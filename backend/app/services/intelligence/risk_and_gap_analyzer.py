from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.project_state import (
    ProjectRisk,
    RiskSeverity,
    RiskStatus,
    KnowledgeGap,
)


class RiskAndGapAnalyzer:
    """Identifies evidence-based project risks, blockers, and knowledge gaps."""

    RISKS_COLLECTION = "project_risks"
    GAPS_COLLECTION = "project_knowledge_gaps"

    async def analyze_risks_and_gaps(
        self, project_id: str, db: AsyncIOMotorDatabase
    ) -> tuple[list[ProjectRisk], list[KnowledgeGap]]:
        """Identify actionable risks, blockers, and knowledge gaps from project evidence."""
        risks: list[ProjectRisk] = []
        gaps: list[KnowledgeGap] = []
        now = datetime.now(timezone.utc)

        # 1. Analyze Action Items for Blockers and Overdue Deadlines
        cursor_actions = db["action_items"].find({"project_id": project_id})
        actions = await cursor_actions.to_list(length=100)

        for act in actions:
            status = act.get("status", "TODO")
            title = act.get("title", "")
            desc = act.get("description", "")
            due_at = act.get("due_at")
            assignee = act.get("assignee_name") or act.get("assignee_id")

            # Check for explicit blockers
            if "blocked" in title.lower() or "blocked" in desc.lower():
                risks.append(
                    ProjectRisk(
                        id=str(ObjectId()),
                        risk_id=f"risk_blocked_{act.get('action_id')}",
                        project_id=project_id,
                        title=f"Blocked Action Item: {title}",
                        impact_explanation="A critical project task has been flagged as blocked in project records.",
                        severity=RiskSeverity.HIGH.value,
                        evidence=[
                            {
                                "source_type": "action_item",
                                "source_id": act.get("action_id"),
                                "title": title,
                            }
                        ],
                        detected_at=now,
                        status=RiskStatus.OPEN.value,
                    )
                )

            # Check for overdue tasks
            if status in ["TODO", "IN_PROGRESS"] and due_at:
                try:
                    due_dt = due_at if isinstance(due_at, datetime) else datetime.fromisoformat(str(due_at))
                    if due_dt.tzinfo is None:
                        due_dt = due_dt.replace(tzinfo=timezone.utc)
                    if due_dt < now:
                        risks.append(
                            ProjectRisk(
                                id=str(ObjectId()),
                                risk_id=f"risk_overdue_{act.get('action_id')}",
                                project_id=project_id,
                                title=f"Overdue Action Item: {title}",
                                impact_explanation=f"Task was scheduled to complete by {due_dt.strftime('%b %d, %Y')}.",
                                severity=RiskSeverity.MEDIUM.value,
                                evidence=[
                                    {
                                        "source_type": "action_item",
                                        "source_id": act.get("action_id"),
                                        "title": title,
                                        "due_at": due_dt.isoformat(),
                                    }
                                ],
                                detected_at=now,
                                status=RiskStatus.OPEN.value,
                            )
                        )
                except Exception:
                    pass

            # Check for unassigned tasks (Knowledge / Responsibility Gap)
            if status in ["TODO", "IN_PROGRESS"] and not assignee:
                gaps.append(
                    KnowledgeGap(
                        id=str(ObjectId()),
                        gap_id=f"gap_unassigned_{act.get('action_id')}",
                        project_id=project_id,
                        area="Task Ownership",
                        description=f"Action item '{title}' has no designated owner.",
                        suggested_action="Assign a team member to ensure accountability.",
                        detected_at=now,
                    )
                )

        # 2. Analyze Meeting Summaries for Unresolved Questions
        cursor_m = db["meeting_summaries"].find({"project_id": project_id}).sort("generated_at", -1).limit(5)
        summaries = await cursor_m.to_list(length=5)
        for s in summaries:
            unresolved = s.get("unresolved_questions", [])
            for q in unresolved:
                if len(q.strip()) > 10:
                    risks.append(
                        ProjectRisk(
                            id=str(ObjectId()),
                            risk_id=f"risk_unresolved_{s.get('meeting_id')}_{hash(q) % 10000}",
                            project_id=project_id,
                            title=f"Unresolved Meeting Topic: {q[:80]}",
                            impact_explanation="Open architectural or technical question deferred during team meeting.",
                            severity=RiskSeverity.LOW.value,
                            evidence=[
                                {
                                    "source_type": "meeting_summary",
                                    "source_id": s.get("meeting_id"),
                                    "question": q,
                                }
                            ],
                            detected_at=now,
                            status=RiskStatus.OPEN.value,
                        )
                    )

        # 3. Check for Architecture Knowledge Gaps
        cursor_dec = db["decisions"].find({"project_id": project_id})
        dec_count = await db["decisions"].count_documents({"project_id": project_id})
        if dec_count == 0:
            gaps.append(
                KnowledgeGap(
                    id=str(ObjectId()),
                    gap_id=f"gap_no_decisions_{project_id}",
                    project_id=project_id,
                    area="Architecture Decisions",
                    description="No architectural or technical decisions have been logged for this project.",
                    suggested_action="Document key framework, database, and infrastructure choices in the Decision Log.",
                    detected_at=now,
                )
            )

        # Upsert risks and gaps without modifying immutable _id
        for r in risks:
            r_data = r.model_dump(by_alias=True)
            r_data.pop("_id", None)
            await db[self.RISKS_COLLECTION].update_one(
                {"risk_id": r.risk_id, "project_id": project_id},
                {"$set": r_data},
                upsert=True,
            )
        for g in gaps:
            g_data = g.model_dump(by_alias=True)
            g_data.pop("_id", None)
            await db[self.GAPS_COLLECTION].update_one(
                {"gap_id": g.gap_id, "project_id": project_id},
                {"$set": g_data},
                upsert=True,
            )

        cursor_r_all = db[self.RISKS_COLLECTION].find({"project_id": project_id}).sort("detected_at", -1)
        r_docs = await cursor_r_all.to_list(length=50)

        cursor_g_all = db[self.GAPS_COLLECTION].find({"project_id": project_id}).sort("detected_at", -1)
        g_docs = await cursor_g_all.to_list(length=50)

        return [ProjectRisk(**d) for d in r_docs], [KnowledgeGap(**d) for d in g_docs]

    async def update_risk_status(
        self, project_id: str, risk_id: str, new_status: str, db: AsyncIOMotorDatabase
    ) -> bool:
        """Update status of a risk (OPEN, ACKNOWLEDGED, RESOLVED)."""
        res = await db[self.RISKS_COLLECTION].update_one(
            {"risk_id": risk_id, "project_id": project_id},
            {"$set": {"status": new_status.upper()}},
        )
        return res.modified_count > 0

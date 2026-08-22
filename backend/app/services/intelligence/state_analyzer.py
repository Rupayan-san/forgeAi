from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.project_state import ProjectStateSnapshot, HealthStatus
from app.services.constitution_service import ConstitutionService


class ProjectStateAnalyzer:
    """Derives point-in-time ProjectStateSnapshot from cross-system project evidence."""

    COLLECTION_NAME = "project_state_snapshots"

    async def analyze_project_state(
        self, project_id: str, db: AsyncIOMotorDatabase
    ) -> ProjectStateSnapshot:
        """Construct evidence-based point-in-time ProjectStateSnapshot."""
        now = datetime.now(timezone.utc)

        # 1. Fetch project & constitution
        project_doc = await db["projects"].find_one({"project_id": project_id})
        project_name = project_doc.get("name", "Project") if project_doc else "Project"

        constitution = await ConstitutionService.get_or_create_constitution(
            db=db, project_id=project_id, user_id="system"
        )
        tech_stack = {
            "languages": constitution.sections.technology.languages,
            "frameworks": constitution.sections.technology.frameworks,
            "databases": constitution.sections.technology.databases,
            "infrastructure": constitution.sections.technology.infrastructure,
        }

        # 2. Fetch Decisions
        dec_cursor = db["decisions"].find({"project_id": project_id})
        decisions = await dec_cursor.to_list(length=100)
        active_decisions = [d for d in decisions if d.get("status") == "ACTIVE"]

        # 3. Fetch Action Items
        act_cursor = db["action_items"].find({"project_id": project_id})
        actions = await act_cursor.to_list(length=100)

        open_actions = [a for a in actions if a.get("status") in ["TODO", "IN_PROGRESS"]]
        completed_actions = [a for a in actions if a.get("status") == "DONE"]
        blocked_actions = [
            a.get("title") for a in actions
            if "blocked" in a.get("title", "").lower() or "blocked" in a.get("description", "").lower()
        ]

        overdue_actions = []
        for a in open_actions:
            due = a.get("due_at")
            if due:
                try:
                    due_dt = due if isinstance(due, datetime) else datetime.fromisoformat(str(due))
                    if due_dt.tzinfo is None:
                        due_dt = due_dt.replace(tzinfo=timezone.utc)
                    if due_dt < now:
                        overdue_actions.append(a.get("title"))
                except Exception:
                    pass

        # 4. Fetch Recent Meetings
        meet_cursor = db["meetings"].find({"project_id": project_id}).sort("created_at", -1).limit(5)
        meetings = await meet_cursor.to_list(length=5)

        # 5. Derive Current Phase & Active/Completed Work
        active_work = [a.get("title") for a in open_actions[:5] if a.get("title")]
        completed_work = [a.get("title") for a in completed_actions[:5] if a.get("title")]
        for d in active_decisions[:3]:
            completed_work.append(f"Decided: {d.get('decision_text')}")

        # Phase inference heuristic
        phase = "Active Development"
        all_text = " ".join(active_work + completed_work).lower()
        if "rag" in all_text or "retrieval" in all_text:
            phase = "RAG & Retrieval Optimization"
        elif "voice" in all_text or "meeting" in all_text:
            phase = "Voice & Meeting Collaboration"
        elif "decision" in all_text or "constitution" in all_text:
            phase = "Architecture & Governance"
        elif "auth" in all_text:
            phase = "Authentication & Foundation"

        # 6. Determine Health Status with Explainable Reasons
        health_reasons = []
        if len(blocked_actions) > 0:
            health_status = HealthStatus.AT_RISK.value
            health_reasons.append(f"{len(blocked_actions)} critical task(s) currently flagged as blocked.")
        elif len(overdue_actions) > 0:
            health_status = HealthStatus.ATTENTION.value
            health_reasons.append(f"{len(overdue_actions)} action item(s) are past their target deadline.")
        elif any(d.get("status") == "CONFLICTED" for d in decisions):
            health_status = HealthStatus.ATTENTION.value
            health_reasons.append("Conflicting architectural decisions detected in project decision records.")
        else:
            health_status = HealthStatus.HEALTHY.value
            health_reasons.append("All documented action items on track with active architectural alignment.")

        # 7. Generate Project Summary
        summary = (
            f"Project '{project_name}' is currently in the '{phase}' phase with {len(active_decisions)} active architectural decision(s) "
            f"and {len(open_actions)} open action item(s)."
        )
        if blocked_actions:
            summary += f" Attention required: {len(blocked_actions)} item(s) are blocked."

        snapshot = ProjectStateSnapshot(
            id=str(ObjectId()),
            snapshot_id=f"snap_{project_id}_{int(now.timestamp())}",
            project_id=project_id,
            generated_at=now,
            project_summary=summary,
            current_phase=phase,
            active_work=active_work,
            completed_work=completed_work,
            blocked_work=blocked_actions,
            technical_stack=tech_stack,
            active_decisions_count=len(active_decisions),
            open_action_items_count=len(open_actions),
            overdue_action_items_count=len(overdue_actions),
            health_status=health_status,
            health_reasons=health_reasons,
            confidence="HIGH",
        )

        # Upsert latest snapshot without modifying immutable _id
        doc_data = snapshot.model_dump(by_alias=True)
        doc_data.pop("_id", None)
        await db[self.COLLECTION_NAME].update_one(
            {"project_id": project_id},
            {"$set": doc_data},
            upsert=True,
        )

        from app.services.cache_service import cache_service
        cache_service.set_cached_state_snapshot(project_id, snapshot.model_dump(by_alias=True))
        return snapshot

    async def get_latest_snapshot(
        self, project_id: str, db: AsyncIOMotorDatabase
    ) -> ProjectStateSnapshot:
        """Get cached snapshot or calculate fresh if none exists."""
        from app.services.cache_service import cache_service
        cached = cache_service.get_cached_state_snapshot(project_id)
        if cached:
            return ProjectStateSnapshot(**cached)

        doc = await db[self.COLLECTION_NAME].find_one({"project_id": project_id})
        if doc:
            snapshot = ProjectStateSnapshot(**doc)
            cache_service.set_cached_state_snapshot(project_id, snapshot.model_dump(by_alias=True))
            return snapshot
        return await self.analyze_project_state(project_id, db)

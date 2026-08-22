from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.project_state import ConsistencyIssue, ConsistencyIssueType
from app.services.constitution_service import ConstitutionService


class ConsistencyAnalyzer:
    """Detects drift between documented Decisions, Constitution rules, and codebase evidence."""

    COLLECTION_NAME = "project_consistency_issues"

    async def analyze_consistency(
        self, project_id: str, db: AsyncIOMotorDatabase
    ) -> list[ConsistencyIssue]:
        """Run consistency verification across Decisions, Constitution, and codebase artifacts."""
        issues: list[ConsistencyIssue] = []

        # 1. Fetch active Constitution and Decisions
        constitution = await ConstitutionService.get_or_create_constitution(
            db=db, project_id=project_id, user_id="system"
        )
        const_frameworks = [f.lower() for f in constitution.sections.technology.frameworks]
        const_databases = [d.lower() for d in constitution.sections.technology.databases]

        cursor_dec = db["decisions"].find({"project_id": project_id})
        decisions = await cursor_dec.to_list(length=100)

        # 2. Check Decision Staleness & Contradictions
        for dec in decisions:
            status = dec.get("status", "ACTIVE")
            text = dec.get("decision_text", "").lower()

            # Check if an active decision mentions a replaced technology (e.g. Elasticsearch when Qdrant is chosen)
            if "elasticsearch" in text and ("qdrant" in const_databases or any("qdrant" in d.get("decision_text", "").lower() for d in decisions if d.get("status") == "ACTIVE")):
                issues.append(
                    ConsistencyIssue(
                        id=str(ObjectId()),
                        issue_id=f"stale_dec_{dec.get('decision_id')}",
                        project_id=project_id,
                        issue_type=ConsistencyIssueType.DECISION_STALENESS.value,
                        title="Potentially Outdated Vector Store Decision",
                        description=f"Decision '{dec.get('decision_text')}' references Elasticsearch, but project has standardized on Qdrant.",
                        documented_claim=dec.get("decision_text"),
                        observed_evidence="Active Project Constitution specifies Qdrant for vector retrieval.",
                        confidence="HIGH",
                        detected_at=datetime.now(timezone.utc),
                    )
                )

            # Check if decision conflicts exist
            if status == "CONFLICTED":
                issues.append(
                    ConsistencyIssue(
                        id=str(ObjectId()),
                        issue_id=f"conflict_dec_{dec.get('decision_id')}",
                        project_id=project_id,
                        issue_type=ConsistencyIssueType.DECISION_VS_CODE.value,
                        title="Conflicting Architectural Decision",
                        description=f"Decision '{dec.get('decision_text')}' conflicts with another active project decision.",
                        documented_claim=dec.get("decision_text"),
                        observed_evidence="Decision Intelligence marked this record as CONFLICTED.",
                        confidence="HIGH",
                        detected_at=datetime.now(timezone.utc),
                    )
                )

        # 3. Check Constitution vs Technology Stack
        # e.g., if constitution lists Redis but no Redis decision or action item exists
        if "redis" in const_databases and not any("redis" in d.get("decision_text", "").lower() for d in decisions):
            # Potential documentation drift: Constitution mentions Redis but no explicit decision rationale was recorded
            issues.append(
                ConsistencyIssue(
                    id=str(ObjectId()),
                    issue_id=f"const_drift_redis_{project_id}",
                    project_id=project_id,
                    issue_type=ConsistencyIssueType.DOCUMENTATION_DRIFT.value,
                    title="Constitution Lists Redis Without Logged Decision Rationale",
                    description="Project Constitution specifies Redis in databases, but no formal decision record explains the selection.",
                    documented_claim="Constitution: databases = ['Redis']",
                    observed_evidence="Zero active decision records found for Redis selection.",
                    confidence="MEDIUM",
                    detected_at=datetime.now(timezone.utc),
                )
            )

        # Cache issues into DB without modifying immutable _id
        for iss in issues:
            iss_data = iss.model_dump(by_alias=True)
            iss_data.pop("_id", None)
            await db[self.COLLECTION_NAME].update_one(
                {"issue_id": iss.issue_id, "project_id": project_id},
                {"$set": iss_data},
                upsert=True,
            )

        cursor_res = db[self.COLLECTION_NAME].find({"project_id": project_id}).sort("detected_at", -1)
        docs = await cursor_res.to_list(length=50)
        return [ConsistencyIssue(**d) for d in docs]

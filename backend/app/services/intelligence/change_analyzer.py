from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.project_state import SemanticChangeGroup


class ChangeAnalyzer:
    """Groups related commits, PRs, and meeting actions into high-level semantic changes."""

    COLLECTION_NAME = "semantic_changes"

    async def analyze_and_group_changes(
        self, project_id: str, db: AsyncIOMotorDatabase
    ) -> list[SemanticChangeGroup]:
        """Aggregate recent development activity into grouped semantic changes."""
        # 1. Fetch recent PRs / commits / meetings from DB or memory points
        groups: list[SemanticChangeGroup] = []

        # Find recent finalized meetings
        cursor_m = db["meetings"].find({"project_id": project_id, "status": "ENDED"}).sort("ended_at", -1).limit(5)
        meetings = await cursor_m.to_list(length=5)
        for m in meetings:
            m_title = m.get("title", "Team Meeting")
            summary_doc = await db["meeting_summaries"].find_one({"meeting_id": m.get("meeting_id")})
            overview = summary_doc.get("overview", "") if summary_doc else f"Concluded {m_title}."

            groups.append(
                SemanticChangeGroup(
                    id=str(ObjectId()),
                    group_id=f"change_meet_{m.get('meeting_id')}",
                    project_id=project_id,
                    title=f"Meeting Alignment: {m_title}",
                    summary=overview[:300],
                    related_commit_shas=[],
                    related_pr_numbers=[],
                    timestamp=m.get("ended_at") or m.get("created_at") or datetime.now(timezone.utc),
                    area="Collaboration & Architecture",
                )
            )

        # Find completed action items
        cursor_a = db["action_items"].find({"project_id": project_id, "status": "DONE"}).sort("completed_at", -1).limit(10)
        done_actions = await cursor_a.to_list(length=10)
        if done_actions:
            titles = [a.get("title") for a in done_actions if a.get("title")]
            groups.append(
                SemanticChangeGroup(
                    id=str(ObjectId()),
                    group_id=f"change_actions_{project_id}",
                    project_id=project_id,
                    title=f"Completed {len(done_actions)} Project Action Items",
                    summary="Delivered tasks: " + "; ".join(titles[:5]),
                    related_commit_shas=[],
                    related_pr_numbers=[],
                    timestamp=done_actions[0].get("completed_at") or datetime.now(timezone.utc),
                    area="Tasks & Execution",
                )
            )

        # Cache/upsert groups without modifying immutable _id
        for g in groups:
            g_data = g.model_dump(by_alias=True)
            g_data.pop("_id", None)
            await db[self.COLLECTION_NAME].update_one(
                {"group_id": g.group_id, "project_id": project_id},
                {"$set": g_data},
                upsert=True,
            )

        # Return latest sorted
        cursor_res = db[self.COLLECTION_NAME].find({"project_id": project_id}).sort("timestamp", -1).limit(20)
        docs = await cursor_res.to_list(length=20)
        return [SemanticChangeGroup(**d) for d in docs]

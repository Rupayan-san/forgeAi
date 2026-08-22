from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.project_state import ProjectTimelineEvent


class TimelineBuilder:
    """Constructs a unified, queryable chronological project timeline from multiple sources."""

    COLLECTION_NAME = "project_timeline_events"

    async def build_timeline(
        self,
        project_id: str,
        event_type_filter: Optional[str] = None,
        limit: int = 50,
        db: Optional[AsyncIOMotorDatabase] = None,
    ) -> list[ProjectTimelineEvent]:
        """Aggregate chronological project events with full provenance."""
        events: list[ProjectTimelineEvent] = []

        # 1. Project Decisions
        cursor_d = db["decisions"].find({"project_id": project_id}).sort("timestamp", -1).limit(30)
        decisions = await cursor_d.to_list(length=30)
        for d in decisions:
            ts = d.get("timestamp") or d.get("extracted_at") or datetime.now(timezone.utc)
            events.append(
                ProjectTimelineEvent(
                    id=str(ObjectId()),
                    event_id=f"timeline_dec_{d.get('decision_id')}",
                    project_id=project_id,
                    event_type="DECISION",
                    source_id=d.get("decision_id"),
                    title=f"Decision: {d.get('decision_text', '')[:100]}",
                    description=d.get("reasoning", "")[:200],
                    author="Decision Intelligence",
                    timestamp=ts if isinstance(ts, datetime) else datetime.fromisoformat(str(ts)),
                    metadata={"status": d.get("status"), "source_type": d.get("source_type")},
                )
            )

        # 2. Meetings
        cursor_m = db["meetings"].find({"project_id": project_id}).sort("created_at", -1).limit(30)
        meetings = await cursor_m.to_list(length=30)
        for m in meetings:
            ts = m.get("started_at") or m.get("created_at") or datetime.now(timezone.utc)
            events.append(
                ProjectTimelineEvent(
                    id=str(ObjectId()),
                    event_id=f"timeline_meet_{m.get('meeting_id')}",
                    project_id=project_id,
                    event_type="MEETING",
                    source_id=m.get("meeting_id"),
                    title=f"Meeting: {m.get('title', 'Voice Meeting')}",
                    description=f"Status: {m.get('status')} with {len(m.get('participants', []))} participants",
                    author=m.get("created_by", "User"),
                    timestamp=ts if isinstance(ts, datetime) else datetime.fromisoformat(str(ts)),
                    metadata={"status": m.get("status")},
                )
            )

        # 3. Action Items
        cursor_a = db["action_items"].find({"project_id": project_id}).sort("created_at", -1).limit(30)
        actions = await cursor_a.to_list(length=30)
        for a in actions:
            ts = a.get("created_at") or datetime.now(timezone.utc)
            events.append(
                ProjectTimelineEvent(
                    id=str(ObjectId()),
                    event_id=f"timeline_act_{a.get('action_id')}",
                    project_id=project_id,
                    event_type="ACTION_ITEM",
                    source_id=a.get("action_id"),
                    title=f"Action Item: {a.get('title', '')[:100]}",
                    description=f"Assignee: {a.get('assignee_name') or 'Unassigned'}, Status: {a.get('status')}",
                    author="Action Extractor",
                    timestamp=ts if isinstance(ts, datetime) else datetime.fromisoformat(str(ts)),
                    metadata={"status": a.get("status"), "assignee": a.get("assignee_name")},
                )
            )

        # 4. Constitution
        const_doc = await db["constitutions"].find_one({"project_id": project_id})
        if const_doc:
            ts = const_doc.get("updated_at") or const_doc.get("created_at") or datetime.now(timezone.utc)
            events.append(
                ProjectTimelineEvent(
                    id=str(ObjectId()),
                    event_id=f"timeline_const_{project_id}",
                    project_id=project_id,
                    event_type="CONSTITUTION",
                    source_id=project_id,
                    title="Project Constitution Initialized / Updated",
                    description="Established technology stack, architecture rules, and coding standards.",
                    author="Constitution Service",
                    timestamp=ts if isinstance(ts, datetime) else datetime.fromisoformat(str(ts)),
                    metadata={"version": const_doc.get("version", 1)},
                )
            )

        # Cache/upsert timeline events without modifying immutable _id
        for ev in events:
            ev_data = ev.model_dump(by_alias=True)
            ev_data.pop("_id", None)
            await db[self.COLLECTION_NAME].update_one(
                {"event_id": ev.event_id, "project_id": project_id},
                {"$set": ev_data},
                upsert=True,
            )

        query: dict = {"project_id": project_id}
        if event_type_filter:
            query["event_type"] = event_type_filter.upper()

        cursor_res = db[self.COLLECTION_NAME].find(query).sort("timestamp", -1).limit(limit)
        docs = await cursor_res.to_list(length=limit)
        return [ProjectTimelineEvent(**d) for d in docs]

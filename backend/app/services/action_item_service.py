import json
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.action_item import (
    ActionItemModel,
    ActionItemStatus,
    CreateActionItemRequest,
    UpdateActionItemRequest,
)


ACTION_EXTRACTION_PROMPT = """Analyze the following transcript excerpt from a software engineering project meeting. Determine if any EXPLICIT ACTION ITEMS, TASKS, OR ASSIGNMENTS were committed to.

CRITERIA FOR A VALID ACTION ITEM:
- Must represent an actionable task someone agreed/was assigned to do (e.g. "Rahul will implement Redis caching by Friday", "I'll update the API docs tomorrow").
- Vague ideas or hypothetical brainstorming without clear assignment should have confidence_score < 0.5 or be omitted.

Provide a JSON object with:
- "has_actions": boolean
- "action_items": Array of objects, each containing:
  - "title": Concise task title (e.g. "Implement Redis caching layer")
  - "description": Additional details or context
  - "assignee_name": Name of person assigned (or null if unassigned)
  - "due_text": Natural language deadline mentioned (e.g. "Friday", "tomorrow", or null)
  - "confidence_score": Float between 0.0 and 1.0

Transcript:
{context}

Respond with ONLY valid JSON."""


class ActionItemService:
    """Service for extracting, managing, and tracking Project Action Items."""

    COLLECTION_NAME = "action_items"

    def __init__(self):
        self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"

    async def extract_action_items(
        self,
        project_id: str,
        meeting_id: str,
        text: str,
        transcript_segment_id: Optional[str],
        db: AsyncIOMotorDatabase,
    ) -> list[ActionItemModel]:
        """Extract structured action items from a transcript segment using LLM."""
        if not text or len(text.strip()) < 15:
            return []

        try:
            completion = await self.openai.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an AI meeting assistant extracting action items. Always respond with valid JSON.",
                    },
                    {"role": "user", "content": ACTION_EXTRACTION_PROMPT.format(context=text)},
                ],
                temperature=0.1,
                max_tokens=400,
            )
            raw = completion.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
                raw = raw.rsplit("```", 1)[0]

            data = json.loads(raw)
            if not data.get("has_actions") or not data.get("action_items"):
                return []

            extracted: list[ActionItemModel] = []
            for item in data.get("action_items", []):
                title = item.get("title", "").strip()
                if not title:
                    continue

                confidence = float(item.get("confidence_score", 0.8))
                if confidence < 0.4:
                    continue

                action_obj = ActionItemModel(
                    id=str(ObjectId()),
                    action_id=str(ObjectId()),
                    project_id=project_id,
                    meeting_id=meeting_id,
                    title=title,
                    description=item.get("description", "").strip(),
                    assignee_name=item.get("assignee_name"),
                    status=ActionItemStatus.TODO.value,
                    confidence_score=confidence,
                    source_transcript_segment_id=transcript_segment_id,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                await db[self.COLLECTION_NAME].insert_one(action_obj.model_dump(by_alias=True))
                extracted.append(action_obj)

            return extracted

        except Exception as e:
            print(f"[ActionItemService] Extraction warning: {e}")
            return []

    async def create_action_item(
        self,
        project_id: str,
        data: CreateActionItemRequest,
        db: AsyncIOMotorDatabase,
    ) -> ActionItemModel:
        """Manually create an action item."""
        action = ActionItemModel(
            id=str(ObjectId()),
            action_id=str(ObjectId()),
            project_id=project_id,
            meeting_id=data.meeting_id,
            title=data.title.strip(),
            description=data.description.strip(),
            assignee_id=data.assignee_id,
            assignee_name=data.assignee_name,
            due_at=data.due_at,
            status=ActionItemStatus.TODO.value,
            confidence_score=1.0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        await db[self.COLLECTION_NAME].insert_one(action.model_dump(by_alias=True))
        return action

    async def update_action_item(
        self,
        action_id: str,
        data: UpdateActionItemRequest,
        db: AsyncIOMotorDatabase,
    ) -> Optional[ActionItemModel]:
        """Update an action item (manual human correction overrides AI)."""
        update_dict = {}
        dumped = data.model_dump(exclude_unset=True)

        for field in ["title", "description", "assignee_id", "assignee_name", "due_at", "status"]:
            if field in dumped and dumped[field] is not None:
                update_dict[field] = dumped[field]

        if not update_dict:
            doc = await db[self.COLLECTION_NAME].find_one({"action_id": action_id})
            return ActionItemModel(**doc) if doc else None

        update_dict["updated_at"] = datetime.now(timezone.utc)
        if update_dict.get("status") == ActionItemStatus.DONE.value:
            update_dict["completed_at"] = datetime.now(timezone.utc)

        await db[self.COLLECTION_NAME].update_one(
            {"action_id": action_id},
            {"$set": update_dict},
        )

        doc = await db[self.COLLECTION_NAME].find_one({"action_id": action_id})
        return ActionItemModel(**doc) if doc else None

    async def get_project_action_items(
        self,
        project_id: str,
        meeting_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        db: Optional[AsyncIOMotorDatabase] = None,
    ) -> list[ActionItemModel]:
        """Fetch project-scoped action items with optional meeting / status filters."""
        query = {"project_id": project_id}
        if meeting_id:
            query["meeting_id"] = meeting_id
        if status_filter:
            query["status"] = status_filter.upper()

        cursor = db[self.COLLECTION_NAME].find(query).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        return [ActionItemModel(**d) for d in docs]

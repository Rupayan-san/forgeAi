import json
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.meeting import MeetingSummaryModel, MeetingModel
from app.services.memory_service import ProjectMemoryService
from app.services.decision_service import DecisionService
from app.services.action_item_service import ActionItemService


SUMMARY_PROMPT = """You are Forge AI analyzing a completed software project meeting. Generate a concise, highly structured technical summary.

Transcript:
{transcript}

Provide a JSON object with:
- "overview": 2-3 sentence summary of the meeting's purpose and primary outcomes.
- "key_points": Array of 3-6 bullet points covering major topics discussed.
- "decisions": Array of architectural/technical/product decisions agreed upon during this meeting.
- "action_items": Array of specific tasks committed to with assignees if mentioned.
- "unresolved_questions": Array of open questions or topics postponed for future discussions.

Respond with ONLY valid JSON."""


class MeetingSummaryService:
    """Generates structured post-meeting summaries and indexes meeting intelligence into Project Memory."""

    COLLECTION_NAME = "meeting_summaries"

    def __init__(self):
        self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"
        self.memory_service = ProjectMemoryService()
        self.decision_service = DecisionService()
        self.action_service = ActionItemService()

    async def generate_and_index_summary(
        self,
        project_id: str,
        meeting_id: str,
        db: AsyncIOMotorDatabase,
    ) -> Optional[MeetingSummaryModel]:
        """Generate structured meeting summary, extract decisions/actions, and index to Project Memory."""
        # 1. Fetch meeting and transcripts
        meeting_doc = await db["meetings"].find_one({"meeting_id": meeting_id, "project_id": project_id})
        if not meeting_doc:
            return None
        meeting = MeetingModel(**meeting_doc)

        cursor = db["meeting_transcripts"].find({"meeting_id": meeting_id}).sort("sequence", 1)
        transcript_docs = await cursor.to_list(length=500)

        if not transcript_docs:
            # Fallback for empty meeting
            summary = MeetingSummaryModel(
                id=str(ObjectId()),
                summary_id=str(ObjectId()),
                meeting_id=meeting_id,
                project_id=project_id,
                overview=f"Meeting '{meeting.title}' concluded with no spoken dialogue recorded.",
                key_points=[],
                decisions=[],
                action_items=[],
                unresolved_questions=[],
                generated_at=datetime.now(timezone.utc),
            )
            await db[self.COLLECTION_NAME].insert_one(summary.model_dump(by_alias=True))
            return summary

        full_transcript_text = "\n".join(
            f"[{d.get('speaker_name', 'Speaker')}]: {d.get('text', '')}"
            for d in transcript_docs
        )

        # 2. Generate structured summary with LLM
        try:
            completion = await self.openai.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are Forge AI generating a structured project meeting summary. Always respond with valid JSON.",
                    },
                    {"role": "user", "content": SUMMARY_PROMPT.format(transcript=full_transcript_text[:12000])},
                ],
                temperature=0.2,
                max_tokens=800,
            )
            raw = completion.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
                raw = raw.rsplit("```", 1)[0]

            data = json.loads(raw)
        except Exception as e:
            print(f"[MeetingSummaryService] LLM summarization fallback: {e}")
            data = {
                "overview": f"Summary for meeting: {meeting.title}",
                "key_points": [full_transcript_text[:200]],
                "decisions": [],
                "action_items": [],
                "unresolved_questions": [],
            }

        # 3. Persist MeetingSummaryModel
        summary = MeetingSummaryModel(
            id=str(ObjectId()),
            summary_id=str(ObjectId()),
            meeting_id=meeting_id,
            project_id=project_id,
            overview=data.get("overview", f"Meeting '{meeting.title}' concluded.").strip(),
            key_points=data.get("key_points", []),
            decisions=data.get("decisions", []),
            action_items=data.get("action_items", []),
            unresolved_questions=data.get("unresolved_questions", []),
            generated_at=datetime.now(timezone.utc),
        )

        # Replace existing or insert new
        await db[self.COLLECTION_NAME].replace_one(
            {"meeting_id": meeting_id},
            summary.model_dump(by_alias=True),
            upsert=True,
        )

        # 4. Extract structured decisions into Decision Intelligence
        for dec_text in summary.decisions:
            if len(dec_text.strip()) > 10:
                try:
                    await self.decision_service.extract_decision_candidate(
                        project_id=project_id,
                        text=f"Decision reached during meeting '{meeting.title}': {dec_text}",
                        source_type="meeting",
                        source_id=f"meeting_{meeting_id}",
                        source_url="",
                        db=db,
                    )
                except Exception as dec_err:
                    print(f"[MeetingSummaryService] Decision extraction warning: {dec_err}")

        # 5. Ingest into Project Memory (Qdrant Vector Store)
        memory_content = f"Meeting Summary ({meeting.title}):\n{summary.overview}\n\nKey Points:\n" + "\n".join(f"- {p}" for p in summary.key_points)
        if summary.decisions:
            memory_content += "\n\nDecisions:\n" + "\n".join(f"- {d}" for d in summary.decisions)
        if summary.action_items:
            memory_content += "\n\nAction Items:\n" + "\n".join(f"- {a}" for a in summary.action_items)

        try:
            project_doc = await db["projects"].find_one({"project_id": project_id})
            col_name = project_doc.get("qdrant_collection_name") if project_doc else f"forge_{project_id}"

            await self.memory_service.index_memory_item(
                project_id=project_id,
                source_type="meeting",
                source_id=f"meeting_{meeting_id}",
                content=memory_content,
                metadata={
                    "meeting_id": meeting_id,
                    "title": meeting.title,
                    "date": summary.generated_at.isoformat(),
                },
                collection_name=col_name,
            )
        except Exception as mem_err:
            print(f"[MeetingSummaryService] Memory indexing warning: {mem_err}")

        return summary

    async def get_summary(self, meeting_id: str, db: AsyncIOMotorDatabase) -> Optional[MeetingSummaryModel]:
        """Fetch saved meeting summary."""
        doc = await db[self.COLLECTION_NAME].find_one({"meeting_id": meeting_id})
        return MeetingSummaryModel(**doc) if doc else None

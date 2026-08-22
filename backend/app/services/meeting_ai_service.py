import re
from datetime import datetime, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.project import ProjectModel, ProjectAIConfig
from app.models.chat import SourceCitation
from app.services.retrieval.advanced_retrieval_service import AdvancedRetrievalService
from app.services.meeting_connection_manager import meeting_connection_manager


class MeetingAIService:
    """Handles real-time Forge AI participation in Project Meetings with voice invocation and Advanced RAG."""

    def __init__(self):
        self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"
        self.retrieval_service = AdvancedRetrievalService()

    @classmethod
    def detect_meeting_ai_invocation(
        cls, text: str, ai_config: Optional[ProjectAIConfig] = None
    ) -> tuple[bool, str]:
        """Detect if spoken transcript is explicitly addressing Forge AI."""
        if not text:
            return False, text

        invoc_phrase = (ai_config.invocation_phrase if ai_config and ai_config.invocation_phrase else "Forge").strip()
        ai_name = (ai_config.name if ai_config and ai_config.name else "Forge").strip()

        triggers = {invoc_phrase.lower(), ai_name.lower(), "forge", "assistant"}

        # 1. Explicit @mention anywhere: e.g. "@Forge summarize..."
        for trigger in triggers:
            at_pattern = rf"@\b{re.escape(trigger)}\b"
            if re.search(at_pattern, text, re.IGNORECASE):
                cleaned = re.sub(at_pattern, "", text, flags=re.IGNORECASE).strip()
                return True, cleaned or text

        # 2. Addressed with punctuation or greeting: e.g. "Forge, what...", "Hey Forge: tell us..."
        for trigger in triggers:
            punc_pattern = rf"^(?:(?:hey|hi|hello|ok)\s+)?\b{re.escape(trigger)}\b\s*[,:\-\?]\s*"
            if re.search(punc_pattern, text, re.IGNORECASE):
                cleaned = re.sub(punc_pattern, "", text, count=1, flags=re.IGNORECASE).strip()
                return True, cleaned or text

        # 3. Direct start of sentence with question / command verb: e.g. "Forge what is...", "Forge summarize..."
        for trigger in triggers:
            verb_pattern = rf"^(?:(?:hey|hi|hello|ok)\s+)?\b{re.escape(trigger)}\b\s+(?=(?:what|how|why|who|where|when|which|can|could|please|summarize|tell|list|add|is|are|do|does)\b)"
            if re.search(verb_pattern, text, re.IGNORECASE):
                cleaned = re.sub(verb_pattern, "", text, count=1, flags=re.IGNORECASE).strip()
                return True, cleaned or text

        return False, text

    async def handle_live_voice_query(
        self,
        project: ProjectModel,
        meeting_id: str,
        speaker_name: str,
        query: str,
        db: AsyncIOMotorDatabase,
    ) -> dict:
        """Process live voice query: broadcast THINKING → Advanced RAG → generate answer → broadcast SPEAKING."""
        ai = project.ai_config or ProjectAIConfig(
            name="Forge", role="Project Assistant", invocation_phrase="Forge"
        )

        # 1. Update & broadcast THINKING state
        meeting_connection_manager.set_ai_state(meeting_id, "THINKING")
        await meeting_connection_manager.broadcast(
            meeting_id,
            {
                "type": "ai_state",
                "state": "THINKING",
                "ai_name": ai.name,
                "query": query,
            },
        )

        # 2 & 3. Parallel Execution: Retrieve dialogue history and orchestrate Advanced RAG concurrently
        async def fetch_dialogue():
            try:
                cursor = db["meeting_transcripts"].find({"meeting_id": meeting_id}).sort("sequence", -1).limit(8)
                docs = await cursor.to_list(length=8)
                docs.reverse()
                return "\n".join(
                    f"[{d.get('speaker_name', 'Speaker')}]: {d.get('text', '')}"
                    for d in docs
                )
            except Exception:
                return ""

        async def fetch_rag():
            return await self.retrieval_service.retrieve_and_orchestrate(
                project=project,
                query=query,
                db=db,
                custom_top_k=6,
            )

        import asyncio
        recent_dialogue, context_result = await asyncio.gather(
            fetch_dialogue(),
            fetch_rag(),
            return_exceptions=False,
        )
        citations: list[SourceCitation] = context_result.citations

        system_prompt = f"""You are {ai.name}, the real-time AI project collaborator participating in a live voice meeting for '{project.name}'.

VOICE RESPONSE RULES:
1. Speak directly, concisely, and naturally (2-4 sentences suitable for spoken audio).
2. Prioritize rules in the Project Constitution and active Decisions.
3. Ground your answer in the provided Project Context.
4. If project knowledge is insufficient or missing, state that clearly rather than guessing.

PROJECT CONTEXT:
{context_result.formatted_context}

RECENT MEETING DIALOGUE:
{recent_dialogue or 'Meeting started recently.'}"""

        # 4. Generate AI response
        try:
            completion = await self.openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"{speaker_name} asked: {query}"},
                ],
                temperature=0.3,
                max_tokens=350,
            )
            response_text = completion.choices[0].message.content or f"I heard your question regarding '{query}'."
        except Exception:
            # Do not persist or broadcast a fabricated answer when the LLM is
            # unavailable. The API layer reports the provider failure.
            meeting_connection_manager.set_ai_state(meeting_id, "IDLE")
            raise

        # 5. Broadcast response and SPEAKING state
        meeting_connection_manager.set_ai_state(meeting_id, "SPEAKING")
        await meeting_connection_manager.broadcast(
            meeting_id,
            {
                "type": "ai_response",
                "state": "SPEAKING",
                "ai_name": ai.name,
                "content": response_text,
                "sources": [c.model_dump() for c in citations],
            },
        )

        # Reset to IDLE
        meeting_connection_manager.set_ai_state(meeting_id, "IDLE")
        await meeting_connection_manager.broadcast(
            meeting_id,
            {
                "type": "ai_state",
                "state": "IDLE",
                "ai_name": ai.name,
            },
        )

        return {
            "ai_name": ai.name,
            "content": response_text,
            "sources": [c.model_dump() for c in citations],
            "trace": context_result.trace,
        }

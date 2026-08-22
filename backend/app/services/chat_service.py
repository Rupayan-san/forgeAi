import re
import time
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.project import ProjectModel, ProjectAIConfig
from app.models.chat import ChatMessageModel, SourceCitation
from app.services.project_context_service import ProjectContextService
from app.services.memory_service import ProjectMemoryService
from app.services.decision_service import DecisionService
from app.telemetry.metrics import metrics


class ChatService:
    """Service handling Unified Project Chat messages, AI invocation detection, and memory grounding."""

    COLLECTION_NAME = "chat_history"

    @classmethod
    def detect_ai_invocation(
        cls, content: str, ai_config: Optional[ProjectAIConfig] = None
    ) -> tuple[bool, str]:
        """Detect if a user message is invoking the project AI assistant."""
        if not content:
            return False, content

        invoc_phrase = (ai_config.invocation_phrase if ai_config and ai_config.invocation_phrase else "Forge").strip()
        ai_name = (ai_config.name if ai_config and ai_config.name else "Forge").strip()

        triggers = {invoc_phrase.lower(), ai_name.lower(), "forge", "ai"}

        # 1. Check for @mention (e.g. @Atlas, @Forge)
        for trigger in triggers:
            pattern = rf"@\b{re.escape(trigger)}\b"
            if re.search(pattern, content, re.IGNORECASE):
                cleaned = re.sub(pattern, "", content, flags=re.IGNORECASE).strip()
                return True, cleaned or content

        # 2. Check for start of message invocation (e.g. "Atlas, explain ...", "Forge: ...")
        for trigger in triggers:
            pattern = rf"^\b{re.escape(trigger)}\b[\s,:\-]+"
            if re.search(pattern, content, re.IGNORECASE):
                cleaned = re.sub(pattern, "", content, flags=re.IGNORECASE).strip()
                return True, cleaned or content

        return False, content

    @classmethod
    async def save_user_message(
        cls,
        db: AsyncIOMotorDatabase,
        project_id: str,
        user_id: str,
        user_name: str,
        user_avatar: Optional[str],
        content: str,
        is_ai_invocation: bool = False,
    ) -> ChatMessageModel:
        """Persist a human user's chat message to MongoDB."""
        msg = ChatMessageModel(
            id=str(ObjectId()),
            message_id=str(ObjectId()),
            project_id=project_id,
            user_id=user_id,
            user_name=user_name,
            user_avatar=user_avatar,
            role="user",
            content=content,
            is_ai_generated=False,
            is_ai_invocation=is_ai_invocation,
            created_at=datetime.now(timezone.utc),
        )
        await db[cls.COLLECTION_NAME].insert_one(msg.model_dump(by_alias=True))
        return msg

    @classmethod
    async def generate_and_save_ai_response(
        cls,
        db: AsyncIOMotorDatabase,
        project: ProjectModel,
        user_id: str,
        user_message: str,
        trace: Optional[list[str]] = None,
    ) -> ChatMessageModel:
        """Generate a project-grounded AI answer combining Constitution, Decisions, and Memory via ProjectContextService."""
        trace = trace if trace is not None else []
        ai = project.ai_config or ProjectAIConfig(
            name="Forge", role="Project Assistant", invocation_phrase="Forge"
        )

        trace.append(f"Invoking {ai.name} ({ai.role})...")

        # 1. Build unified project context
        trace.append("Retrieving Project Constitution, active Decisions, and Memory chunks...")
        context_service = ProjectContextService()
        project_context = await context_service.build_project_context(
            project=project,
            query_text=user_message,
            db=db,
        )
        sources: list[SourceCitation] = project_context.citations

        system_prompt = f"""You are {ai.name}, the {ai.role} for the project '{project.name}'.

Your responsibilities:
1. Always align your technical guidance with the Project Constitution and active Decisions below.
2. Ground your answers in the retrieved Project Knowledge.
3. Be concise, actionable, and friendly to team members.
4. If a proposed practice violates the Project Constitution or established decisions, explain why and recommend the approved convention.

PROJECT CONTEXT:
{project_context.formatted_context}"""

        # 2. Load recent chat history for conversational context
        history_cursor = (
            db[cls.COLLECTION_NAME]
            .find({"project_id": project.project_id})
            .sort("created_at", -1)
            .limit(6)
        )
        history_docs = await history_cursor.to_list(length=6)
        history_docs.reverse()

        messages = [{"role": "system", "content": system_prompt}]
        for doc in history_docs:
            messages.append({"role": doc.get("role", "user"), "content": doc.get("content", "")})

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        # 3. Generate completion with OpenAI
        trace.append("Generating response with GPT-4o-mini...")
        llm_started = time.perf_counter()
        try:
            openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            completion = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.3,
                max_tokens=1024,
            )
            assistant_content = completion.choices[0].message.content or "I processed your request."
            usage = completion.usage
            metrics.record_llm_call(
                model="gpt-4o-mini",
                operation="project_chat",
                status="success",
                duration_seconds=time.perf_counter() - llm_started,
                prompt_tokens=getattr(usage, "prompt_tokens", 0) or 0,
                completion_tokens=getattr(usage, "completion_tokens", 0) or 0,
            )
        except Exception:
            metrics.record_llm_call(
                model="gpt-4o-mini",
                operation="project_chat",
                status="error",
                duration_seconds=time.perf_counter() - llm_started,
            )
            raise

        # 4. Persist assistant message
        assistant_msg = ChatMessageModel(
            id=str(ObjectId()),
            message_id=str(ObjectId()),
            project_id=project.project_id,
            user_id="ai",
            user_name=ai.name,
            user_avatar=None,
            role="assistant",
            content=assistant_content,
            sources=sources,
            is_ai_generated=True,
            is_ai_invocation=True,
            created_at=datetime.now(timezone.utc),
        )
        await db[cls.COLLECTION_NAME].insert_one(assistant_msg.model_dump(by_alias=True))
        return assistant_msg

    @classmethod
    async def get_chat_history(
        cls,
        db: AsyncIOMotorDatabase,
        project_id: str,
        limit: int = 50,
        before: Optional[datetime] = None,
    ) -> list[ChatMessageModel]:
        """Fetch chronological message history for a project with cursor pagination."""
        query = {"project_id": project_id}
        if before:
            query["created_at"] = {"$lt": before}

        cursor = (
            db[cls.COLLECTION_NAME]
            .find(query)
            .sort("created_at", -1)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        docs.reverse()
        return [ChatMessageModel(**doc) for doc in docs]

    @classmethod
    async def process_background_message_memory(
        cls,
        project_id: str,
        message_id: str,
        content: str,
        qdrant_collection_name: Optional[str],
        db: Optional[AsyncIOMotorDatabase] = None,
    ):
        """Background worker to check message relevance, index memory, and extract decisions."""
        if len(content.strip()) < 15:
            return

        try:
            # 1. Check if message is technical/decision relevant
            openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "Does this team chat message contain important project technical decisions, architecture agreements, configurations, or bug resolutions? Answer exactly 'yes' or 'no'.",
                    },
                    {"role": "user", "content": content},
                ],
                temperature=0,
                max_tokens=10,
            )
            is_relevant = response.choices[0].message.content.strip().lower() == "yes"

            if is_relevant:
                # 2. Index into Project Memory
                memory_service = ProjectMemoryService()
                await memory_service.index_memory_item(
                    project_id=project_id,
                    source_type="chat_message",
                    source_id=message_id,
                    content=content,
                    metadata={"project_id": project_id, "message_id": message_id},
                    collection_name=qdrant_collection_name,
                )

                # 3. If DB available, evaluate decision candidate extraction
                if db is not None:
                    decision_service = DecisionService()
                    await decision_service.extract_decision_candidate(
                        project_id=project_id,
                        text=content,
                        source_type="project_chat",
                        source_id=message_id,
                        source_url="",
                        db=db,
                    )
        except Exception as err:
            print(f"[ChatService] Background memory/decision processing skipped: {err}")

import asyncio
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
from app.services.constitution_service import ConstitutionService
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

        triggers = {invoc_phrase.lower(), ai_name.lower(), "forge", "ai", "bot", "assistant"}

        # 1. Check for @mention (e.g. @Atlas, @Forge, @ai, @bot)
        for trigger in triggers:
            pattern = rf"@\b{re.escape(trigger)}\b"
            if re.search(pattern, content, re.IGNORECASE):
                cleaned = re.sub(pattern, "", content, flags=re.IGNORECASE).strip()
                return True, cleaned or content

        # 2. Check for start of message invocation (e.g. "Forge, explain ...", "Hey Forge: ...")
        for trigger in triggers:
            pattern = rf"^(hey\s+)?\b{re.escape(trigger)}\b[\s,:\-]+"
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
        """Generate a project-grounded AI answer combining Constitution, Decisions, and Memory with fast turnaround."""
        trace = trace if trace is not None else []
        ai = project.ai_config or ProjectAIConfig(
            name="Forge", role="Project Assistant", invocation_phrase="Forge"
        )

        trace.append(f"Invoking {ai.name} ({ai.role})...")

        # 1. Unified project context retrieval
        trace.append("Retrieving Project Constitution, active Decisions, and Memory...")
        context_service = ProjectContextService()
        sources: list[SourceCitation] = []
        project_context_formatted = ""
        try:
            project_context = await asyncio.wait_for(
                context_service.build_project_context(
                    project=project,
                    query_text=user_message,
                    db=db,
                ),
                timeout=4.0,
            )
            sources = project_context.citations or []
            project_context_formatted = project_context.formatted_context
        except Exception as ctx_err:
            print(f"[ChatService] Context retrieval fallback triggered: {ctx_err}")
            # Robust fallback: fetch full Project Constitution and active Decisions directly
            constitution_md = await ConstitutionService.format_constitution_for_ai(
                db=db, project_id=project.project_id
            )
            try:
                decisions_docs = await db["decisions"].find({"project_id": project.project_id}).limit(5).to_list(5)
                decisions_text = "\n".join([f"• Decision: {d.get('decision_text', d.get('title', ''))} ({d.get('reasoning', d.get('rationale', ''))})" for d in decisions_docs])
            except Exception:
                decisions_text = "No specific architectural decisions recorded."

            project_context_formatted = f"""=== PROJECT METADATA ===
Name: {project.name}
Description: {project.description or 'No description provided'}

=== PROJECT CONSTITUTION (HIGHEST PRIORITY - AUTHORITATIVE RULES) ===
{constitution_md}

=== ACTIVE PROJECT DECISIONS (HIGH PRIORITY - ARCHITECTURAL AGREEMENTS) ===
{decisions_text or 'No specific architectural decisions recorded.'}"""

            sources = [
                SourceCitation(
                    source_type="constitution",
                    source_id=f"Project Constitution v{project.project_id[:6]}",
                    source_url="",
                    relevance_score=1.0,
                    content_preview="Authoritative Project Constitution rules and conventions.",
                )
            ]

        system_prompt = f"""You are {ai.name}, the {ai.role} for project '{project.name}'.
Your core responsibilities:
1. Ground answers strictly and accurately in the Project Constitution and active Decisions provided below.
2. If asked about languages, frameworks, databases, tech stack, architecture style, coding rules, git workflow, API conventions, UI rules, or restrictions, ANSWER USING THE EXACT VALUES defined in the Project Constitution.
3. Be concise, direct, helpful, and actionable.

{project_context_formatted}"""

        # 2. Load recent conversational context
        try:
            history_cursor = (
                db[cls.COLLECTION_NAME]
                .find({"project_id": project.project_id})
                .sort("created_at", -1)
                .limit(4)
            )
            history_docs = await history_cursor.to_list(length=4)
            history_docs.reverse()
        except Exception:
            history_docs = []

        messages = [{"role": "system", "content": system_prompt}]
        for doc in history_docs:
            messages.append({"role": doc.get("role", "user"), "content": doc.get("content", "")})
        messages.append({"role": "user", "content": user_message})

        # 3. Generate response with low-latency LLM call
        trace.append("Generating response with GPT-4o-mini...")
        llm_started = time.perf_counter()
        assistant_content = ""
        try:
            if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock"):
                openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                completion = await asyncio.wait_for(
                    openai_client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=messages,
                        temperature=0.2,
                        max_tokens=400,
                    ),
                    timeout=5.0,
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
            else:
                assistant_content = f"Hello! I am {ai.name}, your {ai.role}.\n\n"
                if project_context_formatted:
                    assistant_content += f"Here is our project grounding:\n\n{project_context_formatted[:600]}"
                else:
                    assistant_content += f"I am connected to {project.name}. You can ask questions about our stack, decisions, or conventions!"
        except Exception as llm_err:
            print(f"[ChatService LLM Error] {llm_err}")
            metrics.record_llm_call(
                model="gpt-4o-mini",
                operation="project_chat",
                status="error",
                duration_seconds=time.perf_counter() - llm_started,
            )
            if project_context_formatted:
                assistant_content = f"Here is the relevant project context from Constitution and memory for '{user_message}':\n\n{project_context_formatted[:600]}"
            else:
                assistant_content = f"Hello! I am {ai.name}. I received your message: '{user_message}'. Feel free to ask about project architecture, constitution, or repository code!"

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

"""RAG (Retrieval-Augmented Generation) service for Forge.

Uses ProjectContextService to ground answers in Project Constitution, active Decisions,
and Project Memory vector chunks with strict project isolation and source citations.
"""

from datetime import datetime, timezone
from bson import ObjectId

from openai import AsyncOpenAI
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.models.project import ProjectModel
from app.models.chat import ChatMessageModel, SourceCitation
from app.services.project_context_service import ProjectContextService


SYSTEM_PROMPT = """You are Forge AI — an intelligent project knowledge assistant. You answer questions about a software project grounded strictly in the project context below, which includes the Project Constitution, active team Decisions, source code files, and communications.

Rules:
- Answer concisely and accurately using the provided context.
- Prioritize rules in the Project Constitution and active Decisions.
- If the context doesn't contain enough information to answer, say so honestly.
- When referencing specific files or code, mention the file path.
- When referencing decisions, mention what was decided and why.
- Use markdown formatting for code blocks, lists, and emphasis.
- Keep answers focused and practical.

Project Context:
{context}"""


class RAGService:
    """Retrieval-Augmented Generation pipeline consuming unified Project Context."""

    def __init__(self):
        self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.context_service = ProjectContextService()
        self.generation_model = "gpt-4o-mini"

    async def query(
        self,
        project_id: str,
        collection_name: str,
        user_message: str,
        user_id: str,
        db: AsyncIOMotorDatabase,
        interface_type: str = "text",
    ) -> dict:
        """Full RAG pipeline: ProjectContext assembly → generate answer → save history."""
        trace: list[str] = []

        # 1. Fetch project model
        project_doc = await db["projects"].find_one({"project_id": project_id})
        if project_doc:
            project = ProjectModel(**project_doc)
        else:
            project = ProjectModel(
                project_id=project_id,
                name="Project",
                slug=project_id,
                owner_id=user_id,
                qdrant_collection_name=collection_name,
            )

        # 2. Build unified project context
        trace.append("Retrieving Project Constitution, active Decisions, and Memory chunks...")
        context_result = await self.context_service.build_project_context(
            project=project,
            query_text=user_message,
            db=db,
        )
        sources: list[SourceCitation] = context_result.citations
        trace.extend(context_result.trace)
        trace.append(f"Assembled context with {len(sources)} verified source citations")

        # 3. Save user message to chat history
        user_msg = ChatMessageModel(
            message_id=str(ObjectId()),
            project_id=project_id,
            user_id=user_id,
            role="user",
            content=user_message,
            sources=[],
            interface_type=interface_type,
            created_at=datetime.now(timezone.utc),
        )
        await db["chat_history"].insert_one(user_msg.model_dump(by_alias=True))

        # 4. Fetch recent chat history for conversational context (last 6 messages)
        trace.append("Loading recent conversation history...")
        history_cursor = db["chat_history"].find(
            {"project_id": project_id, "user_id": user_id},
            sort=[("created_at", -1)],
            limit=6,
        )
        history_docs = await history_cursor.to_list(length=6)
        history_docs.reverse()

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT.format(context=context_result.formatted_context)},
        ]
        for doc in history_docs:
            messages.append({"role": doc["role"], "content": doc["content"]})

        # 5. Call GPT-4o-mini
        trace.append("Generating grounded answer with gpt-4o-mini...")
        completion = await self.openai.chat.completions.create(
            model=self.generation_model,
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
        )
        assistant_content = completion.choices[0].message.content or "I processed your request."
        trace.append("Answer generated and cited")

        # 6. Save assistant response to chat history
        assistant_msg = ChatMessageModel(
            message_id=str(ObjectId()),
            project_id=project_id,
            user_id=user_id,
            role="assistant",
            content=assistant_content,
            sources=sources,
            interface_type=interface_type,
            created_at=datetime.now(timezone.utc),
        )
        await db["chat_history"].insert_one(assistant_msg.model_dump(by_alias=True))

        return {
            "message_id": assistant_msg.message_id,
            "content": assistant_content,
            "sources": [s.model_dump() for s in sources],
            "created_at": assistant_msg.created_at,
            "trace": trace,
        }

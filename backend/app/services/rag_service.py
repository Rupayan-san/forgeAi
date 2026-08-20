"""RAG (Retrieval-Augmented Generation) service for Forge.

Uses text-embedding-3-small for query embedding and gpt-4o-mini for generation.
Keeps costs minimal while delivering grounded, citation-backed answers.
"""

from datetime import datetime, timezone
from bson import ObjectId

from openai import AsyncOpenAI
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_qdrant
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.models.chat import ChatMessageModel, SourceCitation


SYSTEM_PROMPT = """You are Forge AI — a project knowledge assistant. You answer questions about a software project based ONLY on the retrieved context below. The context includes source code files, Discord conversations, and other project artifacts.

Rules:
- Answer concisely and accurately using ONLY the provided context.
- If the context doesn't contain enough information to answer, say so honestly.
- When referencing specific files or code, mention the file path.
- When referencing Discord messages, mention who said it and in which channel.
- Use markdown formatting for code blocks, lists, and emphasis.
- Keep answers focused and practical.

Retrieved Context:
{context}"""


class RAGService:
    """Retrieval-Augmented Generation pipeline."""

    def __init__(self):
        self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.embedding_service = EmbeddingService()
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
        """Full RAG pipeline: embed query → search Qdrant → generate answer → save history."""

        # 1. Embed the user's question
        query_vector = await self.embedding_service.generate_single_embedding(user_message)

        # 2. Search Qdrant for relevant chunks
        qdrant = get_qdrant()
        qdrant_service = QdrantService(qdrant)
        results = await qdrant_service.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=8,
        )

        # 3. Build context string and source citations
        context_parts = []
        sources = []
        seen_sources = set()

        for hit in results:
            payload = hit["payload"]
            content = payload.get("content", "")
            source_type = payload.get("source_type", "unknown")
            source_id = payload.get("source_id", "")
            score = hit["score"]

            # Build readable context label
            if source_type == "github_file":
                file_path = payload.get("file_path", source_id)
                label = f"[File: {file_path}]"
            elif source_type == "discord_message":
                author = payload.get("author", "unknown")
                channel = payload.get("channel", "unknown")
                label = f"[Discord - #{channel} by {author}]"
            else:
                label = f"[{source_type}: {source_id}]"

            context_parts.append(f"{label}\n{content}")

            # Deduplicate sources
            source_key = f"{source_type}:{source_id}"
            if source_key not in seen_sources:
                seen_sources.add(source_key)
                sources.append(SourceCitation(
                    source_type=source_type,
                    source_id=source_id,
                    source_url=payload.get("url", ""),
                    relevance_score=round(score, 4),
                    content_preview=content[:120],
                ))

        context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant context found."

        # 4. Save user message to chat history
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

        # 5. Fetch recent chat history for conversational context (last 6 messages)
        history_cursor = db["chat_history"].find(
            {"project_id": project_id, "user_id": user_id},
            sort=[("created_at", -1)],
            limit=6,
        )
        history_docs = await history_cursor.to_list(length=6)
        history_docs.reverse()

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
        ]
        for doc in history_docs:
            messages.append({"role": doc["role"], "content": doc["content"]})

        # 6. Call GPT-4o-mini
        completion = await self.openai.chat.completions.create(
            model=self.generation_model,
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
        )
        assistant_content = completion.choices[0].message.content

        # 7. Save assistant response to chat history
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
        }

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


SYSTEM_PROMPT = """You are Forge AI — an intelligent, context-aware project memory and team collaboration assistant.

You answer questions about the software project using the retrieved project context provided below. The context may contain:
- Git commits, Pull Requests, Issues, and Repo details
- Source code files, functions, and architecture
- Recorded team decisions and rationale
- Team group chat and Discord conversations
- Project workspace configuration and members

Guidelines:
- Ground your answers directly in the provided context whenever relevant. Mention specific file paths, commit SHAs, PR numbers, or member names when citing sources.
- Synthesize information across multiple sources (e.g. code + chat + decisions + commits) when answering.
- If the exact specific record requested is not in the context, clearly explain what IS known about the project from the codebase, decisions, and chat, and give a helpful and constructive response.
- Use markdown formatting with code blocks, bullet points, and bold text. Keep answers practical, structured, and easy to read.

Project Context:
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
        """Full RAG pipeline: embed query → search Qdrant → fetch DB records → generate answer → save history."""

        trace: list[str] = []

        # 1. Embed the user's question
        trace.append("Embedding question with text-embedding-3-small...")
        query_vector = await self.embedding_service.generate_single_embedding(user_message)

        # 2. Search Qdrant for relevant chunks
        trace.append(f"Searching vector memory in '{collection_name}'...")
        qdrant = get_qdrant()
        qdrant_service = QdrantService(qdrant)
        results = await qdrant_service.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=12,
        )
        trace.append(f"Retrieved {len(results)} matching chunks")

        # 3. Build context string and source citations from Qdrant hits
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
                label = f"[Source File: {file_path}]"
            elif source_type == "commit":
                label = f"[Git Commit: {source_id}]"
            elif source_type == "pr":
                label = f"[Pull Request: {source_id}]"
            elif source_type == "issue":
                label = f"[GitHub Issue: {source_id}]"
            elif source_type == "discord_message":
                author = payload.get("author", "unknown")
                channel = payload.get("channel", "unknown")
                label = f"[Discord - #{channel} by @{author}]"
            elif source_type == "file_summary":
                label = f"[File Summary: {source_id}]"
            elif source_type == "readme":
                label = f"[Repository Overview]"
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

        # 4. Inject project overview and metadata
        project_doc = await db["projects"].find_one({"project_id": project_id})
        if project_doc:
            proj_name = project_doc.get("name", "Project")
            proj_desc = project_doc.get("description", "")
            proj_repo = project_doc.get("github_repo_name", "")
            meta_str = f"[Project Overview]\nProject: {proj_name}\nDescription: {proj_desc}\nGitHub Repository: {proj_repo}"
            context_parts.insert(0, meta_str)

        # 5. Inject recorded architectural decisions
        decisions_cursor = db["decisions"].find({"project_id": project_id}).sort("timestamp", -1).limit(6)
        decisions = await decisions_cursor.to_list(length=6)
        if decisions:
            dec_texts = []
            for d in decisions:
                dec_texts.append(f"• Decision: {d.get('decision_text')} (Reason: {d.get('reasoning')})")
            context_parts.append(f"[Recent Project Decisions]\n" + "\n".join(dec_texts))

        # 6. Inject recent team group chat messages
        chat_cursor = db["group_chat_history"].find({"project_id": project_id}).sort("created_at", -1).limit(6)
        recent_chats = await chat_cursor.to_list(length=6)
        if recent_chats:
            recent_chats.reverse()
            chat_texts = [f"@{c.get('user_name', 'Member')}: {c.get('content')}" for c in recent_chats]
            context_parts.append(f"[Recent Team Chat]\n" + "\n".join(chat_texts))

        context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant context found."

        # Trace info
        distinct_types = sorted({s.source_type for s in sources})
        if distinct_types:
            trace.append(f"Deduped to {len(sources)} unique sources across: {', '.join(distinct_types)}")
        else:
            trace.append("Project metadata and memory loaded")

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
        trace.append("Loading recent conversation history...")
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
        trace.append("Generating grounded answer with gpt-4o-mini...")
        completion = await self.openai.chat.completions.create(
            model=self.generation_model,
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
        )
        assistant_content = completion.choices[0].message.content
        trace.append("Answer generated and cited")

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
            "trace": trace,
        }

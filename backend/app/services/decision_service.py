"""Decision extraction service using gpt-4o-mini."""

import json
from datetime import datetime, timezone
from bson import ObjectId

from openai import AsyncOpenAI
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_qdrant
from app.services.qdrant_service import QdrantService
from app.models.decision import DecisionModel


EXTRACTION_PROMPT = """Analyze the following project context (code files and Discord conversations) and extract any architectural or product decisions that the team has made.

For each decision found, provide:
- decision_text: A clear, concise statement of what was decided
- reasoning: Why this decision was made (if mentioned)
- alternatives_considered: List of alternatives that were discussed (if any)
- participants: List of people involved in the decision (usernames/names)
- source_type: "github_file" or "discord_message"
- source_id: The file path or message identifier
- confidence_score: How confident you are this is a real decision (0.0-1.0)

Return a JSON array of decisions. If no decisions are found, return an empty array [].
Only extract REAL decisions — things like choosing a framework, database, architecture pattern, API design, etc.
Do NOT invent decisions that aren't in the context.

Context:
{context}

Respond with ONLY valid JSON array, no markdown formatting."""


class DecisionService:
    def __init__(self):
        self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"

    async def extract_decisions(
        self,
        project_id: str,
        collection_name: str,
        db: AsyncIOMotorDatabase,
    ) -> list[dict]:
        """Extract decisions from the project's knowledge base."""

        # 1. Fetch chunks from Qdrant using scroll
        qdrant = get_qdrant()
        
        # Use scroll to get points from the collection
        points, _ = await qdrant.scroll(
            collection_name=collection_name,
            limit=30,
            with_payload=True,
            with_vectors=False,
        )

        if not points:
            return []

        # 2. Build context from chunks
        context_parts = []
        for point in points:
            payload = point.payload
            source_type = payload.get("source_type", "unknown")
            content = payload.get("content", "")
            
            if source_type == "github_file":
                label = f"[File: {payload.get('file_path', '')}]"
            elif source_type == "discord_message":
                author = payload.get("author", "unknown")
                channel = payload.get("channel", "unknown")
                label = f"[Discord #{channel} by {author}]"
            else:
                label = f"[{source_type}]"
            
            context_parts.append(f"{label}\n{content}")

        context = "\n\n---\n\n".join(context_parts)

        # 3. Call gpt-4o-mini to extract decisions
        try:
            completion = await self.openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a technical analyst that extracts architectural and product decisions from project artifacts. Always respond with valid JSON."},
                    {"role": "user", "content": EXTRACTION_PROMPT.format(context=context)},
                ],
                temperature=0.2,
                max_tokens=2048,
            )
            
            raw_response = completion.choices[0].message.content.strip()
            # Clean potential markdown wrapping
            if raw_response.startswith("```"):
                raw_response = raw_response.split("\n", 1)[1]
                raw_response = raw_response.rsplit("```", 1)[0]
            
            decisions_data = json.loads(raw_response)
        except (json.JSONDecodeError, Exception) as e:
            print(f"Failed to parse decisions: {e}")
            return []

        # 4. Save decisions to MongoDB
        saved_decisions = []
        for d in decisions_data:
            decision = DecisionModel(
                decision_id=str(ObjectId()),
                project_id=project_id,
                decision_text=d.get("decision_text", ""),
                reasoning=d.get("reasoning", ""),
                alternatives_considered=d.get("alternatives_considered", []),
                participants=d.get("participants", []),
                source_type=d.get("source_type", "unknown"),
                source_id=d.get("source_id", ""),
                source_url=d.get("source_url", ""),
                timestamp=datetime.now(timezone.utc),
                extracted_at=datetime.now(timezone.utc),
                confidence_score=d.get("confidence_score", 0.5),
            )
            await db["decisions"].insert_one(decision.model_dump(by_alias=True))
            saved_decisions.append(decision)

        return [d.model_dump() for d in saved_decisions]

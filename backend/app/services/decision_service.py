import json
import math
from datetime import datetime, timezone
from bson import ObjectId

from openai import AsyncOpenAI
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_qdrant
from app.services.qdrant_service import QdrantService
from app.services.embedding_service import EmbeddingService
from app.models.decision import DecisionModel, DecisionConflictModel


EXTRACTION_PROMPT = """Analyze the following project context (code files, commit logs, pull requests, and Discord conversations) and extract any architectural, design, or product decisions that the team has made.

For each decision found, provide:
- decision_text: A clear, concise statement of what was decided
- reasoning: Why this decision was made (if mentioned)
- alternatives_considered: List of alternatives that were discussed (if any)
- participants: List of people involved in the decision (usernames/names)
- source_type: "pr", "commit", "discord_message", or "github_file"
- source_id: The file path, PR number, commit SHA, or channel name
- source_url: The web URL of the source if provided in the context
- confidence_score: How confident you are this is a real decision (0.0-1.0)

Return a JSON array of decisions. If no decisions are found, return an empty array [].
Only extract REAL decisions — things like choosing a framework, database, architecture pattern, API design, dependency, UI library, etc.
Do NOT invent decisions that aren't in the context.

Context:
{context}

Respond with ONLY valid JSON array, no markdown formatting."""


class DecisionService:
    def __init__(self):
        self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"
        self.embedding_service = EmbeddingService()

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
            limit=100,
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
            url = payload.get("url", "")
            
            if source_type == "github_file":
                label = f"[File: {payload.get('file_path', '')}] (URL: {url})"
            elif source_type in ("commit", "git_commit"):
                author = payload.get("author", "unknown")
                sha = payload.get("commit_sha", "")[:7]
                label = f"[Commit {sha} by {author}] (URL: {url})"
            elif source_type in ("pr", "pull_request", "github_pr"):
                pr_num = payload.get("pr_number", payload.get("source_id", ""))
                title = payload.get("title", "")
                label = f"[PR #{pr_num}: {title}] (URL: {url})"
            elif source_type in ("discord_message", "discord", "discord_thread"):
                author = payload.get("author", "unknown")
                channel = payload.get("channel", "general")
                label = f"[Discord #{channel} by {author}] (URL: {url})"
            elif source_type in ("chat", "group_chat"):
                author = payload.get("sender_name", "team")
                label = f"[Team Chat by {author}]"
            elif source_type == "file_summary":
                label = f"[File Summary: {payload.get('file_path', '')}]"
            else:
                label = f"[{source_type}] (URL: {url})"
            
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

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        """Plain-python cosine similarity — no extra dependency needed."""
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(y * y for y in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    async def detect_conflicts(
        self,
        project_id: str,
        db: AsyncIOMotorDatabase,
        similarity_threshold: float = 0.80,
    ) -> list[dict]:
        """Find decisions that likely conflict or supersede each other.

        Step 1 (cheap): embed all decision_texts, compare pairwise with cosine
        similarity. Only pairs above `similarity_threshold` are "candidates" —
        this avoids an O(n^2) LLM call over every decision pair.
        Step 2 (expensive, only for candidates): ask gpt-4o-mini to classify
        the relationship between the two decisions.
        """
        cursor = db["decisions"].find({"project_id": project_id}).sort("timestamp", 1)
        decisions = await cursor.to_list(length=500)

        if len(decisions) < 2:
            return []

        # Clear old conflict records for this project before recomputing
        await db["decision_conflicts"].delete_many({"project_id": project_id})

        texts = [d["decision_text"] for d in decisions]
        embeddings = await self.embedding_service.generate_embeddings(texts)

        # Step 1: cheap pairwise similarity pre-filter (no API calls)
        candidate_pairs = []
        for i in range(len(decisions)):
            for j in range(i + 1, len(decisions)):
                sim = self._cosine_similarity(embeddings[i], embeddings[j])
                if sim >= similarity_threshold:
                    candidate_pairs.append((i, j, sim))

        if not candidate_pairs:
            return []

        # Step 2: expensive LLM call only for the filtered candidates
        saved_conflicts = []
        for i, j, sim in candidate_pairs:
            dec_a, dec_b = decisions[i], decisions[j]
            prompt = f"""Decision A (made {dec_a.get('timestamp')}): {dec_a['decision_text']}
Reasoning A: {dec_a.get('reasoning', 'N/A')}

Decision B (made {dec_b.get('timestamp')}): {dec_b['decision_text']}
Reasoning B: {dec_b.get('reasoning', 'N/A')}

Do these two decisions conflict, does one supersede the other, or are they unrelated?
Respond with ONLY valid JSON: {{"relationship": "conflict"|"supersedes"|"unrelated", "explanation": "one sentence why"}}"""

            try:
                completion = await self.openai.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a technical analyst comparing project decisions for contradictions. Always respond with valid JSON only."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.1,
                    max_tokens=200,
                )
                raw = completion.choices[0].message.content.strip()
                if raw.startswith("```"):
                    raw = raw.split("\n", 1)[1]
                    raw = raw.rsplit("```", 1)[0]
                result = json.loads(raw)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Conflict check failed for pair ({i},{j}): {e}")
                continue

            relationship = result.get("relationship", "unrelated")
            if relationship == "unrelated":
                continue  # don't store noise, only real relationships

            conflict = DecisionConflictModel(
                project_id=project_id,
                decision_id_a=dec_a["decision_id"],
                decision_id_b=dec_b["decision_id"],
                relationship=relationship,
                explanation=result.get("explanation", ""),
            )
            await db["decision_conflicts"].insert_one(conflict.model_dump(by_alias=True))
            saved_conflicts.append(conflict.model_dump())

        return saved_conflicts


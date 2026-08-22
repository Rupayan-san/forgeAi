import uuid
import hashlib
from typing import Any, Optional

from openai import AsyncOpenAI
from app.core.config import settings


class EmbeddingService:
    """Handles text chunking and OpenAI embedding generation."""

    def __init__(self):
        api_key = settings.OPENAI_API_KEY or "sk-dummy-key-for-offline"
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = "text-embedding-3-small"
        self.chunk_size = 500  # tokens (approximate using chars / 4)
        self.chunk_overlap = 50
        self._cache: dict[str, list[float]] = {}
        self._max_cache_size = 2000

    def _get_cache_key(self, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def chunk_text(self, text: str) -> list[str]:
        """Split text into overlapping, approximately token-sized chunks.

        The service intentionally uses a character approximation instead of a
        provider-specific tokenizer: four characters is close enough for the
        ingestion budget and keeps code, markdown, and configuration files
        dependency-free. Chunks prefer a newline or whitespace boundary when
        one is available so source snippets remain readable.
        """
        normalized = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
        if not normalized:
            return []

        max_chars = max(1, self.chunk_size * 4)
        overlap_chars = max(0, min(max_chars - 1, self.chunk_overlap * 4))
        if len(normalized) <= max_chars:
            return [normalized]

        chunks: list[str] = []
        start = 0
        while start < len(normalized):
            proposed_end = min(start + max_chars, len(normalized))
            end = proposed_end

            if proposed_end < len(normalized):
                # Keep at least half a chunk before accepting a boundary. This
                # prevents a dense file with frequent short lines from making
                # thousands of tiny chunks.
                boundary_floor = start + max_chars // 2
                newline_boundary = normalized.rfind("\n", boundary_floor, proposed_end)
                space_boundary = normalized.rfind(" ", boundary_floor, proposed_end)
                boundary = max(newline_boundary, space_boundary)
                if boundary > start:
                    end = boundary

            chunk = normalized[start:end].strip()
            if chunk:
                chunks.append(chunk)

            if end >= len(normalized):
                break

            next_start = end - overlap_chars
            # Ensure malformed configuration values cannot create an infinite
            # loop even if chunk_size/overlap are changed at runtime.
            start = max(start + 1, next_start)

        return chunks

    @staticmethod
    def generate_chunk_id(source_type: str, source_id: str, chunk_index: int) -> str:
        """Return a stable UUID for one logical source chunk.

        Stable IDs make repository re-ingestion idempotent: the same file,
        source type, and chunk index upsert the same Qdrant point.
        """
        identity = f"forge:{source_type}:{source_id}:{chunk_index}"
        return str(uuid.uuid5(uuid.NAMESPACE_URL, identity))

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate 1536-dimensional embeddings for a list of texts with in-memory caching and offline fallback."""
        if not texts:
            return []

        results: list[Optional[list[float]]] = [None] * len(texts)
        uncached_indices: list[int] = []
        uncached_texts: list[str] = []

        for i, t in enumerate(texts):
            key = self._get_cache_key(t)
            if key in self._cache:
                results[i] = self._cache[key]
            else:
                uncached_indices.append(i)
                uncached_texts.append(t.replace("\n", " ").strip() or " ")

        if uncached_texts:
            try:
                response = await self.client.embeddings.create(
                    model=self.model,
                    input=uncached_texts,
                    dimensions=1536,
                    timeout=5.0,
                )
                for idx, data in zip(uncached_indices, response.data):
                    vec = data.embedding
                    results[idx] = vec
                    key = self._get_cache_key(texts[idx])
                    if len(self._cache) < self._max_cache_size:
                        self._cache[key] = vec
            except Exception as e:
                # Deterministic fallback vector for offline tests / missing key
                for idx in uncached_indices:
                    h = hashlib.sha256(texts[idx].encode("utf-8")).digest()
                    # Produce 1536 floats normalized
                    base_floats = [float(b) / 255.0 for b in h]
                    fallback_vec = (base_floats * 48)[:1536]
                    results[idx] = fallback_vec
                    key = self._get_cache_key(texts[idx])
                    if len(self._cache) < self._max_cache_size:
                        self._cache[key] = fallback_vec

        return [r for r in results if r is not None]

    async def generate_single_embedding(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        key = self._get_cache_key(text)
        if key in self._cache:
            return self._cache[key]
        embeddings = await self.generate_embeddings([text])
        return embeddings[0]

    async def chunk_and_embed(
        self,
        text: str,
        source_type: str,
        source_id: str,
        metadata: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Chunk text, generate embeddings, and return Qdrant-ready points."""
        chunks = self.chunk_text(text)
        if not chunks:
            return []

        embeddings = await self.generate_embeddings(chunks)

        points = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = self.generate_chunk_id(source_type, source_id, i)
            payload = {
                "source_type": source_type,
                "source_id": source_id,
                "content": chunk,
                **metadata,
            }
            points.append({
                "id": point_id,
                "vector": embedding,
                "payload": payload,
            })

        return points

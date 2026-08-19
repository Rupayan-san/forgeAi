import uuid
import hashlib
from typing import Any

from openai import AsyncOpenAI
from app.core.config import settings


class EmbeddingService:
    """Handles text chunking and OpenAI embedding generation."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "text-embedding-3-small"
        self.chunk_size = 500  # tokens (approximate using chars / 4)
        self.chunk_overlap = 50

    def chunk_text(self, text: str, max_chars: int = 2000, overlap_chars: int = 200) -> list[str]:
        """Split text into overlapping chunks."""
        if not text or not text.strip():
            return []

        text = text.strip()

        # If text is short enough, return as single chunk
        if len(text) <= max_chars:
            return [text]

        chunks = []
        start = 0
        while start < len(text):
            end = start + max_chars

            # Try to break at a paragraph or sentence boundary
            if end < len(text):
                # Look for paragraph break
                para_break = text.rfind("\n\n", start, end)
                if para_break > start + max_chars // 2:
                    end = para_break + 2
                else:
                    # Look for sentence break
                    sentence_break = text.rfind(". ", start, end)
                    if sentence_break > start + max_chars // 2:
                        end = sentence_break + 2

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            start = end - overlap_chars
            if start >= len(text):
                break

        return chunks

    def generate_chunk_id(self, source_type: str, source_id: str, chunk_index: int) -> str:
        """Generate a deterministic UUID for a chunk (ensures idempotent upserts)."""
        namespace = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # URL namespace
        unique_string = f"{source_type}:{source_id}:{chunk_index}"
        return str(uuid.uuid5(namespace, unique_string))

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate 1536-dimensional embeddings for a list of texts."""
        if not texts:
            return []

        # Sanitize
        sanitized = [t.replace("\n", " ").strip() or " " for t in texts]

        response = await self.client.embeddings.create(
            model=self.model,
            input=sanitized,
            dimensions=1536,
        )
        return [data.embedding for data in response.data]

    async def generate_single_embedding(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
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

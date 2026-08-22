from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    VectorParams,
    Distance,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from app.core.config import settings


class QdrantService:
    """Manages Qdrant vector database operations."""

    def __init__(self, client: AsyncQdrantClient):
        self.client = client

    async def ensure_collection(self, collection_name: str, vector_size: int = 1536) -> None:
        """Create a collection if it doesn't exist."""
        exists = await self.client.collection_exists(collection_name)
        if not exists:
            await self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=Distance.COSINE,
                ),
            )
            print(f"✓ Created Qdrant collection: {collection_name}")

    async def upsert_points(self, collection_name: str, points: list[dict]) -> None:
        """Upsert points into a collection. Points: [{id, vector, payload}]"""
        if not points:
            return

        qdrant_points = [
            PointStruct(
                id=p["id"],
                vector=p["vector"],
                payload=p["payload"],
            )
            for p in points
        ]

        await self.client.upsert(
            collection_name=collection_name,
            points=qdrant_points,
        )

    async def search(
        self,
        collection_name: str,
        query_vector: list[float],
        limit: int = 8,
        source_type_filter: str | None = None,
        project_id_filter: str | None = None,
    ) -> list[dict]:
        """Search for similar vectors with optional filters."""
        conditions = []
        if source_type_filter:
            conditions.append(
                FieldCondition(key="source_type", match=MatchValue(value=source_type_filter))
            )
        if project_id_filter:
            conditions.append(
                FieldCondition(key="project_id", match=MatchValue(value=project_id_filter))
            )

        query_filter = Filter(must=conditions) if conditions else None

        import asyncio
        try:
            results = await asyncio.wait_for(
                self.client.query_points(
                    collection_name=collection_name,
                    query=query_vector,
                    query_filter=query_filter,
                    limit=limit,
                ),
                timeout=0.5,
            )
            return [
                {
                    "id": str(point.id),
                    "score": point.score,
                    "payload": point.payload,
                }
                for point in results.points
            ]
        except Exception:
            return []

    async def delete_collection(self, collection_name: str) -> None:
        """Delete an entire collection."""
        exists = await self.client.collection_exists(collection_name)
        if exists:
            await self.client.delete_collection(collection_name)
            print(f"✓ Deleted Qdrant collection: {collection_name}")

    async def get_collection_info(self, collection_name: str) -> dict | None:
        """Get collection info (point count, etc.)."""
        try:
            info = await self.client.get_collection(collection_name)
            return {
                "name": collection_name,
                "points_count": info.points_count,
                "vectors_count": info.vectors_count,
                "status": info.status.value if info.status else "unknown",
            }
        except Exception:
            return None

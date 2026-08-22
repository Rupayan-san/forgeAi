from datetime import datetime, timezone
from typing import Any, Optional

from qdrant_client.models import Filter, FieldCondition, MatchValue

from app.core.database import get_qdrant
from app.models.memory import MemoryItem
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService


class ProjectMemoryService:
    """Unified service for ingesting, searching, and managing project-scoped memory chunks in vector storage."""

    def __init__(self):
        self.embedding_service = EmbeddingService()

    @staticmethod
    def _get_collection_name(project_id: str, custom_collection: Optional[str] = None) -> str:
        """Get canonical project collection name."""
        return custom_collection or f"project_{project_id}"

    async def index_memory_item(
        self,
        project_id: str,
        source_type: str,
        source_id: str,
        content: str,
        metadata: Optional[dict[str, Any]] = None,
        collection_name: Optional[str] = None,
    ) -> int:
        """Index a piece of project knowledge into vector memory with source metadata."""
        if not content or len(content.strip()) < 5:
            return 0

        target_collection = self._get_collection_name(project_id, collection_name)
        try:
            qdrant = get_qdrant()
            qdrant_service = QdrantService(qdrant)
            await qdrant_service.ensure_collection(target_collection)

            full_meta = (metadata or {}).copy()
            full_meta.update({
                "project_id": project_id,
                "source_type": source_type,
                "source_id": source_id,
                "indexed_at": datetime.now(timezone.utc).isoformat(),
            })

            points = await self.embedding_service.chunk_and_embed(
                text=content,
                source_type=source_type,
                source_id=source_id,
                metadata=full_meta,
            )

            if points:
                await qdrant_service.upsert_points(target_collection, points)
                return len(points)
        except Exception as err:
            print(f"[ProjectMemoryService] Indexing skipped or failed: {err}")
        return 0

    async def search_project_memory(
        self,
        project_id: str,
        query_text: str,
        limit: int = 8,
        source_types: Optional[list[str]] = None,
        collection_name: Optional[str] = None,
    ) -> list[MemoryItem]:
        """Search project memory with strict project isolation and optional source type filtering."""
        target_collection = self._get_collection_name(project_id, collection_name)
        try:
            qdrant = get_qdrant()
            qdrant_service = QdrantService(qdrant)

            await qdrant_service.ensure_collection(target_collection)
            query_vector = await self.embedding_service.generate_single_embedding(query_text)

            qdrant_filter = None
            if source_types:
                conditions = []
                for st in source_types:
                    conditions.append(FieldCondition(key="source_type", match=MatchValue(value=st)))
                qdrant_filter = Filter(should=conditions)

            hits = await qdrant_service.search(
                collection_name=target_collection,
                query_vector=query_vector,
                limit=limit,
                score_threshold=0.3,
                filter_condition=qdrant_filter,
            )

            memory_items: list[MemoryItem] = []
            for hit in hits:
                payload = hit.get("payload", {})
                if payload.get("project_id") and payload.get("project_id") != project_id:
                    continue

                memory_items.append(
                    MemoryItem(
                        memory_id=str(hit.get("id")),
                        project_id=project_id,
                        source_type=payload.get("source_type", "unknown"),
                        source_id=payload.get("source_id", ""),
                        content=payload.get("content", ""),
                        metadata=payload,
                        relevance_score=round(hit.get("score", 0.0), 4),
                    )
                )

            return memory_items
        except Exception as err:
            print(f"[ProjectMemoryService] Vector search bypassed or empty: {err}")
            return []

    async def invalidate_source_memory(
        self,
        project_id: str,
        source_type: str,
        source_id: str,
        collection_name: Optional[str] = None,
    ) -> bool:
        """Invalidate/delete stale memory chunks when a source is updated or removed."""
        target_collection = self._get_collection_name(project_id, collection_name)
        try:
            qdrant = get_qdrant()
            delete_filter = Filter(
                must=[
                    FieldCondition(key="project_id", match=MatchValue(value=project_id)),
                    FieldCondition(key="source_type", match=MatchValue(value=source_type)),
                    FieldCondition(key="source_id", match=MatchValue(value=source_id)),
                ]
            )
            await qdrant.delete(
                collection_name=target_collection,
                points_selector=delete_filter,
            )
            return True
        except Exception as err:
            print(f"[ProjectMemoryService] Invalidation error: {err}")
            return False

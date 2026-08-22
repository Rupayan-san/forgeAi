import asyncio
from typing import Optional

from qdrant_client.models import Filter, FieldCondition, MatchValue

from app.core.database import get_qdrant
from app.models.memory import MemoryItem
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.core.retrieval_config import RetrievalConfig, retrieval_config


class DenseRetriever:
    """Performs semantic vector search over project memory in Qdrant with multi-query support."""

    def __init__(self, config: Optional[RetrievalConfig] = None):
        self.config = config or retrieval_config
        self.embedding_service = EmbeddingService()

    async def retrieve(
        self,
        project_id: str,
        collection_name: str,
        queries: list[str],
        source_types: Optional[list[str]] = None,
        top_k: Optional[int] = None,
    ) -> list[MemoryItem]:
        """Execute parallel semantic searches across query variants with strict project isolation."""
        limit = top_k or self.config.dense_top_k
        if not queries:
            return []

        try:
            qdrant = get_qdrant()
            qdrant_service = QdrantService(qdrant)
            try:
                await asyncio.wait_for(qdrant_service.ensure_collection(collection_name), timeout=1.0)
            except Exception:
                return []

            # Build Qdrant filter
            must_conditions = [
                FieldCondition(key="project_id", match=MatchValue(value=project_id))
            ]
            should_conditions = []
            if source_types:
                for st in source_types:
                    should_conditions.append(FieldCondition(key="source_type", match=MatchValue(value=st)))

            qdrant_filter = Filter(
                must=must_conditions,
                should=should_conditions if should_conditions else None,
            )

            # Parallel embeddings generation & vector searches
            # Determine the single source_type_filter to pass (if exactly one)
            single_source_filter = source_types[0] if source_types and len(source_types) == 1 else None

            async def search_single_query(q_text: str) -> list[dict]:
                try:
                    q_vector = await self.embedding_service.generate_single_embedding(q_text)
                    return await qdrant_service.search(
                        collection_name=collection_name,
                        query_vector=q_vector,
                        limit=limit,
                        source_type_filter=single_source_filter,
                        project_id_filter=project_id,
                    )
                except Exception as err:
                    print(f"[DenseRetriever] Single query error for '{q_text}': {err}")
                    return []

            search_tasks = [search_single_query(q) for q in queries]
            search_results = await asyncio.gather(*search_tasks, return_exceptions=False)

            # Aggregate and deduplicate candidate points by point ID
            seen_point_ids = set()
            candidate_items: list[MemoryItem] = []

            for hits in search_results:
                for hit in hits:
                    pid = str(hit.get("id"))
                    payload = hit.get("payload", {})
                    # Ensure strict project isolation at payload level
                    if payload.get("project_id") and payload.get("project_id") != project_id:
                        continue

                    if pid not in seen_point_ids:
                        seen_point_ids.add(pid)
                        candidate_items.append(
                            MemoryItem(
                                memory_id=pid,
                                project_id=project_id,
                                source_type=payload.get("source_type", "unknown"),
                                source_id=payload.get("source_id", ""),
                                content=payload.get("content", ""),
                                metadata=payload,
                                relevance_score=round(hit.get("score", 0.0), 4),
                            )
                        )

            # Sort by highest score first
            candidate_items.sort(key=lambda x: x.relevance_score, reverse=True)
            return candidate_items[:limit]

        except Exception as err:
            print(f"[DenseRetriever] Error in dense retrieval: {err}")
            return []

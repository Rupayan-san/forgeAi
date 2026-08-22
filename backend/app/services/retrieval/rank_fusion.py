from typing import Optional
from app.models.memory import MemoryItem
from app.core.retrieval_config import RetrievalConfig, retrieval_config


class RRFusion:
    """Combines diverse ranked candidate lists using Reciprocal Rank Fusion (RRF)."""

    def __init__(self, config: Optional[RetrievalConfig] = None):
        self.config = config or retrieval_config

    def fuse(
        self,
        ranked_lists: list[tuple[list[MemoryItem], float]],  # list of (items, weight)
        top_k: Optional[int] = None,
    ) -> list[MemoryItem]:
        """Perform Reciprocal Rank Fusion across candidate lists.

        Formula: Score(d) = sum_{list} weight * (1 / (k + rank))
        """
        k = self.config.fusion_k
        limit = top_k or (self.config.dense_top_k + self.config.sparse_top_k)

        # Mapping: unique_id -> (MemoryItem, rrf_score)
        item_scores: dict[str, float] = {}
        item_registry: dict[str, MemoryItem] = {}

        for items, weight in ranked_lists:
            for rank, item in enumerate(items, start=1):
                # Unique key across sources
                uid = item.memory_id or f"{item.source_type}:{item.source_id}"

                rrf_contribution = weight * (1.0 / (k + rank))
                item_scores[uid] = item_scores.get(uid, 0.0) + rrf_contribution

                if uid not in item_registry:
                    item_registry[uid] = item

        # Sort by accumulated RRF score
        sorted_uids = sorted(item_scores.keys(), key=lambda x: item_scores[x], reverse=True)

        fused_items: list[MemoryItem] = []
        for uid in sorted_uids[:limit]:
            base_item = item_registry[uid]
            fused_item = base_item.model_copy()
            fused_item.relevance_score = round(item_scores[uid], 6)
            fused_items.append(fused_item)

        return fused_items

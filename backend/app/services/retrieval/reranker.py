from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional

from app.models.memory import MemoryItem
from app.core.retrieval_config import RetrievalConfig, retrieval_config


class BaseReranker(ABC):
    """Abstract interface for reranking candidate documents."""

    @abstractmethod
    async def rerank(
        self,
        query: str,
        candidates: list[MemoryItem],
        exact_terms: list[str],
        is_temporal: bool = False,
        temporal_dir: str = "neutral",
        top_k: Optional[int] = None,
    ) -> list[MemoryItem]:
        pass


class WeightedReranker(BaseReranker):
    """Heuristic weighted reranker; this is not a neural cross-encoder."""

    SOURCE_AUTHORITY_WEIGHTS = {
        "constitution": 1.4,
        "decision": 1.3,
        "meeting": 1.25,
        "github_file": 1.2,
        "file_summary": 1.15,
        "github_commit": 1.0,
        "github_pr": 1.0,
        "discord_message": 0.9,
        "chat_message": 0.9,
        "unknown": 0.8,
    }

    def __init__(self, config: Optional[RetrievalConfig] = None):
        self.config = config or retrieval_config

    async def rerank(
        self,
        query: str,
        candidates: list[MemoryItem],
        exact_terms: list[str],
        is_temporal: bool = False,
        temporal_dir: str = "neutral",
        top_k: Optional[int] = None,
    ) -> list[MemoryItem]:
        """Rerank candidates based on multi-signal relevance scoring."""
        limit = top_k or self.config.rerank_top_k
        if not candidates:
            return []

        try:
            q_terms = set(query.lower().split())
            scored_candidates: list[tuple[MemoryItem, float]] = []

            for item in candidates:
                content_lower = item.content.lower()
                source_id_lower = item.source_id.lower()
                metadata_str = " ".join(str(v).lower() for v in item.metadata.values())
                full_text = f"{source_id_lower} {metadata_str} {content_lower}"

                # 1. Base score from fusion / initial retrieval
                base_score = item.relevance_score

                # 2. Term overlap ratio
                matched_terms = sum(1 for term in q_terms if term in full_text)
                overlap_ratio = matched_terms / max(1, len(q_terms))

                # 3. Exact code symbol matching boost
                exact_boost = 1.0
                for exact in exact_terms:
                    e_low = exact.lower()
                    if e_low in source_id_lower or e_low in str(item.metadata.get("file_path", "")).lower():
                        exact_boost += self.config.exact_match_boost * 1.5
                    elif e_low in content_lower:
                        exact_boost += self.config.exact_match_boost

                # 4. Source authority multiplier
                authority = self.SOURCE_AUTHORITY_WEIGHTS.get(item.source_type, 1.0)

                # 5. Temporal adjustment
                temporal_factor = 1.0
                if is_temporal:
                    doc_date_str = item.metadata.get("date") or item.metadata.get("indexed_at")
                    if doc_date_str:
                        try:
                            doc_dt = datetime.fromisoformat(str(doc_date_str).replace("Z", "+00:00"))
                            if temporal_dir == "recent":
                                temporal_factor = self.config.temporal_boost
                            elif temporal_dir == "historical":
                                temporal_factor = 1.1
                        except Exception:
                            pass

                # Composite score calculation
                final_score = (base_score * 0.4 + overlap_ratio * 0.6) * exact_boost * authority * temporal_factor

                reranked_item = item.model_copy()
                reranked_item.relevance_score = round(final_score, 4)
                scored_candidates.append((reranked_item, final_score))

            scored_candidates.sort(key=lambda x: x[1], reverse=True)
            return [c[0] for c in scored_candidates[:limit]]

        except Exception as e:
            print(f"[Reranker] Fallback to fusion order due to error: {e}")
            return candidates[:limit]

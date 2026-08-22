import hashlib
from typing import Optional
from app.models.memory import MemoryItem
from app.core.retrieval_config import RetrievalConfig, retrieval_config


class DeterministicDeduplicator:
    """Removes exact and near-duplicate chunks based on content hashes and word set similarity."""

    @staticmethod
    def _content_hash(text: str) -> str:
        cleaned = " ".join(text.lower().split())
        return hashlib.md5(cleaned.encode("utf-8")).hexdigest()

    @staticmethod
    def _jaccard_similarity(text1: str, text2: str) -> float:
        w1 = set(text1.lower().split())
        w2 = set(text2.lower().split())
        if not w1 or not w2:
            return 0.0
        intersection = len(w1.intersection(w2))
        union = len(w1.union(w2))
        return intersection / union

    @classmethod
    def deduplicate(cls, items: list[MemoryItem], similarity_threshold: float = 0.85) -> list[MemoryItem]:
        """Filter out duplicates and near-duplicate chunks."""
        seen_hashes = set()
        deduped: list[MemoryItem] = []

        for item in items:
            chash = cls._content_hash(item.content)
            if chash in seen_hashes:
                continue

            # Check near-duplicate Jaccard similarity with already selected items
            is_near_dup = False
            for existing in deduped:
                if existing.source_type == item.source_type and existing.source_id == item.source_id:
                    sim = cls._jaccard_similarity(existing.content, item.content)
                    if sim >= similarity_threshold:
                        is_near_dup = True
                        break

            if not is_near_dup:
                seen_hashes.add(chash)
                deduped.append(item)

        return deduped


class MMRDiversifier:
    """Maximal Marginal Relevance (MMR) for balancing relevance and diversity."""

    def __init__(self, config: Optional[RetrievalConfig] = None):
        self.config = config or retrieval_config

    def diversify(
        self,
        candidates: list[MemoryItem],
        top_k: Optional[int] = None,
        lambda_param: Optional[float] = None,
    ) -> list[MemoryItem]:
        """Select diverse, highly-relevant subset of chunks using MMR."""
        limit = top_k or self.config.final_context_k
        lam = lambda_param if lambda_param is not None else self.config.mmr_lambda

        # First run deterministic deduplication
        deduped = DeterministicDeduplicator.deduplicate(candidates)
        if len(deduped) <= limit:
            return deduped

        # MMR Selection algorithm
        selected: list[MemoryItem] = []
        unselected = list(deduped)

        # 1. Pick top candidate first
        best_first = max(unselected, key=lambda x: x.relevance_score)
        selected.append(best_first)
        unselected.remove(best_first)

        # 2. Iteratively pick candidate maximizing MMR score
        while len(selected) < limit and unselected:
            best_mmr_score = -float("inf")
            best_candidate = None

            for cand in unselected:
                relevance = cand.relevance_score

                # Maximum similarity to already selected items
                max_sim = max(
                    DeterministicDeduplicator._jaccard_similarity(cand.content, s.content)
                    for s in selected
                )

                # MMR score formula
                mmr_score = lam * relevance - (1.0 - lam) * max_sim
                if mmr_score > best_mmr_score:
                    best_mmr_score = mmr_score
                    best_candidate = cand

            if best_candidate:
                selected.append(best_candidate)
                unselected.remove(best_candidate)
            else:
                break

        return selected

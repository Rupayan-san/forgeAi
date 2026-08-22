from pydantic import BaseModel, Field


class RetrievalConfig(BaseModel):
    """Centralized, configurable parameters for Forge Advanced RAG."""

    # Candidate Retrieval Limits
    dense_top_k: int = Field(default=15, description="Number of dense vector candidates to retrieve")
    sparse_top_k: int = Field(default=15, description="Number of sparse / BM25 candidates to retrieve")
    structured_limit: int = Field(default=5, description="Number of structured records (decisions/constitution) to retrieve")

    # Multi-Query Expansion
    max_query_expansions: int = Field(default=3, description="Maximum number of query expansion variants")
    enable_query_expansion: bool = Field(default=True, description="Whether to expand queries selectively")

    # Fusion (RRF)
    fusion_k: int = Field(default=60, description="RRF constant k (standard value 60)")
    dense_weight: float = Field(default=1.0, description="Weight multiplier for dense retrieval ranks")
    sparse_weight: float = Field(default=1.0, description="Weight multiplier for sparse retrieval ranks")

    # Reranking
    rerank_top_k: int = Field(default=10, description="Number of candidates to rerank from the fusion pool")
    exact_match_boost: float = Field(default=1.5, description="Boost multiplier for exact code symbol / keyword matches")
    temporal_boost: float = Field(default=1.2, description="Boost multiplier for recent / latest records when query is temporal")

    # Diversity (MMR)
    mmr_lambda: float = Field(default=0.7, description="MMR balance parameter (1.0 = pure relevance, 0.0 = pure diversity)")
    final_context_k: int = Field(default=8, description="Maximum final memory chunks to include in context")

    # Context Budgeting & Confidence
    max_context_tokens: int = Field(default=4000, description="Maximum token budget for total assembled context")
    min_relevance_threshold: float = Field(default=0.15, description="Minimum relevance score threshold before flagging low confidence")
    enable_parent_expansion: bool = Field(default=True, description="Whether to expand code / conversation context")


# Default global instance
retrieval_config = RetrievalConfig()

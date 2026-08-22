import asyncio
import time
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.project import ProjectModel
from app.models.memory import ProjectContextResult
from app.core.retrieval_config import RetrievalConfig, retrieval_config
from app.services.retrieval.query_planner import QueryPlanner, RetrievalPlan
from app.services.retrieval.dense_retriever import DenseRetriever
from app.services.retrieval.sparse_retriever import SparseRetriever
from app.services.retrieval.structured_retriever import StructuredRetriever, StructuredRetrievalResult
from app.services.retrieval.rank_fusion import RRFusion
from app.services.retrieval.reranker import WeightedReranker
from app.services.retrieval.diversifier import MMRDiversifier
from app.services.retrieval.context_builder import ContextBuilder
from app.telemetry.metrics import metrics
from app.telemetry.tracing import trace_span


class AdvancedRetrievalService:
    """End-to-end Advanced RAG & Retrieval Optimization engine for Forge."""

    def __init__(self, config: Optional[RetrievalConfig] = None):
        self.config = config or retrieval_config
        self.planner = QueryPlanner(self.config)
        self.dense_retriever = DenseRetriever(self.config)
        self.sparse_retriever = SparseRetriever(self.config)
        self.structured_retriever = StructuredRetriever(self.config)
        self.fusion = RRFusion(self.config)
        self.reranker = WeightedReranker(self.config)
        self.diversifier = MMRDiversifier(self.config)
        self.context_builder = ContextBuilder(self.config)

    async def retrieve_and_orchestrate(
        self,
        project: ProjectModel,
        query: str,
        db: AsyncIOMotorDatabase,
        custom_top_k: Optional[int] = None,
    ) -> ProjectContextResult:
        """Execute the full retrieval pipeline: Plan → Retrieve → Fuse → Rerank → MMR → Assemble."""
        start_time = time.perf_counter()
        timings_ms: dict[str, float] = {}
        trace: list[str] = []

        # 1. Query Analysis & Planning
        planning_start = time.perf_counter()
        with trace_span("query processing", {"project_id": project.project_id}):
            plan: RetrievalPlan = self.planner.plan(query)
        timings_ms["query_processing"] = (time.perf_counter() - planning_start) * 1000.0
        trace.append(f"Query plan: intent={plan.intent.value}, variants={len(plan.query_variants)}, exact_terms={plan.exact_terms}")

        collection_name = project.qdrant_collection_name or f"forge_{project.project_id}"

        # 2. Parallel Candidate Retrieval (Dense, Sparse, Structured)
        async def fetch_dense():
            if not plan.requires_dense:
                return []
            try:
                return await self.dense_retriever.retrieve(
                    project_id=project.project_id,
                    collection_name=collection_name,
                    queries=plan.query_variants,
                    source_types=plan.target_source_types,
                    top_k=self.config.dense_top_k,
                )
            except Exception as e:
                print(f"[AdvancedRetrieval] Dense retrieval warning: {e}")
                return []

        async def fetch_sparse(dense_candidates=None):
            if not plan.requires_sparse:
                return []
            try:
                return await self.sparse_retriever.retrieve(
                    project_id=project.project_id,
                    collection_name=collection_name,
                    query=plan.normalized_query,
                    exact_terms=plan.exact_terms,
                    candidate_pool=dense_candidates,
                    source_types=plan.target_source_types,
                    top_k=self.config.sparse_top_k,
                )
            except Exception as e:
                print(f"[AdvancedRetrieval] Sparse retrieval warning: {e}")
                return []

        async def fetch_structured():
            if not plan.requires_structured:
                return StructuredRetrievalResult()
            try:
                return await self.structured_retriever.retrieve(
                    project_id=project.project_id,
                    query_text=plan.normalized_query,
                    db=db,
                    limit=self.config.structured_limit,
                )
            except Exception as e:
                print(f"[AdvancedRetrieval] Structured retrieval warning: {e}")
                return StructuredRetrievalResult()

        retrieval_start = time.perf_counter()
        with trace_span("retrieval", {"project_id": project.project_id}):
            dense_res, structured_res = await asyncio.gather(
                fetch_dense(),
                fetch_structured(),
                return_exceptions=False,
            )

            sparse_res = await fetch_sparse(dense_candidates=dense_res)
        timings_ms["retrieval"] = (time.perf_counter() - retrieval_start) * 1000.0

        trace.append(f"Retrieved: {len(dense_res)} dense candidates, {len(sparse_res)} sparse candidates")

        # 3. Reciprocal Rank Fusion (RRF)
        fusion_start = time.perf_counter()
        with trace_span("fusion", {"project_id": project.project_id}):
            ranked_lists = [
                (dense_res, self.config.dense_weight),
                (sparse_res, self.config.sparse_weight),
            ]
            fused_candidates = self.fusion.fuse(
                ranked_lists=ranked_lists,
                top_k=self.config.dense_top_k + self.config.sparse_top_k,
            )
        timings_ms["fusion"] = (time.perf_counter() - fusion_start) * 1000.0
        trace.append(f"Fused {len(fused_candidates)} candidates via RRF (k={self.config.fusion_k})")

        # 4. Reranking
        rerank_start = time.perf_counter()
        with trace_span("reranking", {"project_id": project.project_id}):
            reranked_candidates = await self.reranker.rerank(
                query=plan.normalized_query,
                candidates=fused_candidates,
                exact_terms=plan.exact_terms,
                is_temporal=plan.is_temporal,
                temporal_dir=plan.temporal_direction,
                top_k=self.config.rerank_top_k,
            )
        timings_ms["reranking"] = (time.perf_counter() - rerank_start) * 1000.0
        trace.append(f"Reranked top {len(reranked_candidates)} candidates")

        # 5. Deduplication & MMR Diversification
        final_chunks = self.diversifier.diversify(
            candidates=reranked_candidates,
            top_k=custom_top_k or self.config.final_context_k,
            lambda_param=self.config.mmr_lambda,
        )
        trace.append(f"MMR selected {len(final_chunks)} diverse final chunks (lambda={self.config.mmr_lambda})")

        # 6. Context Assembly & Budgeting
        context_start = time.perf_counter()
        with trace_span("context construction", {"project_id": project.project_id}):
            result = self.context_builder.build_context(
                project=project,
                query=query,
                intent=plan.intent,
                structured_data=structured_res,
                memory_chunks=final_chunks,
                trace=trace,
            )
        timings_ms["context_construction"] = (time.perf_counter() - context_start) * 1000.0

        result.timings_ms = {key: round(value, 3) for key, value in timings_ms.items()}
        result.timings_ms["total_retrieval_pipeline"] = round((time.perf_counter() - start_time) * 1000.0, 3)
        result.retrieved_documents = [
            {
                "memory_id": item.memory_id,
                "project_id": item.project_id,
                "source_type": item.source_type,
                "source_id": item.source_id,
                "content": item.content,
                "metadata": item.metadata,
                "relevance_score": item.relevance_score,
            }
            for item in final_chunks
        ]
        if structured_res.has_constitution:
            result.retrieved_documents.insert(0, {
                "project_id": project.project_id,
                "source_type": "constitution",
                "source_id": f"constitution:{project.project_id}",
                "content": structured_res.constitution_markdown,
                "metadata": {},
                "relevance_score": 1.0,
            })
        result.retrieved_documents.extend(
            {
                "project_id": project.project_id,
                "source_type": "decision",
                "source_id": decision.decision_id,
                "content": decision.decision_text,
                "metadata": {},
                "relevance_score": decision.confidence_score,
            }
            for decision in structured_res.decisions
        )
        result.retrieval_stats = {
            "dense_candidates": len(dense_res),
            "sparse_candidates": len(sparse_res),
            "fused_candidates": len(fused_candidates),
            "reranked_candidates": len(reranked_candidates),
            "final_documents": len(result.retrieved_documents),
        }
        for source_type in {doc["source_type"] for doc in result.retrieved_documents}:
            metrics.record_retrieval(
                source_type=source_type,
                status="success",
                duration_seconds=timings_ms["retrieval"] / 1000.0,
                doc_count=sum(1 for doc in result.retrieved_documents if doc["source_type"] == source_type),
            )

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        result.trace.append(f"Advanced RAG pipeline completed in {elapsed_ms}ms")

        return result

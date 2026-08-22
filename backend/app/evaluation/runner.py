import inspect
import time
from typing import Any, Awaitable, Callable, Optional

from pydantic import BaseModel, Field

from app.core.config import settings
from app.evaluation.dataset import EvaluationDataset, EvaluationExample, get_benchmark_dataset
from app.evaluation.evaluators import RAGEvaluator
from app.services.rag_service import RAGService


RequestFn = Callable[[EvaluationExample], Awaitable[dict[str, Any]] | dict[str, Any]]


class EvaluationItemResult(BaseModel):
    example_id: str
    category: str
    query: str
    status: str = "PASSED"
    error: Optional[str] = None
    correctness_score: float = 0.0
    relevance_score: float = 0.0
    groundedness_score: float = 0.0
    completeness_score: float = 0.0
    source_attribution_score: float = 0.0
    retrieval_precision_at_k: float = 0.0
    retrieval_recall_at_k: float = 0.0
    retrieval_mrr: float = 0.0
    latency_ms: float = 0.0
    latency_breakdown_ms: dict[str, float] = Field(default_factory=dict)
    tokens_actual: Optional[int] = None
    cost_usd: Optional[float] = None


class EvaluationRunReport(BaseModel):
    dataset_name: str
    run_timestamp: float = Field(default_factory=time.time)
    total_examples: int
    passed_examples: int
    not_tested_examples: int = 0
    average_correctness: float = 0.0
    average_relevance: float = 0.0
    average_groundedness: float = 0.0
    average_completeness: float = 0.0
    average_source_attribution: float = 0.0
    average_retrieval_precision_at_k: float = 0.0
    average_retrieval_recall_at_k: float = 0.0
    average_retrieval_mrr: float = 0.0
    p50_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    total_tokens: int = 0
    token_measurement_status: str = "unavailable"
    cost_measurement_status: str = "unavailable"
    langsmith_status: str = "not_requested"
    results: list[EvaluationItemResult] = Field(default_factory=list)
    has_regressions: bool = False
    regression_details: list[str] = Field(default_factory=list)


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = position - lower
    return ordered[lower] + (ordered[upper] - ordered[lower]) * fraction


class EvaluationRunner:
    """Run the real Forge RAG request and score its actual output and retrieval list."""

    def __init__(self, dataset: Optional[EvaluationDataset] = None, request_fn: Optional[RequestFn] = None):
        self.dataset = dataset or get_benchmark_dataset()
        # request_fn is for isolated unit tests. The CLI leaves it unset.
        self.request_fn = request_fn
        self.rag_service = RAGService()

    async def _execute(self, example: EvaluationExample, db: Any, project: Any, user_id: str) -> dict[str, Any]:
        if self.request_fn:
            value = self.request_fn(example)
            return await value if inspect.isawaitable(value) else value
        if db is None or project is None:
            raise ValueError(
                "Real evaluation requires a configured database and project. "
                "Pass --project-id and a valid backend configuration to evaluate.py."
            )
        return await self.rag_service.query(
            project_id=project.project_id,
            collection_name=project.qdrant_collection_name or f"forge_{project.project_id}",
            user_message=example.query,
            user_id=user_id,
            db=db,
            interface_type="evaluation",
        )

    async def _export_langsmith(self, example: EvaluationExample, response: dict[str, Any], result: EvaluationItemResult) -> None:
        if not settings.LANGCHAIN_API_KEY:
            return
        from langsmith import Client

        client = Client(api_key=settings.LANGCHAIN_API_KEY)
        client.create_run(
            name=f"forge-evaluation:{example.example_id}",
            run_type="chain",
            inputs={"query": example.query, "reference_answer": example.reference_answer},
            outputs={
                "answer": response.get("content", ""),
                "retrieved_documents": response.get("retrieved_documents", []),
                "scores": result.model_dump(),
            },
            project_name=settings.LANGCHAIN_PROJECT,
            extra={"dataset_name": self.dataset.dataset_name, "example_id": example.example_id},
        )

    async def run_evaluation(
        self,
        baseline_report: Optional[dict[str, Any]] = None,
        export_langsmith: bool = False,
        db: Any = None,
        project: Any = None,
        user_id: str = "evaluation",
    ) -> EvaluationRunReport:
        item_results: list[EvaluationItemResult] = []
        latencies: list[float] = []
        total_tokens = 0
        tokens_available = True
        costs_available = True
        langsmith_status = "not_requested" if not export_langsmith else "unavailable"

        for example in self.dataset.examples:
            started = time.perf_counter()
            try:
                response = await self._execute(example, db=db, project=project, user_id=user_id)
                latency_ms = (time.perf_counter() - started) * 1000.0
                documents = response.get("retrieved_documents", [])
                retrieval = RAGEvaluator.evaluate_retrieval(
                    documents,
                    expected_source_types=example.expected_sources,
                    expected_source_ids=example.expected_source_ids,
                )
                answer = RAGEvaluator.evaluate_answer(
                    answer_text=response.get("content", ""),
                    retrieved_documents=documents,
                    expected_keywords=example.expected_answer_keywords,
                    reference_answer=example.reference_answer,
                )
                citations = response.get("sources", [])
                citation_types = [
                    citation.get("source_type", "") if isinstance(citation, dict) else getattr(citation, "source_type", "")
                    for citation in citations
                ]
                attribution = RAGEvaluator.evaluate_source_attribution(citation_types, example.expected_sources)
                usage = response.get("usage") or {}
                actual_tokens = usage.get("total_tokens")
                cost = usage.get("cost_usd")
                if actual_tokens is None:
                    tokens_available = False
                else:
                    total_tokens += int(actual_tokens)
                if cost is None:
                    costs_available = False

                item = EvaluationItemResult(
                    example_id=example.example_id,
                    category=example.category,
                    query=example.query,
                    status="PASSED" if answer["groundedness"] >= 0.7 and attribution >= 0.7 else "FAILED",
                    correctness_score=answer["correctness"],
                    relevance_score=answer["relevance"],
                    groundedness_score=answer["groundedness"],
                    completeness_score=answer["completeness"],
                    source_attribution_score=round(attribution, 4),
                    retrieval_precision_at_k=round(retrieval["precision_at_k"], 4),
                    retrieval_recall_at_k=round(retrieval["recall_at_k"], 4),
                    retrieval_mrr=round(retrieval["mrr"], 4),
                    latency_ms=round(latency_ms, 3),
                    latency_breakdown_ms=response.get("timings_ms", {}),
                    tokens_actual=actual_tokens,
                    cost_usd=cost,
                )
                item_results.append(item)
                latencies.append(latency_ms)
                if export_langsmith and settings.LANGCHAIN_API_KEY:
                    try:
                        await self._export_langsmith(example, response, item)
                        langsmith_status = "exported"
                    except Exception as exc:
                        langsmith_status = f"error: {exc}"
            except Exception as exc:
                item_results.append(EvaluationItemResult(
                    example_id=example.example_id,
                    category=example.category,
                    query=example.query,
                    status="NOT_TESTED",
                    error=str(exc),
                    latency_ms=round((time.perf_counter() - started) * 1000.0, 3),
                ))
                tokens_available = False
                costs_available = False

        completed = [item for item in item_results if item.status != "NOT_TESTED"]
        passed_count = sum(1 for item in completed if item.status == "PASSED")

        def average(attribute: str) -> float:
            return round(sum(getattr(item, attribute) for item in completed) / max(1, len(completed)), 4)

        regressions: list[str] = []
        if baseline_report:
            baseline_groundedness = baseline_report.get("average_groundedness", 0.0)
            if average("groundedness_score") < baseline_groundedness - 0.05:
                regressions.append("Average groundedness dropped beyond the configured 0.05 tolerance.")
            elif any(
                item.groundedness_score < baseline_groundedness - 0.05
                or item.relevance_score < baseline_groundedness - 0.05
                for item in completed
            ):
                regressions.append("At least one groundedness/relevance score dropped beyond the configured 0.05 tolerance.")

        return EvaluationRunReport(
            dataset_name=self.dataset.dataset_name,
            total_examples=len(item_results),
            passed_examples=passed_count,
            not_tested_examples=sum(1 for item in item_results if item.status == "NOT_TESTED"),
            average_correctness=average("correctness_score"),
            average_relevance=average("relevance_score"),
            average_groundedness=average("groundedness_score"),
            average_completeness=average("completeness_score"),
            average_source_attribution=average("source_attribution_score"),
            average_retrieval_precision_at_k=average("retrieval_precision_at_k"),
            average_retrieval_recall_at_k=average("retrieval_recall_at_k"),
            average_retrieval_mrr=average("retrieval_mrr"),
            p50_latency_ms=round(_percentile(latencies, 0.50), 3),
            p95_latency_ms=round(_percentile(latencies, 0.95), 3),
            p99_latency_ms=round(_percentile(latencies, 0.99), 3),
            total_tokens=total_tokens,
            token_measurement_status="measured" if tokens_available and completed else "unavailable",
            cost_measurement_status="measured" if costs_available and completed else "unavailable",
            langsmith_status=langsmith_status,
            results=item_results,
            has_regressions=bool(regressions),
            regression_details=regressions,
        )

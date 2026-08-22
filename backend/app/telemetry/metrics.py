import time
from typing import Optional
from prometheus_client import (
    Counter,
    Histogram,
    generate_latest,
    CONTENT_TYPE_LATEST,
    REGISTRY,
)


class ForgeMetrics:
    """Central Prometheus Metrics Registry for Forge System, AI, RAG, Workers, and Meetings."""

    def __init__(self):
        # 1. HTTP Metrics
        self.http_requests_total = Counter(
            "forge_http_requests_total",
            "Total HTTP requests handled by Forge API",
            ["method", "endpoint", "status_code"],
        )
        self.http_request_duration_seconds = Histogram(
            "forge_http_request_duration_seconds",
            "HTTP request latency in seconds",
            ["method", "endpoint"],
            buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
        )

        # 2. AI / LLM Metrics
        self.llm_requests_total = Counter(
            "forge_llm_requests_total",
            "Total LLM generation calls",
            ["model", "operation", "status"],
        )
        self.llm_duration_seconds = Histogram(
            "forge_llm_duration_seconds",
            "LLM call latency in seconds",
            ["model", "operation"],
            buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0),
        )
        self.llm_tokens_total = Counter(
            "forge_llm_tokens_total",
            "Total tokens processed by Forge AI",
            ["model", "token_type"],  # prompt, completion, total
        )

        # 3. RAG & Retrieval Metrics
        self.retrieval_requests_total = Counter(
            "forge_retrieval_requests_total",
            "Total vector and hybrid search queries",
            ["source_type", "status"],
        )
        self.retrieval_duration_seconds = Histogram(
            "forge_retrieval_duration_seconds",
            "Retrieval pipeline latency in seconds",
            ["source_type"],
            buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5),
        )
        self.retrieved_documents_total = Counter(
            "forge_retrieved_documents_total",
            "Total documents/chunks retrieved for project grounding",
            ["source_type"],
        )

        # 4. Background Workers
        self.worker_jobs_total = Counter(
            "forge_worker_jobs_total",
            "Total RQ background jobs processed",
            ["job_type", "status"],
        )
        self.worker_job_duration_seconds = Histogram(
            "forge_worker_job_duration_seconds",
            "Background job execution time in seconds",
            ["job_type"],
            buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0),
        )

        # 5. Voice & Meeting Intelligence
        self.meeting_invocations_total = Counter(
            "forge_meeting_invocations_total",
            "Total voice AI invocations in meetings",
            ["status"],
        )
        self.meeting_voice_latency_seconds = Histogram(
            "forge_meeting_voice_latency_seconds",
            "Voice AI response latency from transcript to speech",
            buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 4.0),
        )

    def record_http_request(self, method: str, endpoint: str, status_code: int, duration_seconds: float):
        try:
            self.http_requests_total.labels(method=method, endpoint=endpoint, status_code=str(status_code)).inc()
            self.http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration_seconds)
        except Exception:
            pass

    def record_llm_call(self, model: str, operation: str, status: str, duration_seconds: float, prompt_tokens: int = 0, completion_tokens: int = 0):
        try:
            self.llm_requests_total.labels(model=model, operation=operation, status=status).inc()
            self.llm_duration_seconds.labels(model=model, operation=operation).observe(duration_seconds)
            if prompt_tokens > 0:
                self.llm_tokens_total.labels(model=model, token_type="prompt").inc(prompt_tokens)
            if completion_tokens > 0:
                self.llm_tokens_total.labels(model=model, token_type="completion").inc(completion_tokens)
            total_tokens = prompt_tokens + completion_tokens
            if total_tokens > 0:
                self.llm_tokens_total.labels(model=model, token_type="total").inc(total_tokens)
        except Exception:
            pass

    def record_retrieval(self, source_type: str, status: str, duration_seconds: float, doc_count: int = 0):
        try:
            self.retrieval_requests_total.labels(source_type=source_type, status=status).inc()
            self.retrieval_duration_seconds.labels(source_type=source_type).observe(duration_seconds)
            if doc_count > 0:
                self.retrieved_documents_total.labels(source_type=source_type).inc(doc_count)
        except Exception:
            pass

    def record_worker_job(self, job_type: str, status: str, duration_seconds: float):
        try:
            self.worker_jobs_total.labels(job_type=job_type, status=status).inc()
            self.worker_job_duration_seconds.labels(job_type=job_type).observe(duration_seconds)
        except Exception:
            pass

    def record_voice_invocation(self, status: str, duration_seconds: float):
        try:
            self.meeting_invocations_total.labels(status=status).inc()
            self.meeting_voice_latency_seconds.observe(duration_seconds)
        except Exception:
            pass


# Global singleton instance
metrics = ForgeMetrics()


def get_prometheus_metrics_payload() -> tuple[bytes, str]:
    """Generate latest Prometheus metrics text and content type."""
    return generate_latest(REGISTRY), CONTENT_TYPE_LATEST

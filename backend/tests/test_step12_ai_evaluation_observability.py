import pytest
from datetime import datetime, timezone
from mongomock_motor import AsyncMongoMockClient

from app.telemetry.correlation import (
    generate_request_id,
    set_correlation_context,
    get_request_id,
    get_project_id,
)
from app.telemetry.logging import redact_sensitive_data, structured_log
from app.telemetry.metrics import metrics, get_prometheus_metrics_payload
from app.telemetry.tracing import trace_span
from app.evaluation.dataset import get_benchmark_dataset
from app.evaluation.evaluators import (
    RAGEvaluator,
    MeetingEvaluator,
    ProjectIntelligenceEvaluator,
)
from app.evaluation.runner import EvaluationRunner


def test_telemetry_request_id_and_correlation():
    """Verify request ID generation and async context variable propagation."""
    req_id = generate_request_id()
    assert req_id.startswith("req_")

    set_correlation_context(request_id=req_id, project_id="proj_123", user_id="user_456")
    assert get_request_id() == req_id
    assert get_project_id() == "proj_123"


def test_structured_logging_and_sanitization():
    """Verify passwords, authorization headers, and API keys are redacted."""
    raw_text = "Bearer ghp_1234567890abcdef and password='SuperSecretPassword123' with token: sk-12345678901234567890"
    sanitized = redact_sensitive_data(raw_text)

    assert "SuperSecretPassword123" not in sanitized
    assert "ghp_1234567890abcdef" not in sanitized
    assert "[REDACTED" in sanitized


def test_prometheus_metrics_recording_and_payload():
    """Verify recording HTTP requests, LLM calls, RAG retrievals, and worker jobs in Prometheus."""
    metrics.record_http_request("GET", "/api/v1/projects", 200, 0.045)
    metrics.record_llm_call("gpt-4o-mini", "chat", "success", 0.42, prompt_tokens=150, completion_tokens=50)
    metrics.record_retrieval("decision", "success", 0.015, doc_count=3)
    metrics.record_worker_job("github_sync", "success", 1.25)
    metrics.record_voice_invocation("success", 0.18)

    payload, content_type = get_prometheus_metrics_payload()
    text = payload.decode("utf-8")

    assert "forge_http_requests_total" in text
    assert "forge_llm_requests_total" in text
    assert "forge_retrieval_requests_total" in text
    assert "forge_worker_jobs_total" in text
    assert "forge_meeting_invocations_total" in text


def test_opentelemetry_tracing_fail_safe():
    """Verify OpenTelemetry trace_span creates spans with zero failure leakage."""
    executed = False
    with trace_span("AI Retrieval Operation", {"source_type": "decision", "query_len": 42}):
        executed = True

    assert executed is True

    # Test error handling inside span
    with pytest.raises(ValueError):
        with trace_span("Failing Operation"):
            raise ValueError("Test error handling")


def test_evaluation_dataset_and_benchmark():
    """Verify standard evaluation dataset loads and covers all required categories."""
    dataset = get_benchmark_dataset()
    assert len(dataset.examples) >= 5

    categories = {e.category for e in dataset.examples}
    assert "rag" in categories
    assert "decisions" in categories
    assert "meetings" in categories
    assert "project_intelligence" in categories


def test_rag_and_meeting_evaluators():
    """Verify RAG, Meeting, and Project Intelligence evaluation scoring algorithms."""
    # RAG Groundedness
    groundedness = RAGEvaluator.evaluate_groundedness_and_keywords(
        answer_text="Forge uses Qdrant for vector storage and fast payload filtering.",
        expected_keywords=["Qdrant", "vector", "payload"],
    )
    assert groundedness == 1.0

    # Source Attribution
    attribution = RAGEvaluator.evaluate_source_attribution(
        retrieved_source_types=["decision", "constitution", "github_file"],
        expected_sources=["decision", "constitution"],
    )
    assert attribution == 1.0

    # Meeting Decision Extraction
    dec_score = MeetingEvaluator.evaluate_decision_extraction(
        extracted_decisions=["We adopted BM25 sparse search alongside Qdrant."],
        ground_truth_keywords=["BM25", "Qdrant"],
    )
    assert dec_score == 1.0

    # Project Intelligence Risk Detection
    risk_score = ProjectIntelligenceEvaluator.evaluate_risk_detection(
        detected_risks=[{"title": "Blocked Action Item: OAuth flow"}],
        expected_risk_types=["blocked"],
    )
    assert risk_score == 1.0


@pytest.mark.asyncio
async def test_evaluation_runner_and_regression_detection():
    """Verify full evaluation run computes percentiles, tokens, and regression comparisons."""
    runner = EvaluationRunner()
    report = await runner.run_evaluation()

    assert report.total_examples > 0
    assert report.passed_examples > 0
    assert report.average_groundedness >= 0.7
    assert report.average_source_attribution >= 0.7
    assert report.p50_latency_ms > 0
    assert report.p95_latency_ms > 0
    assert report.total_tokens > 0
    assert report.has_regressions is False

    # Test regression detection against a high baseline
    baseline_high = {"average_groundedness": 1.0}
    runner_reg = EvaluationRunner()
    # Force low score
    runner_reg.dataset.examples[0].expected_answer_keywords = ["NonExistentImpossibleKeyword12345"]
    report_reg = await runner_reg.run_evaluation(baseline_report=baseline_high)

    assert report_reg.has_regressions is True
    assert len(report_reg.regression_details) > 0


def test_observability_failure_isolation():
    """Verify observability errors never crash main application workflows."""
    # Even with bad inputs, metrics/logging must not crash
    metrics.record_http_request(None, None, 500, -1.0)
    structured_log("INFO", "Safe log call", operation=None, duration_ms=None)
    # Passed without throwing exception
    assert True

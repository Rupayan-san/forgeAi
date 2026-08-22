#!/usr/bin/env python3
"""Measure the real Forge AI request pipeline against representative queries."""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.core.database import get_db
from app.models.project import ProjectModel
from app.evaluation.dataset import get_benchmark_dataset
from app.services.rag_service import RAGService


def percentile(values: list[float], quantile: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    index = (len(values) - 1) * quantile
    low = int(index)
    high = min(low + 1, len(values) - 1)
    return values[low] + (values[high] - values[low]) * (index - low)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark the real Forge AI pipeline")
    parser.add_argument("--project-id", required=True, help="Existing Forge project to query")
    parser.add_argument("--user-id", default="benchmark", help="User ID used for persisted benchmark conversation")
    parser.add_argument("--iterations", type=int, default=1, help="Number of passes over the benchmark dataset")
    parser.add_argument("--output", default="performance_report.json")
    args = parser.parse_args()
    if args.iterations < 1:
        raise SystemExit("--iterations must be at least 1")

    db = get_db()
    project_doc = await db["projects"].find_one({"project_id": args.project_id})
    if not project_doc:
        raise SystemExit(f"Project not found: {args.project_id}. No benchmark request was executed.")
    project = ProjectModel(**project_doc)
    service = RAGService()
    examples = get_benchmark_dataset().examples
    samples: list[dict] = []

    for _ in range(args.iterations):
        for example in examples:
            started = time.perf_counter()
            response = await service.query(
                project_id=project.project_id,
                collection_name=project.qdrant_collection_name or f"forge_{project.project_id}",
                user_message=example.query,
                user_id=args.user_id,
                db=db,
                interface_type="benchmark",
            )
            elapsed_ms = (time.perf_counter() - started) * 1000.0
            samples.append({
                "example_id": example.example_id,
                "latency_ms": round(elapsed_ms, 3),
                "timings_ms": response.get("timings_ms", {}),
                "tokens": response.get("usage", {}).get("total_tokens"),
                "cost_usd": response.get("usage", {}).get("cost_usd"),
                "retrieval_stats": response.get("retrieval_stats", {}),
            })

    def stats(field: str) -> dict[str, float]:
        values = [sample[field] for sample in samples if sample.get(field) is not None]
        return {"p50": round(percentile(values, 0.50), 3), "p95": round(percentile(values, 0.95), 3), "p99": round(percentile(values, 0.99), 3)}

    breakdown = {}
    for key in ("query_processing", "retrieval", "reranking", "context_construction", "llm", "total"):
        values = [sample.get("timings_ms", {}).get(key) for sample in samples if sample.get("timings_ms", {}).get(key) is not None]
        breakdown[key] = {"p50": round(percentile(values, 0.50), 3), "p95": round(percentile(values, 0.95), 3), "p99": round(percentile(values, 0.99), 3)}

    report = {
        "measurement": "real Forge RAGService.query execution",
        "baseline": "No trustworthy baseline available.",
        "project_id": project.project_id,
        "samples": len(samples),
        "total_latency_ms": stats("latency_ms"),
        "breakdown_ms": breakdown,
        "tokens": {"measured_samples": sum(1 for sample in samples if sample["tokens"] is not None), "total": sum(sample["tokens"] or 0 for sample in samples)},
        "cost": {"measured_samples": sum(1 for sample in samples if sample["cost_usd"] is not None)},
        "samples_detail": samples,
    }
    Path(args.output).write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("measurement", "samples", "total_latency_ms", "breakdown_ms", "tokens", "cost")}, indent=2))


if __name__ == "__main__":
    asyncio.run(main())

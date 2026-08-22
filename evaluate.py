#!/usr/bin/env python3
"""
Forge AI - Standalone AI Evaluation & Regression CLI
Runs the benchmark evaluation dataset, verifies retrieval, answers, and sources,
and outputs aggregate precision, recall, groundedness, and latency percentiles.
"""

import os
import sys

# Configure UTF-8 encoding for Windows terminals
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import asyncio
import argparse
import json
from pathlib import Path

# Add backend directory to sys.path
ROOT_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.evaluation.dataset import get_benchmark_dataset
from app.evaluation.runner import EvaluationRunner
from app.core.database import get_db
from app.models.project import ProjectModel


async def main():
    parser = argparse.ArgumentParser(description="Forge AI Evaluation & Observability Benchmark Runner")
    parser.add_argument("--category", type=str, default=None, help="Filter benchmark category (rag, decisions, meetings, project_intelligence)")
    parser.add_argument("--baseline", type=str, default=None, help="Path to baseline JSON report for regression comparison")
    parser.add_argument("--export-langsmith", action="store_true", help="Push evaluation results to LangSmith if configured")
    parser.add_argument("--project-id", required=True, help="Existing Forge project to evaluate against")
    parser.add_argument("--user-id", default="evaluation", help="User ID used for persisted evaluation conversation")
    parser.add_argument("--output", type=str, default="evaluation_report.json", help="Path to save output report JSON")
    args = parser.parse_args()

    print("\n" + "=" * 65)
    print("        Starting Forge AI Evaluation Benchmark Runner")
    print("=" * 65 + "\n")

    dataset = get_benchmark_dataset()
    if args.category:
        dataset.examples = [e for e in dataset.examples if e.category.lower() == args.category.lower()]
        print(f"[*] Filtered dataset to category '{args.category}': {len(dataset.examples)} examples.")

    baseline = None
    if args.baseline and Path(args.baseline).exists():
        with open(args.baseline, "r", encoding="utf-8") as f:
            baseline = json.load(f)
        print(f"[*] Loaded baseline report from: {args.baseline}")

    db = get_db()
    project_doc = await db["projects"].find_one({"project_id": args.project_id})
    if not project_doc:
        raise SystemExit(f"Project not found: {args.project_id}. No evaluation request was executed.")
    runner = EvaluationRunner(dataset=dataset)
    report = await runner.run_evaluation(
        baseline_report=baseline,
        export_langsmith=args.export_langsmith,
        db=db,
        project=ProjectModel(**project_doc),
        user_id=args.user_id,
    )

    print("\n" + "-" * 65)
    print(f" [REPORT] BENCHMARK EVALUATION RESULTS ({report.dataset_name})")
    print("-" * 65)
    print(f" Total Examples:             {report.total_examples}")
    print(f" Passed Examples:            {report.passed_examples} / {report.total_examples}")
    print(f" Not Tested:                 {report.not_tested_examples}")
    print(f" Average Correctness:        {report.average_correctness * 100:.1f}%")
    print(f" Average Relevance:          {report.average_relevance * 100:.1f}%")
    print(f" Average Groundedness:       {report.average_groundedness * 100:.1f}%")
    print(f" Source Attribution Score:   {report.average_source_attribution * 100:.1f}%")
    print(f" Retrieval (P / R / MRR):    {report.average_retrieval_precision_at_k:.3f} / {report.average_retrieval_recall_at_k:.3f} / {report.average_retrieval_mrr:.3f}")
    print(f" Latency (p50/p95/p99):      {report.p50_latency_ms:.1f}ms / {report.p95_latency_ms:.1f}ms / {report.p99_latency_ms:.1f}ms")
    print(f" Tokens:                     {report.total_tokens} ({report.token_measurement_status})")
    print(f" Cost:                       {report.cost_measurement_status}")
    print(f" LangSmith:                  {report.langsmith_status}")
    print(f" Regression Detected:        {'YES' if report.has_regressions else 'NO'}")
    if report.regression_details:
        for r in report.regression_details:
            print(f"   - {r}")
    print("-" * 65 + "\n")

    # Save output report
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(report.model_dump_json(indent=2))
    print(f"[OK] Saved detailed evaluation report to '{args.output}'\n")


if __name__ == "__main__":
    asyncio.run(main())

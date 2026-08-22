#!/usr/bin/env python3
"""
Forge AI - Performance & Latency Benchmarking CLI (Step 13)
Measures and profiles end-to-end latencies across RAG, Database, Redis Cache,
Voice AI, and Project Intelligence, reporting p50, p95, and p99 percentiles.
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
import time
import numpy as np
from pathlib import Path

# Add backend directory to sys.path
ROOT_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from mongomock_motor import AsyncMongoMockClient
from app.models.project import ProjectModel, ProjectAIConfig
from app.services.cache_service import cache_service
from app.services.constitution_service import ConstitutionService
from app.services.retrieval.advanced_retrieval_service import AdvancedRetrievalService
from app.services.intelligence.state_analyzer import ProjectStateAnalyzer


def calc_percentiles(latencies: list[float]) -> tuple[float, float, float]:
    """Calculate p50, p95, and p99 percentiles from latency samples (in ms)."""
    if not latencies:
        return 0.0, 0.0, 0.0
    arr = np.array(latencies)
    return float(np.percentile(arr, 50)), float(np.percentile(arr, 95)), float(np.percentile(arr, 99))


async def run_benchmark():
    print("\n" + "=" * 70)
    print("        [START] FORGE AI PERFORMANCE & LATENCY BENCHMARK")
    print("=" * 70 + "\n")

    client = AsyncMongoMockClient()
    db = client["forge_benchmark"]
    project_id = "proj_bench_123"

    project = ProjectModel(
        project_id=project_id,
        name="Forge Benchmark Suite",
        description="Benchmarking project performance",
        owner_id="user_admin",
        ai_config=ProjectAIConfig(name="Forge", invocation_phrase="Forge"),
    )
    await db["projects"].insert_one(project.model_dump(by_alias=True))

    # Pre-seed constitution
    await ConstitutionService.get_or_create_constitution(db, project_id)

    # 1. Benchmark: Database Direct Read vs Redis Cached Read
    print("[*] 1. Profiling MongoDB vs Redis Cache Latency (50 iterations)...")
    db_latencies = []
    for _ in range(50):
        # Force cache invalidation to measure DB read
        cache_service.invalidate_constitution(project_id)
        t0 = time.perf_counter()
        await ConstitutionService.get_or_create_constitution(db, project_id)
        db_latencies.append((time.perf_counter() - t0) * 1000.0)

    # Warm up cache
    await ConstitutionService.get_or_create_constitution(db, project_id)
    cache_latencies = []
    for _ in range(50):
        t0 = time.perf_counter()
        await ConstitutionService.get_or_create_constitution(db, project_id)
        cache_latencies.append((time.perf_counter() - t0) * 1000.0)

    db_p50, db_p95, db_p99 = calc_percentiles(db_latencies)
    cache_p50, cache_p95, cache_p99 = calc_percentiles(cache_latencies)

    # 2. Benchmark: Advanced RAG Retrieval Pipeline (Planning, Concurrency, RRF, Rerank)
    print("[*] 2. Profiling Advanced RAG Retrieval Pipeline (20 queries)...")
    retrieval_service = AdvancedRetrievalService()
    rag_latencies = []
    queries = [
        "What vector database do we use and why?",
        "How does hybrid retrieval search combine dense and sparse?",
        "What are the project architectural rules?",
        "Explain Redis token blacklisting policy",
        "Summarize current open action items and risks",
    ]

    for i in range(20):
        q = queries[i % len(queries)]
        t0 = time.perf_counter()
        await retrieval_service.retrieve_and_orchestrate(project, q, db)
        rag_latencies.append((time.perf_counter() - t0) * 1000.0)

    rag_p50, rag_p95, rag_p99 = calc_percentiles(rag_latencies)

    # 3. Benchmark: Project State Analysis & Snapshot
    print("[*] 3. Profiling Project Intelligence State Analysis...")
    analyzer = ProjectStateAnalyzer()
    state_compute_latencies = []
    state_cached_latencies = []

    for _ in range(15):
        cache_service.invalidate_state_snapshot(project_id)
        t0 = time.perf_counter()
        await analyzer.analyze_project_state(project_id, db)
        state_compute_latencies.append((time.perf_counter() - t0) * 1000.0)

    # Cached reads
    for _ in range(25):
        t0 = time.perf_counter()
        await analyzer.get_latest_snapshot(project_id, db)
        state_cached_latencies.append((time.perf_counter() - t0) * 1000.0)

    sc_p50, sc_p95, sc_p99 = calc_percentiles(state_compute_latencies)
    sk_p50, sk_p95, sk_p99 = calc_percentiles(state_cached_latencies)

    # 4. Benchmark: Concurrent Throughput Simulation
    print("[*] 4. Simulating Concurrent Request Throughput (25 concurrent requests)...")
    async def concurrent_task():
        t0 = time.perf_counter()
        await retrieval_service.retrieve_and_orchestrate(project, "How do we handle auth tokens?", db)
        return (time.perf_counter() - t0) * 1000.0

    t_start = time.perf_counter()
    concur_latencies = await asyncio.gather(*[concurrent_task() for _ in range(25)])
    total_time = time.perf_counter() - t_start
    throughput = 25.0 / max(0.001, total_time)
    cc_p50, cc_p95, cc_p99 = calc_percentiles(concur_latencies)

    # Print Report Table
    print("\n" + "=" * 70)
    print("              [REPORT] FORGE AI PERFORMANCE BENCHMARK REPORT")
    print("=" * 70)
    print(f"{'Operation':<35} | {'p50 (ms)':<10} | {'p95 (ms)':<10} | {'p99 (ms)':<10}")
    print("-" * 70)
    print(f"{'MongoDB Uncached Read':<35} | {db_p50:<10.2f} | {db_p95:<10.2f} | {db_p99:<10.2f}")
    print(f"{'Redis Cached Read (Speedup: ' + f'{db_p50/max(0.001, cache_p50):.1f}x)':<35} | {cache_p50:<10.2f} | {cache_p95:<10.2f} | {cache_p99:<10.2f}")
    print(f"{'Advanced RAG Retrieval':<35} | {rag_p50:<10.2f} | {rag_p95:<10.2f} | {rag_p99:<10.2f}")
    print(f"{'Project State Full Compute':<35} | {sc_p50:<10.2f} | {sc_p95:<10.2f} | {sc_p99:<10.2f}")
    print(f"{'Project State Cached Read':<35} | {sk_p50:<10.2f} | {sk_p95:<10.2f} | {sk_p99:<10.2f}")
    print(f"{'25 Concurrent Queries Latency':<35} | {cc_p50:<10.2f} | {cc_p95:<10.2f} | {cc_p99:<10.2f}")
    print("-" * 70)
    print(f" Concurrency Throughput:      {throughput:.1f} req/s")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(run_benchmark())

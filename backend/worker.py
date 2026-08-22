import os
import sys
import time
from redis import Redis
from rq import SimpleWorker as Worker, Queue

# Ensure the app directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.telemetry.metrics import metrics


class ForgeWorker(Worker):
    """RQ worker that records the real job lifecycle in Prometheus."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._job_started: dict[str, float] = {}

    def execute_job(self, job, queue):
        self._job_started[job.id] = time.perf_counter()
        return super().execute_job(job, queue)

    def handle_job_success(self, job, queue, started_job_registry):
        started = self._job_started.pop(job.id, time.perf_counter())
        metrics.record_worker_job(getattr(job.func, "__name__", "unknown"), "success", time.perf_counter() - started)
        return super().handle_job_success(job, queue, started_job_registry)

    def handle_job_failure(self, job, queue, started_job_registry=None, exc_string=""):
        started = self._job_started.pop(job.id, time.perf_counter())
        metrics.record_worker_job(getattr(job.func, "__name__", "unknown"), "failure", time.perf_counter() - started)
        return super().handle_job_failure(job, queue, started_job_registry, exc_string)

def start_worker():
    redis_conn = Redis.from_url(settings.REDIS_URL)
    
    # We will listen to the github, discord, and decisions queues
    queues = ["github", "discord", "decisions"]
    
    worker = ForgeWorker(queues, connection=redis_conn)
    print(f"Starting RQ Worker listening on {queues}...")
    worker.work()

if __name__ == "__main__":
    start_worker()

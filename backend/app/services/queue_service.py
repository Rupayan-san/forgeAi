from redis import Redis
from rq import Queue
from rq.job import Job
from app.core.config import settings


redis_conn = Redis.from_url(settings.REDIS_URL)

# Named queues for different worker types
github_queue = Queue("github", connection=redis_conn)
discord_queue = Queue("discord", connection=redis_conn)
decision_queue = Queue("decisions", connection=redis_conn)


def enqueue_github_job(func, *args, **kwargs) -> dict:
    """Enqueue a job for the GitHub ingestion worker."""
    job = github_queue.enqueue(func, *args, **kwargs)
    return {"job_id": job.get_id(), "status": job.get_status()}


def enqueue_discord_job(func, *args, **kwargs) -> dict:
    """Enqueue a job for the Discord ingestion worker."""
    job = discord_queue.enqueue(func, *args, **kwargs)
    return {"job_id": job.get_id(), "status": job.get_status()}


def enqueue_decision_job(func, *args, **kwargs) -> dict:
    """Enqueue a job for the Decision extraction worker."""
    job = decision_queue.enqueue(func, *args, **kwargs)
    return {"job_id": job.get_id(), "status": job.get_status()}


def get_job_status(job_id: str) -> dict:
    """Check the status of an RQ job."""
    try:
        job = Job.fetch(job_id, connection=redis_conn)
        return {
            "job_id": job.id,
            "status": job.get_status(),
            "result": job.result,
            "is_failed": job.is_failed,
            "enqueued_at": job.enqueued_at.isoformat() if job.enqueued_at else None,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "ended_at": job.ended_at.isoformat() if job.ended_at else None,
        }
    except Exception:
        return {"job_id": job_id, "status": "not_found"}

import os
import sys
from redis import Redis
from rq import SimpleWorker as Worker, Queue

# Ensure the app directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

def start_worker():
    redis_conn = Redis.from_url(settings.REDIS_URL)
    
    # We will listen to the github, discord, and decisions queues
    queues = ["github", "discord", "decisions"]
    
    worker = Worker(queues, connection=redis_conn)
    print(f"Starting RQ Worker listening on {queues}...")
    worker.work()

if __name__ == "__main__":
    start_worker()

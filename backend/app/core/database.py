from contextlib import asynccontextmanager
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from qdrant_client import AsyncQdrantClient
from app.core.config import settings


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None
    qdrant: AsyncQdrantClient | None = None


db_instance = Database()


def get_motor_client() -> AsyncIOMotorClient:
    """Create or return tuned Motor async client with connection pooling."""
    return AsyncIOMotorClient(
        settings.MONGODB_URL,
        maxPoolSize=100,
        minPoolSize=10,
        maxIdleTimeMS=45000,
        connectTimeoutMS=5000,
        serverSelectionTimeoutMS=5000,
    )


def get_db() -> AsyncIOMotorDatabase:
    """Get MongoDB database instance with lazy fallback."""
    if db_instance.db is None:
        db_instance.client = get_motor_client()
        db_instance.db = db_instance.client[settings.MONGODB_DB_NAME]
    return db_instance.db


def get_qdrant() -> AsyncQdrantClient:
    """Get Qdrant client instance with lazy fallback."""
    if db_instance.qdrant is None:
        db_instance.qdrant = AsyncQdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
            timeout=1.0,
            check_compatibility=False,
        )
    return db_instance.qdrant


async def init_db_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create essential compound and unique indexes in the background to optimize query latency."""
    try:
        # Users & Projects
        await db["users"].create_index([("user_id", ASCENDING)], unique=True, background=True)
        await db["users"].create_index([("email", ASCENDING)], unique=True, background=True)
        await db["projects"].create_index([("project_id", ASCENDING)], unique=True, background=True)
        await db["projects"].create_index([("owner_id", ASCENDING)], background=True)
        await db["projects"].create_index([("members", ASCENDING)], background=True)

        # Constitution & Decisions
        await db["project_constitutions"].create_index([("project_id", ASCENDING)], unique=True, background=True)
        await db["decisions"].create_index([("project_id", ASCENDING), ("status", ASCENDING)], background=True)
        await db["decisions"].create_index([("project_id", ASCENDING), ("timestamp", DESCENDING)], background=True)

        # Actions & Meetings
        await db["action_items"].create_index([("project_id", ASCENDING), ("status", ASCENDING)], background=True)
        await db["action_items"].create_index([("project_id", ASCENDING), ("due_at", ASCENDING)], background=True)
        await db["action_items"].create_index([("project_id", ASCENDING), ("created_at", DESCENDING)], background=True)
        await db["meetings"].create_index([("project_id", ASCENDING), ("status", ASCENDING)], background=True)
        await db["meetings"].create_index([("project_id", ASCENDING), ("created_at", DESCENDING)], background=True)
        await db["meeting_transcripts"].create_index([("meeting_id", ASCENDING), ("sequence", ASCENDING)], background=True)
        await db["meeting_summaries"].create_index([("meeting_id", ASCENDING)], unique=True, background=True)

        # Chat & Intelligence
        await db["chat_history"].create_index([("project_id", ASCENDING), ("created_at", ASCENDING)], background=True)
        await db["project_state_snapshots"].create_index([("project_id", ASCENDING)], unique=True, background=True)
        await db["semantic_changes"].create_index([("project_id", ASCENDING), ("timestamp", DESCENDING)], background=True)
        await db["project_risks"].create_index([("project_id", ASCENDING), ("status", ASCENDING)], background=True)
        await db["project_timeline_events"].create_index([("project_id", ASCENDING), ("timestamp", DESCENDING)], background=True)

        print("[Database] Optimized compound indexes initialized in background.")
    except Exception as e:
        print(f"[Database] Index initialization note: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan managing database connections and index creation."""
    # Startup
    db_instance.client = get_motor_client()
    db_instance.db = db_instance.client[settings.MONGODB_DB_NAME]
    
    # Verify MongoDB connection
    try:
        await db_instance.client.admin.command("ping")
        print(f"[Database] Connected to MongoDB with pool tuning: {settings.MONGODB_DB_NAME}")
        # Initialize background indexes
        await init_db_indexes(db_instance.db)
    except Exception as e:
        print(f"[Database] MongoDB connection warning: {e}")
    
    # Initialize Qdrant
    db_instance.qdrant = AsyncQdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
        timeout=5.0,
    )
    print(f"[Database] Connected to Qdrant: {settings.QDRANT_URL}")
    
    yield
    
    # Shutdown
    if db_instance.client:
        db_instance.client.close()
        print("[Database] Closed MongoDB connection pool")
    if db_instance.qdrant:
        await db_instance.qdrant.close()
        print("[Database] Closed Qdrant connection")

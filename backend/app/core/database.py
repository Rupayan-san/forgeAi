from contextlib import asynccontextmanager
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from qdrant_client import AsyncQdrantClient
from app.core.config import settings


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None
    qdrant: AsyncQdrantClient | None = None


db_instance = Database()


def get_db() -> AsyncIOMotorDatabase:
    """Get MongoDB database instance."""
    if db_instance.db is None:
        raise RuntimeError("Database not initialized. Ensure lifespan is configured.")
    return db_instance.db


def get_qdrant() -> AsyncQdrantClient:
    """Get Qdrant client instance."""
    if db_instance.qdrant is None:
        raise RuntimeError("Qdrant not initialized. Ensure lifespan is configured.")
    return db_instance.qdrant


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan managing database connections."""
    # Startup
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_instance.db = db_instance.client[settings.MONGODB_DB_NAME]
    
    # Verify MongoDB connection
    try:
        await db_instance.client.admin.command("ping")
        print(f"[Database] Connected to MongoDB: {settings.MONGODB_DB_NAME}")
    except Exception as e:
        print(f"[Database] MongoDB connection failed: {e}")
    
    # Initialize Qdrant
    db_instance.qdrant = AsyncQdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
    )
    print(f"[Database] Connected to Qdrant: {settings.QDRANT_URL}")
    
    yield
    
    # Shutdown
    if db_instance.client:
        db_instance.client.close()
        print("[Database] Closed MongoDB connection")
    if db_instance.qdrant:
        await db_instance.qdrant.close()
        print("[Database] Closed Qdrant connection")

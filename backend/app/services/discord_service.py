import asyncio
from datetime import datetime, timezone
from typing import Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.services.memory_service import ProjectMemoryService
from app.models.project import ProjectModel


class DiscordIngestionService:
    """Service handling Discord Channel configuration, noise filtering, incremental backfills, and disconnects."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self.embedding_service = EmbeddingService()
        self.memory_service = ProjectMemoryService()

    @staticmethod
    def is_noise(content: str) -> bool:
        """Filter out bot commands, emoji-only reactions, system text, and trivial noise."""
        if not content:
            return True
        text = content.strip()
        if len(text) < 8:
            return True
        # Filter commands
        if text.startswith(("!", "/", "?", "$", ".", "-")):
            return True
        # Filter bot/system markers
        lower = text.lower()
        if lower in {"ok", "yes", "no", "cool", "thanks", "ty", "k", "np", "+1", "-1"}:
            return True
        return False

    async def ingest_message(
        self,
        guild_id: str,
        channel_name: str,
        channel_id: str,
        message_id: str,
        author: str,
        content: str,
        timestamp_iso: str,
        db: AsyncIOMotorDatabase,
    ) -> int:
        """Ingest a single verified, non-noise Discord message into project vector memory."""
        if self.is_noise(content):
            return 0

        project_doc = await db["projects"].find_one({"project_id": self.project_id})
        if not project_doc:
            return 0

        project = ProjectModel(**project_doc)

        # Respect channel whitelist if defined
        if project.discord_channels and channel_name not in project.discord_channels and channel_id not in project.discord_channels:
            return 0

        metadata = {
            "project_id": self.project_id,
            "author": author,
            "channel": channel_name,
            "channel_id": channel_id,
            "timestamp": timestamp_iso,
        }

        points = await self.embedding_service.chunk_and_embed(
            text=content,
            source_type="discord_message",
            source_id=message_id,
            metadata=metadata,
        )

        if points:
            from app.core.database import get_qdrant
            qdrant = get_qdrant()
            qdrant_service = QdrantService(qdrant)
            await qdrant_service.ensure_collection(project.qdrant_collection_name)
            await qdrant_service.upsert_points(project.qdrant_collection_name, points)

            # Update MongoDB status
            await db["projects"].update_one(
                {"project_id": self.project_id},
                {
                    "$inc": {"ingestion_status.discord_chunks_count": len(points)},
                    "$set": {
                        "ingestion_status.discord_backfill_complete": True,
                        "ingestion_status.last_discord_sync": datetime.now(timezone.utc).isoformat(),
                        "ingestion_status.last_discord_message_id": message_id,
                        "discord_bot_active": True,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                },
            )
            return len(points)
        return 0

    @classmethod
    async def connect_guild(
        cls, project_id: str, guild_id: str, channels: list[str], db: AsyncIOMotorDatabase
    ) -> bool:
        """Connect Discord server guild and optional channel list to a project."""
        result = await db["projects"].update_one(
            {"project_id": project_id},
            {
                "$set": {
                    "discord_guild_id": guild_id.strip(),
                    "discord_channels": [c.strip() for c in channels if c.strip()],
                    "discord_bot_active": True,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        return result.matched_count > 0

    @classmethod
    async def update_channels(
        cls, project_id: str, channels: list[str], db: AsyncIOMotorDatabase
    ) -> bool:
        """Update monitored Discord channels list for a project."""
        result = await db["projects"].update_one(
            {"project_id": project_id},
            {
                "$set": {
                    "discord_channels": [c.strip() for c in channels if c.strip()],
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        return result.matched_count > 0

    @classmethod
    async def disconnect_guild(cls, project_id: str, db: AsyncIOMotorDatabase) -> bool:
        """Disconnect Discord guild and invalidate stored Discord memory chunks."""
        project_doc = await db["projects"].find_one({"project_id": project_id})
        if not project_doc:
            return False

        project = ProjectModel(**project_doc)
        collection_name = project.qdrant_collection_name

        # Purge Discord vectors
        memory_service = ProjectMemoryService()
        try:
            await memory_service.invalidate_source_memory(
                project_id=project_id,
                source_type="discord_message",
                source_id="*",
                collection_name=collection_name,
            )
        except Exception as e:
            print(f"[Discord Ingestion] Vector purge warning: {e}")

        # Update Project doc
        await db["projects"].update_one(
            {"project_id": project_id},
            {
                "$set": {
                    "discord_guild_id": "",
                    "discord_channels": [],
                    "discord_bot_active": False,
                    "ingestion_status.discord_backfill_complete": False,
                    "ingestion_status.discord_chunks_count": 0,
                    "ingestion_status.last_discord_message_id": None,
                    "ingestion_status.last_discord_error": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        return True

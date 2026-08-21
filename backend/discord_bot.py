import os
import sys
import asyncio
from datetime import datetime, timezone

import discord
from motor.motor_asyncio import AsyncIOMotorClient
from qdrant_client import AsyncQdrantClient

# Ensure the app directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.models.project import ProjectModel

class ForgeDiscordBot(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(intents=intents)
        
        self.embedding_service = EmbeddingService()
        
        # Connect to databases
        self.db_client = AsyncIOMotorClient(settings.MONGODB_URL)
        self.db = self.db_client[settings.MONGODB_DB_NAME]
        
        self.qdrant = AsyncQdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        self.qdrant_service = QdrantService(self.qdrant)

    async def on_ready(self):
        print(f"Logged in as {self.user} (ID: {self.user.id})")
        print("Listening for messages...")

    async def on_message(self, message: discord.Message):
        # Ignore bots (including ourselves)
        if message.author.bot:
            return
            
        # We only care about messages in guilds (servers)
        if not message.guild:
            return
            
        guild_id = str(message.guild.id)
        
        # Find project linked to this discord_guild_id
        project_doc = await self.db["projects"].find_one({"discord_guild_id": guild_id})
        if not project_doc:
            return
            
        project = ProjectModel(**project_doc)
        
        if not message.content.strip():
            return
            
        print(f"Indexed message from {message.author.name} in {message.guild.name}: {message.content[:30]}...")
        
        try:
            metadata = {
                "project_id": project.project_id,
                "author": message.author.name,
                "author_id": str(message.author.id),
                "channel": message.channel.name if hasattr(message.channel, "name") else str(message.channel.id),
                "channel_id": str(message.channel.id),
                "timestamp": message.created_at.isoformat(),
            }
            
            points = await self.embedding_service.chunk_and_embed(
                text=message.content,
                source_type="discord_message",
                source_id=str(message.id),
                metadata=metadata
            )
            
            if points:
                await self.qdrant_service.ensure_collection(project.qdrant_collection_name)
                await self.qdrant_service.upsert_points(project.qdrant_collection_name, points)
                
                # Update chunk count
                await self.db["projects"].update_one(
                    {"project_id": project.project_id},
                    {
                        "$inc": {"ingestion_status.discord_chunks_count": len(points)},
                        "$set": {
                            "ingestion_status.discord_backfill_complete": True,
                            "discord_bot_active": True,
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
        except Exception as e:
            print(f"Error processing Discord message {message.id}: {e}")

if __name__ == "__main__":
    if not settings.DISCORD_BOT_TOKEN:
        print("Error: DISCORD_BOT_TOKEN is not set in your .env file!")
        sys.exit(1)
        
    client = ForgeDiscordBot()
    client.run(settings.DISCORD_BOT_TOKEN)

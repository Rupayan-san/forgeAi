import os
import sys
import asyncio
from datetime import datetime, timezone

import discord
from motor.motor_asyncio import AsyncIOMotorClient
from qdrant_client import AsyncQdrantClient

# Ensure the app directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set UTF-8 encoding on Windows to prevent UnicodeEncodeError with emojis/chat text
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app.core.config import settings
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.models.project import ProjectModel

class ForgeDiscordBot(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.messages = True
        super().__init__(intents=intents)
        
        self.embedding_service = EmbeddingService()
        
        # Connect to databases
        self.db_client = AsyncIOMotorClient(settings.MONGODB_URL)
        self.db = self.db_client[settings.MONGODB_DB_NAME]
        
        self.qdrant = AsyncQdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        self.qdrant_service = QdrantService(self.qdrant)

    async def on_ready(self):
        print("=" * 60, flush=True)
        print(f"🤖 [Discord Bot] Logged in as: {self.user} (ID: {self.user.id})", flush=True)
        guild_list = [f"'{g.name}' (ID: {g.id})" for g in self.guilds]
        print(f"🌐 [Discord Bot] Connected to {len(self.guilds)} server(s): {', '.join(guild_list) if guild_list else 'None'}", flush=True)
        print("🎧 [Discord Bot] Actively listening for team messages...", flush=True)
        print("=" * 60, flush=True)

    async def on_message(self, message: discord.Message):
        # Ignore bots (including ourselves)
        if message.author.bot:
            return
            
        # We only care about messages in guilds (servers)
        if not message.guild:
            return
            
        guild_id = str(message.guild.id)
        channel_name = message.channel.name if hasattr(message.channel, "name") else str(message.channel.id)
        
        if not message.content or not message.content.strip():
            print(f"⚠️ [Discord Bot] Message from @{message.author.name} in #{channel_name} has empty text.", flush=True)
            print("   👉 If you sent text, make sure 'Message Content Intent' is ENABLED in Discord Developer Portal (Bot -> Privileged Gateway Intents).", flush=True)
            return

        # Find all projects linked to this discord_guild_id
        cursor = self.db["projects"].find({"discord_guild_id": guild_id})
        project_docs = await cursor.to_list(length=100)
        
        if not project_docs:
            print(f"ℹ️ [Discord Bot] Message in '{message.guild.name}' (Guild ID: {guild_id}) by @{message.author.name}, but no Forge project is linked to this Guild ID.", flush=True)
            return

        print(f"📩 [Discord Bot] Message from @{message.author.name} in #{channel_name} ('{message.guild.name}'): {message.content[:60]}...", flush=True)
        print(f"   Linking to {len(project_docs)} project(s)...", flush=True)

        for project_doc in project_docs:
            project = ProjectModel(**project_doc)
            try:
                metadata = {
                    "project_id": project.project_id,
                    "author": message.author.name,
                    "author_id": str(message.author.id),
                    "channel": channel_name,
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
                    
                    # Update chunk count and bot status in MongoDB
                    await self.db["projects"].update_one(
                        {"project_id": project.project_id},
                        {
                            "$inc": {"ingestion_status.discord_chunks_count": len(points)},
                            "$set": {
                                "ingestion_status.discord_backfill_complete": True,
                                "ingestion_status.last_discord_sync": datetime.now(timezone.utc),
                                "discord_bot_active": True,
                                "updated_at": datetime.now(timezone.utc)
                            }
                        }
                    )
                    print(f"   ✅ Indexed {len(points)} chunk(s) for Project '{project.name}' (ID: {project.project_id})", flush=True)
            except Exception as e:
                print(f"   ❌ Error indexing for Project '{project.name}' ({project.project_id}): {e}", flush=True)


if __name__ == "__main__":
    if not settings.DISCORD_BOT_TOKEN:
        print("Error: DISCORD_BOT_TOKEN is not set in your .env file!", flush=True)
        sys.exit(1)
        
    client = ForgeDiscordBot()
    client.run(settings.DISCORD_BOT_TOKEN)

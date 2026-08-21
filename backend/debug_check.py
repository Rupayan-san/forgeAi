"""Quick debug script to check if discord_guild_id is saved in MongoDB."""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    async for doc in db["projects"].find():
        print(f"Project: {doc.get('name')}")
        print(f"  project_id: {doc.get('project_id')}")
        print(f"  discord_guild_id: '{doc.get('discord_guild_id')}'")
        print(f"  discord_bot_active: {doc.get('discord_bot_active')}")
        print()
    client.close()

asyncio.run(check())

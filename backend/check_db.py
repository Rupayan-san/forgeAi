import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    users = await db.users.find().to_list(20)
    projects = await db.projects.find().to_list(20)
    print(f"Users found ({len(users)}):")
    for u in users:
        print(f"  - User: {u.get('name')} | user_id: {u.get('user_id')} | gh: {u.get('github_username')}")
    print(f"\nProjects found ({len(projects)}):")
    for p in projects:
        print(f"  - Project: {p.get('name')} | id: {p.get('project_id')} | owner_id: {p.get('owner_id')} | members: {p.get('members')}")

if __name__ == "__main__":
    asyncio.run(check())

from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import UserModel


class UserService:
    """Handles user CRUD operations in MongoDB."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["users"]

    async def get_by_id(self, user_id: str) -> UserModel | None:
        doc = await self.collection.find_one({"user_id": user_id})
        return UserModel(**doc) if doc else None

    async def get_by_github_id(self, github_id: int) -> UserModel | None:
        doc = await self.collection.find_one({"github_id": github_id})
        return UserModel(**doc) if doc else None

    async def create_user(self, user_data: dict) -> UserModel:
        user_data["user_id"] = str(ObjectId())
        user_data["created_at"] = datetime.now(timezone.utc)
        user_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.insert_one(user_data)
        user_data["_id"] = result.inserted_id
        return UserModel(**user_data)

    async def upsert_by_github_id(self, github_id: int, user_data: dict) -> UserModel:
        """Create or update user by GitHub ID. Returns the user."""
        existing = await self.get_by_github_id(github_id)
        if existing:
            user_data["updated_at"] = datetime.now(timezone.utc)
            await self.collection.update_one(
                {"github_id": github_id},
                {"$set": user_data}
            )
            doc = await self.collection.find_one({"github_id": github_id})
            return UserModel(**doc)
        else:
            return await self.create_user(user_data)

    async def update_user(self, user_id: str, update_data: dict) -> bool:
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def delete_user(self, user_id: str) -> bool:
        result = await self.collection.delete_one({"user_id": user_id})
        return result.deleted_count > 0

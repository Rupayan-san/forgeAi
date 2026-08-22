from datetime import datetime, timedelta, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import UserModel
from app.core.config import settings
from app.core.security import create_refresh_token, hash_refresh_token


class UserService:
    """Handles user CRUD operations in MongoDB."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["users"]
        self.refresh_tokens = db["refresh_tokens"]

    async def get_by_id(self, user_id: str) -> UserModel | None:
        doc = await self.collection.find_one({"user_id": user_id})
        if not doc and ObjectId.is_valid(user_id):
            doc = await self.collection.find_one({"_id": ObjectId(user_id)})
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

    # ========== Refresh Token Methods ==========

    async def store_refresh_token(self, user_id: str) -> str:
        """Generate and store a new refresh token. Returns the raw token."""
        raw_token = create_refresh_token()
        token_hash = hash_refresh_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self.refresh_tokens.insert_one({
            "token_hash": token_hash,
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        })

        return raw_token

    async def validate_refresh_token(self, raw_token: str) -> str | None:
        """Validate a refresh token. Returns the user_id if valid, else None."""
        token_hash = hash_refresh_token(raw_token)
        doc = await self.refresh_tokens.find_one({"token_hash": token_hash})

        if not doc:
            return None

        # Check expiry
        expires_at = doc["expires_at"]
        if isinstance(expires_at, datetime):
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                # Expired — clean up
                await self.refresh_tokens.delete_one({"token_hash": token_hash})
                return None

        return doc["user_id"]

    async def revoke_refresh_token(self, raw_token: str) -> bool:
        """Revoke a specific refresh token."""
        token_hash = hash_refresh_token(raw_token)
        result = await self.refresh_tokens.delete_one({"token_hash": token_hash})
        return result.deleted_count > 0

    async def revoke_all_user_tokens(self, user_id: str) -> int:
        """Revoke all refresh tokens for a user (logout everywhere)."""
        result = await self.refresh_tokens.delete_many({"user_id": user_id})
        return result.deleted_count

    async def rotate_refresh_token(self, old_raw_token: str, user_id: str) -> str | None:
        """Revoke the old refresh token and issue a new one (token rotation)."""
        revoked = await self.revoke_refresh_token(old_raw_token)
        if not revoked:
            return None
        return await self.store_refresh_token(user_id)

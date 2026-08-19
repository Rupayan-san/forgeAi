from datetime import datetime, timezone
from typing import Annotated
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, EmailStr


PyObjectId = Annotated[str, BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else str(x))]


class UserModel(BaseModel):
    """MongoDB User document model."""
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    user_id: str = Field(default_factory=lambda: str(ObjectId()))
    email: str | None = None
    name: str | None = None
    avatar_url: str | None = None
    github_access_token: str = ""  # Encrypted
    github_username: str = ""
    github_id: int | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class UserResponse(BaseModel):
    """User response schema (no sensitive data)."""
    user_id: str
    email: str | None = None
    name: str | None = None
    avatar_url: str | None = None
    github_username: str = ""
    created_at: datetime


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

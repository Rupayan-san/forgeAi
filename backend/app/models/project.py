from datetime import datetime, timezone
from typing import Annotated
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator


PyObjectId = Annotated[str, BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else str(x))]


class IngestionStatus(BaseModel):
    """Tracks ingestion pipeline progress."""
    github_backfill_complete: bool = False
    discord_backfill_complete: bool = False
    last_github_sync: datetime | None = None
    last_discord_sync: datetime | None = None
    github_chunks_count: int = 0
    discord_chunks_count: int = 0


class ProjectModel(BaseModel):
    """MongoDB Project document model."""
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    project_id: str = Field(default_factory=lambda: str(ObjectId()))
    name: str
    description: str = ""
    owner_id: str  # References Users.user_id
    members: list[str] = Field(default_factory=list)  # List of user_ids
    join_code: str = ""
    join_requests: list[str] = Field(default_factory=list)  # List of user_ids
    github_repo_url: str = ""
    github_repo_name: str = ""  # e.g., "owner/repo"
    github_installation_id: str = ""
    discord_guild_id: str = ""
    discord_bot_active: bool = False
    join_code: str = ""
    join_requests: list[str] = Field(default_factory=list)
    max_members: int = 10
    qdrant_collection_name: str = ""  # forge_{project_id}
    ingestion_status: IngestionStatus = Field(default_factory=IngestionStatus)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class MemberDetail(BaseModel):
    """Details of a project member resolved to their profile info."""
    user_id: str
    github_username: str
    name: str | None = None
    avatar_url: str | None = None


class ProjectCreate(BaseModel):
    """Schema for creating a new project."""
    name: str
    description: str = ""
    github_repo_url: str = ""
    discord_guild_id: str = ""
    max_members: int = 10


class ProjectResponse(BaseModel):
    """Project response schema."""
    project_id: str
    name: str
    description: str
    owner_id: str
    members: list[str]
    join_code: str
    join_requests: list[str]
    max_members: int
    member_details: list[MemberDetail] = Field(default_factory=list)
    github_repo_url: str
    github_repo_name: str
    discord_guild_id: str
    discord_bot_active: bool
    ingestion_status: IngestionStatus
    created_at: datetime
    updated_at: datetime

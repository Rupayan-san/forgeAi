from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict


PyObjectId = Annotated[str, BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else str(x))]


class ProjectRole(str, Enum):
    """Project-level permissions roles."""
    OWNER = "owner"
    MEMBER = "member"


class ProjectAIConfig(BaseModel):
    """Project-level AI persona and configuration."""
    name: str = Field(default="Forge", min_length=1, max_length=50)
    role: str = Field(default="Project Assistant", min_length=1, max_length=100)
    invocation_phrase: str = Field(default="Forge", min_length=1, max_length=50)


class IngestionStatus(BaseModel):
    """Tracks ingestion pipeline progress."""
    github_backfill_complete: bool = False
    discord_backfill_complete: bool = False
    last_github_sync: datetime | None = None
    last_discord_sync: datetime | None = None
    github_chunks_count: int = 0
    discord_chunks_count: int = 0
    indexed_commits_count: int = 0
    indexed_prs_count: int = 0
    last_commit_sha: str | None = None
    last_discord_message_id: str | None = None
    sync_state: str = "IDLE"  # IDLE | PENDING | RUNNING | COMPLETED | FAILED
    last_github_error: str | None = None
    last_discord_error: str | None = None


class ProjectModel(BaseModel):
    """MongoDB Project document model."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    project_id: str = Field(default_factory=lambda: str(ObjectId()))
    name: str
    description: str = ""
    owner_id: str  # References Users.user_id
    members: list[str] = Field(default_factory=list)  # List of user_ids
    member_roles: dict[str, str] = Field(default_factory=dict)  # Maps user_id -> "owner" | "member"
    ai_config: ProjectAIConfig = Field(default_factory=ProjectAIConfig)
    join_code: str = ""
    join_requests: list[str] = Field(default_factory=list)  # List of user_ids
    github_repo_url: str = ""
    github_repo_name: str = ""  # e.g., "owner/repo"
    github_branch: str = "main"
    github_installation_id: str = ""
    discord_guild_id: str = ""
    discord_channels: list[str] = Field(default_factory=list)  # Designated channels to ingest
    discord_bot_active: bool = False
    max_members: int = 10
    qdrant_collection_name: str = ""  # forge_{project_id}
    ingestion_status: IngestionStatus = Field(default_factory=IngestionStatus)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MemberDetail(BaseModel):
    """Details of a project member resolved to their profile info and role."""
    user_id: str
    github_username: str
    name: str | None = None
    avatar_url: str | None = None
    role: str = "member"  # "owner" | "member"
    joined_at: datetime | None = None


class ProjectCreate(BaseModel):
    """Schema for creating a new project."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    github_repo_url: str = ""
    github_branch: str = "main"
    discord_guild_id: str = ""
    discord_channels: list[str] = Field(default_factory=list)
    max_members: int = Field(default=10, ge=1, le=100)
    ai_config: ProjectAIConfig | None = None


class ProjectUpdate(BaseModel):
    """Schema for updating an existing project (all fields optional)."""
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    github_repo_url: str | None = None
    github_branch: str | None = None
    discord_guild_id: str | None = None
    discord_channels: list[str] | None = None
    max_members: int | None = Field(default=None, ge=1, le=100)
    ai_config: ProjectAIConfig | None = None


class ProjectSettingsUpdate(BaseModel):
    """Schema for updating project settings and configuration."""
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    github_repo_url: str | None = None
    github_branch: str | None = None
    discord_guild_id: str | None = None
    discord_channels: list[str] | None = None
    max_members: int | None = Field(default=None, ge=1, le=100)
    ai_config: ProjectAIConfig | None = None


class ProjectAIConfigUpdate(BaseModel):
    """Schema for updating only project AI configuration."""
    name: str = Field(..., min_length=1, max_length=50)
    role: str = Field(..., min_length=1, max_length=100)
    invocation_phrase: str = Field(..., min_length=1, max_length=50)


class MemberRoleUpdate(BaseModel):
    """Schema for updating a member's role."""
    role: str = Field(..., pattern="^(owner|member)$")


class InviteSchema(BaseModel):
    """Schema for inviting a member by GitHub username."""
    github_username: str = Field(..., min_length=1)


class JoinRequestSchema(BaseModel):
    """Schema for requesting to join via join code."""
    join_code: str = Field(..., min_length=1)


class ProjectResponse(BaseModel):
    """Project response schema."""
    project_id: str
    name: str
    description: str = ""
    owner_id: str
    members: list[str] = Field(default_factory=list)
    member_roles: dict[str, str] = Field(default_factory=dict)
    ai_config: ProjectAIConfig = Field(default_factory=ProjectAIConfig)
    user_role: str | None = None
    join_code: str = ""
    join_requests: list[str] = Field(default_factory=list)
    max_members: int = 10
    member_details: list[MemberDetail] = Field(default_factory=list)
    join_request_details: list[MemberDetail] = Field(default_factory=list)
    github_repo_url: str = ""
    github_repo_name: str = ""
    github_branch: str = "main"
    discord_guild_id: str = ""
    discord_channels: list[str] = Field(default_factory=list)
    discord_bot_active: bool = False
    ingestion_status: IngestionStatus = Field(default_factory=IngestionStatus)
    created_at: datetime
    updated_at: datetime

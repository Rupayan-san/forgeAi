from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict


PyObjectId = Annotated[str, BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else str(x))]


class DecisionStatus(str, Enum):
    """Decision lifecycle statuses."""
    ACTIVE = "ACTIVE"
    SUPERSEDED = "SUPERSEDED"
    CONFLICTED = "CONFLICTED"


class DecisionModel(BaseModel):
    """MongoDB Decision document model."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    decision_id: str = Field(default_factory=lambda: str(ObjectId()))
    project_id: str
    decision_text: str  # What was decided
    reasoning: str = ""  # Why it was decided
    alternatives_considered: list[str] = Field(default_factory=list)
    participants: list[str] = Field(default_factory=list)  # Usernames
    source_type: str = "project_artifact"  # github_file, discord_message, project_chat, meeting
    source_id: str = "manual"  # File path, PR number, message ID, etc.
    source_url: str = ""
    status: str = DecisionStatus.ACTIVE.value  # ACTIVE | SUPERSEDED | CONFLICTED
    supersedes: Optional[str] = None  # ID of older decision replaced by this
    superseded_by: Optional[str] = None  # ID of newer decision replacing this
    conflict_ids: list[str] = Field(default_factory=list)  # List of conflicting decision IDs
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))  # When decision occurred
    extracted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    confidence_score: float = 0.0  # 0.0 to 1.0


class ConflictInfo(BaseModel):
    """A conflict/supersedes relationship attached to a decision for display."""
    other_decision_id: str
    other_decision_text: str
    relationship: str  # "conflict" | "supersedes" | "superseded_by"
    explanation: str = ""


class DecisionResponse(BaseModel):
    """Decision response schema."""
    decision_id: str
    project_id: str
    decision_text: str
    reasoning: str
    alternatives_considered: list[str] = Field(default_factory=list)
    participants: list[str] = Field(default_factory=list)
    source_type: str = "project_artifact"
    source_id: str = "manual"
    source_url: str = ""
    status: str = DecisionStatus.ACTIVE.value
    supersedes: Optional[str] = None
    superseded_by: Optional[str] = None
    timestamp: datetime
    extracted_at: datetime
    updated_at: Optional[datetime] = None
    confidence_score: float = 0.0
    conflicts: list[ConflictInfo] = Field(default_factory=list)


class DecisionStatusUpdate(BaseModel):
    """Schema for manually updating decision status."""
    status: str = Field(description="ACTIVE | SUPERSEDED | CONFLICTED")
    reason: Optional[str] = None


class DecisionConflictModel(BaseModel):
    """MongoDB decision_conflicts document model."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    conflict_id: str = Field(default_factory=lambda: str(ObjectId()))
    project_id: str
    decision_id_a: str
    decision_id_b: str
    relationship: str  # "conflict" | "supersedes" | "unrelated"
    explanation: str = ""
    detected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

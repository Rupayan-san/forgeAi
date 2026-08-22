from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict


PyObjectId = Annotated[str, BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else str(x))]


class ActionItemStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class ActionItemModel(BaseModel):
    """Structured Project Action Item extracted from meetings or created manually."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    action_id: str = Field(default_factory=lambda: str(ObjectId()))
    project_id: str
    meeting_id: Optional[str] = None
    title: str
    description: str = ""
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    due_at: Optional[datetime] = None
    status: str = ActionItemStatus.TODO.value
    confidence_score: float = 1.0
    source_transcript_segment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None


class CreateActionItemRequest(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str = ""
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    due_at: Optional[datetime] = None
    meeting_id: Optional[str] = None


class UpdateActionItemRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    due_at: Optional[datetime] = None
    status: Optional[str] = None


class ActionItemResponse(BaseModel):
    action_id: str
    project_id: str
    meeting_id: Optional[str] = None
    title: str
    description: str = ""
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    due_at: Optional[datetime] = None
    status: str
    confidence_score: float
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

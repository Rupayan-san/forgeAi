from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict


PyObjectId = Annotated[str, BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else str(x))]


class MeetingStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    ENDED = "ENDED"
    CANCELLED = "CANCELLED"


class ParticipantRole(str, Enum):
    HOST = "host"
    PARTICIPANT = "participant"
    AI = "ai"


class MeetingParticipant(BaseModel):
    """Participant in a project meeting."""
    user_id: str
    user_name: str
    avatar_url: Optional[str] = None
    role: str = ParticipantRole.PARTICIPANT.value
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    left_at: Optional[datetime] = None
    is_muted: bool = False


class MeetingModel(BaseModel):
    """Unified Project Meeting MongoDB document model."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    meeting_id: str = Field(default_factory=lambda: str(ObjectId()))
    project_id: str
    title: str = "Project Meeting"
    created_by: str
    status: str = MeetingStatus.SCHEDULED.value
    channel_name: str = ""
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    participants: list[MeetingParticipant] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TranscriptSegmentModel(BaseModel):
    """Chronological meeting transcript segment."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    segment_id: str = Field(default_factory=lambda: str(ObjectId()))
    meeting_id: str
    project_id: str
    speaker_id: str
    speaker_name: str
    text: str
    is_final: bool = True
    sequence: int = 0
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MeetingSummaryModel(BaseModel):
    """Post-meeting structured intelligence summary."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    summary_id: str = Field(default_factory=lambda: str(ObjectId()))
    meeting_id: str
    project_id: str
    overview: str
    key_points: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    action_items: list[str] = Field(default_factory=list)
    unresolved_questions: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# API Request / Response Schemas
class CreateMeetingRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200, default="Project Meeting")


class MeetingResponse(BaseModel):
    meeting_id: str
    project_id: str
    title: str
    created_by: str
    status: str
    channel_name: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    participants: list[MeetingParticipant] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class RtcTokenResponse(BaseModel):
    token: str
    channel_name: str
    app_id: str
    uid: int | str
    expires_in_seconds: int = 3600


class AddTranscriptRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    speaker_name: Optional[str] = None
    is_final: bool = True

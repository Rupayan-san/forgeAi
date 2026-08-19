from datetime import datetime, timezone
from typing import Annotated
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator


PyObjectId = Annotated[str, BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else str(x))]


class SourceCitation(BaseModel):
    """A single source citation in a chat response."""
    source_type: str  # commit, pr, issue, readme, discord_message
    source_id: str
    source_url: str = ""
    relevance_score: float = 0.0
    content_preview: str = ""  # First 100 chars of source


class ChatMessageModel(BaseModel):
    """MongoDB ChatHistory document model."""
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    message_id: str = Field(default_factory=lambda: str(ObjectId()))
    project_id: str
    user_id: str
    role: str  # "user" or "assistant"
    content: str
    sources: list[SourceCitation] = Field(default_factory=list)
    interface_type: str = "text"  # "text" or "voice"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ChatRequest(BaseModel):
    """Schema for sending a chat message."""
    message: str
    interface_type: str = "text"


class ChatResponse(BaseModel):
    """Schema for a chat response."""
    message_id: str
    content: str
    sources: list[SourceCitation]
    created_at: datetime

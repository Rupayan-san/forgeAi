from datetime import datetime, timezone
from typing import Annotated, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict


PyObjectId = Annotated[str, BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else str(x))]


class SourceCitation(BaseModel):
    """A single source citation in a chat response."""
    source_type: str  # github_file, discord_message, constitution, decision, chat_message
    source_id: str
    source_url: str = ""
    relevance_score: float = 0.0
    content_preview: str = ""  # Preview text of source


class ChatMessageModel(BaseModel):
    """Unified Project Chat Message MongoDB document model."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    message_id: str = Field(default_factory=lambda: str(ObjectId()))
    project_id: str
    user_id: str
    user_name: str = "User"
    user_avatar: Optional[str] = None
    role: str = "user"  # "user" | "assistant" | "system"
    content: str
    sources: list[SourceCitation] = Field(default_factory=list)
    is_ai_generated: bool = False
    is_ai_invocation: bool = False
    interface_type: str = "text"  # "text" | "voice"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


class SendMessageRequest(BaseModel):
    """Schema for sending a unified project chat message."""
    content: str = Field(min_length=1, max_length=10000)
    interface_type: str = "text"


class ChatRequest(BaseModel):
    """Legacy schema compatibility for Q&A query."""
    message: str
    interface_type: str = "text"


class ChatResponse(BaseModel):
    """Schema for a chat response."""
    message_id: str
    content: str
    sources: list[SourceCitation] = Field(default_factory=list)
    created_at: datetime
    trace: list[str] = Field(default_factory=list)
    is_ai_generated: bool = True
    user_id: str = "ai"
    user_name: str = "Forge"


class ChatHistoryResponse(BaseModel):
    """Paginated chat history response."""
    messages: list[ChatMessageModel]
    has_more: bool = False
    next_cursor: Optional[str] = None

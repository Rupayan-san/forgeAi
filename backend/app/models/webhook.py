from datetime import datetime, timezone
from typing import Any, Annotated
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator


PyObjectId = Annotated[str, BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else str(x))]


class WebhookEventModel(BaseModel):
    """MongoDB WebhookEvents document model."""
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    event_id: str = Field(default_factory=lambda: str(ObjectId()))
    project_id: str
    source: str  # "github" or "discord"
    event_type: str  # push, pull_request, issues, message, etc.
    payload: dict[str, Any] = Field(default_factory=dict)
    processed: bool = False
    processed_at: datetime | None = None
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

from datetime import datetime, timezone
from typing import Annotated
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator


PyObjectId = Annotated[str, BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else str(x))]


class DecisionModel(BaseModel):
    """MongoDB Decision document model."""
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    decision_id: str = Field(default_factory=lambda: str(ObjectId()))
    project_id: str
    decision_text: str  # What was decided
    reasoning: str = ""  # Why it was decided
    alternatives_considered: list[str] = Field(default_factory=list)
    participants: list[str] = Field(default_factory=list)  # Usernames
    source_type: str  # commit, pr, issue, discord
    source_id: str  # Original PR number, message ID, etc.
    source_url: str = ""
    timestamp: datetime  # When the original discussion happened
    extracted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    confidence_score: float = 0.0  # 0.0 to 1.0

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class DecisionResponse(BaseModel):
    """Decision response schema."""
    decision_id: str
    project_id: str
    decision_text: str
    reasoning: str
    alternatives_considered: list[str]
    participants: list[str]
    source_type: str
    source_id: str
    source_url: str
    timestamp: datetime
    extracted_at: datetime
    confidence_score: float
    conflicts: list["ConflictInfo"] = Field(default_factory=list)


class ConflictInfo(BaseModel):
    """A conflict/supersedes relationship attached to a decision for display."""
    other_decision_id: str
    other_decision_text: str
    relationship: str  # "conflict" | "supersedes"
    explanation: str


class DecisionConflictModel(BaseModel):
    """MongoDB decision_conflicts document model."""
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    conflict_id: str = Field(default_factory=lambda: str(ObjectId()))
    project_id: str
    decision_id_a: str
    decision_id_b: str
    relationship: str  # "conflict" | "supersedes" | "unrelated"
    explanation: str = ""
    detected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


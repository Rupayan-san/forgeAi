from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.chat import SourceCitation


class QueryIntent(str, Enum):
    """Categorized user query intent for context orchestration."""
    CONSTITUTION = "CONSTITUTION"
    DECISIONS = "DECISIONS"
    CODEBASE = "CODEBASE"
    COMMITS_PRS = "COMMITS_PRS"
    DISCUSSIONS = "DISCUSSIONS"
    MULTI_SOURCE = "MULTI_SOURCE"


class MemoryItem(BaseModel):
    """Normalized project memory item representation."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    memory_id: str
    project_id: str
    source_type: str  # github_file, file_summary, github_commit, github_pr, discord_message, chat_message, constitution, decision
    source_id: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    relevance_score: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MemorySearchRequest(BaseModel):
    """Schema for querying project memory semantically."""
    query: str = Field(min_length=1, max_length=1000)
    limit: int = Field(default=8, ge=1, le=50)
    source_types: Optional[list[str]] = None


class MemorySearchResult(BaseModel):
    """Semantic search response over project memory."""
    project_id: str
    query: str
    total_results: int
    items: list[MemoryItem]


class ProjectContextResult(BaseModel):
    """Aggregated project context for AI grounding."""
    project_id: str
    project_name: str
    constitution_text: str
    decisions: list[dict] = Field(default_factory=list)
    memory_chunks: list[dict] = Field(default_factory=list)
    formatted_context: str
    citations: list[SourceCitation] = Field(default_factory=list)
    orchestration_intent: str = QueryIntent.MULTI_SOURCE.value
    trace: list[str] = Field(default_factory=list)

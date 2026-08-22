from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.models.decision import DecisionModel
from app.services.constitution_service import ConstitutionService
from app.services.decision_service import DecisionService
from app.core.retrieval_config import RetrievalConfig, retrieval_config


class StructuredRetrievalResult(BaseModel):
    """Structured knowledge retrieved directly from MongoDB with strict project scoping."""
    constitution_markdown: str = ""
    has_constitution: bool = False
    decisions: list[DecisionModel] = Field(default_factory=list)
    active_decisions: list[DecisionModel] = Field(default_factory=list)
    conflicted_decisions: list[DecisionModel] = Field(default_factory=list)
    superseded_decisions: list[DecisionModel] = Field(default_factory=list)


class StructuredRetriever:
    """Retrieves authoritative rules and architectural decisions directly from MongoDB."""

    def __init__(self, config: Optional[RetrievalConfig] = None):
        self.config = config or retrieval_config
        self.decision_service = DecisionService()

    async def retrieve(
        self,
        project_id: str,
        query_text: str,
        db: AsyncIOMotorDatabase,
        limit: Optional[int] = None,
    ) -> StructuredRetrievalResult:
        """Fetch Project Constitution and relevant Decisions with project isolation."""
        dec_limit = limit or self.config.structured_limit

        # 1. Fetch Constitution
        constitution_md = ""
        has_constitution = False
        try:
            constitution_md = await ConstitutionService.format_constitution_for_ai(
                db=db, project_id=project_id
            )
            has_constitution = "### Project Constitution" in constitution_md
        except Exception as e:
            print(f"[StructuredRetriever] Constitution retrieval warning: {e}")
            constitution_md = "Project Constitution unavailable."

        # 2. Fetch Decisions
        decisions: list[DecisionModel] = []
        try:
            decisions = await self.decision_service.get_relevant_decisions(
                project_id=project_id,
                query_text=query_text,
                db=db,
                limit=dec_limit,
            )
        except Exception as e:
            print(f"[StructuredRetriever] Decisions retrieval warning: {e}")

        active = [d for d in decisions if d.status == "ACTIVE"]
        conflicted = [d for d in decisions if d.status == "CONFLICTED"]
        superseded = [d for d in decisions if d.status == "SUPERSEDED"]

        return StructuredRetrievalResult(
            constitution_markdown=constitution_md,
            has_constitution=has_constitution,
            decisions=decisions,
            active_decisions=active,
            conflicted_decisions=conflicted,
            superseded_decisions=superseded,
        )

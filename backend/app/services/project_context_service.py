from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.project import ProjectModel
from app.models.memory import ProjectContextResult
from app.services.project_context_orchestrator import ProjectContextOrchestrator


class ProjectContextService:
    """Unified service delegating to ProjectContextOrchestrator for intelligent context assembly."""

    def __init__(self):
        self.orchestrator = ProjectContextOrchestrator()

    async def build_project_context(
        self,
        project: ProjectModel,
        query_text: str,
        db: AsyncIOMotorDatabase,
        memory_limit: int = 8,
        decision_limit: int = 5,
    ) -> ProjectContextResult:
        """Construct comprehensive, source-attributed project context with query classification and priority ordering."""
        return await self.orchestrator.build_orchestrated_context(
            project=project,
            query_text=query_text,
            db=db,
            memory_limit=memory_limit,
            decision_limit=decision_limit,
        )

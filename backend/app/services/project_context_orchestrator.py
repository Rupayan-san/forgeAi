from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.project import ProjectModel
from app.models.memory import ProjectContextResult, QueryIntent
from app.services.retrieval.advanced_retrieval_service import AdvancedRetrievalService
from app.services.retrieval.query_planner import QueryPlanner, QueryNormalizer
from app.core.retrieval_config import RetrievalConfig, retrieval_config


class ProjectContextOrchestrator:
    """Intelligent Context Orchestrator backed by the Advanced RAG & Retrieval Optimization engine."""

    def __init__(self, config: Optional[RetrievalConfig] = None):
        self.config = config or retrieval_config
        self.planner = QueryPlanner(self.config)
        self.retrieval_service = AdvancedRetrievalService(self.config)

    def classify_query(self, query: str) -> QueryIntent:
        """Query intent classifier with exact code symbol awareness."""
        normalized, exact_terms = QueryNormalizer.normalize(query)
        return self.planner._classify_intent(normalized, exact_terms)

    async def build_orchestrated_context(
        self,
        project: ProjectModel,
        query_text: str,
        db: AsyncIOMotorDatabase,
        memory_limit: int = 8,
        decision_limit: int = 5,
    ) -> ProjectContextResult:
        """Execute full Advanced RAG pipeline: Planning → Dense + Sparse + Structured → RRF → Rerank → MMR → Context."""
        return await self.retrieval_service.retrieve_and_orchestrate(
            project=project,
            query=query_text,
            db=db,
            custom_top_k=memory_limit,
        )

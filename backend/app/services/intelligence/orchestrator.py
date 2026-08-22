from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.project_state import (
    ProjectStateSnapshot,
    ProjectRisk,
    ConsistencyIssue,
    KnowledgeGap,
    ProjectTimelineEvent,
    SemanticChangeGroup,
)
from app.services.intelligence.state_analyzer import ProjectStateAnalyzer
from app.services.intelligence.change_analyzer import ChangeAnalyzer
from app.services.intelligence.consistency_analyzer import ConsistencyAnalyzer
from app.services.intelligence.risk_and_gap_analyzer import RiskAndGapAnalyzer
from app.services.intelligence.timeline_builder import TimelineBuilder


class ProjectIntelligenceOrchestrator:
    """Central orchestrator for project state, changes, consistency, risks, and timeline."""

    def __init__(self):
        self.state_analyzer = ProjectStateAnalyzer()
        self.change_analyzer = ChangeAnalyzer()
        self.consistency_analyzer = ConsistencyAnalyzer()
        self.risk_gap_analyzer = RiskAndGapAnalyzer()
        self.timeline_builder = TimelineBuilder()

    async def refresh_full_intelligence(
        self, project_id: str, db: AsyncIOMotorDatabase
    ) -> ProjectStateSnapshot:
        """Run full cross-system intelligence analysis and refresh all cached intelligence models."""
        # 1. State snapshot
        snapshot = await self.state_analyzer.analyze_project_state(project_id, db)
        # 2. Semantic changes
        await self.change_analyzer.analyze_and_group_changes(project_id, db)
        # 3. Consistency and drift checks
        await self.consistency_analyzer.analyze_consistency(project_id, db)
        # 4. Risks, blockers, and knowledge gaps
        await self.risk_gap_analyzer.analyze_risks_and_gaps(project_id, db)
        # 5. Timeline builder
        await self.timeline_builder.build_timeline(project_id=project_id, db=db)

        return snapshot

    async def get_project_state(
        self, project_id: str, db: AsyncIOMotorDatabase
    ) -> ProjectStateSnapshot:
        return await self.state_analyzer.get_latest_snapshot(project_id, db)

    async def get_timeline(
        self,
        project_id: str,
        event_type_filter: Optional[str] = None,
        limit: int = 50,
        db: Optional[AsyncIOMotorDatabase] = None,
    ) -> list[ProjectTimelineEvent]:
        return await self.timeline_builder.build_timeline(
            project_id=project_id,
            event_type_filter=event_type_filter,
            limit=limit,
            db=db,
        )

    async def get_recent_changes(
        self, project_id: str, db: AsyncIOMotorDatabase
    ) -> list[SemanticChangeGroup]:
        return await self.change_analyzer.analyze_and_group_changes(project_id, db)

    async def get_risks(
        self, project_id: str, db: AsyncIOMotorDatabase
    ) -> list[ProjectRisk]:
        risks, _ = await self.risk_gap_analyzer.analyze_risks_and_gaps(project_id, db)
        return risks

    async def get_consistency_issues(
        self, project_id: str, db: AsyncIOMotorDatabase
    ) -> list[ConsistencyIssue]:
        return await self.consistency_analyzer.analyze_consistency(project_id, db)

    async def get_knowledge_gaps(
        self, project_id: str, db: AsyncIOMotorDatabase
    ) -> list[KnowledgeGap]:
        _, gaps = await self.risk_gap_analyzer.analyze_risks_and_gaps(project_id, db)
        return gaps

    async def update_risk_status(
        self, project_id: str, risk_id: str, new_status: str, db: AsyncIOMotorDatabase
    ) -> bool:
        return await self.risk_gap_analyzer.update_risk_status(
            project_id=project_id, risk_id=risk_id, new_status=new_status, db=db
        )

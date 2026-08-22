from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.api.v1.permissions import require_project_member, ProjectContext
from app.models.project_state import (
    ProjectStateSnapshot,
    ProjectRisk,
    ConsistencyIssue,
    KnowledgeGap,
    ProjectTimelineEvent,
    SemanticChangeGroup,
    UpdateRiskRequest,
)
from app.services.intelligence.orchestrator import ProjectIntelligenceOrchestrator

router = APIRouter()
orchestrator = ProjectIntelligenceOrchestrator()


@router.get("/projects/{project_id}/intelligence/state", response_model=ProjectStateSnapshot)
async def get_project_state(
    context: ProjectContext = Depends(require_project_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get the latest derived point-in-time state of the project."""
    return await orchestrator.get_project_state(context.project.project_id, db)


@router.post("/projects/{project_id}/intelligence/refresh", response_model=ProjectStateSnapshot)
async def refresh_project_intelligence(
    context: ProjectContext = Depends(require_project_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Trigger a fresh cross-system intelligence analysis for the project."""
    return await orchestrator.refresh_full_intelligence(context.project.project_id, db)


@router.get("/projects/{project_id}/intelligence/timeline", response_model=list[ProjectTimelineEvent])
async def get_project_timeline(
    event_type: Optional[str] = Query(None, alias="type"),
    limit: int = Query(50, ge=1, le=200),
    context: ProjectContext = Depends(require_project_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get chronological multi-source project timeline."""
    return await orchestrator.get_timeline(
        project_id=context.project.project_id,
        event_type_filter=event_type,
        limit=limit,
        db=db,
    )


@router.get("/projects/{project_id}/intelligence/changes", response_model=list[SemanticChangeGroup])
async def get_recent_changes(
    context: ProjectContext = Depends(require_project_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get grouped semantic development changes."""
    return await orchestrator.get_recent_changes(context.project.project_id, db)


@router.get("/projects/{project_id}/intelligence/risks", response_model=list[ProjectRisk])
async def get_project_risks(
    context: ProjectContext = Depends(require_project_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get identified project risks and blockers."""
    return await orchestrator.get_risks(context.project.project_id, db)


@router.patch("/projects/{project_id}/intelligence/risks/{risk_id}", response_model=dict)
async def update_risk_status(
    risk_id: str,
    body: UpdateRiskRequest,
    context: ProjectContext = Depends(require_project_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update risk status (OPEN, ACKNOWLEDGED, RESOLVED)."""
    success = await orchestrator.update_risk_status(
        project_id=context.project.project_id,
        risk_id=risk_id,
        new_status=body.status,
        db=db,
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk not found")
    return {"status": "success", "risk_id": risk_id, "new_status": body.status}


@router.get("/projects/{project_id}/intelligence/consistency", response_model=list[ConsistencyIssue])
async def get_consistency_issues(
    context: ProjectContext = Depends(require_project_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get detected inconsistencies between decisions, constitution, and code."""
    return await orchestrator.get_consistency_issues(context.project.project_id, db)


@router.get("/projects/{project_id}/intelligence/gaps", response_model=list[KnowledgeGap])
async def get_knowledge_gaps(
    context: ProjectContext = Depends(require_project_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get identified project knowledge gaps."""
    return await orchestrator.get_knowledge_gaps(context.project.project_id, db)

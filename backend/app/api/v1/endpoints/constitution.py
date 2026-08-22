from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.api.v1.permissions import (
    ProjectContext,
    require_project_member,
    require_project_owner,
)
from app.models.constitution import (
    ConstitutionModel,
    ConstitutionUpdate,
    ConstitutionHistoryModel,
)
from app.services.constitution_service import ConstitutionService

router = APIRouter()


@router.get("/{project_id}/constitution", response_model=ConstitutionModel)
async def get_project_constitution(
    project_id: str,
    ctx: ProjectContext = Depends(require_project_member),
):
    """Retrieve the active Project Constitution. Initialized with defaults if missing."""
    constitution = await ConstitutionService.get_or_create_constitution(
        db=ctx.db,
        project_id=project_id,
        user_id=ctx.user.user_id,
    )
    return constitution


@router.put("/{project_id}/constitution", response_model=ConstitutionModel)
async def update_project_constitution(
    project_id: str,
    payload: ConstitutionUpdate,
    ctx: ProjectContext = Depends(require_project_owner),
):
    """Update the Project Constitution. Only available to Project Owners. Automatically increments version and creates a history snapshot."""
    updated = await ConstitutionService.update_constitution(
        db=ctx.db,
        project_id=project_id,
        update_data=payload,
        user_id=ctx.user.user_id,
    )
    return updated


@router.get(
    "/{project_id}/constitution/history",
    response_model=list[ConstitutionHistoryModel],
)
async def get_constitution_history(
    project_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    ctx: ProjectContext = Depends(require_project_member),
):
    """Retrieve historical snapshots of past constitution versions."""
    history = await ConstitutionService.get_history(
        db=ctx.db,
        project_id=project_id,
        limit=limit,
        skip=skip,
    )
    return history


@router.get(
    "/{project_id}/constitution/versions/{version}",
    response_model=ConstitutionHistoryModel,
)
async def get_constitution_version(
    project_id: str,
    version: int,
    ctx: ProjectContext = Depends(require_project_member),
):
    """Retrieve a specific historical constitution version snapshot."""
    snapshot = await ConstitutionService.get_version_snapshot(
        db=ctx.db,
        project_id=project_id,
        version=version,
    )
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Constitution version {version} not found for this project",
        )
    return snapshot

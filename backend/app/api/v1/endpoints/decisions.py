from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.api.v1.dependencies import get_current_user
from app.models.user import UserModel
from app.models.project import ProjectModel
from app.models.decision import DecisionModel, DecisionResponse, ConflictInfo
from app.services.decision_service import DecisionService

router = APIRouter()
decision_service = DecisionService()


@router.post("/{project_id}/decisions/extract")
async def extract_decisions(
    project_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Trigger AI extraction of decisions from the project knowledge base."""
    project_doc = await db["projects"].find_one({
        "project_id": project_id,
        "members": current_user.user_id,
    })
    if not project_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project = ProjectModel(**project_doc)
    if not project.qdrant_collection_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No knowledge base available")

    # Clear old decisions first
    await db["decisions"].delete_many({"project_id": project_id})

    decisions = await decision_service.extract_decisions(
        project_id=project_id,
        collection_name=project.qdrant_collection_name,
        db=db,
    )

    return {"message": f"Extracted {len(decisions)} decisions", "count": len(decisions)}


@router.post("/{project_id}/decisions/detect-conflicts")
async def detect_conflicts(
    project_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Run conflict detection across all extracted decisions for this project."""
    project_doc = await db["projects"].find_one({
        "project_id": project_id,
        "members": current_user.user_id,
    })
    if not project_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    conflicts = await decision_service.detect_conflicts(project_id=project_id, db=db)
    return {"message": f"Detected {len(conflicts)} conflicts", "count": len(conflicts)}


@router.get("/{project_id}/decisions", response_model=list[DecisionResponse])
async def list_decisions(
    project_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get all extracted decisions for a project, with conflict info attached."""
    project_doc = await db["projects"].find_one({
        "project_id": project_id,
        "members": current_user.user_id,
    })
    if not project_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    cursor = db["decisions"].find(
        {"project_id": project_id},
        sort=[("confidence_score", -1)],
    )
    decisions = [DecisionModel(**doc) async for doc in cursor]
    decision_text_map = {d.decision_id: d.decision_text for d in decisions}

    # Fetch all conflicts for this project once, build a lookup by decision_id
    conflict_cursor = db["decision_conflicts"].find({"project_id": project_id})
    conflicts_by_decision: dict[str, list[ConflictInfo]] = {}
    async for c in conflict_cursor:
        for this_id, other_id in [(c["decision_id_a"], c["decision_id_b"]), (c["decision_id_b"], c["decision_id_a"])]:
            conflicts_by_decision.setdefault(this_id, []).append(
                ConflictInfo(
                    other_decision_id=other_id,
                    other_decision_text=decision_text_map.get(other_id, ""),
                    relationship=c["relationship"],
                    explanation=c.get("explanation", ""),
                )
            )

    result = []
    for d in decisions:
        response = DecisionResponse(
            **d.model_dump(),
            conflicts=conflicts_by_decision.get(d.decision_id, []),
        )
        result.append(response)

    return result

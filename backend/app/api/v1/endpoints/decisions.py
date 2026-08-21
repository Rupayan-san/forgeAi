from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.api.v1.dependencies import get_current_user
from app.models.user import UserModel
from app.models.project import ProjectModel
from app.models.decision import DecisionModel, DecisionResponse
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


@router.get("/{project_id}/decisions", response_model=list[DecisionResponse])
async def list_decisions(
    project_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get all extracted decisions for a project."""
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

    decisions = []
    async for doc in cursor:
        decisions.append(DecisionResponse(**DecisionModel(**doc).model_dump()))

    return decisions

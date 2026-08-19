from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db, get_qdrant
from app.api.v1.dependencies import get_current_user
from app.models.user import UserModel
from app.models.project import ProjectModel, ProjectCreate, ProjectResponse, IngestionStatus
from app.services.qdrant_service import QdrantService

router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new project and initialize its Qdrant collection."""
    project_id = str(ObjectId())
    collection_name = f"forge_{project_id}"

    # Extract repo name from URL if provided
    github_repo_name = ""
    if project_data.github_repo_url:
        # Extract "owner/repo" from URL like https://github.com/owner/repo
        parts = project_data.github_repo_url.rstrip("/").split("/")
        if len(parts) >= 2:
            github_repo_name = f"{parts[-2]}/{parts[-1]}"

    project = ProjectModel(
        project_id=project_id,
        name=project_data.name,
        description=project_data.description,
        owner_id=current_user.user_id,
        members=[current_user.user_id],
        github_repo_url=project_data.github_repo_url,
        github_repo_name=github_repo_name,
        qdrant_collection_name=collection_name,
        ingestion_status=IngestionStatus(),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    # Insert into MongoDB
    await db["projects"].insert_one(project.model_dump(by_alias=True))

    # Create Qdrant collection
    try:
        qdrant = get_qdrant()
        qdrant_service = QdrantService(qdrant)
        await qdrant_service.ensure_collection(collection_name)
    except Exception as e:
        print(f"Warning: Failed to create Qdrant collection: {e}")

    return ProjectResponse(**project.model_dump())


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all projects the current user is a member of."""
    cursor = db["projects"].find({"members": current_user.user_id})
    projects = []
    async for doc in cursor:
        projects.append(ProjectResponse(**ProjectModel(**doc).model_dump()))
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get a specific project by ID."""
    doc = await db["projects"].find_one({
        "project_id": project_id,
        "members": current_user.user_id,
    })
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectResponse(**ProjectModel(**doc).model_dump())


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update_data: ProjectCreate,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update a project's settings."""
    doc = await db["projects"].find_one({
        "project_id": project_id,
        "owner_id": current_user.user_id,
    })
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or not owner")

    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)

    await db["projects"].update_one(
        {"project_id": project_id},
        {"$set": update_dict}
    )

    updated_doc = await db["projects"].find_one({"project_id": project_id})
    return ProjectResponse(**ProjectModel(**updated_doc).model_dump())


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a project and its Qdrant collection."""
    doc = await db["projects"].find_one({
        "project_id": project_id,
        "owner_id": current_user.user_id,
    })
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or not owner")

    # Delete Qdrant collection
    try:
        qdrant = get_qdrant()
        qdrant_service = QdrantService(qdrant)
        collection_name = doc.get("qdrant_collection_name", f"forge_{project_id}")
        await qdrant_service.delete_collection(collection_name)
    except Exception as e:
        print(f"Warning: Failed to delete Qdrant collection: {e}")

    # Delete from MongoDB
    await db["projects"].delete_one({"project_id": project_id})
    # Also delete associated decisions and chat history
    await db["decisions"].delete_many({"project_id": project_id})
    await db["chat_history"].delete_many({"project_id": project_id})

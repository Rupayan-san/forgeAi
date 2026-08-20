from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db, get_qdrant
from app.api.v1.dependencies import get_current_user
from app.models.user import UserModel
from app.models.project import ProjectModel, ProjectCreate, ProjectResponse, IngestionStatus
from app.services.qdrant_service import QdrantService

from app.services.queue_service import enqueue_github_job
from app.services.user_service import UserService
from app.core.security import decrypt_token

router = APIRouter()


async def resolve_member_details(db: AsyncIOMotorDatabase, project_doc: dict) -> list[dict]:
    member_ids = project_doc.get("members", [])
    if not member_ids:
        return []
    cursor = db["users"].find({"user_id": {"$in": member_ids}})
    users = await cursor.to_list(length=len(member_ids))
    user_map = {
        u["user_id"]: {
            "user_id": u["user_id"],
            "github_username": u.get("github_username", ""),
            "name": u.get("name"),
            "avatar_url": u.get("avatar_url")
        } for u in users
    }
    return [user_map[uid] for uid in member_ids if uid in user_map]


import random
import string

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new project and initialize its Qdrant collection."""
    project_id = str(ObjectId())
    collection_name = f"forge_{project_id}"
    join_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

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
        join_code=join_code,
        join_requests=[],
        max_members=project_data.max_members,
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

    member_details = await resolve_member_details(db, project.model_dump())
    return ProjectResponse(**{**project.model_dump(), "member_details": member_details})

from pydantic import BaseModel

class JoinRequestSchema(BaseModel):
    join_code: str

@router.post("/join/request")
async def request_join(
    data: JoinRequestSchema,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Request to join a project using a join code."""
    doc = await db["projects"].find_one({"join_code": data.join_code})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found or invalid join code")
        
    project = ProjectModel(**doc)
    if len(project.members) >= project.max_members:
        raise HTTPException(status_code=400, detail="This project has reached its maximum member limit.")
        
    if current_user.user_id in project.members:
        return {"message": "Already a member"}
        
    if current_user.user_id not in project.join_requests:
        await db["projects"].update_one(
            {"project_id": project.project_id},
            {"$push": {"join_requests": current_user.user_id}}
        )
    return {"message": "Join request sent"}

@router.post("/{project_id}/join/approve/{user_id}")
async def approve_join(
    project_id: str,
    user_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Approve a join request."""
    doc = await db["projects"].find_one({"project_id": project_id, "owner_id": current_user.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found or not owner")
        
    project = ProjectModel(**doc)
    if len(project.members) >= project.max_members:
        raise HTTPException(status_code=400, detail="This project has reached its maximum member limit.")

    if user_id in project.join_requests:
        await db["projects"].update_one(
            {"project_id": project_id},
            {
                "$pull": {"join_requests": user_id},
                "$addToSet": {"members": user_id}
            }
        )
        # Create welcome message
        from app.models.chat import ChatMessageModel
        welcome_msg = ChatMessageModel(
            message_id=str(ObjectId()),
            project_id=project_id,
            user_id=user_id,
            role="assistant",
            content=f"Welcome to the project! Here is a brief description of what we are building:\n\n{project.description or 'No description provided.'}\n\nFeel free to ask me any questions about the repository or our team conversations!",
            sources=[],
            interface_type="text",
            created_at=datetime.now(timezone.utc)
        )
        await db["chat_history"].insert_one(welcome_msg.model_dump(by_alias=True))
        
    return {"message": "User approved"}

@router.post("/{project_id}/join/reject/{user_id}")
async def reject_join(
    project_id: str,
    user_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Reject a join request."""
    doc = await db["projects"].find_one({"project_id": project_id, "owner_id": current_user.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found or not owner")
        
    await db["projects"].update_one(
        {"project_id": project_id},
        {"$pull": {"join_requests": user_id}}
    )
    return {"message": "User rejected"}

class InviteSchema(BaseModel):
    github_username: str

@router.post("/{project_id}/members/invite")
async def invite_member(
    project_id: str,
    data: InviteSchema,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Invite a user by GitHub username."""
    doc = await db["projects"].find_one({"project_id": project_id, "owner_id": current_user.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found or not owner")
        
    project = ProjectModel(**doc)
    if len(project.members) >= project.max_members:
        raise HTTPException(status_code=400, detail="This project has reached its maximum member limit.")

    user_doc = await db["users"].find_one({"github_username": data.github_username})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
        
    invitee_id = user_doc["user_id"]
    if invitee_id not in project.members:
        await db["projects"].update_one(
            {"project_id": project_id},
            {"$addToSet": {"members": invitee_id}}
        )
        # Create welcome message
        from app.models.chat import ChatMessageModel
        welcome_msg = ChatMessageModel(
            message_id=str(ObjectId()),
            project_id=project_id,
            user_id=invitee_id,
            role="assistant",
            content=f"Welcome to the project! Here is a brief description of what we are building:\n\n{project.description or 'No description provided.'}\n\nFeel free to ask me any questions about the repository or our team conversations!",
            sources=[],
            interface_type="text",
            created_at=datetime.now(timezone.utc)
        )
        await db["chat_history"].insert_one(welcome_msg.model_dump(by_alias=True))
        
    return {"message": "User invited and added"}


@router.post("/{project_id}/ingest/github")
async def trigger_github_ingestion(
    project_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Trigger background ingestion of the GitHub repository."""
    # Verify project exists and user is a member
    doc = await db["projects"].find_one({
        "project_id": project_id,
        "members": current_user.user_id,
    })
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
    project = ProjectModel(**doc)
    if not project.github_repo_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project has no GitHub repository configured")

    # Get user's decrypted GitHub token
    user_service = UserService(db)
    user = await user_service.get_by_id(current_user.user_id)
    
    if not user or not user.github_access_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User GitHub token missing")
        
    decrypted_token = decrypt_token(user.github_access_token)
    
    # Enqueue job
    from app.services.github_service import run_github_ingestion
    job_info = enqueue_github_job(run_github_ingestion, project_id=project_id, access_token=decrypted_token)
    
    return {"message": "Ingestion started", "job_id": job_info["job_id"]}


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all projects the current user is a member of."""
    cursor = db["projects"].find({"members": current_user.user_id})
    projects = []
    async for doc in cursor:
        member_details = await resolve_member_details(db, doc)
        projects.append(ProjectResponse(**{**ProjectModel(**doc).model_dump(), "member_details": member_details}))
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
    
    member_details = await resolve_member_details(db, doc)
    return ProjectResponse(**{**ProjectModel(**doc).model_dump(), "member_details": member_details})


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

    # Also update github_repo_name if github_repo_url changed
    if "github_repo_url" in update_dict and update_dict["github_repo_url"]:
        parts = update_dict["github_repo_url"].rstrip("/").split("/")
        if len(parts) >= 2:
            update_dict["github_repo_name"] = f"{parts[-2]}/{parts[-1]}"

    await db["projects"].update_one(
        {"project_id": project_id},
        {"$set": update_dict}
    )

    updated_doc = await db["projects"].find_one({"project_id": project_id})
    member_details = await resolve_member_details(db, updated_doc)
    return ProjectResponse(**{**ProjectModel(**updated_doc).model_dump(), "member_details": member_details})


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


@router.delete("/{project_id}/members/{user_id}")
async def kick_member(
    project_id: str,
    user_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Kick a member from the project (owner only)."""
    doc = await db["projects"].find_one({"project_id": project_id, "owner_id": current_user.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found or not owner")
        
    project = ProjectModel(**doc)
    if user_id == project.owner_id:
        raise HTTPException(status_code=400, detail="Cannot kick the owner of the project")
        
    if user_id in project.members:
        await db["projects"].update_one(
            {"project_id": project_id},
            {"$pull": {"members": user_id}}
        )
    return {"message": "Member removed"}

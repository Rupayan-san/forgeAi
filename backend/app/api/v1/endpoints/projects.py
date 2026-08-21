from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db, get_qdrant
from app.api.v1.dependencies import get_current_user
from app.models.user import UserModel
from app.models.project import ProjectModel, ProjectCreate, ProjectUpdate, ProjectResponse, IngestionStatus
from app.services.qdrant_service import QdrantService

from app.services.queue_service import enqueue_github_job
from app.services.user_service import UserService
from app.core.security import decrypt_token

router = APIRouter()


async def resolve_member_details(db: AsyncIOMotorDatabase, project_doc: dict) -> list[dict]:
    member_ids = project_doc.get("members", [])
    if not member_ids:
        return []
    cursor = db["users"].find({
        "$or": [
            {"user_id": {"$in": member_ids}},
            {"_id": {"$in": [ObjectId(uid) for uid in member_ids if ObjectId.is_valid(uid)]}}
        ]
    })
    users = await cursor.to_list(length=len(member_ids))
    user_map = {}
    for u in users:
        uid = u.get("user_id") or str(u.get("_id"))
        user_map[uid] = {
            "user_id": uid,
            "github_username": u.get("github_username", ""),
            "name": u.get("name") or u.get("github_username", ""),
            "avatar_url": u.get("avatar_url")
        }
    return [user_map.get(uid, {"user_id": uid, "github_username": f"user-{uid[:6]}", "name": "Member", "avatar_url": None}) for uid in member_ids]


async def resolve_join_request_details(db: AsyncIOMotorDatabase, project_doc: dict) -> list[dict]:
    request_ids = project_doc.get("join_requests", [])
    if not request_ids:
        return []
    cursor = db["users"].find({
        "$or": [
            {"user_id": {"$in": request_ids}},
            {"_id": {"$in": [ObjectId(uid) for uid in request_ids if ObjectId.is_valid(uid)]}}
        ]
    })
    users = await cursor.to_list(length=len(request_ids))
    user_map = {}
    for u in users:
        uid = u.get("user_id") or str(u.get("_id"))
        user_map[uid] = {
            "user_id": uid,
            "github_username": u.get("github_username", ""),
            "name": u.get("name") or u.get("github_username", ""),
            "avatar_url": u.get("avatar_url")
        }
    return [user_map.get(uid, {"user_id": uid, "github_username": f"user-{uid[:6]}", "name": "Applicant", "avatar_url": None}) for uid in request_ids]


async def build_project_response(db: AsyncIOMotorDatabase, doc: dict) -> ProjectResponse:
    member_details = await resolve_member_details(db, doc)
    join_request_details = await resolve_join_request_details(db, doc)
    model = ProjectModel(**doc)
    return ProjectResponse(
        **{
            **model.model_dump(),
            "member_details": member_details,
            "join_request_details": join_request_details,
        }
    )


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
        clean_url = project_data.github_repo_url.strip().rstrip("/")
        if clean_url.endswith(".git"):
            clean_url = clean_url[:-4]
        parts = clean_url.split("/")
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
        discord_guild_id=project_data.discord_guild_id.strip() if project_data.discord_guild_id else "",
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

    return await build_project_response(db, project.model_dump())

from pydantic import BaseModel

class ActivityItem(BaseModel):
    id: str
    type: str  # "commit" | "pr" | "discord" | "decision" | "chat" | "member" | "sync"
    title: str
    description: str = ""
    author: str = ""
    source: str = ""
    timestamp: str = ""
    url: str = ""


class JoinRequestSchema(BaseModel):
    join_code: str

@router.post("/join/request")
async def request_join(
    data: JoinRequestSchema,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Request to join a project using a join code."""
    code = data.join_code.strip().upper()
    doc = await db["projects"].find_one({"join_code": code})
    if not doc:
        doc = await db["projects"].find_one({"join_code": {"$regex": f"^{code}$", "$options": "i"}})
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

@router.get("/{project_id}/join/requests")
async def get_join_requests(
    project_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get pending join requests for a project (owner only)."""
    doc = await db["projects"].find_one({"project_id": project_id, "owner_id": current_user.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found or not owner")

    project = ProjectModel(**doc)
    join_request_uids = project.join_requests or []
    if not join_request_uids:
        return []

    cursor = db["users"].find({
        "$or": [
            {"user_id": {"$in": join_request_uids}},
            {"_id": {"$in": [ObjectId(uid) for uid in join_request_uids if ObjectId.is_valid(uid)]}}
        ]
    })
    users = await cursor.to_list(length=len(join_request_uids))
    user_map = {}
    for u in users:
        uid = u.get("user_id") or str(u.get("_id"))
        user_map[uid] = u

    return [
        {
            "request_id": uid,
            "user_id": uid,
            "user_name": user_map.get(uid, {}).get("name") or user_map.get(uid, {}).get("github_username", "Unknown User"),
            "github_username": user_map.get(uid, {}).get("github_username", ""),
            "avatar_url": user_map.get(uid, {}).get("avatar_url", ""),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        for uid in join_request_uids
    ]


@router.post("/{project_id}/join/approve/{user_id}")
@router.post("/{project_id}/join/requests/{user_id}/approve")
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
@router.post("/{project_id}/join/requests/{user_id}/reject")
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
@router.post("/{project_id}/invite")
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
        resp = await build_project_response(db, doc)
        projects.append(resp)
    return projects


@router.get("/activity/all", response_model=list[ActivityItem])
async def get_all_recent_activity(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch global recent activity across all projects the user is a member of."""
    cursor = db["projects"].find({"members": current_user.user_id})
    user_projects = await cursor.to_list(length=50)
    if not user_projects:
        return []

    project_ids = [p["project_id"] for p in user_projects]
    project_map = {p["project_id"]: p.get("name", "Project") for p in user_projects}

    activities = []

    # 1. Decisions across all user projects
    dec_cursor = db["decisions"].find({"project_id": {"$in": project_ids}}).sort("timestamp", -1).limit(15)
    async for dec in dec_cursor:
        pid = dec.get("project_id", "")
        pname = project_map.get(pid, "Project")
        activities.append({
            "id": f"dec_{dec.get('_id')}",
            "type": "decision",
            "title": f"Decision: {dec.get('decision_text', '')[:90]}",
            "description": dec.get("reasoning", "")[:150],
            "author": ", ".join(dec.get("participants", [])) or "Forge AI",
            "source": f"{pname} • Decision",
            "timestamp": dec.get("timestamp") or dec.get("extracted_at") or datetime.now(timezone.utc).isoformat(),
            "url": dec.get("source_url", f"/project/{pid}/decisions"),
        })

    # 2. Group Chat messages across user projects
    gc_cursor = db["group_chat_history"].find({"project_id": {"$in": project_ids}}).sort("created_at", -1).limit(15)
    async for msg in gc_cursor:
        pid = msg.get("project_id", "")
        pname = project_map.get(pid, "Project")
        activities.append({
            "id": f"gc_{msg.get('_id')}",
            "type": "chat",
            "title": f"{msg.get('user_name', 'Member')}: {msg.get('content', '')[:80]}",
            "description": msg.get("content", "")[:150],
            "author": msg.get("user_name", "Team Member"),
            "source": f"{pname} • Team Chat",
            "timestamp": msg.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(msg.get("created_at"), datetime) else str(msg.get("created_at")),
            "url": f"/project/{pid}/group-chat",
        })

    # 3. Project creations & GitHub sync status
    for p in user_projects:
        pid = p.get("project_id", "")
        pname = p.get("name", "Project")
        ingestion = p.get("ingestion_status", {})
        if ingestion.get("github_backfill_complete"):
            activities.append({
                "id": f"sync_gh_{pid}",
                "type": "commit",
                "title": f"GitHub Indexed: {p.get('github_repo_name') or 'Repository'}",
                "description": f"{ingestion.get('github_chunks_count', 0)} chunks vectorized",
                "author": "GitHub Integration",
                "source": f"{pname} • GitHub Sync",
                "timestamp": ingestion.get("last_github_sync") or p.get("updated_at", datetime.now(timezone.utc)).isoformat(),
                "url": p.get("github_repo_url", ""),
            })

        activities.append({
            "id": f"proj_{pid}",
            "type": "member",
            "title": f"Project '{pname}' created",
            "description": p.get("description") or "Workspace active",
            "author": "Project Owner",
            "source": f"{pname} • Workspace",
            "timestamp": p.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(p.get("created_at"), datetime) else str(p.get("created_at")),
            "url": f"/project/{pid}",
        })

    def parse_time(item):
        ts = item.get("timestamp")
        if isinstance(ts, datetime):
            return ts
        if isinstance(ts, str):
            try:
                return datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                pass
        return datetime.min.replace(tzinfo=timezone.utc)

    activities.sort(key=parse_time, reverse=True)
    return [ActivityItem(**item) for item in activities[:25]]


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
    
    return await build_project_response(db, doc)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update_data: ProjectUpdate,
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
        clean_url = update_dict["github_repo_url"].strip().rstrip("/")
        if clean_url.endswith(".git"):
            clean_url = clean_url[:-4]
        parts = clean_url.split("/")
        if len(parts) >= 2:
            update_dict["github_repo_name"] = f"{parts[-2]}/{parts[-1]}"

    await db["projects"].update_one(
        {"project_id": project_id},
        {"$set": update_dict}
    )

    updated_doc = await db["projects"].find_one({"project_id": project_id})
    return await build_project_response(db, updated_doc)


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


@router.get("/{project_id}/activity", response_model=list[ActivityItem])
async def get_project_activity(
    project_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch real activity timeline for a project."""
    doc = await db["projects"].find_one({
        "project_id": project_id,
        "members": current_user.user_id,
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")

    activities = []

    # 1. Decisions extracted for this project
    decisions_cursor = db["decisions"].find({"project_id": project_id}).sort("timestamp", -1).limit(10)
    async for dec in decisions_cursor:
        activities.append({
            "id": f"dec_{dec.get('_id')}",
            "type": "decision",
            "title": f"Decision: {dec.get('decision_text', '')[:100]}",
            "description": dec.get("reasoning", "")[:180],
            "author": ", ".join(dec.get("participants", [])) or "Forge AI",
            "source": f"Decision Engine ({dec.get('source_type', 'AI')})",
            "timestamp": dec.get("timestamp") or dec.get("extracted_at") or datetime.now(timezone.utc).isoformat(),
            "url": dec.get("source_url", f"/project/{project_id}/decisions"),
        })

    # 2. Team Group Chat Messages
    chat_cursor = db["group_chat_history"].find({"project_id": project_id}).sort("created_at", -1).limit(15)
    async for msg in chat_cursor:
        activities.append({
            "id": f"gc_{msg.get('_id')}",
            "type": "chat",
            "title": f"{msg.get('user_name', 'Team Member')}: {msg.get('content', '')[:90]}",
            "description": msg.get("content", "")[:180],
            "author": msg.get("user_name", "Team Member"),
            "source": "Team Group Chat",
            "timestamp": msg.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(msg.get("created_at"), datetime) else str(msg.get("created_at")),
            "url": f"/project/{project_id}/group-chat",
        })

    # 3. Discord Messages from Qdrant vector memory
    try:
        qdrant = get_qdrant()
        coll_name = doc.get("qdrant_collection_name", f"forge_{project_id}")
        records, _ = await qdrant.scroll(
            collection_name=coll_name,
            scroll_filter={
                "must": [
                    {"key": "source_type", "match": {"value": "discord_message"}}
                ]
            },
            limit=10,
            with_payload=True,
        )
        for pt in records:
            p = pt.payload or {}
            activities.append({
                "id": f"disc_{pt.id}",
                "type": "discord",
                "title": f"Discord @{p.get('author', 'member')}: {p.get('text', '')[:80]}",
                "description": p.get("text", "")[:180],
                "author": p.get("author", "Discord Member"),
                "source": f"Discord #{p.get('channel', 'general')}",
                "timestamp": p.get("timestamp", datetime.now(timezone.utc).isoformat()),
                "url": "",
            })
    except Exception:
        pass

    # 4. GitHub Sync Activity
    ingestion = doc.get("ingestion_status", {})
    if ingestion.get("github_backfill_complete"):
        activities.append({
            "id": f"sync_gh_{doc.get('project_id')}",
            "type": "commit",
            "title": f"GitHub Indexed: {doc.get('github_repo_name') or 'Repository'}",
            "description": f"{ingestion.get('github_chunks_count', 0)} chunks vectorized and available for AI search",
            "author": "GitHub Integration",
            "source": "GitHub Sync",
            "timestamp": ingestion.get("last_github_sync") or doc.get("updated_at", datetime.now(timezone.utc)).isoformat(),
            "url": doc.get("github_repo_url", ""),
        })

    # 5. Project Workspace Creation
    activities.append({
        "id": f"proj_{doc.get('project_id')}",
        "type": "member",
        "title": f"Project '{doc.get('name')}' created",
        "description": doc.get("description") or "Project workspace initialized",
        "author": "Project Owner",
        "source": "Forge Workspace",
        "timestamp": doc.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at")),
        "url": "",
    })

    # Sort all activities by timestamp descending
    def parse_time(item):
        ts = item.get("timestamp")
        if isinstance(ts, datetime):
            return ts
        if isinstance(ts, str):
            try:
                return datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                pass
        return datetime.min.replace(tzinfo=timezone.utc)

    activities.sort(key=parse_time, reverse=True)
    return [ActivityItem(**item) for item in activities[:20]]

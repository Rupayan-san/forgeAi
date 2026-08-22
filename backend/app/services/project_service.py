import random
import string
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_qdrant
from app.models.chat import ChatMessageModel
from app.models.project import (
    IngestionStatus,
    MemberDetail,
    ProjectAIConfig,
    ProjectAIConfigUpdate,
    ProjectCreate,
    ProjectModel,
    ProjectResponse,
    ProjectRole,
    ProjectSettingsUpdate,
    ProjectUpdate,
)
from app.models.user import UserModel
from app.services.qdrant_service import QdrantService


class ProjectService:
    """Handles project lifecycle, membership, permissions, settings, and AI configuration."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["projects"]
        self.users_collection = db["users"]
        self.chat_collection = db["chat_history"]
        self.decisions_collection = db["decisions"]
        self.group_chat_collection = db["group_chat_history"]

    # ==================== Member & User Resolution Helpers ====================

    async def resolve_member_details(self, project: ProjectModel) -> list[MemberDetail]:
        """Resolve member user IDs into MemberDetail objects with rich profile and role data."""
        member_ids = list(dict.fromkeys(project.members))
        if not member_ids:
            return []

        cursor = self.users_collection.find({
            "$or": [
                {"user_id": {"$in": member_ids}},
                {"_id": {"$in": [ObjectId(uid) for uid in member_ids if ObjectId.is_valid(uid)]}},
            ]
        })
        users = await cursor.to_list(length=len(member_ids))
        user_map: dict[str, dict] = {}
        for u in users:
            uid = u.get("user_id") or str(u.get("_id"))
            user_map[uid] = u

        member_details: list[MemberDetail] = []
        for uid in member_ids:
            user_data = user_map.get(uid)
            # Determine role: primary owner_id or explicit member_roles or default "member"
            if uid == project.owner_id:
                role = ProjectRole.OWNER.value
            elif project.member_roles and uid in project.member_roles:
                role = project.member_roles[uid]
            else:
                role = ProjectRole.MEMBER.value

            if user_data:
                member_details.append(
                    MemberDetail(
                        user_id=uid,
                        github_username=user_data.get("github_username", f"user-{uid[:6]}"),
                        name=user_data.get("name") or user_data.get("github_username"),
                        avatar_url=user_data.get("avatar_url"),
                        role=role,
                        joined_at=user_data.get("created_at"),
                    )
                )
            else:
                member_details.append(
                    MemberDetail(
                        user_id=uid,
                        github_username=f"user-{uid[:6]}",
                        name="Member",
                        avatar_url=None,
                        role=role,
                    )
                )

        return member_details

    async def resolve_join_request_details(self, project: ProjectModel) -> list[MemberDetail]:
        """Resolve join request user IDs into applicant details."""
        request_ids = list(dict.fromkeys(project.join_requests))
        if not request_ids:
            return []

        cursor = self.users_collection.find({
            "$or": [
                {"user_id": {"$in": request_ids}},
                {"_id": {"$in": [ObjectId(uid) for uid in request_ids if ObjectId.is_valid(uid)]}},
            ]
        })
        users = await cursor.to_list(length=len(request_ids))
        user_map: dict[str, dict] = {}
        for u in users:
            uid = u.get("user_id") or str(u.get("_id"))
            user_map[uid] = u

        details: list[MemberDetail] = []
        for uid in request_ids:
            user_data = user_map.get(uid)
            if user_data:
                details.append(
                    MemberDetail(
                        user_id=uid,
                        github_username=user_data.get("github_username", f"user-{uid[:6]}"),
                        name=user_data.get("name") or user_data.get("github_username"),
                        avatar_url=user_data.get("avatar_url"),
                        role="applicant",
                    )
                )
            else:
                details.append(
                    MemberDetail(
                        user_id=uid,
                        github_username=f"user-{uid[:6]}",
                        name="Applicant",
                        avatar_url=None,
                        role="applicant",
                    )
                )

        return details

    async def build_project_response(
        self, project_or_doc: ProjectModel | dict, current_user_id: str | None = None
    ) -> ProjectResponse:
        """Construct a full ProjectResponse with resolved members and current user's role."""
        if isinstance(project_or_doc, dict):
            project = ProjectModel(**project_or_doc)
        else:
            project = project_or_doc

        member_details = await self.resolve_member_details(project)
        join_request_details = await self.resolve_join_request_details(project)

        # Determine user role in response
        user_role = None
        if current_user_id:
            if current_user_id == project.owner_id:
                user_role = ProjectRole.OWNER.value
            elif project.member_roles and current_user_id in project.member_roles:
                user_role = project.member_roles[current_user_id]
            elif current_user_id in project.members:
                user_role = ProjectRole.MEMBER.value

        return ProjectResponse(
            project_id=project.project_id,
            name=project.name,
            description=project.description,
            owner_id=project.owner_id,
            members=project.members,
            member_roles=project.member_roles,
            ai_config=project.ai_config or ProjectAIConfig(),
            user_role=user_role,
            join_code=project.join_code,
            join_requests=project.join_requests,
            max_members=project.max_members,
            member_details=member_details,
            join_request_details=join_request_details,
            github_repo_url=project.github_repo_url,
            github_repo_name=project.github_repo_name,
            github_branch=project.github_branch or "main",
            discord_guild_id=project.discord_guild_id,
            discord_channels=project.discord_channels or [],
            discord_bot_active=project.discord_bot_active,
            ingestion_status=project.ingestion_status,
            created_at=project.created_at,
            updated_at=project.updated_at,
        )

    # ==================== Project CRUD ====================

    async def create_project(self, current_user: UserModel, project_data: ProjectCreate) -> ProjectResponse:
        """Create a new project workspace with owner role and default AI config."""
        project_id = str(ObjectId())
        collection_name = f"forge_{project_id}"
        join_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

        github_repo_name = ""
        if project_data.github_repo_url:
            clean_url = project_data.github_repo_url.strip().rstrip("/")
            if clean_url.endswith(".git"):
                clean_url = clean_url[:-4]
            parts = clean_url.split("/")
            if len(parts) >= 2:
                github_repo_name = f"{parts[-2]}/{parts[-1]}"

        ai_config = project_data.ai_config if project_data.ai_config else ProjectAIConfig()

        project = ProjectModel(
            project_id=project_id,
            name=project_data.name.strip(),
            description=project_data.description.strip(),
            owner_id=current_user.user_id,
            members=[current_user.user_id],
            member_roles={current_user.user_id: ProjectRole.OWNER.value},
            ai_config=ai_config,
            join_code=join_code,
            join_requests=[],
            max_members=project_data.max_members,
            github_repo_url=project_data.github_repo_url.strip(),
            github_repo_name=github_repo_name,
            discord_guild_id=project_data.discord_guild_id.strip() if project_data.discord_guild_id else "",
            qdrant_collection_name=collection_name,
            ingestion_status=IngestionStatus(),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        await self.collection.insert_one(project.model_dump(by_alias=True))

        # Initialize Qdrant collection
        try:
            qdrant = get_qdrant()
            qdrant_service = QdrantService(qdrant)
            await qdrant_service.ensure_collection(collection_name)
        except Exception as e:
            print(f"Warning: Failed to create Qdrant collection for project {project_id}: {e}")

        return await self.build_project_response(project, current_user.user_id)

    async def get_project(self, project_id: str, current_user_id: str | None = None) -> ProjectResponse:
        """Fetch project by ID."""
        doc = await self.collection.find_one({"project_id": project_id})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return await self.build_project_response(doc, current_user_id)

    async def list_projects(self, current_user_id: str) -> list[ProjectResponse]:
        """List all projects where current user is an owner or member."""
        query_conditions: list[dict] = [
            {"members": current_user_id},
            {"owner_id": current_user_id},
            {f"member_roles.{current_user_id}": {"$exists": True}},
        ]
        if ObjectId.is_valid(current_user_id):
            query_conditions.extend([
                {"members": ObjectId(current_user_id)},
                {"owner_id": ObjectId(current_user_id)},
            ])

        cursor = self.collection.find({"$or": query_conditions}).sort("created_at", -1)
        projects: list[ProjectResponse] = []
        async for doc in cursor:
            resp = await self.build_project_response(doc, current_user_id)
            projects.append(resp)
        return projects

    async def update_project(
        self,
        project: ProjectModel,
        update_data: ProjectUpdate | ProjectSettingsUpdate,
        current_user_id: str | None = None,
    ) -> ProjectResponse:
        """Update project settings and metadata."""
        dumped = update_data.model_dump(exclude_unset=True)
        update_dict: dict = {}

        if "name" in dumped and dumped["name"] is not None:
            name = dumped["name"].strip()
            if not name:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project name cannot be empty")
            update_dict["name"] = name

        if "description" in dumped and dumped["description"] is not None:
            update_dict["description"] = dumped["description"].strip()

        if "max_members" in dumped and dumped["max_members"] is not None:
            max_m = dumped["max_members"]
            if max_m < len(project.members):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Max members ({max_m}) cannot be less than current member count ({len(project.members)})",
                )
            update_dict["max_members"] = max_m

        if "github_repo_url" in dumped and dumped["github_repo_url"] is not None:
            repo_url = dumped["github_repo_url"].strip()
            update_dict["github_repo_url"] = repo_url
            if repo_url:
                clean_url = repo_url.rstrip("/")
                if clean_url.endswith(".git"):
                    clean_url = clean_url[:-4]
                parts = clean_url.split("/")
                if len(parts) >= 2:
                    update_dict["github_repo_name"] = f"{parts[-2]}/{parts[-1]}"
            else:
                update_dict["github_repo_name"] = ""

        if "github_branch" in dumped and dumped["github_branch"] is not None:
            update_dict["github_branch"] = dumped["github_branch"].strip() or "main"

        if "discord_guild_id" in dumped and dumped["discord_guild_id"] is not None:
            update_dict["discord_guild_id"] = dumped["discord_guild_id"].strip()

        if "discord_channels" in dumped and dumped["discord_channels"] is not None:
            update_dict["discord_channels"] = [c.strip() for c in dumped["discord_channels"] if c.strip()]

        if "ai_config" in dumped and dumped["ai_config"] is not None:
            ai_data = dumped["ai_config"]
            if isinstance(ai_data, dict):
                ai_cfg = ProjectAIConfig(**ai_data)
            else:
                ai_cfg = ai_data
            update_dict["ai_config"] = ai_cfg.model_dump()

        if not update_dict:
            return await self.build_project_response(project, current_user_id)

        update_dict["updated_at"] = datetime.now(timezone.utc)

        await self.collection.update_one(
            {"project_id": project.project_id},
            {"$set": update_dict},
        )

        updated_doc = await self.collection.find_one({"project_id": project.project_id})
        return await self.build_project_response(updated_doc, current_user_id)

    async def delete_project(self, project: ProjectModel) -> None:
        """Delete a project and cascade delete all associated data."""
        # Delete Qdrant vector memory
        try:
            qdrant = get_qdrant()
            qdrant_service = QdrantService(qdrant)
            collection_name = project.qdrant_collection_name or f"forge_{project.project_id}"
            await qdrant_service.delete_collection(collection_name)
        except Exception as e:
            print(f"Warning: Failed to delete Qdrant collection for project {project.project_id}: {e}")

        # Delete database records
        await self.collection.delete_one({"project_id": project.project_id})
        await self.decisions_collection.delete_many({"project_id": project.project_id})
        await self.chat_collection.delete_many({"project_id": project.project_id})
        await self.group_chat_collection.delete_many({"project_id": project.project_id})

    # ==================== Membership & Roles ====================

    async def get_members(self, project: ProjectModel) -> list[MemberDetail]:
        """List all members with roles and profiles."""
        return await self.resolve_member_details(project)

    async def invite_member(self, project: ProjectModel, github_username: str) -> MemberDetail:
        """Invite an existing registered user by GitHub username."""
        clean_username = github_username.strip()
        if not clean_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GitHub username is required")

        if len(project.members) >= project.max_members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This project has reached its maximum limit of {project.max_members} members.",
            )

        # Lookup user by case-insensitive github_username
        user_doc = await self.users_collection.find_one({
            "github_username": {"$regex": f"^{clean_username}$", "$options": "i"}
        })
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with GitHub username '{clean_username}' not found. Please ensure they have logged into Forge at least once.",
            )

        invitee_id = user_doc.get("user_id") or str(user_doc.get("_id"))
        if invitee_id in project.members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this project.",
            )

        # Add to members, set role to MEMBER, clear from join_requests if present
        await self.collection.update_one(
            {"project_id": project.project_id},
            {
                "$addToSet": {"members": invitee_id},
                "$pull": {"join_requests": invitee_id},
                "$set": {
                    f"member_roles.{invitee_id}": ProjectRole.MEMBER.value,
                    "updated_at": datetime.now(timezone.utc),
                },
            },
        )

        # Send welcome onboarding chat message
        ai_name = project.ai_config.name if project.ai_config else "Forge"
        welcome_msg = ChatMessageModel(
            message_id=str(ObjectId()),
            project_id=project.project_id,
            user_id=invitee_id,
            role="assistant",
            content=(
                f"Welcome to {project.name}! I am {ai_name}, your AI project partner. "
                f"Here is a summary of what we are building:\n\n"
                f"{project.description or 'No description provided.'}\n\n"
                f"Feel free to ask me any questions about the repository, decisions, or architecture!"
            ),
            sources=[],
            interface_type="text",
            created_at=datetime.now(timezone.utc),
        )
        await self.chat_collection.insert_one(welcome_msg.model_dump(by_alias=True))

        return MemberDetail(
            user_id=invitee_id,
            github_username=user_doc.get("github_username", clean_username),
            name=user_doc.get("name") or user_doc.get("github_username"),
            avatar_url=user_doc.get("avatar_url"),
            role=ProjectRole.MEMBER.value,
            joined_at=datetime.now(timezone.utc),
        )

    async def remove_member(self, project: ProjectModel, target_user_id: str, actor_id: str) -> None:
        """Remove a member from the project. Ensures projects cannot become ownerless."""
        if target_user_id not in project.members and target_user_id != project.owner_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this project")

        # Find all owners
        all_owners: list[str] = []
        for uid in project.members:
            if uid == project.owner_id or (project.member_roles and project.member_roles.get(uid) == ProjectRole.OWNER.value):
                all_owners.append(uid)
        all_owners = list(dict.fromkeys(all_owners))

        # Check if removing the final owner
        if target_user_id in all_owners and len(all_owners) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the sole owner of the project. Please promote another member to owner first or delete the project.",
            )

        update_ops: dict = {
            "$pull": {"members": target_user_id, "join_requests": target_user_id},
            "$unset": {f"member_roles.{target_user_id}": ""},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        }

        # If removed member is the primary owner_id, transfer owner_id to next remaining owner
        if project.owner_id == target_user_id:
            remaining_owners = [uid for uid in all_owners if uid != target_user_id]
            if remaining_owners:
                update_ops["$set"]["owner_id"] = remaining_owners[0]

        await self.collection.update_one({"project_id": project.project_id}, update_ops)

    async def update_member_role(
        self, project: ProjectModel, target_user_id: str, new_role: str, actor_id: str
    ) -> MemberDetail:
        """Update a member's role (OWNER or MEMBER). Prevents demoting the sole owner."""
        if target_user_id not in project.members and target_user_id != project.owner_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this project")

        if new_role not in [ProjectRole.OWNER.value, ProjectRole.MEMBER.value]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role: {new_role}")

        # Find all current owners
        all_owners: list[str] = []
        for uid in project.members:
            if uid == project.owner_id or (project.member_roles and project.member_roles.get(uid) == ProjectRole.OWNER.value):
                all_owners.append(uid)
        all_owners = list(dict.fromkeys(all_owners))

        # If demoting to member and this is the only owner, reject
        if target_user_id in all_owners and len(all_owners) <= 1 and new_role == ProjectRole.MEMBER.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the sole owner of the project. Promote another member to owner first.",
            )

        update_set: dict = {
            f"member_roles.{target_user_id}": new_role,
            "updated_at": datetime.now(timezone.utc),
        }

        # If demoting primary owner_id and multiple owners exist, transfer owner_id to next owner
        if project.owner_id == target_user_id and new_role == ProjectRole.MEMBER.value:
            remaining_owners = [uid for uid in all_owners if uid != target_user_id]
            if remaining_owners:
                update_set["owner_id"] = remaining_owners[0]

        await self.collection.update_one(
            {"project_id": project.project_id},
            {"$set": update_set},
        )

        user_doc = await self.users_collection.find_one({
            "$or": [
                {"user_id": target_user_id},
                {"_id": ObjectId(target_user_id) if ObjectId.is_valid(target_user_id) else None},
            ]
        })

        return MemberDetail(
            user_id=target_user_id,
            github_username=user_doc.get("github_username", f"user-{target_user_id[:6]}") if user_doc else f"user-{target_user_id[:6]}",
            name=(user_doc.get("name") or user_doc.get("github_username")) if user_doc else "Member",
            avatar_url=user_doc.get("avatar_url") if user_doc else None,
            role=new_role,
        )

    # ==================== Join Requests ====================

    async def request_join(self, join_code: str, user_id: str) -> dict:
        """Submit a request to join a project via join code."""
        code = join_code.strip().upper()
        if not code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Join code is required")

        doc = await self.collection.find_one({"join_code": {"$regex": f"^{code}$", "$options": "i"}})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or invalid join code",
            )

        project = ProjectModel(**doc)

        if user_id in project.members:
            return {"message": "You are already a member of this project", "status": "already_member"}

        if len(project.members) >= project.max_members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This project has reached its maximum member limit.",
            )

        if user_id not in project.join_requests:
            await self.collection.update_one(
                {"project_id": project.project_id},
                {"$push": {"join_requests": user_id}, "$set": {"updated_at": datetime.now(timezone.utc)}},
            )

        return {"message": "Join request sent successfully", "status": "pending"}

    async def get_my_pending_projects(self, user_id: str) -> list[ProjectResponse]:
        """List all projects where current user has a pending join request."""
        query_conditions = [{"join_requests": user_id}]
        if ObjectId.is_valid(user_id):
            query_conditions.append({"join_requests": ObjectId(user_id)})

        cursor = self.collection.find({"$or": query_conditions})
        projects: list[ProjectResponse] = []
        async for doc in cursor:
            resp = await self.build_project_response(doc, user_id)
            projects.append(resp)
        return projects

    async def get_join_requests(self, project: ProjectModel) -> list[dict]:
        """Fetch join requests with applicant details."""
        request_ids = project.join_requests or []
        if not request_ids:
            return []

        cursor = self.users_collection.find({
            "$or": [
                {"user_id": {"$in": request_ids}},
                {"_id": {"$in": [ObjectId(uid) for uid in request_ids if ObjectId.is_valid(uid)]}},
            ]
        })
        users = await cursor.to_list(length=len(request_ids))
        user_map = {}
        for u in users:
            uid = u.get("user_id") or str(u.get("_id"))
            user_map[uid] = u

        return [
            {
                "request_id": uid,
                "user_id": uid,
                "user_name": user_map.get(uid, {}).get("name") or user_map.get(uid, {}).get("github_username", "Applicant"),
                "github_username": user_map.get(uid, {}).get("github_username", ""),
                "avatar_url": user_map.get(uid, {}).get("avatar_url", ""),
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            for uid in request_ids
        ]

    async def approve_join_request(self, project: ProjectModel, target_user_id: str) -> dict:
        """Approve a user's join request and add them as a member."""
        if len(project.members) >= project.max_members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This project has reached its maximum member limit.",
            )

        await self.collection.update_one(
            {"project_id": project.project_id},
            {
                "$pull": {"join_requests": target_user_id},
                "$addToSet": {"members": target_user_id},
                "$set": {
                    f"member_roles.{target_user_id}": ProjectRole.MEMBER.value,
                    "updated_at": datetime.now(timezone.utc),
                },
            },
        )

        ai_name = project.ai_config.name if project.ai_config else "Forge"
        welcome_msg = ChatMessageModel(
            message_id=str(ObjectId()),
            project_id=project.project_id,
            user_id=target_user_id,
            role="assistant",
            content=(
                f"Welcome to {project.name}! I am {ai_name}, your AI project partner. "
                f"Here is a summary of what we are building:\n\n"
                f"{project.description or 'No description provided.'}\n\n"
                f"Feel free to ask me any questions about the repository, team conversations, or decisions!"
            ),
            sources=[],
            interface_type="text",
            created_at=datetime.now(timezone.utc),
        )
        await self.chat_collection.insert_one(welcome_msg.model_dump(by_alias=True))

        return {"message": "User join request approved"}

    async def reject_join_request(self, project: ProjectModel, target_user_id: str) -> dict:
        """Reject a user's join request."""
        await self.collection.update_one(
            {"project_id": project.project_id},
            {
                "$pull": {"join_requests": target_user_id},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )
        return {"message": "User join request rejected"}

    # ==================== AI Configuration ====================

    async def get_ai_config(self, project: ProjectModel) -> ProjectAIConfig:
        """Get project AI persona and configuration."""
        return project.ai_config or ProjectAIConfig()

    async def update_ai_config(
        self, project: ProjectModel, ai_config_data: ProjectAIConfig | ProjectAIConfigUpdate
    ) -> ProjectAIConfig:
        """Update project AI persona and configuration."""
        clean_name = ai_config_data.name.strip()
        clean_role = ai_config_data.role.strip()
        clean_phrase = ai_config_data.invocation_phrase.strip()

        if not clean_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AI Name cannot be empty")
        if not clean_role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AI Role cannot be empty")
        if not clean_phrase:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AI Invocation Phrase cannot be empty")

        new_config = ProjectAIConfig(
            name=clean_name,
            role=clean_role,
            invocation_phrase=clean_phrase,
        )

        await self.collection.update_one(
            {"project_id": project.project_id},
            {
                "$set": {
                    "ai_config": new_config.model_dump(),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        return new_config

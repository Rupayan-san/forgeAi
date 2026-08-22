import pytest
import mongomock_motor
from bson import ObjectId
from datetime import datetime, timezone
from fastapi import HTTPException
import httpx
from httpx import ASGITransport

from app.main import app
from app.core.database import get_db
from app.api.v1.dependencies import get_current_user
from app.models.user import UserModel
from app.models.project import (
    ProjectAIConfig,
    ProjectAIConfigUpdate,
    ProjectCreate,
    ProjectModel,
    ProjectRole,
    ProjectSettingsUpdate,
    ProjectUpdate,
)
from app.services.project_service import ProjectService


@pytest.fixture
def mock_db():
    """Create a clean in-memory async mock MongoDB database."""
    client = mongomock_motor.AsyncMongoMockClient()
    return client["test_forge_db"]


@pytest.fixture
def owner_user():
    return UserModel(
        user_id="user_owner_1",
        email="owner@example.com",
        name="Owner Alice",
        github_username="alice-owner",
    )


@pytest.fixture
def member_user():
    return UserModel(
        user_id="user_member_2",
        email="member@example.com",
        name="Member Bob",
        github_username="bob-member",
    )


@pytest.fixture
def outsider_user():
    return UserModel(
        user_id="user_outsider_3",
        email="outsider@example.com",
        name="Outsider Charlie",
        github_username="charlie-outsider",
    )


# ==================== 1. AI Configuration Tests ====================

@pytest.mark.asyncio
async def test_default_ai_configuration(mock_db, owner_user):
    """Verify that a newly created project receives default AI configuration."""
    service = ProjectService(mock_db)
    create_data = ProjectCreate(
        name="Atlas Project",
        description="A cool AI workspace",
    )
    project_resp = await service.create_project(owner_user, create_data)

    assert project_resp.ai_config is not None
    assert project_resp.ai_config.name == "Forge"
    assert project_resp.ai_config.role == "Project Assistant"
    assert project_resp.ai_config.invocation_phrase == "Forge"


@pytest.mark.asyncio
async def test_custom_ai_configuration_on_create(mock_db, owner_user):
    """Verify that custom AI configuration can be passed upon creation."""
    service = ProjectService(mock_db)
    custom_ai = ProjectAIConfig(
        name="Atlas",
        role="Senior Software Architect",
        invocation_phrase="Atlas",
    )
    create_data = ProjectCreate(
        name="Custom AI Project",
        description="Project with Atlas AI",
        ai_config=custom_ai,
    )
    project_resp = await service.create_project(owner_user, create_data)

    assert project_resp.ai_config.name == "Atlas"
    assert project_resp.ai_config.role == "Senior Software Architect"
    assert project_resp.ai_config.invocation_phrase == "Atlas"


@pytest.mark.asyncio
async def test_update_ai_configuration(mock_db, owner_user):
    """Verify that owner can update AI configuration."""
    service = ProjectService(mock_db)
    project_resp = await service.create_project(
        owner_user, ProjectCreate(name="AI Config Test")
    )

    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)

    new_ai = ProjectAIConfigUpdate(
        name="Hermes",
        role="DevOps & Reliability Engineer",
        invocation_phrase="Hermes",
    )
    updated_config = await service.update_ai_config(project, new_ai)

    assert updated_config.name == "Hermes"
    assert updated_config.role == "DevOps & Reliability Engineer"
    assert updated_config.invocation_phrase == "Hermes"

    # Verify persisted in database
    refetched = await service.get_project(project.project_id)
    assert refetched.ai_config.name == "Hermes"
    assert refetched.ai_config.role == "DevOps & Reliability Engineer"


@pytest.mark.asyncio
async def test_invalid_ai_configuration_rejected(mock_db, owner_user):
    """Verify that empty AI configuration values are rejected."""
    service = ProjectService(mock_db)
    project_resp = await service.create_project(
        owner_user, ProjectCreate(name="Invalid AI Test")
    )
    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)

    with pytest.raises(HTTPException) as exc_info:
        await service.update_ai_config(
            project,
            ProjectAIConfigUpdate(name="   ", role="Valid Role", invocation_phrase="Valid"),
        )
    assert exc_info.value.status_code == 400


# ==================== 2. Membership & Roles Tests ====================

@pytest.mark.asyncio
async def test_project_creator_is_owner(mock_db, owner_user):
    """Verify that project creator is assigned the OWNER role."""
    service = ProjectService(mock_db)
    project_resp = await service.create_project(
        owner_user, ProjectCreate(name="Ownership Test")
    )

    assert project_resp.owner_id == owner_user.user_id
    assert owner_user.user_id in project_resp.members
    assert project_resp.member_roles.get(owner_user.user_id) == ProjectRole.OWNER.value
    assert project_resp.user_role == ProjectRole.OWNER.value


@pytest.mark.asyncio
async def test_invite_member(mock_db, owner_user, member_user):
    """Verify inviting a user by GitHub username adds them with MEMBER role."""
    await mock_db["users"].insert_one(member_user.model_dump(by_alias=True))

    service = ProjectService(mock_db)
    project_resp = await service.create_project(
        owner_user, ProjectCreate(name="Invite Test")
    )
    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)

    member_detail = await service.invite_member(project, member_user.github_username)
    assert member_detail.user_id == member_user.user_id
    assert member_detail.role == ProjectRole.MEMBER.value

    # Verify project document updated
    refetched = await service.get_project(project.project_id)
    assert member_user.user_id in refetched.members
    assert refetched.member_roles.get(member_user.user_id) == ProjectRole.MEMBER.value


@pytest.mark.asyncio
async def test_prevent_duplicate_membership(mock_db, owner_user, member_user):
    """Verify that inviting an already existing member is prevented."""
    await mock_db["users"].insert_one(member_user.model_dump(by_alias=True))

    service = ProjectService(mock_db)
    project_resp = await service.create_project(
        owner_user, ProjectCreate(name="Duplicate Member Test")
    )
    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)

    # First invite succeeds
    await service.invite_member(project, member_user.github_username)

    # Refresh project model
    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)

    # Second invite must fail
    with pytest.raises(HTTPException) as exc:
        await service.invite_member(project, member_user.github_username)
    assert exc.value.status_code == 400
    assert "already a member" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_update_member_role(mock_db, owner_user, member_user):
    """Verify promoting a member to owner and demoting back."""
    await mock_db["users"].insert_one(member_user.model_dump(by_alias=True))

    service = ProjectService(mock_db)
    project_resp = await service.create_project(
        owner_user, ProjectCreate(name="Role Change Test")
    )
    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)

    await service.invite_member(project, member_user.github_username)

    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)

    # Promote to OWNER
    promoted = await service.update_member_role(
        project, member_user.user_id, ProjectRole.OWNER.value, owner_user.user_id
    )
    assert promoted.role == ProjectRole.OWNER.value

    # Refresh project model
    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)

    # Demote back to MEMBER (valid because owner_user is still an owner)
    demoted = await service.update_member_role(
        project, member_user.user_id, ProjectRole.MEMBER.value, owner_user.user_id
    )
    assert demoted.role == ProjectRole.MEMBER.value


@pytest.mark.asyncio
async def test_prevent_demoting_sole_owner(mock_db, owner_user):
    """Verify that the sole owner of a project cannot be demoted."""
    service = ProjectService(mock_db)
    project_resp = await service.create_project(
        owner_user, ProjectCreate(name="Sole Owner Demotion Test")
    )
    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)

    with pytest.raises(HTTPException) as exc:
        await service.update_member_role(
            project, owner_user.user_id, ProjectRole.MEMBER.value, owner_user.user_id
        )
    assert exc.value.status_code == 400
    assert "sole owner" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_remove_member_and_prevent_removing_sole_owner(mock_db, owner_user, member_user):
    """Verify removing a member works, but removing the sole owner fails."""
    await mock_db["users"].insert_one(member_user.model_dump(by_alias=True))

    service = ProjectService(mock_db)
    project_resp = await service.create_project(
        owner_user, ProjectCreate(name="Removal Test")
    )
    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)

    await service.invite_member(project, member_user.github_username)

    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)

    # Remove member Bob
    await service.remove_member(project, member_user.user_id, owner_user.user_id)
    refetched = await service.get_project(project.project_id)
    assert member_user.user_id not in refetched.members

    # Attempt to remove sole owner Alice
    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)
    with pytest.raises(HTTPException) as exc:
        await service.remove_member(project, owner_user.user_id, owner_user.user_id)
    assert exc.value.status_code == 400
    assert "sole owner" in exc.value.detail.lower()


# ==================== 3. Join Request Flow Tests ====================

@pytest.mark.asyncio
async def test_join_request_flow(mock_db, owner_user, member_user):
    """Verify request_join, get_join_requests, and approve_join_request."""
    await mock_db["users"].insert_one(owner_user.model_dump(by_alias=True))
    await mock_db["users"].insert_one(member_user.model_dump(by_alias=True))

    service = ProjectService(mock_db)
    project_resp = await service.create_project(
        owner_user, ProjectCreate(name="Join Flow Test")
    )

    # Member requests to join using join_code
    res = await service.request_join(project_resp.join_code, member_user.user_id)
    assert res["status"] == "pending"

    # Owner views join requests
    doc = await mock_db["projects"].find_one({"project_id": project_resp.project_id})
    project = ProjectModel(**doc)
    reqs = await service.get_join_requests(project)
    assert len(reqs) == 1
    assert reqs[0]["user_id"] == member_user.user_id

    # Owner approves request
    await service.approve_join_request(project, member_user.user_id)

    # Verify member is now in project with role MEMBER
    refetched = await service.get_project(project.project_id)
    assert member_user.user_id in refetched.members
    assert refetched.member_roles.get(member_user.user_id) == ProjectRole.MEMBER.value
    assert member_user.user_id not in refetched.join_requests


# ==================== 4. FastAPI Endpoints & Permission Tests ====================

@pytest.mark.asyncio
async def test_api_authorization_owner_vs_member(mock_db, owner_user, member_user, outsider_user):
    """Test full HTTP API endpoints authorization using httpx.AsyncClient."""
    project_id = "test_proj_123"
    join_code = "XYZ123"

    await mock_db["users"].insert_one(owner_user.model_dump(by_alias=True))
    await mock_db["users"].insert_one(member_user.model_dump(by_alias=True))
    await mock_db["users"].insert_one(outsider_user.model_dump(by_alias=True))

    project_doc = {
        "_id": ObjectId(),
        "project_id": project_id,
        "name": "Integration Test Project",
        "description": "Testing permissions",
        "owner_id": owner_user.user_id,
        "members": [owner_user.user_id, member_user.user_id],
        "member_roles": {
            owner_user.user_id: ProjectRole.OWNER.value,
            member_user.user_id: ProjectRole.MEMBER.value,
        },
        "ai_config": {
            "name": "Atlas",
            "role": "Architect",
            "invocation_phrase": "Atlas",
        },
        "join_code": join_code,
        "join_requests": [],
        "max_members": 10,
        "github_repo_url": "",
        "github_repo_name": "",
        "discord_guild_id": "",
        "discord_bot_active": False,
        "qdrant_collection_name": f"forge_{project_id}",
        "ingestion_status": {},
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await mock_db["projects"].insert_one(project_doc)

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Unauthenticated request to /api/v1/projects/{project_id} -> 401/403
        app.dependency_overrides[get_db] = lambda: mock_db
        resp = await client.get(f"/api/v1/projects/{project_id}")
        assert resp.status_code in [401, 403]

        # 2. Non-member outsider accessing /api/v1/projects/{project_id} -> 403 Forbidden
        app.dependency_overrides[get_current_user] = lambda: outsider_user
        resp = await client.get(f"/api/v1/projects/{project_id}")
        assert resp.status_code == 403

        # 3. Member accessing /api/v1/projects/{project_id} -> 200 OK
        app.dependency_overrides[get_current_user] = lambda: member_user
        resp = await client.get(f"/api/v1/projects/{project_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Integration Test Project"
        assert data["user_role"] == "member"

        # 4. Member attempting to update AI config -> 403 Forbidden
        resp = await client.put(
            f"/api/v1/projects/{project_id}/ai-config",
            json={"name": "Hacked", "role": "Hacker", "invocation_phrase": "Hacked"},
        )
        assert resp.status_code == 403

        # 5. Member attempting to update project settings -> 403 Forbidden
        resp = await client.put(
            f"/api/v1/projects/{project_id}/settings",
            json={"name": "Hacked Name"},
        )
        assert resp.status_code == 403

        # 6. Member attempting to delete project -> 403 Forbidden
        resp = await client.delete(f"/api/v1/projects/{project_id}")
        assert resp.status_code == 403

        # 7. Owner updating AI config -> 200 OK
        app.dependency_overrides[get_current_user] = lambda: owner_user
        resp = await client.put(
            f"/api/v1/projects/{project_id}/ai-config",
            json={"name": "Forge Prime", "role": "Lead Architect", "invocation_phrase": "Prime"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Forge Prime"

        # 8. Owner updating project settings -> 200 OK
        resp = await client.put(
            f"/api/v1/projects/{project_id}/settings",
            json={"name": "Updated Project Name", "description": "Updated description"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Project Name"

        # 9. Owner updating member role -> 200 OK
        resp = await client.put(
            f"/api/v1/projects/{project_id}/members/{member_user.user_id}/role",
            json={"role": "owner"},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "owner"

    app.dependency_overrides.clear()

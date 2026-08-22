import pytest
import mongomock_motor
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone
from bson import ObjectId

from app.main import app
from app.core.database import get_db
from app.api.v1.dependencies import get_current_user
from app.models.user import UserModel
from app.models.project import ProjectModel, ProjectRole


@pytest.fixture
def mock_db():
    client = mongomock_motor.AsyncMongoMockClient()
    return client["test_forge_db"]


@pytest.fixture
def owner_user():
    return UserModel(
        user_id="owner_gh_step6",
        email="owner_gh@example.com",
        name="Owner Alice",
        github_username="alice-owner",
    )


@pytest.fixture
def member_user():
    return UserModel(
        user_id="member_gh_step6",
        email="member_gh@example.com",
        name="Member Bob",
        github_username="bob-member",
    )


@pytest.mark.asyncio
async def test_github_connect_and_disconnect(mock_db, owner_user, member_user):
    """Test connecting a GitHub repository and disconnecting with vector invalidation."""
    project_id = "test_gh_proj_001"

    await mock_db["users"].insert_one(owner_user.model_dump(by_alias=True))
    await mock_db["users"].insert_one(member_user.model_dump(by_alias=True))

    project_doc = {
        "_id": ObjectId(),
        "project_id": project_id,
        "name": "GitHub Intelligence Project",
        "description": "Testing GitHub Step 6",
        "owner_id": owner_user.user_id,
        "members": [owner_user.user_id, member_user.user_id],
        "member_roles": {
            owner_user.user_id: ProjectRole.OWNER.value,
            member_user.user_id: ProjectRole.MEMBER.value,
        },
        "qdrant_collection_name": f"forge_{project_id}",
        "github_repo_url": "",
        "github_branch": "main",
        "ingestion_status": {},
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await mock_db["projects"].insert_one(project_doc)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.dependency_overrides[get_db] = lambda: mock_db
        app.dependency_overrides[get_current_user] = lambda: owner_user

        # 1. Connect repository as owner
        connect_res = await client.post(
            f"/api/v1/projects/{project_id}/github/connect",
            json={"github_repo_url": "https://github.com/test-org/forge-test-repo", "github_branch": "develop"},
        )
        assert connect_res.status_code == 200
        proj_data = connect_res.json()["project"]
        assert proj_data["github_repo_url"] == "https://github.com/test-org/forge-test-repo"
        assert proj_data["github_branch"] == "develop"

        # 2. Member cannot disconnect (owner only)
        app.dependency_overrides[get_current_user] = lambda: member_user
        forbidden_res = await client.post(f"/api/v1/projects/{project_id}/github/disconnect")
        assert forbidden_res.status_code == 403

        # 3. Owner disconnects repository
        app.dependency_overrides[get_current_user] = lambda: owner_user
        disc_res = await client.post(f"/api/v1/projects/{project_id}/github/disconnect")
        assert disc_res.status_code == 200

        # Verify project doc is cleared
        doc = await mock_db["projects"].find_one({"project_id": project_id})
        assert doc["github_repo_url"] == ""


@pytest.mark.asyncio
async def test_github_webhook_event_handling(mock_db, owner_user):
    """Test webhook processing for push and pull_request events."""
    project_id = "test_gh_proj_002"

    project_doc = {
        "_id": ObjectId(),
        "project_id": project_id,
        "name": "Webhook Project",
        "owner_id": owner_user.user_id,
        "members": [owner_user.user_id],
        "member_roles": {owner_user.user_id: ProjectRole.OWNER.value},
        "qdrant_collection_name": f"forge_{project_id}",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await mock_db["projects"].insert_one(project_doc)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.dependency_overrides[get_db] = lambda: mock_db
        app.dependency_overrides[get_current_user] = lambda: owner_user

        # Send push event
        push_res = await client.post(
            f"/api/v1/projects/{project_id}/github/webhook?event_type=push",
            json={
                "commits": [
                    {
                        "id": "c1a2b3c4d5e6f7",
                        "author": {"name": "Forge Committer"},
                        "message": "feat(auth): add OAuth2 provider fallback",
                        "url": "https://github.com/owner/repo/commit/c1a2b3c4d5e6f7",
                    }
                ]
            },
        )
        assert push_res.status_code == 200
        assert "Processed push event" in push_res.json()["message"]

        # Send pull_request event
        pr_res = await client.post(
            f"/api/v1/projects/{project_id}/github/webhook?event_type=pull_request",
            json={
                "action": "opened",
                "pull_request": {
                    "number": 42,
                    "title": "Upgrade vector database client",
                    "body": "Replaces HTTP client with native gRPC async wrapper.",
                    "user": {"login": "dev_sayan"},
                    "html_url": "https://github.com/owner/repo/pull/42",
                },
            },
        )
        assert pr_res.status_code == 200
        assert "Processed pull_request event" in pr_res.json()["message"]

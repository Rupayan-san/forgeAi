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
from app.services.discord_service import DiscordIngestionService


@pytest.fixture
def mock_db():
    client = mongomock_motor.AsyncMongoMockClient()
    return client["test_forge_db"]


@pytest.fixture
def owner_user():
    return UserModel(
        user_id="owner_disc_step7",
        email="owner_disc@example.com",
        name="Owner Disc",
        github_username="alice-owner-disc",
    )


def test_discord_noise_filtering():
    """Verify noise filter drops bot commands, short emojis, and trivial chat."""
    assert DiscordIngestionService.is_noise("!help") is True
    assert DiscordIngestionService.is_noise("/sync") is True
    assert DiscordIngestionService.is_noise("?status") is True
    assert DiscordIngestionService.is_noise("ok") is True
    assert DiscordIngestionService.is_noise("k") is True
    assert DiscordIngestionService.is_noise("") is True
    assert DiscordIngestionService.is_noise("hi") is True

    # Real meaningful discussion must pass
    assert DiscordIngestionService.is_noise("We agreed to use Redis for task queues instead of RabbitMQ.") is False
    assert DiscordIngestionService.is_noise("Let's make sure the database migration handles indexes on user_id.") is False


@pytest.mark.asyncio
async def test_discord_connect_channels_and_disconnect(mock_db, owner_user):
    """Test Discord server connection, channel list update, and disconnect."""
    project_id = "test_disc_proj_001"

    project_doc = {
        "_id": ObjectId(),
        "project_id": project_id,
        "name": "Discord Knowledge Project",
        "owner_id": owner_user.user_id,
        "members": [owner_user.user_id],
        "member_roles": {owner_user.user_id: ProjectRole.OWNER.value},
        "qdrant_collection_name": f"forge_{project_id}",
        "discord_guild_id": "",
        "discord_channels": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await mock_db["projects"].insert_one(project_doc)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.dependency_overrides[get_db] = lambda: mock_db
        app.dependency_overrides[get_current_user] = lambda: owner_user

        # 1. Connect Discord Guild and configure channels
        connect_res = await client.post(
            f"/api/v1/projects/{project_id}/discord/connect",
            json={"discord_guild_id": "123456789012345678", "discord_channels": ["general", "architecture", "dev"]},
        )
        assert connect_res.status_code == 200

        doc = await mock_db["projects"].find_one({"project_id": project_id})
        assert doc["discord_guild_id"] == "123456789012345678"
        assert "architecture" in doc["discord_channels"]
        assert doc["discord_bot_active"] is True

        # 2. Update channels
        update_res = await client.post(
            f"/api/v1/projects/{project_id}/discord/channels",
            json={"discord_channels": ["backend", "frontend"]},
        )
        assert update_res.status_code == 200

        doc = await mock_db["projects"].find_one({"project_id": project_id})
        assert doc["discord_channels"] == ["backend", "frontend"]

        # 3. Disconnect Discord Guild
        disc_res = await client.post(f"/api/v1/projects/{project_id}/discord/disconnect")
        assert disc_res.status_code == 200

        doc = await mock_db["projects"].find_one({"project_id": project_id})
        assert doc["discord_guild_id"] == ""
        assert doc["discord_bot_active"] is False

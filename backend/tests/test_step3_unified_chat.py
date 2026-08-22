import pytest
import pytest_asyncio
from mongomock_motor import AsyncMongoMockClient
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import UserModel
from app.models.project import ProjectModel, ProjectRole, ProjectAIConfig
from app.models.constitution import ConstitutionSections, ArchitectureSection
from app.services.chat_service import ChatService
from app.services.constitution_service import ConstitutionService
from app.services.chat_connection_manager import ChatConnectionManager


@pytest_asyncio.fixture
async def mock_db():
    client = AsyncMongoMockClient()
    db = client["forge_test_chat_db"]
    return db


@pytest_asyncio.fixture
async def sample_owner(mock_db):
    user = UserModel(
        user_id="user_owner_chat",
        github_username="alice_chat",
        email="alice.chat@example.com",
        name="Alice Chat",
    )
    await mock_db["users"].insert_one(user.model_dump(by_alias=True))
    return user


@pytest_asyncio.fixture
async def sample_member(mock_db):
    user = UserModel(
        user_id="user_member_chat",
        github_username="bob_chat",
        email="bob.chat@example.com",
        name="Bob Chat",
    )
    await mock_db["users"].insert_one(user.model_dump(by_alias=True))
    return user


@pytest_asyncio.fixture
async def sample_stranger(mock_db):
    user = UserModel(
        user_id="user_stranger_chat",
        github_username="charlie_chat",
        email="charlie.chat@example.com",
        name="Charlie Chat",
    )
    await mock_db["users"].insert_one(user.model_dump(by_alias=True))
    return user


@pytest_asyncio.fixture
async def sample_project(mock_db, sample_owner, sample_member):
    project = ProjectModel(
        project_id="proj_chat_test",
        name="Project Chat Test",
        description="Unified Chat Test Project",
        owner_id=sample_owner.user_id,
        members=[sample_owner.user_id, sample_member.user_id],
        member_roles={
            sample_owner.user_id: ProjectRole.OWNER.value,
            sample_member.user_id: ProjectRole.MEMBER.value,
        },
        ai_config=ProjectAIConfig(
            name="Atlas",
            role="Lead Architect",
            invocation_phrase="Atlas",
        ),
        qdrant_collection_name="project_proj_chat_test",
    )
    await mock_db["projects"].insert_one(project.model_dump(by_alias=True))
    return project


@pytest_asyncio.fixture
async def client(mock_db):
    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


def test_ai_invocation_detection():
    """Test AI invocation parser with custom project AI persona."""
    ai_config = ProjectAIConfig(name="Atlas", role="Architect", invocation_phrase="Atlas")

    # Positive cases
    is_inv, q = ChatService.detect_ai_invocation("@Atlas how do we structure routes?", ai_config)
    assert is_inv is True
    assert "how do we structure routes?" in q

    is_inv2, q2 = ChatService.detect_ai_invocation("Atlas, what is our database?", ai_config)
    assert is_inv2 is True
    assert "what is our database?" in q2

    is_inv3, q3 = ChatService.detect_ai_invocation("Forge: explain architecture", ai_config)
    assert is_inv3 is True
    assert "explain architecture" in q3

    # Negative cases (normal conversation)
    is_inv4, _ = ChatService.detect_ai_invocation("Hey team, I pushed the PR", ai_config)
    assert is_inv4 is False

    is_inv5, _ = ChatService.detect_ai_invocation("We need to update the atlas map package", ai_config)
    assert is_inv5 is False


@pytest.mark.asyncio
async def test_send_and_get_chat_messages_rest(client, sample_project, sample_member):
    """Member can send a normal team chat message and view message history."""
    token = create_access_token({"sub": sample_member.user_id})
    headers = {"Authorization": f"Bearer {token}"}

    # Send message
    send_res = await client.post(
        f"/api/v1/projects/{sample_project.project_id}/chat/messages",
        json={"content": "Hey team, backend auth endpoints are ready!"},
        headers=headers,
    )
    assert send_res.status_code == 200
    msg = send_res.json()
    assert msg["content"] == "Hey team, backend auth endpoints are ready!"
    assert msg["user_id"] == sample_member.user_id
    assert msg["role"] == "user"
    assert msg["is_ai_invocation"] is False

    # Get history
    history_res = await client.get(
        f"/api/v1/projects/{sample_project.project_id}/chat/messages",
        headers=headers,
    )
    assert history_res.status_code == 200
    messages = history_res.json()
    assert len(messages) >= 1
    assert messages[0]["content"] == "Hey team, backend auth endpoints are ready!"


@pytest.mark.asyncio
async def test_ai_invocation_in_chat_triggers_ai_response(client, mock_db, sample_project, sample_member, monkeypatch):
    """Invoking AI in chat generates and persists an assistant response grounded in Project Constitution."""
    from types import SimpleNamespace

    class FakeCompletions:
        async def create(self, **kwargs):
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content="Use the service layer for MongoDB access."))],
                usage=SimpleNamespace(prompt_tokens=20, completion_tokens=10, total_tokens=30),
            )

    class FakeOpenAI:
        def __init__(self, **kwargs):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    # Explicit test seam: production ChatService propagates provider failures.
    monkeypatch.setattr("app.services.chat_service.AsyncOpenAI", FakeOpenAI)
    # Set up constitution first
    await mock_db["project_constitutions"].insert_one({
        "project_id": sample_project.project_id,
        "version": 1,
        "sections": {
            "technology": {"languages": ["Python", "TypeScript"], "frameworks": [], "databases": ["MongoDB"], "infrastructure": [], "external_services": [], "notes": ""},
            "architecture": {"style": "Clean Architecture", "rules": ["Must use service layer"], "service_boundaries": [], "dependency_rules": [], "layering_rules": [], "notes": ""},
            "coding_standards": {"naming_conventions": [], "formatting": [], "code_organization": [], "error_handling": [], "typing": [], "notes": ""},
            "git_workflow": {"branch_naming": [], "commit_conventions": [], "pr_conventions": [], "merge_strategy": "", "notes": ""},
            "api_conventions": {"style": "REST", "endpoint_naming": [], "response_format": "", "error_format": "", "versioning_rules": [], "notes": ""},
            "design_ui_conventions": {"component_conventions": [], "styling_conventions": [], "accessibility_rules": [], "state_management": [], "notes": ""},
            "general_rules": {"custom_rules": [], "restrictions": [], "important_agreements": [], "notes": ""},
        },
        "created_at": "2026-08-22T00:00:00Z",
        "updated_at": "2026-08-22T00:00:00Z",
        "updated_by": "system",
    })

    token = create_access_token({"sub": sample_member.user_id})
    headers = {"Authorization": f"Bearer {token}"}

    send_res = await client.post(
        f"/api/v1/projects/{sample_project.project_id}/chat/messages",
        json={"content": "@Atlas should we query MongoDB directly from endpoints?"},
        headers=headers,
    )
    assert send_res.status_code == 200
    user_msg = send_res.json()
    assert user_msg["is_ai_invocation"] is True

    # Check that an assistant response was saved
    history_res = await client.get(
        f"/api/v1/projects/{sample_project.project_id}/chat/messages",
        headers=headers,
    )
    assert history_res.status_code == 200
    messages = history_res.json()
    # Should have user message AND AI assistant response
    assert len(messages) >= 2
    assistant_msgs = [m for m in messages if m["role"] == "assistant"]
    assert len(assistant_msgs) >= 1
    assert assistant_msgs[0]["is_ai_generated"] is True
    assert assistant_msgs[0]["user_name"] == "Atlas"


@pytest.mark.asyncio
async def test_non_member_cannot_access_chat(client, sample_project, sample_stranger):
    """Non-members cannot read or send chat messages (403 Forbidden)."""
    token = create_access_token({"sub": sample_stranger.user_id})
    headers = {"Authorization": f"Bearer {token}"}

    # GET
    get_res = await client.get(f"/api/v1/projects/{sample_project.project_id}/chat/messages", headers=headers)
    assert get_res.status_code == 403

    # POST
    post_res = await client.post(
        f"/api/v1/projects/{sample_project.project_id}/chat/messages",
        json={"content": "Sneaky message"},
        headers=headers,
    )
    assert post_res.status_code == 403


@pytest.mark.asyncio
async def test_chat_connection_manager_broadcast():
    """Test ChatConnectionManager connection tracking and clean broadcast."""
    manager = ChatConnectionManager()

    class MockWebSocket:
        def __init__(self):
            self.sent_messages = []
            self.accepted = False

        async def accept(self):
            self.accepted = True

        async def send_text(self, text):
            self.sent_messages.append(text)

    ws1 = MockWebSocket()
    ws2 = MockWebSocket()

    await manager.connect("proj_1", ws1, "user_1")
    await manager.connect("proj_1", ws2, "user_2")

    assert manager.get_online_user_count("proj_1") == 2
    assert manager.get_online_user_count("proj_2") == 0

    await manager.broadcast("proj_1", {"type": "message", "content": "Hello Team!"})

    assert len(ws1.sent_messages) == 1
    assert len(ws2.sent_messages) == 1
    assert "Hello Team!" in ws1.sent_messages[0]

    # Disconnect ws1
    manager.disconnect(ws1)
    assert manager.get_online_user_count("proj_1") == 1

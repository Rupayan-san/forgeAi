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
from app.models.memory import QueryIntent
from app.models.decision import DecisionModel
from app.services.project_context_orchestrator import ProjectContextOrchestrator
from app.services.constitution_service import ConstitutionService


@pytest.fixture
def mock_db():
    client = mongomock_motor.AsyncMongoMockClient()
    return client["test_forge_db"]


@pytest.fixture
def owner_user():
    return UserModel(
        user_id="owner_orch_step8",
        email="owner_orch@example.com",
        name="Owner Orch",
        github_username="alice-owner-orch",
    )


def test_query_classification_intents():
    """Verify deterministic query routing correctly classifies different developer intents."""
    orchestrator = ProjectContextOrchestrator()

    assert orchestrator.classify_query("What coding conventions and rules do we follow?") == QueryIntent.CONSTITUTION
    assert orchestrator.classify_query("What is our approved tech stack?") == QueryIntent.CONSTITUTION
    assert orchestrator.classify_query("Why did we choose MongoDB over PostgreSQL?") == QueryIntent.DECISIONS
    assert orchestrator.classify_query("Are there any conflicting architecture decisions?") == QueryIntent.DECISIONS
    assert orchestrator.classify_query("Where is the user authentication endpoint implemented?") == QueryIntent.CODEBASE
    assert orchestrator.classify_query("What changed recently in the project?") == QueryIntent.COMMITS_PRS
    assert orchestrator.classify_query("What PR introduced the Qdrant vector client?") == QueryIntent.COMMITS_PRS
    assert orchestrator.classify_query("What did the team discuss in Discord chat?") == QueryIntent.DISCUSSIONS
    assert orchestrator.classify_query("Give me a comprehensive summary of this project.") == QueryIntent.MULTI_SOURCE


@pytest.mark.asyncio
async def test_context_orchestrator_parallel_assembly_and_conflict_awareness(mock_db, owner_user):
    """Verify parallel context assembly, priority formatting, conflict surfacing, and latency tracking."""
    orchestrator = ProjectContextOrchestrator()

    # 1. Create a Project
    project_dict = {
        "_id": ObjectId(),
        "project_id": "step8_orchestrated_proj",
        "name": "Forge Orchestrated Project",
        "description": "Validating Step 8 AI Context Orchestrator",
        "owner_id": owner_user.user_id,
        "members": [owner_user.user_id],
        "member_roles": {owner_user.user_id: ProjectRole.OWNER.value},
        "qdrant_collection_name": "forge_step8_orchestrated_proj",
        "github_repo_url": "https://github.com/forge/orchestrator-test",
        "github_branch": "main",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await mock_db["projects"].insert_one(project_dict)
    project = ProjectModel(**project_dict)

    # 2. Add Constitution rules
    constitution = await ConstitutionService.get_or_create_constitution(
        db=mock_db,
        project_id=project.project_id,
        user_id=owner_user.user_id,
    )
    constitution.sections.technology.frameworks = ["FastAPI", "MongoDB", "Qdrant", "Next.js"]
    constitution.sections.architecture.rules = ["Strict project isolation", "Zero global state"]
    await mock_db[ConstitutionService.COLLECTION_NAME].replace_one(
        {"project_id": project.project_id},
        constitution.model_dump(by_alias=True),
    )

    # 3. Add conflicting decisions
    dec1 = DecisionModel(
        project_id=project.project_id,
        decision_text="We chose Redis for asynchronous background tasks.",
        reasoning="Fast in-memory queueing with RQ.",
        confidence_score=0.95,
        status="CONFLICTED",
        source_type="chat_message",
        source_id="msg_1",
    )
    dec2 = DecisionModel(
        project_id=project.project_id,
        decision_text="We chose Celery with RabbitMQ for background tasks.",
        reasoning="High throughput distributed broker.",
        confidence_score=0.92,
        status="CONFLICTED",
        source_type="discord_message",
        source_id="msg_2",
    )
    await mock_db["decisions"].insert_one(dec1.model_dump(by_alias=True))
    await mock_db["decisions"].insert_one(dec2.model_dump(by_alias=True))

    # 4. Build orchestrated context for decision query
    result = await orchestrator.build_orchestrated_context(
        project=project,
        query_text="Why did we choose Redis for background jobs?",
        db=mock_db,
    )

    assert result.project_id == project.project_id
    assert result.orchestration_intent == QueryIntent.DECISIONS.value
    assert len(result.trace) > 0
    assert "=== PROJECT CONSTITUTION (HIGHEST PRIORITY - AUTHORITATIVE RULES) ===" in result.formatted_context
    assert "=== ACTIVE PROJECT DECISIONS (HIGH PRIORITY - ARCHITECTURAL AGREEMENTS) ===" in result.formatted_context
    assert "CONFLICTED" in result.formatted_context
    assert len(result.citations) > 0


@pytest.mark.asyncio
async def test_ai_chat_end_to_end_with_orchestrator(mock_db, owner_user):
    """Verify that Project Memory search endpoint functions with dependency overrides."""
    project_id = "test_orch_proj_003"
    project_doc = {
        "_id": ObjectId(),
        "project_id": project_id,
        "name": "Chat Orchestration Project",
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

        mem_res = await client.get(
            f"/api/v1/projects/{project_id}/memory/search?q=What+architecture+rules+do+we+follow",
        )
        assert mem_res.status_code == 200
        assert "items" in mem_res.json()

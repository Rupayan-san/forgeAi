import pytest
import pytest_asyncio
from mongomock_motor import AsyncMongoMockClient
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import UserModel
from app.models.project import ProjectModel, ProjectRole
from app.services.constitution_service import ConstitutionService
from app.services.memory_service import ProjectMemoryService
from app.services.project_context_service import ProjectContextService


@pytest_asyncio.fixture
async def mock_db():
    client = AsyncMongoMockClient()
    db = client["forge_test_memory_db"]
    return db


@pytest_asyncio.fixture
async def client(mock_db):
    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_project_memory_service_search_isolation(mock_db):
    """Test that Project Memory queries are strictly isolated to the specified project."""
    service = ProjectMemoryService()
    
    memory_items = await service.search_project_memory(
        project_id="proj_123",
        query_text="What database is used?",
        collection_name="test_collection_proj_123",
    )
    assert isinstance(memory_items, list)
    for item in memory_items:
        assert item.project_id == "proj_123"


@pytest.mark.asyncio
async def test_project_context_service_assembly(mock_db):
    """Test that ProjectContextService aggregates Constitution, Decisions, and Metadata into a clean prompt context."""
    project = ProjectModel(
        project_id="proj_ctx_test",
        name="Apollo Engine",
        slug="apollo-engine",
        owner_id="owner_1",
        description="High throughput indexing platform",
    )
    await mock_db["projects"].insert_one(project.model_dump(by_alias=True))

    # Create constitution in project_constitutions
    constitution = await ConstitutionService.get_or_create_constitution(
        db=mock_db,
        project_id="proj_ctx_test",
        user_id="owner_1",
    )
    # Customize tech stack
    constitution.sections.technology.frameworks = ["FastAPI", "Next.js"]
    await mock_db[ConstitutionService.COLLECTION_NAME].replace_one(
        {"project_id": "proj_ctx_test"},
        constitution.model_dump(by_alias=True),
    )

    # Insert test decision
    await mock_db["decisions"].insert_one({
        "decision_id": "dec_001",
        "project_id": "proj_ctx_test",
        "decision_text": "We will use MongoDB for document storage",
        "reasoning": "High scalability and flexible schema",
        "alternatives_considered": ["PostgreSQL"],
        "participants": ["Alice", "Bob"],
        "source_type": "project_chat",
        "source_id": "msg_001",
        "status": "ACTIVE",
        "confidence_score": 0.95,
    })

    service = ProjectContextService()
    ctx = await service.build_project_context(
        project=project,
        query_text="What database did we decide to use?",
        db=mock_db,
    )

    assert ctx.project_id == "proj_ctx_test"
    assert ctx.project_name == "Apollo Engine"
    assert "FastAPI" in ctx.constitution_text
    assert len(ctx.decisions) == 1
    assert "MongoDB" in ctx.decisions[0]["decision_text"]
    assert "PROJECT CONSTITUTION" in ctx.formatted_context
    assert "ACTIVE PROJECT DECISIONS" in ctx.formatted_context
    assert len(ctx.citations) >= 2


@pytest.mark.asyncio
async def test_memory_search_endpoint_member_access(client, mock_db):
    """Test memory search API endpoint access for project members."""
    user_id = "user_mem_1"
    token = create_access_token({"sub": user_id, "email": "member@test.com"})
    project_id = "proj_mem_api_test"

    await mock_db["users"].insert_one({
        "user_id": user_id,
        "email": "member@test.com",
        "name": "Member User",
    })

    project = ProjectModel(
        project_id=project_id,
        name="Memory Test Proj",
        slug="mem-test-proj",
        owner_id=user_id,
        members=[user_id],
        member_roles={user_id: ProjectRole.OWNER.value},
        qdrant_collection_name="col_mem_test",
    )
    await mock_db["projects"].insert_one(project.model_dump(by_alias=True))

    res = await client.get(
        f"/api/v1/projects/{project_id}/memory/search?q=FastAPI",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["project_id"] == project_id
    assert data["query"] == "FastAPI"
    assert "items" in data


@pytest.mark.asyncio
async def test_memory_search_endpoint_non_member_forbidden(client, mock_db):
    """Test that unauthorized users are rejected when accessing another project's memory."""
    owner_id = "user_owner_real"
    intruder_id = "user_intruder"
    intruder_token = create_access_token({"sub": intruder_id, "email": "intruder@test.com"})
    project_id = "proj_private_mem"

    await mock_db["users"].insert_one({
        "user_id": intruder_id,
        "email": "intruder@test.com",
        "name": "Intruder",
    })

    project = ProjectModel(
        project_id=project_id,
        name="Private Memory Proj",
        slug="private-mem-proj",
        owner_id=owner_id,
        members=[owner_id],
        member_roles={owner_id: ProjectRole.OWNER.value},
    )
    await mock_db["projects"].insert_one(project.model_dump(by_alias=True))

    res = await client.get(
        f"/api/v1/projects/{project_id}/memory/search?q=secrets",
        headers={"Authorization": f"Bearer {intruder_token}"},
    )
    assert res.status_code == 403

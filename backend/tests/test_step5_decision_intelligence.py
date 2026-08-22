import pytest
import pytest_asyncio
from mongomock_motor import AsyncMongoMockClient
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import UserModel
from app.models.project import ProjectModel, ProjectRole
from app.models.decision import DecisionModel, DecisionStatus


@pytest_asyncio.fixture
async def mock_db():
    client = AsyncMongoMockClient()
    db = client["forge_test_decisions_db"]
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
async def test_decision_status_filtering(client, mock_db):
    """Test retrieving decisions filtered by status (ACTIVE, SUPERSEDED, CONFLICTED)."""
    user_id = "user_dec_1"
    token = create_access_token({"sub": user_id, "email": "dec@test.com"})
    project_id = "proj_dec_filter_test"

    await mock_db["users"].insert_one({
        "user_id": user_id,
        "email": "dec@test.com",
        "name": "Decision Maker",
    })

    project = ProjectModel(
        project_id=project_id,
        name="Decision Filter Proj",
        slug="dec-filter-proj",
        owner_id=user_id,
        members=[user_id],
        member_roles={user_id: ProjectRole.OWNER.value},
    )
    await mock_db["projects"].insert_one(project.model_dump(by_alias=True))

    # Insert test decisions
    d1 = DecisionModel(
        decision_id="dec_active_1",
        project_id=project_id,
        decision_text="Use Redis for caching",
        reasoning="In-memory sub-millisecond latency",
        status=DecisionStatus.ACTIVE.value,
    )
    d2 = DecisionModel(
        decision_id="dec_sup_1",
        project_id=project_id,
        decision_text="Use Memcached for caching",
        reasoning="Simple key-value cache",
        status=DecisionStatus.SUPERSEDED.value,
        superseded_by="dec_active_1",
    )
    d3 = DecisionModel(
        decision_id="dec_conf_1",
        project_id=project_id,
        decision_text="Use MySQL for caching session data",
        reasoning="Relational table store",
        status=DecisionStatus.CONFLICTED.value,
    )
    await mock_db["decisions"].insert_many([
        d1.model_dump(by_alias=True),
        d2.model_dump(by_alias=True),
        d3.model_dump(by_alias=True),
    ])

    # Test all
    res_all = await client.get(
        f"/api/v1/projects/{project_id}/decisions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_all.status_code == 200
    assert len(res_all.json()) == 3

    # Test active filter
    res_active = await client.get(
        f"/api/v1/projects/{project_id}/decisions?status_filter=active",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_active.status_code == 200
    active_list = res_active.json()
    assert len(active_list) == 1
    assert active_list[0]["decision_id"] == "dec_active_1"

    # Test superseded filter
    res_sup = await client.get(
        f"/api/v1/projects/{project_id}/decisions?status_filter=superseded",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_sup.status_code == 200
    sup_list = res_sup.json()
    assert len(sup_list) == 1
    assert sup_list[0]["decision_id"] == "dec_sup_1"


@pytest.mark.asyncio
async def test_update_decision_status(client, mock_db):
    """Test manual update of decision status (e.g. resolving a conflict)."""
    user_id = "user_dec_updater"
    token = create_access_token({"sub": user_id, "email": "updater@test.com"})
    project_id = "proj_status_update_test"

    await mock_db["users"].insert_one({
        "user_id": user_id,
        "email": "updater@test.com",
        "name": "Updater",
    })

    project = ProjectModel(
        project_id=project_id,
        name="Status Update Proj",
        slug="status-update-proj",
        owner_id=user_id,
        members=[user_id],
        member_roles={user_id: ProjectRole.OWNER.value},
    )
    await mock_db["projects"].insert_one(project.model_dump(by_alias=True))

    decision = DecisionModel(
        decision_id="dec_to_resolve",
        project_id=project_id,
        decision_text="Use JWT with 15min expiry",
        status=DecisionStatus.CONFLICTED.value,
    )
    await mock_db["decisions"].insert_one(decision.model_dump(by_alias=True))

    res = await client.put(
        f"/api/v1/projects/{project_id}/decisions/dec_to_resolve/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "ACTIVE"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ACTIVE"

    # Verify in DB
    doc = await mock_db["decisions"].find_one({"decision_id": "dec_to_resolve"})
    assert doc["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_decision_access_control(client, mock_db):
    """Test that unauthorized non-members cannot read or modify project decisions."""
    owner_id = "user_dec_owner"
    intruder_id = "user_dec_intruder"
    intruder_token = create_access_token({"sub": intruder_id, "email": "dec_intruder@test.com"})
    project_id = "proj_dec_protected"

    await mock_db["users"].insert_one({
        "user_id": intruder_id,
        "email": "dec_intruder@test.com",
        "name": "Intruder",
    })

    project = ProjectModel(
        project_id=project_id,
        name="Protected Decisions Proj",
        slug="protected-dec-proj",
        owner_id=owner_id,
        members=[owner_id],
        member_roles={owner_id: ProjectRole.OWNER.value},
    )
    await mock_db["projects"].insert_one(project.model_dump(by_alias=True))

    res = await client.get(
        f"/api/v1/projects/{project_id}/decisions",
        headers={"Authorization": f"Bearer {intruder_token}"},
    )
    assert res.status_code == 403

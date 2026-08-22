import pytest
import pytest_asyncio
from mongomock_motor import AsyncMongoMockClient
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import UserModel
from app.models.project import ProjectModel, ProjectRole
from app.models.constitution import (
    ConstitutionSections,
    TechnologySection,
    ArchitectureSection,
    CodingStandardsSection,
    GitWorkflowSection,
    ApiConventionsSection,
    ConstitutionUpdate,
)
from app.services.constitution_service import ConstitutionService


@pytest_asyncio.fixture
async def mock_db():
    client = AsyncMongoMockClient()
    db = client["forge_test_db"]
    return db


@pytest_asyncio.fixture
async def sample_owner(mock_db):
    user = UserModel(
        user_id="owner_user_1",
        github_username="alice_owner",
        email="alice@example.com",
        name="Alice Owner",
    )
    await mock_db["users"].insert_one(user.model_dump(by_alias=True))
    return user


@pytest_asyncio.fixture
async def sample_member(mock_db):
    user = UserModel(
        user_id="member_user_2",
        github_username="bob_member",
        email="bob@example.com",
        name="Bob Member",
    )
    await mock_db["users"].insert_one(user.model_dump(by_alias=True))
    return user


@pytest_asyncio.fixture
async def sample_stranger(mock_db):
    user = UserModel(
        user_id="stranger_user_3",
        github_username="charlie_stranger",
        email="charlie@example.com",
        name="Charlie Stranger",
    )
    await mock_db["users"].insert_one(user.model_dump(by_alias=True))
    return user


@pytest_asyncio.fixture
async def sample_project(mock_db, sample_owner, sample_member):
    project = ProjectModel(
        project_id="proj_alpha",
        name="Project Alpha",
        description="A project for testing constitution",
        owner_id=sample_owner.user_id,
        members=[sample_owner.user_id, sample_member.user_id],
        member_roles={
            sample_owner.user_id: ProjectRole.OWNER.value,
            sample_member.user_id: ProjectRole.MEMBER.value,
        },
        qdrant_collection_name="project_proj_alpha",
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


@pytest.mark.asyncio
async def test_default_constitution_creation(mock_db, sample_project, sample_owner):
    """Test that requesting constitution initializes default v1 document if missing."""
    constitution = await ConstitutionService.get_or_create_constitution(
        mock_db, sample_project.project_id, sample_owner.user_id
    )
    assert constitution.project_id == "proj_alpha"
    assert constitution.version == 1
    assert constitution.sections.technology.languages == []
    assert constitution.sections.api_conventions.style == "REST"


@pytest.mark.asyncio
async def test_get_constitution_endpoint_member_access(client, sample_project, sample_member):
    """Project member can retrieve the active constitution."""
    token = create_access_token({"sub": sample_member.user_id})
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get(f"/api/v1/projects/{sample_project.project_id}/constitution", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == "proj_alpha"
    assert data["version"] == 1
    assert "sections" in data
    assert "technology" in data["sections"]
    assert "architecture" in data["sections"]
    assert "coding_standards" in data["sections"]
    assert "git_workflow" in data["sections"]
    assert "api_conventions" in data["sections"]
    assert "design_ui_conventions" in data["sections"]
    assert "general_rules" in data["sections"]


@pytest.mark.asyncio
async def test_owner_can_update_constitution_and_version_increments(client, sample_project, sample_owner):
    """Owner can update constitution. Version increments to 2 and history is recorded."""
    token = create_access_token({"sub": sample_owner.user_id})
    headers = {"Authorization": f"Bearer {token}"}

    sections = ConstitutionSections(
        technology=TechnologySection(
            languages=["TypeScript", "Python"],
            frameworks=["Next.js", "FastAPI"],
            databases=["MongoDB", "Qdrant"],
        ),
        architecture=ArchitectureSection(
            style="Clean Architecture",
            rules=["Service layer required for all domain logic", "Centralized authorization"],
        ),
        coding_standards=CodingStandardsSection(
            naming_conventions=["camelCase for frontend", "snake_case for backend"],
        ),
        git_workflow=GitWorkflowSection(
            branch_naming=["feature/*", "fix/*"],
            merge_strategy="Squash and merge",
        ),
        api_conventions=ApiConventionsSection(
            style="REST",
            endpoint_naming=["kebab-case"],
        ),
    )

    update_payload = {
        "sections": sections.model_dump(),
        "change_summary": "Initial team technical standards and clean architecture rules",
    }

    response = await client.put(
        f"/api/v1/projects/{sample_project.project_id}/constitution",
        json=update_payload,
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["version"] == 2
    assert data["updated_by"] == sample_owner.user_id
    assert data["sections"]["technology"]["languages"] == ["TypeScript", "Python"]
    assert data["sections"]["architecture"]["style"] == "Clean Architecture"

    # Verify history has version 1 recorded
    history_res = await client.get(
        f"/api/v1/projects/{sample_project.project_id}/constitution/history",
        headers=headers,
    )
    assert history_res.status_code == 200
    history_data = history_res.json()
    assert len(history_data) == 1
    assert history_data[0]["version"] == 1
    assert history_data[0]["change_summary"] == "Initial team technical standards and clean architecture rules"


@pytest.mark.asyncio
async def test_member_cannot_update_constitution(client, sample_project, sample_member):
    """Members cannot update constitution (only owners). Gets 403 Forbidden."""
    token = create_access_token({"sub": sample_member.user_id})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "sections": ConstitutionSections().model_dump(),
        "change_summary": "Unauthorized attempt",
    }

    response = await client.put(
        f"/api/v1/projects/{sample_project.project_id}/constitution",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 403
    assert "Owner permission required" in response.json()["detail"]


@pytest.mark.asyncio
async def test_non_member_cannot_access_constitution(client, sample_project, sample_stranger):
    """Non-members get 403 Forbidden when trying to access or modify constitution."""
    token = create_access_token({"sub": sample_stranger.user_id})
    headers = {"Authorization": f"Bearer {token}"}

    # Try GET
    res_get = await client.get(f"/api/v1/projects/{sample_project.project_id}/constitution", headers=headers)
    assert res_get.status_code == 403

    # Try PUT
    res_put = await client.put(
        f"/api/v1/projects/{sample_project.project_id}/constitution",
        json={"sections": ConstitutionSections().model_dump()},
        headers=headers,
    )
    assert res_put.status_code == 403


@pytest.mark.asyncio
async def test_get_specific_version_snapshot(client, sample_project, sample_owner):
    """Can retrieve a specific past version snapshot."""
    token = create_access_token({"sub": sample_owner.user_id})
    headers = {"Authorization": f"Bearer {token}"}

    # Update once to create v2 (and archive v1)
    await client.put(
        f"/api/v1/projects/{sample_project.project_id}/constitution",
        json={"sections": ConstitutionSections().model_dump(), "change_summary": "Update 1"},
        headers=headers,
    )

    # Fetch v1 snapshot
    res = await client.get(f"/api/v1/projects/{sample_project.project_id}/constitution/versions/1", headers=headers)
    assert res.status_code == 200
    assert res.json()["version"] == 1

    # Fetch non-existent snapshot
    res_404 = await client.get(f"/api/v1/projects/{sample_project.project_id}/constitution/versions/99", headers=headers)
    assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_format_constitution_for_ai_context(mock_db, sample_project, sample_owner):
    """Test AI prompt formatting of project constitution."""
    update = ConstitutionUpdate(
        sections=ConstitutionSections(
            technology=TechnologySection(languages=["Go", "Python"], databases=["PostgreSQL"]),
            architecture=ArchitectureSection(style="Modular Monolith", rules=["No circular imports"]),
            git_workflow=GitWorkflowSection(commit_conventions=["Conventional Commits (feat, fix, chore)"]),
        ),
        change_summary="Configured for backend services",
    )
    await ConstitutionService.update_constitution(
        mock_db, sample_project.project_id, update, sample_owner.user_id
    )

    formatted = await ConstitutionService.format_constitution_for_ai(mock_db, sample_project.project_id)
    assert "### Project Constitution (v2)" in formatted
    assert "Languages: Go, Python" in formatted
    assert "Databases: PostgreSQL" in formatted
    assert "Style: Modular Monolith" in formatted
    assert "No circular imports" in formatted
    assert "Conventional Commits" in formatted

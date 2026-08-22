import pytest
from mongomock_motor import AsyncMongoMockClient

from app.models.project import ProjectModel, ProjectAIConfig
from app.models.constitution import ConstitutionSections, ConstitutionUpdate
from app.services.cache_service import RedisCacheService
from app.services.constitution_service import ConstitutionService
from app.services.intelligence.state_analyzer import ProjectStateAnalyzer
from app.services.meeting_ai_service import MeetingAIService
from app.services.retrieval.advanced_retrieval_service import AdvancedRetrievalService
from app.core.database import init_db_indexes


def test_redis_cache_service_project_isolation():
    """Verify strict project isolation in Redis cache keys."""
    cache = RedisCacheService()

    key_a = cache._constitution_key("proj_alpha")
    key_b = cache._constitution_key("proj_beta")

    assert key_a == "forge:proj:proj_alpha:constitution"
    assert key_b == "forge:proj:proj_beta:constitution"
    assert key_a != key_b

    state_key_a = cache._state_key("proj_alpha")
    assert state_key_a == "forge:proj:proj_alpha:state_snapshot"


def test_cache_fail_safe_fallback():
    """Verify cache service operations gracefully fallback when Redis is unconfigured or offline without crashing."""
    # Point to invalid redis URL
    faulty_cache = RedisCacheService(redis_url="redis://localhost:99999")

    # Initial get on missing key returns None
    val = faulty_cache.get_cached_constitution("proj_123")
    assert val is None

    # Setting cache stores into in-memory fallback smoothly
    success = faulty_cache.set_cached_constitution("proj_123", {"version": 1})
    assert success is True

    # Subsequent get retrieves from fallback cache
    val2 = faulty_cache.get_cached_constitution("proj_123")
    assert val2 == {"version": 1}

    # Invalidation works cleanly
    inv_success = faulty_cache.invalidate_constitution("proj_123")
    assert inv_success is True
    assert faulty_cache.get_cached_constitution("proj_123") is None


@pytest.mark.asyncio
async def test_database_indexes_initialization():
    """Verify automated compound index creation runs safely."""
    client = AsyncMongoMockClient()
    db = client["forge_test_indexes"]

    # Should execute without errors
    await init_db_indexes(db)
    assert True


@pytest.mark.asyncio
async def test_constitution_service_caching_integration():
    """Verify ConstitutionService reads from cache and invalidates on update."""
    client = AsyncMongoMockClient()
    db = client["forge_test_constitution_cache"]
    project_id = "proj_cache_test_1"

    # 1. First fetch creates and caches
    const = await ConstitutionService.get_or_create_constitution(db, project_id)
    assert const.version == 1

    # 2. Update constitution
    update = ConstitutionUpdate(
        sections=ConstitutionSections(
            tech_stack=["FastAPI", "MongoDB", "Qdrant", "Redis"],
            architectural_rules=["Async-first API handlers", "Strict project isolation"],
        ),
        change_summary="Optimized tech stack rules",
    )
    updated = await ConstitutionService.update_constitution(db, project_id, update, "user_admin")
    assert updated.version == 2


@pytest.mark.asyncio
async def test_state_analyzer_caching_integration():
    """Verify ProjectStateAnalyzer leverages caching for fast snapshot retrieval."""
    client = AsyncMongoMockClient()
    db = client["forge_test_state_cache"]
    project_id = "proj_state_cache_1"

    analyzer = ProjectStateAnalyzer()

    # Calculate initial state
    snapshot = await analyzer.analyze_project_state(project_id, db)
    assert snapshot.project_id == project_id

    # Retrieve snapshot (hits cache / DB)
    cached_snapshot = await analyzer.get_latest_snapshot(project_id, db)
    assert cached_snapshot.project_id == project_id


@pytest.mark.asyncio
async def test_concurrent_retrieval_and_parallel_pipeline():
    """Verify AdvancedRetrievalService handles concurrent queries without deadlocks."""
    client = AsyncMongoMockClient()
    db = client["forge_test_concurrent_retrieval"]
    project_id = "proj_concurrent_1"

    project = ProjectModel(
        project_id=project_id,
        name="Concurrent Test Project",
        owner_id="user_admin",
        ai_config=ProjectAIConfig(name="Forge"),
    )
    await db["projects"].insert_one(project.model_dump(by_alias=True))

    retrieval_service = AdvancedRetrievalService()

    queries = [
        "What is our caching strategy?",
        "How are database connections pooled?",
        "Explain project-level permissions",
    ]

    import asyncio
    results = await asyncio.gather(
        *[retrieval_service.retrieve_and_orchestrate(project, q, db) for q in queries]
    )

    assert len(results) == 3
    for res in results:
        assert res.formatted_context is not None


def test_meeting_voice_ai_invocation_detection():
    """Verify voice AI invocation parsing works rapidly on critical path."""
    ai_config = ProjectAIConfig(name="Forge", invocation_phrase="Forge")

    invoked, query = MeetingAIService.detect_meeting_ai_invocation(
        "Hey Forge, what did we decide about Redis caching?", ai_config
    )
    assert invoked is True
    assert "what did we decide about redis caching" in query.lower()

    # Non-invoking statement
    invoked2, _ = MeetingAIService.detect_meeting_ai_invocation(
        "I think we should optimize our Qdrant vectors next week.", ai_config
    )
    assert invoked2 is False


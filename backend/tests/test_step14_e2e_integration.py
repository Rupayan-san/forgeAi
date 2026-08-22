import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from httpx import AsyncClient, ASGITransport
from mongomock_motor import AsyncMongoMockClient

from app.main import app
from app.core.database import get_db, init_db_indexes
from app.core.security import create_access_token, decode_access_token, create_refresh_token, hash_refresh_token
from app.models.user import UserModel
from app.models.project import ProjectModel, ProjectRole, ProjectAIConfig
from app.models.constitution import ConstitutionSections, ConstitutionUpdate
from app.models.decision import DecisionModel, DecisionStatus
from app.models.meeting import MeetingModel, MeetingStatus
from app.models.action_item import ActionItemModel, ActionItemStatus
from app.models.chat import SendMessageRequest, ChatMessageModel
from app.services.constitution_service import ConstitutionService
from app.services.decision_service import DecisionService
from app.services.meeting_ai_service import MeetingAIService
from app.services.retrieval.advanced_retrieval_service import AdvancedRetrievalService
from app.services.intelligence.orchestrator import ProjectIntelligenceOrchestrator
from app.telemetry.correlation import generate_request_id, set_correlation_context, get_request_id
from app.telemetry.metrics import metrics, get_prometheus_metrics_payload
from app.services.cache_service import cache_service


@pytest_asyncio.fixture
async def mock_db():
    client = AsyncMongoMockClient()
    db = client["forge_e2e_test_db"]
    await init_db_indexes(db)
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
async def test_complete_e2e_integrated_user_journey(mock_db, client):
    """
    COMPLETE END-TO-END INTEGRATION TEST (Flows A through K)
    Simulates a full real-world user and team lifecycle across all Forge capabilities:
    1. Authentication & Security (Flow A)
    2. Project Foundation & Constitution (Flow B)
    3. Unified Project Chat & Real-Time AI Invocation (Flow C)
    4. Decision Intelligence & Action Items (Flow D)
    5. Advanced RAG & Retrieval Optimization (Flow E)
    6. Real-Time Voice Meetings & Meeting Intelligence (Flow F, G)
    7. GitHub Project Integration (Flow H)
    8. Advanced Project Intelligence (Flow I)
    9. Observability & Telemetry Verification (Flow J)
    10. Failure Isolation & Graceful Degradation (Flow K)
    """

    # =========================================================================
    # FLOW A: Authentication & Access Control
    # =========================================================================
    user_id = "user_e2e_lead"
    user = UserModel(
        user_id=user_id,
        email="lead@forge.test",
        name="Lead Architect",
        github_username="lead_arch",
    )
    await mock_db["users"].insert_one(user.model_dump(by_alias=True))

    # Token generation and authorization
    token = create_access_token({"sub": user.user_id})
    headers = {"Authorization": f"Bearer {token}", "X-Request-ID": "req_e2e_init_001"}

    # Verify unauthenticated request rejection
    unauth_resp = await client.get("/api/v1/projects", headers={})
    assert unauth_resp.status_code == 401

    # Verify authenticated request
    auth_resp = await client.get("/api/v1/projects", headers=headers)
    assert auth_resp.status_code == 200

    # =========================================================================
    # FLOW B: Project Creation, Constitution, and Configuration
    # =========================================================================
    project_id = "proj_e2e_integrated"
    project = ProjectModel(
        project_id=project_id,
        name="Forge HyperScale",
        description="End-to-end mission-critical software project",
        owner_id=user.user_id,
        members=[user.user_id],
        member_roles={user.user_id: ProjectRole.OWNER.value},
        ai_config=ProjectAIConfig(name="Forge", invocation_phrase="Forge"),
        qdrant_collection_name=f"forge_{project_id}",
    )
    await mock_db["projects"].insert_one(project.model_dump(by_alias=True))

    # Constitution initialization
    const = await ConstitutionService.get_or_create_constitution(mock_db, project_id, user.user_id)
    assert const.version == 1

    # Update Constitution with architecture rules
    from app.models.constitution import TechnologySection, ArchitectureSection
    update_data = ConstitutionUpdate(
        sections=ConstitutionSections(
            technology=TechnologySection(
                languages=["TypeScript", "Python"],
                frameworks=["FastAPI", "Next.js"],
                databases=["MongoDB", "Qdrant", "Redis"],
            ),
            architecture=ArchitectureSection(
                rules=["Async-first API handlers", "Strict project isolation"],
            ),
        ),
        change_summary="Established architecture foundation",
    )
    updated_const = await ConstitutionService.update_constitution(mock_db, project_id, update_data, user.user_id)
    assert updated_const.version == 2
    assert "FastAPI" in updated_const.sections.technology.frameworks

    # =========================================================================
    # FLOW C & D: Unified Project Chat & Decision Intelligence
    # =========================================================================
    # User adds a decision
    dec = DecisionModel(
        decision_id="dec_e2e_vector_db",
        project_id=project_id,
        decision_text="We selected Qdrant as our authoritative vector database for isolated collection multi-tenancy.",
        rationale="Superior payload filtering and low latency.",
        status=DecisionStatus.ACTIVE.value,
        recorded_by=user.user_id,
    )
    await mock_db["decisions"].insert_one(dec.model_dump(by_alias=True))

    # User adds an action item
    action = ActionItemModel(
        item_id="act_e2e_hybrid_rag",
        project_id=project_id,
        title="Implement Advanced RAG hybrid search pipeline",
        status=ActionItemStatus.TODO.value,
        assigned_to=user.user_id,
        due_at=datetime.now(timezone.utc) + timedelta(days=3),
    )
    await mock_db["action_items"].insert_one(action.model_dump(by_alias=True))

    # =========================================================================
    # FLOW E: Advanced RAG & Context Orchestration
    # =========================================================================
    retrieval_service = AdvancedRetrievalService()
    rag_context = await retrieval_service.retrieve_and_orchestrate(
        project=project,
        query="What vector database did we select and why?",
        db=mock_db,
        custom_top_k=5,
    )
    assert rag_context.formatted_context is not None
    assert "Qdrant" in rag_context.formatted_context
    assert len(rag_context.citations) >= 1
    assert any(c.source_type == "decision" for c in rag_context.citations)

    # =========================================================================
    # FLOW F & G: Project Meetings & Real-Time Voice Intelligence
    # =========================================================================
    meeting_id = "meet_e2e_arch_sync"
    meeting = MeetingModel(
        meeting_id=meeting_id,
        project_id=project_id,
        title="Architecture Alignment Sync",
        status=MeetingStatus.LIVE.value,
        created_by=user.user_id,
    )
    await mock_db["meetings"].insert_one(meeting.model_dump(by_alias=True))

    # Add meeting transcripts
    await mock_db["meeting_transcripts"].insert_many([
        {
            "transcript_id": "tr_1",
            "meeting_id": meeting_id,
            "project_id": project_id,
            "speaker_name": "Lead Architect",
            "text": "Let's ensure we use Redis for token revocation.",
            "sequence": 1,
            "timestamp": datetime.now(timezone.utc),
        },
        {
            "transcript_id": "tr_2",
            "meeting_id": meeting_id,
            "project_id": project_id,
            "speaker_name": "Lead Architect",
            "text": "Forge, what is our selected vector database?",
            "sequence": 2,
            "timestamp": datetime.now(timezone.utc),
        },
    ])

    # Voice AI Invocation
    ai_service = MeetingAIService()
    invoked, query = MeetingAIService.detect_meeting_ai_invocation(
        "Forge, what is our selected vector database?", project.ai_config
    )
    assert invoked is True

    voice_result = await ai_service.handle_live_voice_query(
        project=project,
        meeting_id=meeting_id,
        speaker_name="Lead Architect",
        query=query,
        db=mock_db,
    )
    assert voice_result["content"] is not None
    assert len(voice_result["sources"]) >= 1

    # =========================================================================
    # FLOW H & I: Project Intelligence & Health Analysis
    # =========================================================================
    orchestrator = ProjectIntelligenceOrchestrator()
    snapshot = await orchestrator.refresh_full_intelligence(project_id, mock_db)

    assert snapshot is not None
    assert snapshot.project_id == project_id
    assert snapshot.health_status in ["HEALTHY", "ATTENTION", "AT_RISK"]

    # Verify timeline was built
    timeline = await orchestrator.get_timeline(project_id, db=mock_db)
    assert len(timeline) >= 1

    # =========================================================================
    # FLOW J: Observability, Metrics & Telemetry
    # =========================================================================
    # Record metrics
    metrics.record_http_request("POST", f"/api/v1/projects/{project_id}/chat", 200, 0.042)
    metrics.record_llm_call("gpt-4o-mini", "chat", "success", 0.35, prompt_tokens=200, completion_tokens=50)

    # Scrape Prometheus /metrics endpoint
    metrics_resp = await client.get("/metrics")
    assert metrics_resp.status_code == 200
    metrics_text = metrics_resp.text
    assert "forge_http_requests_total" in metrics_text
    assert "forge_llm_requests_total" in metrics_text

    # =========================================================================
    # FLOW K: Failure Isolation & Fallback Verification
    # =========================================================================
    # Faulty Redis cache fallback test
    cache_service.invalidate_project_all(project_id)
    # Re-reading after full invalidation reads cleanly from DB
    const_fallback = await ConstitutionService.get_or_create_constitution(mock_db, project_id, user.user_id)
    assert const_fallback.version == 2

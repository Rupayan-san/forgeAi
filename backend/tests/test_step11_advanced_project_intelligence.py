import pytest
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from mongomock_motor import AsyncMongoMockClient

from app.models.user import UserModel
from app.models.project import ProjectModel
from app.models.decision import DecisionModel
from app.models.action_item import ActionItemModel, ActionItemStatus
from app.models.meeting import MeetingModel, MeetingSummaryModel
from app.services.constitution_service import ConstitutionService
from app.services.intelligence.orchestrator import ProjectIntelligenceOrchestrator
from app.services.intelligence.state_analyzer import ProjectStateAnalyzer
from app.services.intelligence.change_analyzer import ChangeAnalyzer
from app.services.intelligence.consistency_analyzer import ConsistencyAnalyzer
from app.services.intelligence.risk_and_gap_analyzer import RiskAndGapAnalyzer
from app.services.intelligence.timeline_builder import TimelineBuilder
from app.services.project_context_orchestrator import ProjectContextOrchestrator


@pytest.fixture
def mock_db():
    client = AsyncMongoMockClient()
    return client["forge_test_step11"]


@pytest.fixture
def lead_dev():
    return UserModel(
        id=str(ObjectId()),
        user_id="user_lead_step11",
        email="lead@forge.test",
        name="Lead Architect",
        github_username="lead_dev",
    )


@pytest.mark.asyncio
async def test_project_state_snapshot_generation(mock_db, lead_dev):
    """Verify state snapshot extracts tech stack, phase, active/completed work, and explainable health status."""
    project_id = "proj_state_gen"
    await mock_db["projects"].insert_one({
        "_id": ObjectId(),
        "project_id": project_id,
        "name": "Forge Intelligence Core",
        "owner_id": lead_dev.user_id,
    })

    # Constitution
    const = await ConstitutionService.get_or_create_constitution(db=mock_db, project_id=project_id, user_id=lead_dev.user_id)
    const.sections.technology.frameworks = ["FastAPI", "Next.js"]
    const.sections.technology.databases = ["MongoDB", "Qdrant"]
    await mock_db[ConstitutionService.COLLECTION_NAME].replace_one(
        {"project_id": project_id}, const.model_dump(by_alias=True)
    )

    # Actions
    act = ActionItemModel(
        project_id=project_id,
        title="Implement Advanced RAG hybrid search",
        status=ActionItemStatus.TODO.value,
    )
    await mock_db["action_items"].insert_one(act.model_dump(by_alias=True))

    analyzer = ProjectStateAnalyzer()
    snapshot = await analyzer.analyze_project_state(project_id, mock_db)

    assert snapshot.project_id == project_id
    assert snapshot.current_phase == "RAG & Retrieval Optimization"
    assert len(snapshot.active_work) >= 1
    assert "MongoDB" in snapshot.technical_stack.get("databases", [])
    assert snapshot.health_status in ["HEALTHY", "ATTENTION"]


@pytest.mark.asyncio
async def test_semantic_change_grouping(mock_db, lead_dev):
    """Verify raw meetings and completed actions are aggregated into meaningful change groups."""
    project_id = "proj_change_test"

    # Add meeting
    m = MeetingModel(
        meeting_id="m1_change",
        project_id=project_id,
        title="RAG Strategy Alignment",
        status="ENDED",
        created_by=lead_dev.user_id,
        ended_at=datetime.now(timezone.utc),
    )
    await mock_db["meetings"].insert_one(m.model_dump(by_alias=True))
    s = MeetingSummaryModel(
        summary_id="s1_change",
        meeting_id="m1_change",
        project_id=project_id,
        overview="Decided to implement BM25 sparse search alongside Qdrant.",
    )
    await mock_db["meeting_summaries"].insert_one(s.model_dump(by_alias=True))

    analyzer = ChangeAnalyzer()
    groups = await analyzer.analyze_and_group_changes(project_id, mock_db)

    assert len(groups) >= 1
    assert any("Meeting Alignment" in g.title for g in groups)


@pytest.mark.asyncio
async def test_consistency_analyzer_decision_staleness_and_drift(mock_db, lead_dev):
    """Verify detection of stale decisions and documentation drift."""
    project_id = "proj_consistency_test"

    const = await ConstitutionService.get_or_create_constitution(db=mock_db, project_id=project_id, user_id=lead_dev.user_id)
    const.sections.technology.databases = ["Qdrant", "Redis"]
    await mock_db[ConstitutionService.COLLECTION_NAME].replace_one(
        {"project_id": project_id}, const.model_dump(by_alias=True)
    )

    # Stale decision: mentions Elasticsearch
    stale_dec = DecisionModel(
        project_id=project_id,
        decision_text="We selected Elasticsearch for search engine.",
        status="ACTIVE",
    )
    await mock_db["decisions"].insert_one(stale_dec.model_dump(by_alias=True))

    analyzer = ConsistencyAnalyzer()
    issues = await analyzer.analyze_consistency(project_id, mock_db)

    assert len(issues) >= 1
    assert any(i.issue_type == "DECISION_STALENESS" for i in issues)


@pytest.mark.asyncio
async def test_risk_and_gap_analyzer_blockers_and_overdue(mock_db, lead_dev):
    """Verify detection of blocked tasks, overdue actions, and knowledge gaps."""
    project_id = "proj_risks_test"
    now = datetime.now(timezone.utc)

    # 1. Blocked task
    blocked_act = ActionItemModel(
        project_id=project_id,
        title="OAuth login flow is blocked by third party API",
        status=ActionItemStatus.TODO.value,
    )
    # 2. Overdue task
    overdue_act = ActionItemModel(
        project_id=project_id,
        title="Migrate database indexes",
        due_at=now - timedelta(days=2),
        status=ActionItemStatus.TODO.value,
    )
    # 3. Unassigned task
    unassigned_act = ActionItemModel(
        project_id=project_id,
        title="Write API documentation",
        assignee_name=None,
        status=ActionItemStatus.TODO.value,
    )
    await mock_db["action_items"].insert_many([
        blocked_act.model_dump(by_alias=True),
        overdue_act.model_dump(by_alias=True),
        unassigned_act.model_dump(by_alias=True),
    ])

    analyzer = RiskAndGapAnalyzer()
    risks, gaps = await analyzer.analyze_risks_and_gaps(project_id, mock_db)

    assert any("Blocked Action Item" in r.title for r in risks)
    assert any("Overdue Action Item" in r.title for r in risks)
    assert any(g.area == "Task Ownership" for g in gaps)


@pytest.mark.asyncio
async def test_timeline_builder_aggregation(mock_db, lead_dev):
    """Verify unified chronological timeline builder across multi-source events."""
    project_id = "proj_timeline_test"

    dec = DecisionModel(
        project_id=project_id,
        decision_text="Use Redis for token revocation blacklist.",
        status="ACTIVE",
    )
    await mock_db["decisions"].insert_one(dec.model_dump(by_alias=True))

    m = MeetingModel(
        project_id=project_id,
        title="Security Review Sync",
        status="ENDED",
        created_by=lead_dev.user_id,
    )
    await mock_db["meetings"].insert_one(m.model_dump(by_alias=True))

    builder = TimelineBuilder()
    events = await builder.build_timeline(project_id=project_id, db=mock_db)

    assert len(events) >= 2
    types = [e.event_type for e in events]
    assert "DECISION" in types
    assert "MEETING" in types


@pytest.mark.asyncio
async def test_project_intelligence_orchestrator_full_refresh(mock_db, lead_dev):
    """Verify orchestrator runs full intelligence refresh and provides all signals."""
    project_id = "proj_orchestrator_test"
    await mock_db["projects"].insert_one({
        "_id": ObjectId(),
        "project_id": project_id,
        "name": "Forge Full Intelligence",
        "owner_id": lead_dev.user_id,
    })

    orchestrator = ProjectIntelligenceOrchestrator()
    snapshot = await orchestrator.refresh_full_intelligence(project_id, mock_db)

    assert snapshot.project_id == project_id
    timeline = await orchestrator.get_timeline(project_id, db=mock_db)
    changes = await orchestrator.get_recent_changes(project_id, mock_db)
    risks = await orchestrator.get_risks(project_id, mock_db)

    assert isinstance(timeline, list)
    assert isinstance(changes, list)
    assert isinstance(risks, list)


@pytest.mark.asyncio
async def test_e2e_12_step_intelligence_scenario(mock_db, lead_dev):
    """Full End-to-End 12-step scenario for Step 11:
    1. Documented decision: 'Use Qdrant for vector retrieval.'
    2. Meeting discusses hybrid retrieval.
    3. Action item created: 'Implement sparse retrieval.'
    4. Action item completed.
    5. Decision remains active in project intelligence.
    6. Semantic change detects hybrid retrieval progression.
    7. Action item reflects completion.
    8. Project State Snapshot reflects RAG & Retrieval Optimization phase.
    9. Risk & Gap analysis reflects 0 blockers.
    10. Timeline contains the decision, meeting, and action item events.
    11. User asks in Project Chat: 'What changed in our RAG architecture?'
    12. Forge AI retrieves the combined Decision, Meeting, Action, and Memory evidence with full provenance.
    """
    project_id = "step11_e2e_project"
    orchestrator = ProjectIntelligenceOrchestrator()
    context_orchestrator = ProjectContextOrchestrator()

    # Step 1: Documented decision
    dec = DecisionModel(
        project_id=project_id,
        decision_text="Use Qdrant for project-level vector retrieval.",
        reasoning="Supports isolated collections per project and fast payload filtering.",
        status="ACTIVE",
    )
    await mock_db["decisions"].insert_one(dec.model_dump(by_alias=True))

    # Step 2: Meeting discusses hybrid retrieval
    meet = MeetingModel(
        meeting_id="meet_rag_hybrid",
        project_id=project_id,
        title="RAG Retrieval Architecture Sync",
        status="ENDED",
        created_by=lead_dev.user_id,
        ended_at=datetime.now(timezone.utc),
    )
    await mock_db["meetings"].insert_one(meet.model_dump(by_alias=True))
    summary = MeetingSummaryModel(
        summary_id="sum_rag_hybrid",
        meeting_id="meet_rag_hybrid",
        project_id=project_id,
        overview="Agreed to add BM25 sparse search and Reciprocal Rank Fusion to improve exact symbol matching.",
        decisions=["Adopt BM25 sparse scoring and RRF rank fusion alongside Qdrant."],
        action_items=["Implement sparse retrieval and exact symbol boosting."],
    )
    await mock_db["meeting_summaries"].insert_one(summary.model_dump(by_alias=True))

    # Step 3 & 4: Action item created & completed
    action = ActionItemModel(
        action_id="act_sparse_search",
        project_id=project_id,
        meeting_id="meet_rag_hybrid",
        title="Implement sparse retrieval and exact symbol boosting",
        status=ActionItemStatus.DONE.value,
        completed_at=datetime.now(timezone.utc),
    )
    await mock_db["action_items"].insert_one(action.model_dump(by_alias=True))

    # Project Constitution setup
    project_doc = {
        "_id": ObjectId(),
        "project_id": project_id,
        "name": "Forge Step 11 Project",
        "owner_id": lead_dev.user_id,
        "members": [lead_dev.user_id],
        "qdrant_collection_name": f"forge_{project_id}",
    }
    await mock_db["projects"].insert_one(project_doc)
    project = ProjectModel(**project_doc)

    const = await ConstitutionService.get_or_create_constitution(db=mock_db, project_id=project_id, user_id=lead_dev.user_id)
    const.sections.technology.databases = ["Qdrant", "MongoDB"]
    await mock_db[ConstitutionService.COLLECTION_NAME].replace_one(
        {"project_id": project_id}, const.model_dump(by_alias=True)
    )

    # Step 5, 6, 7, 8, 9, 10: Refresh Project Intelligence
    snapshot = await orchestrator.refresh_full_intelligence(project_id, mock_db)
    timeline = await orchestrator.get_timeline(project_id, db=mock_db)
    changes = await orchestrator.get_recent_changes(project_id, mock_db)
    risks = await orchestrator.get_risks(project_id, mock_db)

    # Verify Step 5: Decision active
    assert snapshot.active_decisions_count >= 1

    # Verify Step 6: Semantic change
    assert len(changes) >= 1

    # Verify Step 7: Completed action
    assert any("sparse retrieval" in c for c in snapshot.completed_work)

    # Verify Step 8: Phase
    assert snapshot.current_phase == "RAG & Retrieval Optimization"

    # Verify Step 9: 0 blockers
    assert len(snapshot.blocked_work) == 0

    # Verify Step 10: Timeline events
    assert len(timeline) >= 2

    # Step 11: Query via Project Context Orchestrator
    rag_result = await context_orchestrator.build_orchestrated_context(
        project=project,
        query_text="What changed in our RAG architecture?",
        db=mock_db,
    )

    # Step 12: Verify grounded answer context with sources
    assert rag_result.project_id == project_id
    assert len(rag_result.formatted_context) > 0
    assert any("Advanced RAG pipeline completed" in t for t in rag_result.trace)

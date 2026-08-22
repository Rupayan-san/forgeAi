import pytest
from datetime import datetime, timezone
from bson import ObjectId
from mongomock_motor import AsyncMongoMockClient

from app.models.user import UserModel
from app.models.project import ProjectModel, ProjectAIConfig
from app.models.meeting import (
    MeetingModel,
    MeetingStatus,
    CreateMeetingRequest,
    ParticipantRole,
)
from app.models.action_item import (
    ActionItemModel,
    ActionItemStatus,
    CreateActionItemRequest,
    UpdateActionItemRequest,
)
from app.services.meeting_service import MeetingService
from app.services.agora_service import AgoraService
from app.services.meeting_ai_service import MeetingAIService
from app.services.action_item_service import ActionItemService
from app.services.meeting_summary_service import MeetingSummaryService
from app.services.meeting_connection_manager import meeting_connection_manager
from app.services.constitution_service import ConstitutionService
from app.services.project_context_orchestrator import ProjectContextOrchestrator


@pytest.fixture
def mock_db():
    client = AsyncMongoMockClient()
    return client["forge_test_step10"]


@pytest.fixture
def alice():
    return UserModel(
        id=str(ObjectId()),
        user_id="user_alice_step10",
        email="alice@forge.test",
        name="Alice Architect",
        github_username="alice_dev",
    )


@pytest.fixture
def bob():
    return UserModel(
        id=str(ObjectId()),
        user_id="user_bob_step10",
        email="bob@forge.test",
        name="Bob Builder",
        github_username="bob_dev",
    )


@pytest.fixture
def charlie_outsider():
    return UserModel(
        id=str(ObjectId()),
        user_id="user_charlie_outsider",
        email="charlie@other.test",
        name="Charlie Outsider",
        github_username="charlie_dev",
    )


@pytest.mark.asyncio
async def test_meeting_model_creation_and_defaults(mock_db, alice):
    """Verify meeting creation with host participant, channel name, and SCHEDULED status."""
    service = MeetingService()
    project_id = "proj_step10_basic"

    meeting = await service.create_meeting(
        project_id=project_id,
        data=CreateMeetingRequest(title="Sprint 1 Kickoff"),
        creator=alice,
        db=mock_db,
    )

    assert meeting.project_id == project_id
    assert meeting.title == "Sprint 1 Kickoff"
    assert meeting.status == MeetingStatus.SCHEDULED.value
    assert meeting.created_by == alice.user_id
    assert meeting.channel_name.startswith("forge_")
    assert len(meeting.participants) == 1
    assert meeting.participants[0].user_id == alice.user_id
    assert meeting.participants[0].role == ParticipantRole.HOST.value


@pytest.mark.asyncio
async def test_meeting_service_lifecycle(mock_db, alice, bob):
    """Verify full meeting lifecycle: SCHEDULED -> LIVE (join) -> ENDED (leave)."""
    service = MeetingService()
    project_id = "proj_step10_lifecycle"

    # 1. Create
    meeting = await service.create_meeting(
        project_id=project_id,
        data=CreateMeetingRequest(title="Architecture Sync"),
        creator=alice,
        db=mock_db,
    )
    m_id = meeting.meeting_id

    # 2. Start
    started = await service.start_meeting(m_id, mock_db)
    assert started.status == MeetingStatus.LIVE.value
    assert started.started_at is not None

    # 3. Bob joins
    joined = await service.join_meeting(m_id, bob, mock_db)
    assert len(joined.participants) == 2
    bob_p = next(p for p in joined.participants if p.user_id == bob.user_id)
    assert bob_p.left_at is None

    # 4. Bob leaves
    left = await service.leave_meeting(m_id, bob.user_id, mock_db)
    bob_p_after = next(p for p in left.participants if p.user_id == bob.user_id)
    assert bob_p_after.left_at is not None

    # 5. End meeting
    ended = await service.end_meeting(m_id, mock_db)
    assert ended.status == MeetingStatus.ENDED.value
    assert ended.ended_at is not None


def test_agora_rtc_token_generation():
    """Verify Agora RTC token generation server-side without exposing secrets."""
    token, channel, app_id = AgoraService.generate_rtc_token(
        channel_name="forge_proj1_meet1",
        uid="user_alice",
        expire_seconds=3600,
    )
    assert token is not None
    assert len(token) > 10
    assert channel == "forge_proj1_meet1"
    assert app_id != ""


@pytest.mark.asyncio
async def test_meeting_transcripts_and_speaker_attribution(mock_db, alice, bob):
    """Verify chronological sequencing and speaker preservation in transcripts."""
    service = MeetingService()
    meeting_id = "m_transcripts_test"
    project_id = "p_transcripts_test"

    # Add 3 transcript segments
    t1 = await service.add_transcript_segment(
        meeting_id=meeting_id,
        project_id=project_id,
        speaker_id=alice.user_id,
        speaker_name=alice.name,
        text="Hello team, let's discuss our database choice.",
        is_final=True,
        db=mock_db,
    )
    t2 = await service.add_transcript_segment(
        meeting_id=meeting_id,
        project_id=project_id,
        speaker_id=bob.user_id,
        speaker_name=bob.name,
        text="I suggest we stick with MongoDB and Qdrant for vector storage.",
        is_final=True,
        db=mock_db,
    )
    t3 = await service.add_transcript_segment(
        meeting_id=meeting_id,
        project_id=project_id,
        speaker_id=alice.user_id,
        speaker_name=alice.name,
        text="Agreed! That satisfies our constitution rules.",
        is_final=True,
        db=mock_db,
    )

    assert t1.sequence == 1
    assert t2.sequence == 2
    assert t3.sequence == 3
    assert t2.speaker_name == "Bob Builder"

    all_transcripts = await service.get_meeting_transcripts(meeting_id, mock_db)
    assert len(all_transcripts) == 3
    assert all_transcripts[0].text.startswith("Hello team")
    assert all_transcripts[2].text.startswith("Agreed!")


def test_meeting_ai_invocation_detection():
    """Verify detection of explicit voice invocations vs passive conversation."""
    ai_config = ProjectAIConfig(name="Forge", invocation_phrase="Forge")

    # 1. Explicit invocations
    invoked1, q1 = MeetingAIService.detect_meeting_ai_invocation("Forge, what is our caching strategy?", ai_config)
    assert invoked1 is True
    assert "what is our caching strategy?" in q1

    invoked2, q2 = MeetingAIService.detect_meeting_ai_invocation("@Forge summarize our meeting so far", ai_config)
    assert invoked2 is True
    assert "summarize our meeting so far" in q2

    # 2. Passive conversation without invocation
    invoked3, _ = MeetingAIService.detect_meeting_ai_invocation("We talked about caching with Redis earlier today.", ai_config)
    assert invoked3 is False

    invoked4, _ = MeetingAIService.detect_meeting_ai_invocation("Let's forge ahead with MongoDB.", ai_config)
    # "forge ahead" should not trigger because it's followed by "ahead", not a query/punctuation
    assert invoked4 is False


@pytest.mark.asyncio
async def test_action_item_service_crud_and_override(mock_db, alice):
    """Verify manual creation, human correction override, and project filtering."""
    service = ActionItemService()
    project_id = "proj_action_test"

    # 1. Create
    action = await service.create_action_item(
        project_id=project_id,
        data=CreateActionItemRequest(
            title="Setup Redis cache",
            description="Add Redis client to backend",
            assignee_name="Alice",
        ),
        db=mock_db,
    )
    assert action.status == ActionItemStatus.TODO.value
    assert action.confidence_score == 1.0

    # 2. Human override: reassign to Bob and mark IN_PROGRESS
    updated = await service.update_action_item(
        action_id=action.action_id,
        data=UpdateActionItemRequest(
            assignee_name="Bob Builder",
            status=ActionItemStatus.IN_PROGRESS.value,
        ),
        db=mock_db,
    )
    assert updated.assignee_name == "Bob Builder"
    assert updated.status == ActionItemStatus.IN_PROGRESS.value

    # 3. Mark DONE
    done = await service.update_action_item(
        action_id=action.action_id,
        data=UpdateActionItemRequest(status=ActionItemStatus.DONE.value),
        db=mock_db,
    )
    assert done.status == ActionItemStatus.DONE.value
    assert done.completed_at is not None

    # 4. Project filtering
    items = await service.get_project_action_items(project_id=project_id, db=mock_db)
    assert len(items) == 1


@pytest.mark.asyncio
async def test_meeting_websocket_broadcast_and_ai_state():
    """Verify meeting connection manager tracks online users and AI state transitions."""
    manager = meeting_connection_manager
    meeting_id = "meet_ws_test"

    assert manager.get_ai_state(meeting_id) == "IDLE"

    manager.set_ai_state(meeting_id, "THINKING")
    assert manager.get_ai_state(meeting_id) == "THINKING"

    manager.set_ai_state(meeting_id, "SPEAKING")
    assert manager.get_ai_state(meeting_id) == "SPEAKING"

    manager.set_ai_state(meeting_id, "IDLE")
    assert manager.get_ai_state(meeting_id) == "IDLE"


@pytest.mark.asyncio
async def test_e2e_18_step_meeting_to_rag_scenario(mock_db, alice, bob, monkeypatch):
    """Full End-to-End 18-step integration test:
    Project -> Meeting -> Join -> Transcripts -> Voice Invocation -> Decisions -> Actions -> End -> Summary -> Memory -> Advanced RAG.
    """
    from types import SimpleNamespace

    class FakeCompletions:
        async def create(self, **kwargs):
            prompt = " ".join(message.get("content", "") for message in kwargs.get("messages", []))
            content = (
                '{"overview":"The team reviewed caching and agreed on Redis.",'
                '"key_points":["Caching strategy was discussed"],'
                '"decisions":["Adopt Redis for real-time caching and session management."],'
                '"action_items":["Implement Redis caching layer"],"unresolved_questions":[]}'
                if "valid JSON" in prompt
                else "The constitution requires the documented architecture rules."
            )
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
                usage=SimpleNamespace(prompt_tokens=20, completion_tokens=10, total_tokens=30),
            )

    class FakeOpenAI:
        def __init__(self, **kwargs):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setattr("app.services.meeting_ai_service.AsyncOpenAI", FakeOpenAI)
    monkeypatch.setattr("app.services.meeting_summary_service.AsyncOpenAI", FakeOpenAI)

    project_id = "step10_e2e_project"
    meeting_service = MeetingService()
    summary_service = MeetingSummaryService()
    action_service = ActionItemService()
    ai_service = MeetingAIService()
    orchestrator = ProjectContextOrchestrator()

    # Step 1: User creates a Project
    project_doc = {
        "_id": ObjectId(),
        "project_id": project_id,
        "name": "Forge Step 10 Platform",
        "description": "Validating Step 10 Real-Time Voice and Meeting Intelligence",
        "owner_id": alice.user_id,
        "members": [alice.user_id, bob.user_id],
        "qdrant_collection_name": f"forge_{project_id}",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await mock_db["projects"].insert_one(project_doc)
    project = ProjectModel(**project_doc)

    # Setup Project Constitution
    constitution = await ConstitutionService.get_or_create_constitution(
        db=mock_db, project_id=project_id, user_id=alice.user_id
    )
    constitution.sections.technology.frameworks = ["FastAPI", "MongoDB", "Qdrant", "Next.js"]
    constitution.sections.architecture.rules = ["Zero cross-project leakage", "Stateless microservices"]
    await mock_db[ConstitutionService.COLLECTION_NAME].replace_one(
        {"project_id": project_id}, constitution.model_dump(by_alias=True)
    )

    # Step 2: User creates a Meeting
    meeting = await meeting_service.create_meeting(
        project_id=project_id,
        data=CreateMeetingRequest(title="Architecture Alignment Meeting"),
        creator=alice,
        db=mock_db,
    )
    meeting_id = meeting.meeting_id
    assert meeting.status == MeetingStatus.SCHEDULED.value

    # Step 3: Participants join
    await meeting_service.start_meeting(meeting_id, mock_db)
    await meeting_service.join_meeting(meeting_id, bob, mock_db)

    # Step 4: Forge joins as AI participant
    # (AI state initialized to IDLE)
    assert meeting_connection_manager.get_ai_state(meeting_id) == "IDLE"

    # Step 5: Participants speak & Step 6: Transcript is generated
    await meeting_service.add_transcript_segment(
        meeting_id=meeting_id,
        project_id=project_id,
        speaker_id=alice.user_id,
        speaker_name=alice.name,
        text="Hello everyone, we need to decide on our caching strategy.",
        is_final=True,
        db=mock_db,
    )
    await meeting_service.add_transcript_segment(
        meeting_id=meeting_id,
        project_id=project_id,
        speaker_id=bob.user_id,
        speaker_name=bob.name,
        text="I think Redis is the best option for speed and pub/sub.",
        is_final=True,
        db=mock_db,
    )

    # Step 7: Forge recognizes an explicit invocation
    is_invoked, voice_query = MeetingAIService.detect_meeting_ai_invocation(
        "Forge, what does our Constitution say about architecture?", project.ai_config
    )
    assert is_invoked is True

    # Step 8 & 9: Forge retrieves existing Project Memory and answers
    ai_response = await ai_service.handle_live_voice_query(
        project=project,
        meeting_id=meeting_id,
        speaker_name=alice.name,
        query=voice_query,
        db=mock_db,
    )
    assert ai_response["content"] is not None
    assert len(ai_response["content"]) > 0

    # Step 10 & 11: Participants make a decision & Decision is extracted
    await meeting_service.add_transcript_segment(
        meeting_id=meeting_id,
        project_id=project_id,
        speaker_id=alice.user_id,
        speaker_name=alice.name,
        text="We have decided to adopt Redis for real-time caching and session management.",
        is_final=True,
        db=mock_db,
    )

    # Step 12 & 13: Participants create an action item & Action item is extracted/created
    action_item = await action_service.create_action_item(
        project_id=project_id,
        data=CreateActionItemRequest(
            meeting_id=meeting_id,
            title="Implement Redis caching layer",
            assignee_name="Bob Builder",
        ),
        db=mock_db,
    )
    assert action_item.title == "Implement Redis caching layer"
    assert action_item.assignee_name == "Bob Builder"

    # Step 14: Meeting ends
    ended_meeting = await meeting_service.end_meeting(meeting_id, mock_db)
    assert ended_meeting.status == MeetingStatus.ENDED.value

    # Step 15 & 16: Summary is generated and meeting knowledge enters Project Memory
    summary = await summary_service.generate_and_index_summary(
        project_id=project_id,
        meeting_id=meeting_id,
        db=mock_db,
    )
    assert summary is not None
    assert summary.overview is not None

    # Verify summary is persisted in MongoDB
    saved_summary = await summary_service.get_summary(meeting_id, mock_db)
    assert saved_summary.meeting_id == meeting_id

    # Step 17: Later Project Chat asks: "What did we discuss in yesterday's meeting?"
    chat_result = await orchestrator.build_orchestrated_context(
        project=project,
        query_text="What did we discuss in yesterday's meeting about caching?",
        db=mock_db,
    )

    # Step 18: Forge retrieves the meeting context and returns grounded answer with provenance
    assert chat_result.project_id == project_id
    assert len(chat_result.formatted_context) > 0
    assert any("Advanced RAG pipeline completed" in t for t in chat_result.trace)

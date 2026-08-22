import pytest
import time
from datetime import datetime, timezone
from bson import ObjectId
from mongomock_motor import AsyncMongoMockClient

from app.models.project import ProjectModel
from app.models.user import UserModel
from app.models.memory import QueryIntent, MemoryItem
from app.models.decision import DecisionModel
from app.services.constitution_service import ConstitutionService
from app.services.retrieval.query_planner import (
    QueryNormalizer,
    TemporalDetector,
    QueryExpander,
    QueryPlanner,
)
from app.services.retrieval.sparse_retriever import BM25Scorer, SparseRetriever
from app.services.retrieval.rank_fusion import RRFusion
from app.services.retrieval.reranker import CrossEncoderReranker
from app.services.retrieval.diversifier import DeterministicDeduplicator, MMRDiversifier
from app.services.retrieval.context_builder import ContextBuilder
from app.services.retrieval.structured_retriever import StructuredRetriever
from app.services.retrieval.advanced_retrieval_service import AdvancedRetrievalService
from app.services.project_context_orchestrator import ProjectContextOrchestrator
from tests.eval_dataset import EVALUATION_DATASET


@pytest.fixture
def mock_db():
    client = AsyncMongoMockClient()
    return client["forge_test_step9"]


@pytest.fixture
def test_user():
    return UserModel(
        id=str(ObjectId()),
        user_id="user_step9_test",
        email="dev@forge.test",
        name="Developer Alice",
        github_username="alice_dev",
    )


def test_query_normalizer_and_symbol_preservation():
    """Verify technical identifiers, code symbols, routes, and files are preserved while cleaning filler."""
    q1 = "Where tf is verifyJwt implemented?"
    norm1, symbols1 = QueryNormalizer.normalize(q1)
    assert "verifyJwt" in symbols1
    assert "verifyJwt" in norm1
    assert "Where tf is" not in norm1

    q2 = "Can you show me POST /api/v1/projects endpoint in MusicPlayerBar.tsx?"
    norm2, symbols2 = QueryNormalizer.normalize(q2)
    assert any("MusicPlayerBar.tsx" in s for s in symbols2)
    assert any("POST /api/v1/projects" in s for s in symbols2)


def test_temporal_detector():
    """Verify detection of temporal constraints and direction."""
    is_t1, dir1 = TemporalDetector.detect("What changed in authentication recently?")
    assert is_t1 is True
    assert dir1 == "recent"

    is_t2, dir2 = TemporalDetector.detect("What was the previous database historically?")
    assert is_t2 is True
    assert dir2 == "historical"

    is_t3, dir3 = TemporalDetector.detect("How is JWT validation structured?")
    assert is_t3 is False
    assert dir3 == "neutral"


def test_query_expander():
    """Verify bounded domain query expansion."""
    variants = QueryExpander.expand("JWT auth implementation", max_expansions=3)
    assert len(variants) >= 2
    assert len(variants) <= 3
    assert variants[0] == "JWT auth implementation"


def test_query_planner_routing():
    """Verify query planner classifies intents and maps target sources."""
    planner = QueryPlanner()

    plan_const = planner.plan("What are the coding standards in our project constitution?")
    assert plan_const.intent == QueryIntent.CONSTITUTION
    assert plan_const.target_source_types == ["constitution"]

    plan_dec = planner.plan("Why did we decide to use Redis?")
    assert plan_dec.intent == QueryIntent.DECISIONS
    assert "decision" in plan_dec.target_source_types

    plan_code = planner.plan("Where is verifyJwt function defined?")
    assert plan_code.intent == QueryIntent.CODEBASE
    assert "verifyJwt" in plan_code.exact_terms


def test_bm25_scorer_and_exact_symbol_boost():
    """Verify BM25 lexical term scoring and exact symbol boosting."""
    corpus = [
        "def verifyJwt(token: str): return decode_token(token)",
        "async def get_user_profile(user_id: str): return db.users.find(user_id)",
        "class AuthService: handles token validation and login",
    ]
    scorer = BM25Scorer(corpus)
    score_jwt = scorer.score("verifyJwt", 0)
    score_user = scorer.score("verifyJwt", 1)
    assert score_jwt > score_user
    assert score_user == 0.0


@pytest.mark.asyncio
async def test_sparse_retriever_exact_symbol_ranking():
    """Verify sparse retriever ranks documents with exact code symbols highest."""
    items = [
        MemoryItem(
            memory_id="1",
            project_id="proj_1",
            source_type="github_file",
            source_id="auth.py",
            content="def verifyJwt(token): return True",
            metadata={"file_path": "backend/app/core/auth.py"},
        ),
        MemoryItem(
            memory_id="2",
            project_id="proj_1",
            source_type="github_file",
            source_id="user.py",
            content="def get_user(): return None",
            metadata={"file_path": "backend/app/core/user.py"},
        ),
    ]

    retriever = SparseRetriever()
    results = await retriever.retrieve(
        project_id="proj_1",
        collection_name="test_col",
        query="verifyJwt",
        exact_terms=["verifyJwt"],
        candidate_pool=items,
    )
    assert len(results) > 0
    assert results[0].source_id == "auth.py"
    assert results[0].relevance_score > 0.0


def test_rrf_fusion():
    """Verify Reciprocal Rank Fusion combines diverse lists correctly."""
    fusion = RRFusion()
    item_a = MemoryItem(memory_id="item_a", project_id="p1", source_type="github_file", source_id="a.py", content="A")
    item_b = MemoryItem(memory_id="item_b", project_id="p1", source_type="github_file", source_id="b.py", content="B")
    item_c = MemoryItem(memory_id="item_c", project_id="p1", source_type="github_file", source_id="c.py", content="C")

    dense_list = [item_a, item_b]  # rank 1, 2
    sparse_list = [item_b, item_c] # rank 1, 2

    fused = fusion.fuse(
        ranked_lists=[(dense_list, 1.0), (sparse_list, 1.0)],
        top_k=3,
    )
    assert len(fused) == 3
    # item_b appeared in both lists (rank 2 in dense, rank 1 in sparse) so it should have highest cumulative RRF score
    assert fused[0].memory_id == "item_b"


@pytest.mark.asyncio
async def test_cross_encoder_reranker_and_authority():
    """Verify reranker applies source authority and exact symbol boosting."""
    reranker = CrossEncoderReranker()
    item_chat = MemoryItem(
        memory_id="1",
        project_id="p1",
        source_type="chat_message",
        source_id="chat_1",
        content="we talked about verifyJwt",
        relevance_score=0.5,
    )
    item_code = MemoryItem(
        memory_id="2",
        project_id="p1",
        source_type="github_file",
        source_id="security.py",
        content="export function verifyJwt(token: string) { return true; }",
        metadata={"file_path": "security.py"},
        relevance_score=0.5,
    )

    reranked = await reranker.rerank(
        query="verifyJwt",
        candidates=[item_chat, item_code],
        exact_terms=["verifyJwt"],
    )
    assert len(reranked) == 2
    # Code file with exact path match & higher source authority should rank first
    assert reranked[0].source_type == "github_file"
    assert reranked[0].relevance_score > reranked[1].relevance_score


def test_deterministic_deduplicator_and_mmr():
    """Verify deduplication removes exact duplicates and MMR promotes diversity."""
    items = [
        MemoryItem(memory_id="1", project_id="p1", source_type="doc", source_id="doc1", content="FastAPI MongoDB backend", relevance_score=0.9),
        MemoryItem(memory_id="2", project_id="p1", source_type="doc", source_id="doc1", content="FastAPI MongoDB backend", relevance_score=0.88),  # Exact duplicate
        MemoryItem(memory_id="3", project_id="p1", source_type="doc", source_id="doc2", content="Next.js Tailwind CSS frontend", relevance_score=0.75),
    ]

    deduped = DeterministicDeduplicator.deduplicate(items)
    assert len(deduped) == 2

    diversifier = MMRDiversifier()
    diverse_items = diversifier.diversify(items, top_k=2, lambda_param=0.5)
    assert len(diverse_items) == 2
    assert any("Next.js" in it.content for it in diverse_items)


@pytest.mark.asyncio
async def test_context_builder_budgeting_and_low_confidence(mock_db, test_user):
    """Verify context builder token budgeting and low confidence indicator."""
    builder = ContextBuilder()
    project = ProjectModel(
        project_id="proj_budget_test",
        name="Forge Budget Test",
        owner_id=test_user.user_id,
    )

    # 1. Low confidence case (no constitution, no decisions, no memory)
    from app.services.retrieval.structured_retriever import StructuredRetrievalResult
    empty_structured = StructuredRetrievalResult()

    res_empty = builder.build_context(
        project=project,
        query="Random nonexistent query",
        intent=QueryIntent.MULTI_SOURCE,
        structured_data=empty_structured,
        memory_chunks=[],
        trace=[],
    )
    assert "RETRIEVAL CONFIDENCE NOTE" in res_empty.formatted_context
    assert any("low retrieval confidence" in t for t in res_empty.trace)


@pytest.mark.asyncio
async def test_end_to_end_advanced_rag_pipeline(mock_db, test_user):
    """Verify full retrieval pipeline through ProjectContextOrchestrator."""
    project_id = "step9_e2e_proj"
    project_doc = {
        "_id": ObjectId(),
        "project_id": project_id,
        "name": "Forge Step 9 Project",
        "description": "Validating Advanced RAG pipeline",
        "owner_id": test_user.user_id,
        "members": [test_user.user_id],
        "qdrant_collection_name": f"forge_{project_id}",
        "github_repo_url": "https://github.com/forge/step9-test",
        "github_branch": "main",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await mock_db["projects"].insert_one(project_doc)
    project = ProjectModel(**project_doc)

    # 1. Save Constitution
    constitution = await ConstitutionService.get_or_create_constitution(
        db=mock_db, project_id=project_id, user_id=test_user.user_id
    )
    constitution.sections.technology.frameworks = ["FastAPI", "MongoDB", "Qdrant", "Next.js"]
    constitution.sections.architecture.rules = ["Strict project isolation", "Zero global state"]
    await mock_db[ConstitutionService.COLLECTION_NAME].replace_one(
        {"project_id": project_id}, constitution.model_dump(by_alias=True)
    )

    # 2. Add Decision
    dec = DecisionModel(
        project_id=project_id,
        decision_text="We selected Qdrant for project-level vector memory.",
        reasoning="Fast payload filtering and isolated collection support.",
        confidence_score=0.98,
        status="ACTIVE",
        source_type="chat_message",
        source_id="chat_dec_1",
    )
    await mock_db["decisions"].insert_one(dec.model_dump(by_alias=True))

    # 3. Query via Orchestrator
    orchestrator = ProjectContextOrchestrator()
    result = await orchestrator.build_orchestrated_context(
        project=project,
        query_text="Why did we choose Qdrant?",
        db=mock_db,
    )

    assert result.project_id == project_id
    assert len(result.decisions) >= 1
    assert "Qdrant" in result.formatted_context
    assert any(c.source_type == "decision" for c in result.citations)
    assert any("Advanced RAG pipeline completed" in t for t in result.trace)


@pytest.mark.asyncio
async def test_benchmark_evaluation_dataset_metrics():
    """Benchmark all 10 evaluation queries for intent classification accuracy and latency."""
    planner = QueryPlanner()
    correct_intents = 0
    latencies = []

    for item in EVALUATION_DATASET:
        t0 = time.perf_counter()
        plan = planner.plan(item.query_text)
        lat = (time.perf_counter() - t0) * 1000
        latencies.append(lat)

        if plan.intent.value == item.expected_intent:
            correct_intents += 1

        for expected_term in item.expected_exact_terms:
            assert expected_term.lower() in [t.lower() for t in plan.exact_terms] or expected_term.lower() in plan.normalized_query.lower()

    accuracy = correct_intents / len(EVALUATION_DATASET)
    avg_latency = sum(latencies) / len(latencies)

    print(f"\n[Retrieval Benchmark] Intent Accuracy: {accuracy * 100:.1f}%, Avg Plan Latency: {avg_latency:.3f}ms")
    assert accuracy >= 0.90
    assert avg_latency < 5.0  # Plan latency sub-5ms

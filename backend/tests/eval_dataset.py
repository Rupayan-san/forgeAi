"""Evaluation dataset for Forge Advanced RAG retrieval quality benchmarking."""

from pydantic import BaseModel, Field


class EvalQuery(BaseModel):
    query_id: str
    query_text: str
    expected_intent: str
    expected_source_types: list[str]
    expected_exact_terms: list[str] = Field(default_factory=list)
    description: str


EVALUATION_DATASET: list[EvalQuery] = [
    EvalQuery(
        query_id="eval_01_mongodb_decision",
        query_text="Why did we choose MongoDB?",
        expected_intent="DECISIONS",
        expected_source_types=["decision", "chat_message", "discord_message"],
        expected_exact_terms=["MongoDB"],
        description="Verifies structured decision retrieval with architectural rationale",
    ),
    EvalQuery(
        query_id="eval_02_jwt_codebase",
        query_text="Where is verifyJwt implemented?",
        expected_intent="CODEBASE",
        expected_source_types=["github_file", "file_summary"],
        expected_exact_terms=["verifyJwt"],
        description="Verifies exact camelCase code symbol sparse and dense matching",
    ),
    EvalQuery(
        query_id="eval_03_redis_decision",
        query_text="What did we decide about Redis?",
        expected_intent="DECISIONS",
        expected_source_types=["decision", "chat_message", "discord_message"],
        expected_exact_terms=["Redis"],
        description="Verifies decision + discussion hybrid search for caching technology",
    ),
    EvalQuery(
        query_id="eval_04_auth_changes",
        query_text="What changed in authentication recently?",
        expected_intent="COMMITS_PRS",
        expected_source_types=["github_commit", "github_pr"],
        expected_exact_terms=[],
        description="Verifies temporal git commit and PR retrieval",
    ),
    EvalQuery(
        query_id="eval_05_api_conventions",
        query_text="What are our API conventions?",
        expected_intent="CONSTITUTION",
        expected_source_types=["constitution"],
        expected_exact_terms=[],
        description="Verifies Authoritative Project Constitution retrieval",
    ),
    EvalQuery(
        query_id="eval_06_rate_limiting_chat",
        query_text="Did we discuss rate limiting?",
        expected_intent="DISCUSSIONS",
        expected_source_types=["chat_message", "discord_message"],
        expected_exact_terms=[],
        description="Verifies team chat and Discord discussion retrieval",
    ),
    EvalQuery(
        query_id="eval_07_pr_rag_pipeline",
        query_text="Which PR introduced the new RAG pipeline?",
        expected_intent="COMMITS_PRS",
        expected_source_types=["github_commit", "github_pr"],
        expected_exact_terms=["PR", "RAG"],
        description="Verifies PR exact identifier and semantic retrieval",
    ),
    EvalQuery(
        query_id="eval_08_previous_database",
        query_text="What was the previous database before MongoDB?",
        expected_intent="DECISIONS",
        expected_source_types=["decision", "chat_message", "discord_message"],
        expected_exact_terms=["MongoDB"],
        description="Verifies historical & superseded decision retrieval",
    ),
    EvalQuery(
        query_id="eval_09_qdrant_config",
        query_text="Where is the Qdrant configuration?",
        expected_intent="CODEBASE",
        expected_source_types=["github_file", "file_summary"],
        expected_exact_terms=["Qdrant"],
        description="Verifies config and codebase file matching",
    ),
    EvalQuery(
        query_id="eval_10_caching_discussion",
        query_text="What did the team discuss about caching?",
        expected_intent="DISCUSSIONS",
        expected_source_types=["chat_message", "discord_message"],
        expected_exact_terms=[],
        description="Verifies multi-source discussion retrieval",
    ),
]

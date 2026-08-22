from typing import Optional, Any
from pydantic import BaseModel, Field


class EvaluationExample(BaseModel):
    """A structured benchmark query with expected ground truth and attribution sources."""
    example_id: str
    category: str  # rag, decisions, memory, github, meetings, project_intelligence
    query: str
    expected_answer_keywords: list[str] = Field(default_factory=list)
    expected_sources: list[str] = Field(default_factory=list)
    reference_answer: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvaluationDataset(BaseModel):
    """Collection of benchmark evaluation examples."""
    dataset_name: str = "forge_eval_benchmark_v1"
    description: str = "High-quality benchmark for Forge RAG, Decisions, Meetings, and Project Intelligence"
    examples: list[EvaluationExample] = Field(default_factory=list)


def get_benchmark_dataset() -> EvaluationDataset:
    """Return the standard curated Forge AI evaluation benchmark dataset."""
    examples = [
        # 1. RAG & Architecture Decisions
        EvaluationExample(
            example_id="eval_rag_vector_store",
            category="rag",
            query="What vector database do we use and why did we choose it?",
            expected_answer_keywords=["Qdrant", "vector", "collection", "payload"],
            expected_sources=["decision", "constitution"],
            reference_answer="Forge uses Qdrant for project-isolated vector storage and fast payload filtering.",
            metadata={"difficulty": "medium"},
        ),
        EvaluationExample(
            example_id="eval_rag_retrieval_strategy",
            category="rag",
            query="How does our hybrid retrieval search combine dense and sparse search?",
            expected_answer_keywords=["BM25", "dense", "sparse", "rerank", "fusion"],
            expected_sources=["decision", "meeting", "constitution"],
            reference_answer="Retrieval uses dense semantic search and BM25 sparse search fused via Reciprocal Rank Fusion.",
            metadata={"difficulty": "hard"},
        ),

        # 2. Project Decisions & History
        EvaluationExample(
            example_id="eval_decision_redis_usage",
            category="decisions",
            query="What did we decide regarding Redis and token blacklisting?",
            expected_answer_keywords=["Redis", "token", "revocation", "blacklist"],
            expected_sources=["decision"],
            reference_answer="We decided to use Redis for token revocation blacklisting and background RQ queues.",
            metadata={"difficulty": "easy"},
        ),

        # 3. Meeting Intelligence & Decisions
        EvaluationExample(
            example_id="eval_meeting_action_extraction",
            category="meetings",
            query="What action items were extracted from the RAG alignment meeting?",
            expected_answer_keywords=["sparse retrieval", "symbol", "action"],
            expected_sources=["meeting", "action_item"],
            reference_answer="Action item to implement sparse retrieval and exact symbol boosting was extracted.",
            metadata={"difficulty": "medium"},
        ),

        # 4. Project State & Intelligence
        EvaluationExample(
            example_id="eval_project_current_state",
            category="project_intelligence",
            query="What is the current state and phase of the project?",
            expected_answer_keywords=["phase", "active", "decisions", "actions"],
            expected_sources=["project_state"],
            reference_answer="The project is in active development with active architectural decisions and open actions.",
            metadata={"difficulty": "medium"},
        ),
        EvaluationExample(
            example_id="eval_project_risks_blockers",
            category="project_intelligence",
            query="Are there any blocked action items or overdue tasks?",
            expected_answer_keywords=["block", "overdue", "risk"],
            expected_sources=["action_item", "project_risk"],
            reference_answer="The risk analyzer inspects overdue action items and blocked flags with source traceability.",
            metadata={"difficulty": "medium"},
        ),
    ]

    return EvaluationDataset(examples=examples)

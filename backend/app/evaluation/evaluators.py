import re
from typing import Any, Optional


class RAGEvaluator:
    """Evaluator for Retrieval relevance, groundedness, and answer keyword coverage."""

    @staticmethod
    def evaluate_source_attribution(
        retrieved_source_types: list[str], expected_sources: list[str]
    ) -> float:
        """Measure if retrieved citations overlap with expected source categories."""
        if not expected_sources:
            return 1.0
        if not retrieved_source_types:
            return 0.0

        retrieved_set = {s.lower() for s in retrieved_source_types}
        expected_set = {s.lower() for s in expected_sources}

        overlap = retrieved_set.intersection(expected_set)
        return len(overlap) / len(expected_set)

    @staticmethod
    def evaluate_retrieval(
        retrieved_documents: list[dict[str, Any]],
        expected_source_types: list[str],
        expected_source_ids: Optional[list[str]] = None,
        k: Optional[int] = None,
    ) -> dict[str, float]:
        """Score the actual ranked retrieval list, never the generated answer."""
        ranked = retrieved_documents[:k] if k else retrieved_documents
        expected_ids = {value.lower() for value in (expected_source_ids or [])}
        expected_types = {value.lower() for value in expected_source_types}
        expected_count = len(expected_ids or expected_types)
        if not expected_count:
            return {"precision_at_k": 1.0, "recall_at_k": 1.0, "mrr": 1.0}

        def is_relevant(document: dict[str, Any]) -> bool:
            source_id = str(document.get("source_id", "")).lower()
            source_type = str(document.get("source_type", "")).lower()
            return (source_id in expected_ids if expected_ids else source_type in expected_types)

        relevant_count = sum(1 for document in ranked if is_relevant(document))
        first_rank = next((index for index, document in enumerate(ranked, start=1) if is_relevant(document)), None)
        return {
            "precision_at_k": relevant_count / max(1, len(ranked)),
            "recall_at_k": min(1.0, relevant_count / expected_count),
            "mrr": 1.0 / first_rank if first_rank else 0.0,
        }

    @staticmethod
    def evaluate_answer(
        answer_text: str,
        retrieved_documents: list[dict[str, Any]],
        expected_keywords: list[str],
        reference_answer: Optional[str] = None,
    ) -> dict[str, float]:
        """Evaluate an actual answer against evidence and optional ground truth."""
        answer = answer_text or ""
        evidence = " ".join(str(document.get("content", "")) for document in retrieved_documents)
        keyword_score = RAGEvaluator.evaluate_groundedness_and_keywords(answer, expected_keywords)
        evidence_terms = set(re.findall(r"[a-z0-9_/-]+", evidence.lower()))
        answer_terms = set(re.findall(r"[a-z0-9_/-]+", answer.lower()))
        groundedness = len(answer_terms & evidence_terms) / max(1, len(answer_terms))
        reference_terms = set(re.findall(r"[a-z0-9_/-]+", (reference_answer or "").lower()))
        correctness = (
            len(answer_terms & reference_terms) / max(1, len(reference_terms))
            if reference_terms
            else keyword_score
        )
        return {
            "correctness": round(correctness, 4),
            "relevance": round(keyword_score, 4),
            "groundedness": round(groundedness, 4),
            "completeness": round(keyword_score, 4),
        }

    @staticmethod
    def evaluate_groundedness_and_keywords(
        answer_text: str, expected_keywords: list[str]
    ) -> float:
        """Measure whether the generated answer contains expected domain keywords from evidence."""
        if not expected_keywords:
            return 1.0
        if not answer_text:
            return 0.0

        ans_lower = answer_text.lower()
        matched = sum(1 for kw in expected_keywords if kw.lower() in ans_lower)
        return matched / len(expected_keywords)


class MeetingEvaluator:
    """Evaluator for meeting decision extraction, action item precision, and summary quality."""

    @staticmethod
    def evaluate_decision_extraction(
        extracted_decisions: list[str], ground_truth_keywords: list[str]
    ) -> float:
        """Verify extracted decisions capture authoritative consensus."""
        if not ground_truth_keywords:
            return 1.0
        if not extracted_decisions:
            return 0.0

        all_text = " ".join(extracted_decisions).lower()
        matched = sum(1 for kw in ground_truth_keywords if kw.lower() in all_text)
        return matched / len(ground_truth_keywords)

    @staticmethod
    def evaluate_action_item_precision(
        extracted_actions: list[str], expected_task_keywords: list[str]
    ) -> float:
        """Verify action items contain concrete deliverables."""
        if not expected_task_keywords:
            return 1.0
        if not extracted_actions:
            return 0.0

        all_text = " ".join(extracted_actions).lower()
        matched = sum(1 for kw in expected_task_keywords if kw.lower() in all_text)
        return matched / len(expected_task_keywords)

    @staticmethod
    def _f1(extracted: list[str], expected: list[str]) -> dict[str, float]:
        extracted_set = {value.strip().lower() for value in extracted if value.strip()}
        expected_set = {value.strip().lower() for value in expected if value.strip()}
        true_positives = len(extracted_set & expected_set)
        precision = true_positives / max(1, len(extracted_set))
        recall = true_positives / max(1, len(expected_set))
        f1 = 2 * precision * recall / max(1e-9, precision + recall)
        return {"precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4)}

    @staticmethod
    def evaluate_decision_f1(extracted_decisions: list[str], expected_decisions: list[str]) -> dict[str, float]:
        """Compute exact normalized precision/recall/F1 when meeting ground truth exists."""
        return MeetingEvaluator._f1(extracted_decisions, expected_decisions)

    @staticmethod
    def evaluate_action_item_f1(extracted_actions: list[str], expected_actions: list[str]) -> dict[str, float]:
        """Compute exact normalized precision/recall/F1 for committed actions."""
        return MeetingEvaluator._f1(extracted_actions, expected_actions)


class ProjectIntelligenceEvaluator:
    """Evaluator for current-state accuracy, blocker detection, and consistency verification."""

    @staticmethod
    def evaluate_state_accuracy(
        project_summary: str, expected_phase_keywords: list[str]
    ) -> float:
        """Check if derived project state summary reflects active phase."""
        if not expected_phase_keywords:
            return 1.0
        if not project_summary:
            return 0.0

        summary_lower = project_summary.lower()
        matched = sum(1 for kw in expected_phase_keywords if kw.lower() in summary_lower)
        return matched / len(expected_phase_keywords)

    @staticmethod
    def evaluate_risk_detection(
        detected_risks: list[dict[str, Any]], expected_risk_types: list[str]
    ) -> float:
        """Verify risk analyzer captures blockers and overdue items."""
        if not expected_risk_types:
            return 1.0
        if not detected_risks:
            return 0.0

        all_titles = " ".join([r.get("title", "") for r in detected_risks]).lower()
        matched = sum(1 for rt in expected_risk_types if rt.lower() in all_titles)
        return matched / len(expected_risk_types)

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

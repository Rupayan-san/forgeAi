from typing import Optional
from pydantic import BaseModel, Field

from app.models.project import ProjectModel
from app.models.chat import SourceCitation
from app.models.memory import MemoryItem, ProjectContextResult, QueryIntent
from app.services.retrieval.structured_retriever import StructuredRetrievalResult
from app.core.retrieval_config import RetrievalConfig, retrieval_config


class ContextBuilder:
    """Assembles token-budgeted, prioritized project context with source citations and confidence assessment."""

    def __init__(self, config: Optional[RetrievalConfig] = None):
        self.config = config or retrieval_config

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Estimate token count (approx. 4 characters per token)."""
        return max(1, len(text) // 4)

    def build_context(
        self,
        project: ProjectModel,
        query: str,
        intent: QueryIntent,
        structured_data: StructuredRetrievalResult,
        memory_chunks: list[MemoryItem],
        trace: list[str],
    ) -> ProjectContextResult:
        """Construct structured, token-bounded context result with strict authority priority."""
        citations: list[SourceCitation] = []
        seen_citation_keys = set()

        # 1. Authoritative Constitution
        constitution_md = structured_data.constitution_markdown
        if structured_data.has_constitution:
            citations.append(
                SourceCitation(
                    source_type="constitution",
                    source_id=f"Project Constitution v{project.project_id[:6]}",
                    source_url="",
                    relevance_score=1.0,
                    content_preview="Authoritative Project Constitution rules and conventions.",
                )
            )
            seen_citation_keys.add("constitution:active")
            trace.append("Included Authoritative Constitution")

        # 2. Decisions & Conflict Handling
        active_dec_lines = []
        conflicted_dec_lines = []
        for dec in structured_data.decisions:
            line = f"- {dec.decision_text}"
            if dec.reasoning:
                line += f" (Reason: {dec.reasoning})"
            if dec.alternatives_considered:
                line += f" [Alternatives: {', '.join(dec.alternatives_considered)}]"

            if dec.status == "CONFLICTED":
                conflicted_dec_lines.append(f"⚠️ [CONFLICTED] {line}")
            elif dec.status == "SUPERSEDED":
                active_dec_lines.append(f"🔻 [SUPERSEDED] {line}")
            else:
                active_dec_lines.append(line)

            source_key = f"decision:{dec.decision_id}"
            if source_key not in seen_citation_keys:
                seen_citation_keys.add(source_key)
                citations.append(
                    SourceCitation(
                        source_type="decision",
                        source_id=f"Decision: {dec.decision_text[:40]}...",
                        source_url=dec.source_url or "",
                        relevance_score=round(dec.confidence_score, 4),
                        content_preview=f"{dec.decision_text} ({dec.reasoning})",
                    )
                )

        decisions_block = "\n".join(active_dec_lines) if active_dec_lines else "No specific architectural decisions recorded."
        if conflicted_dec_lines:
            decisions_block += "\n\n⚠️ CONFLICTED ARCHITECTURAL DECISIONS:\n" + "\n".join(conflicted_dec_lines)

        trace.append(f"Included {len(structured_data.decisions)} decisions ({len(conflicted_dec_lines)} conflicted)")

        # 3. Categorized Memory Chunks
        github_code_parts = []
        github_git_parts = []
        discussion_parts = []
        general_memory_parts = []

        max_chunk_score = 0.0
        for item in memory_chunks:
            st = item.source_type
            sid = item.source_id
            c = item.content
            meta = item.metadata
            score = item.relevance_score
            max_chunk_score = max(max_chunk_score, score)

            # Parent-context expansion
            if st in {"github_file", "file_summary"}:
                file_path = meta.get("file_path", sid)
                github_code_parts.append(f"[Code File: {file_path}]\n{c}")
            elif st == "github_commit":
                author = meta.get("author", "Author")
                date = meta.get("date", "")
                github_git_parts.append(f"[Commit {sid[:7]} by {author} on {date}]\n{c}")
            elif st == "github_pr":
                state = meta.get("state", "PR")
                github_git_parts.append(f"[PR #{sid} ({state})]\n{c}")
            elif st == "discord_message":
                author = meta.get("author", "unknown")
                channel = meta.get("channel", "unknown")
                discussion_parts.append(f"[Discord - #{channel} by @{author}]\n{c}")
            elif st == "chat_message":
                author = meta.get("user_name", "Team")
                discussion_parts.append(f"[Team Chat - {author}]\n{c}")
            else:
                general_memory_parts.append(f"[{st}: {sid}]\n{c}")

            source_key = f"{st}:{sid}"
            if source_key not in seen_citation_keys:
                seen_citation_keys.add(source_key)
                citations.append(
                    SourceCitation(
                        source_type=st,
                        source_id=sid,
                        source_url=meta.get("url", ""),
                        relevance_score=score,
                        content_preview=c[:120],
                    )
                )

        trace.append(f"Selected {len(memory_chunks)} diverse memory chunks (max score: {max_chunk_score})")

        # 4. Confidence Evaluation
        is_low_confidence = (
            not structured_data.has_constitution
            and not structured_data.decisions
            and len(memory_chunks) == 0
        ) or (
            len(memory_chunks) > 0 and max_chunk_score < self.config.min_relevance_threshold and not structured_data.decisions
        )

        if is_low_confidence:
            trace.append("Flagged low retrieval confidence (insufficient matching project evidence)")

        # 5. Build Token-Budgeted Context
        code_block = "\n\n---\n\n".join(github_code_parts) if github_code_parts else "No direct code files matched."
        git_block = "\n\n---\n\n".join(github_git_parts) if github_git_parts else "No commit/PR history matched."
        discussion_block = "\n\n---\n\n".join(discussion_parts) if discussion_parts else "No team discussions matched."
        general_block = "\n\n---\n\n".join(general_memory_parts) if general_memory_parts else ""

        formatted_context = f"""=== PROJECT METADATA ===
Name: {project.name}
Description: {project.description or 'No description provided'}
GitHub Repo: {project.github_repo_name or project.github_repo_url or 'Not connected'}
Branch: {project.github_branch or 'main'}

=== PROJECT CONSTITUTION (HIGHEST PRIORITY - AUTHORITATIVE RULES) ===
{constitution_md}

=== ACTIVE PROJECT DECISIONS (HIGH PRIORITY - ARCHITECTURAL AGREEMENTS) ===
{decisions_block}

=== CURRENT IMPLEMENTATION (GITHUB CODE & METADATA) ===
{code_block}

=== RECENT COMMITS & PULL REQUESTS ===
{git_block}

=== TEAM DISCUSSIONS (PROJECT CHAT & DISCORD) ===
{discussion_block}"""

        if general_block:
            formatted_context += f"\n\n=== ADDITIONAL PROJECT MEMORY ===\n{general_block}"

        if is_low_confidence:
            formatted_context += "\n\n=== RETRIEVAL CONFIDENCE NOTE ===\nNotice: Available project evidence for this specific query is sparse or low-confidence. Please state that insufficient project evidence was found rather than inventing facts."

        # Enforce max context token limit
        token_estimate = self.estimate_tokens(formatted_context)
        if token_estimate > self.config.max_context_tokens:
            # Budget truncation preserving top metadata & constitution
            char_budget = self.config.max_context_tokens * 4
            formatted_context = formatted_context[:char_budget] + "\n\n... [Context truncated to fit token budget]"
            trace.append(f"Context truncated to fit token budget ({self.config.max_context_tokens} tokens)")

        return ProjectContextResult(
            project_id=project.project_id,
            project_name=project.name,
            constitution_text=constitution_md,
            decisions=[d.model_dump() for d in structured_data.decisions],
            memory_chunks=[m.model_dump() for m in memory_chunks],
            formatted_context=formatted_context,
            citations=citations,
            orchestration_intent=intent.value,
            trace=trace,
        )

import re
from typing import Optional
from pydantic import BaseModel, Field

from app.models.memory import QueryIntent
from app.core.retrieval_config import RetrievalConfig, retrieval_config


class RetrievalPlan(BaseModel):
    """Detailed blueprint for multi-source candidate retrieval and ranking."""
    original_query: str
    normalized_query: str
    intent: QueryIntent
    query_variants: list[str] = Field(default_factory=list)
    target_source_types: Optional[list[str]] = None
    exact_terms: list[str] = Field(default_factory=list)
    is_temporal: bool = False
    temporal_direction: str = "neutral"  # "recent", "historical", "neutral"
    requires_dense: bool = True
    requires_sparse: bool = True
    requires_structured: bool = True


class QueryNormalizer:
    """Normalizes conversational queries while strictly preserving technical identifiers."""

    # Conversational filler prefixes / phrases that don't add technical signal
    FILLER_PATTERNS = [
        r"^(can you|could you|please|tell me|explain to me|i want to know|where tf is|what the heck is|show me)\s+",
        r"\b(please|kindly|thanks|thank you)\b",
    ]

    # Regex to capture code identifiers (filenames, routes, constants, snake_case, camelCase)
    CODE_SYMBOL_PATTERN = re.compile(
        r"(\b[a-zA-Z0-9_\-\.]+\.(?:ts|tsx|py|js|jsx|json|md|yaml|yml|css|html)\b|"  # filenames with extension
        r"(?:GET|POST|PUT|PATCH|DELETE)\s+\/[a-zA-Z0-9_\-\/]+|"  # API routes
        r"\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\/]+|"      # path patterns
        r"\b[A-Z]{2,}_[A-Z0-9_]+\b|"                  # CONSTANTS
        r"\b[a-z0-9]+(?:_[a-z0-9]+)+\b|"              # snake_case
        r"\b[a-zA-Z]+[A-Z0-9][a-zA-Z0-9]*\b)"         # camelCase / PascalCase
    )

    @classmethod
    def normalize(cls, query: str) -> tuple[str, list[str]]:
        """Normalize query text and extract exact code symbols/terms."""
        if not query:
            return "", []

        q = query.strip()

        # 1. Extract exact code symbols first so we never damage them
        exact_terms = cls.extract_exact_terms(q)

        # 2. Clean conversational filler prefixes
        cleaned = q
        for pat in cls.FILLER_PATTERNS:
            cleaned = re.sub(pat, "", cleaned, flags=re.IGNORECASE).strip()

        # 3. Collapse multiple whitespaces
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        return cleaned or q, exact_terms

    @classmethod
    def extract_exact_terms(cls, query: str) -> list[str]:
        """Extract exact technical terms, function names, file paths, and identifiers."""
        matches = cls.CODE_SYMBOL_PATTERN.findall(query)
        seen = set()
        unique = []
        for m in matches:
            m_clean = m.strip()
            if m_clean and m_clean.lower() not in seen:
                seen.add(m_clean.lower())
                unique.append(m_clean)
        return unique


class TemporalDetector:
    """Detects temporal constraints and directionality in developer queries."""

    RECENT_KEYWORDS = {
        "latest", "recently", "recent", "currently", "current", "today",
        "yesterday", "last week", "this week", "newest", "last commit", "last pr"
    }

    HISTORICAL_KEYWORDS = {
        "historically", "previous", "previously", "former", "initially",
        "originally", "old", "earlier", "history", "before"
    }

    @classmethod
    def detect(cls, text: str) -> tuple[bool, str]:
        """Detect whether query has temporal intent and the direction."""
        t = text.lower()
        for kw in cls.RECENT_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", t):
                return True, "recent"
        for kw in cls.HISTORICAL_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", t):
                return True, "historical"
        return False, "neutral"


class QueryExpander:
    """Controlled query expander producing bounded, domain-relevant query variants."""

    EXPANSION_RULES = {
        "jwt": ["JWT authentication token validation", "access token refresh"],
        "auth": ["authentication authorization login security"],
        "db": ["database MongoDB Qdrant storage"],
        "database": ["MongoDB collections schema"],
        "vector": ["Qdrant embeddings similarity memory"],
        "rag": ["retrieval context project memory search"],
        "pr": ["pull request GitHub changes merged"],
        "commits": ["git commit author changes diff"],
        "cache": ["Redis caching in-memory queue"],
        "redis": ["Redis queue background worker cache"],
        "discord": ["Discord channel messages discussion"],
        "chat": ["project chat messages discussions"],
        "rules": ["Project Constitution architecture conventions"],
        "standards": ["coding standards tech stack conventions"],
    }

    @classmethod
    def expand(cls, normalized_query: str, max_expansions: int = 3) -> list[str]:
        """Generate a small set of high-precision query variants."""
        variants = [normalized_query]
        q_lower = normalized_query.lower()

        for term, expansions in cls.EXPANSION_RULES.items():
            if re.search(rf"\b{re.escape(term)}\b", q_lower):
                for exp in expansions:
                    new_variant = f"{normalized_query} {exp}"
                    if new_variant not in variants:
                        variants.append(new_variant)
                    if len(variants) >= max_expansions:
                        return variants

        return variants[:max_expansions]


class QueryPlanner:
    """Intelligent retrieval planner determining source routing, strategies, and expansion."""

    def __init__(self, config: Optional[RetrievalConfig] = None):
        self.config = config or retrieval_config

    def plan(self, query: str) -> RetrievalPlan:
        """Create a comprehensive retrieval plan for a user query."""
        normalized, exact_terms = QueryNormalizer.normalize(query)
        is_temporal, temporal_dir = TemporalDetector.detect(normalized)

        # Classify intent
        intent = self._classify_intent(normalized, exact_terms)

        # Multi-query expansion
        if self.config.enable_query_expansion:
            variants = QueryExpander.expand(normalized, max_expansions=self.config.max_query_expansions)
        else:
            variants = [normalized]

        # Target source types and retrieval strategy routing
        target_sources = self._determine_target_sources(intent)
        requires_dense = True
        requires_sparse = True
        requires_structured = intent in {QueryIntent.CONSTITUTION, QueryIntent.DECISIONS, QueryIntent.MULTI_SOURCE}

        # If pure exact symbol query (e.g. "where is verifyJwt"), prioritize sparse & dense codebase
        if exact_terms and intent in {QueryIntent.CODEBASE, QueryIntent.MULTI_SOURCE}:
            requires_sparse = True

        return RetrievalPlan(
            original_query=query,
            normalized_query=normalized,
            intent=intent,
            query_variants=variants,
            target_source_types=target_sources,
            exact_terms=exact_terms,
            is_temporal=is_temporal,
            temporal_direction=temporal_dir,
            requires_dense=requires_dense,
            requires_sparse=requires_sparse,
            requires_structured=requires_structured,
        )

    def _classify_intent(self, text: str, exact_terms: list[str]) -> QueryIntent:
        """Classify query intent with word boundary regexes and exact symbol awareness."""
        q = text.lower()

        # 1. Constitution intent
        constitution_keywords = {
            "constitution", "rule", "rules", "guideline", "guidelines", "standard",
            "standards", "convention", "conventions", "coding standard", "tech stack",
            "allowed", "prohibited", "architecture rules"
        }
        if self._matches_keywords(q, constitution_keywords):
            return QueryIntent.CONSTITUTION

        # 2. Decision intent
        decision_keywords = {
            "why did we", "why do we", "why are we", "decision", "decided", "alternatives",
            "reason for choosing", "conflict", "conflicting", "superseded",
            "architecture choice", "rationale", "tradeoff", "trade-off", "previous database",
            "previous database before", "former database", "before mongodb"
        }
        if self._matches_keywords(q, decision_keywords):
            return QueryIntent.DECISIONS

        # 3. Commits / PRs intent
        commit_pr_keywords = {
            "what changed", "who changed", "commit", "commits", "pull request",
            "pr", "prs", "recent changes", "merged", "latest change", "sha",
            "which pr", "introduced the"
        }
        if self._matches_keywords(q, commit_pr_keywords):
            return QueryIntent.COMMITS_PRS

        # 4. Discussions / Chat / Discord intent
        discussion_keywords = {
            "discussed", "discuss", "chat", "discord", "meeting", "agreement", "talked about",
            "conversation", "channel", "team said", "did we discuss"
        }
        if self._matches_keywords(q, discussion_keywords):
            return QueryIntent.DISCUSSIONS

        # 5. Codebase / Implementation intent
        codebase_keywords = {
            "where is", "file", "function", "endpoint", "route", "implemented",
            "class", "code", "schema", "controller", "service", "how is",
            "directory", "package", "component", "config", "configuration"
        }
        if exact_terms or self._matches_keywords(q, codebase_keywords):
            return QueryIntent.CODEBASE

        return QueryIntent.MULTI_SOURCE

    def _determine_target_sources(self, intent: QueryIntent) -> Optional[list[str]]:
        """Map query intent to target Qdrant source_type filters."""
        if intent == QueryIntent.CONSTITUTION:
            return ["constitution"]
        if intent == QueryIntent.DECISIONS:
            return ["decision", "chat_message", "discord_message", "meeting"]
        if intent == QueryIntent.CODEBASE:
            return ["github_file", "file_summary"]
        if intent == QueryIntent.COMMITS_PRS:
            return ["github_commit", "github_pr"]
        if intent == QueryIntent.DISCUSSIONS:
            return ["chat_message", "discord_message", "meeting"]
        return None

    @staticmethod
    def _matches_keywords(text: str, keywords: set[str]) -> bool:
        for kw in keywords:
            if " " in kw or "-" in kw:
                if kw in text:
                    return True
            else:
                if re.search(rf"\b{re.escape(kw)}\b", text, re.IGNORECASE):
                    return True
        return False

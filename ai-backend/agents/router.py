# ai-backend/agents/router.py
import re
from enum import Enum

from observability.logger import log_pipeline_event


class QueryRoute(Enum):
    """Routes a query to either the RAG pipeline or the ReAct agent."""

    RAG = "rag"
    AGENT = "agent"


AGENT_PATTERNS = [
    r"\bhow many\b",
    r"\blist\b",
    r"\bcount\b",
    r"\bcompare\b",
    r"\bcalculat",
    r"\bwhat documents\b",
    r"\bwhich files\b",
    r"\bdo i have\b",
    r"\bwhen (was|did)\b",
    r"\bmetadata\b",
    r"\bsum\b",
    r"\btotal\b",
    r"\bpercentage\b",
    r"\bcurrent(ly)?\b",
    r"\blatest\b",
    r"\brecent\b",
    r"\bnews\b",
    r"\btoday\b",
    r"\b20(2[4-9]|[3-9]\d)\b",  # years 2024+
    r"\bwhat is .+ (company|startup|product)\b",
    r"\bwho is\b",
    r"\bwhen is\b",
]


def route_query(query: str, trace_id: str = None) -> QueryRoute:
    """
    Route a query to RAG or agent via keyword detection.

    Default is RAG — cheaper and faster. Agent only when patterns match.
    """
    query_lower = query.lower().strip()

    for pattern in AGENT_PATTERNS:
        if re.search(pattern, query_lower):
            log_pipeline_event(
                event="query_routed",
                trace_id=trace_id,
                metadata={
                    "route": "agent",
                    "matched_pattern": pattern,
                    "query_preview": query[:50],
                },
            )
            return QueryRoute.AGENT

    log_pipeline_event(
        event="query_routed",
        trace_id=trace_id,
        metadata={"route": "rag", "query_preview": query[:50]},
    )
    return QueryRoute.RAG

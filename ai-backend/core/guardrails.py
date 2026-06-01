"""
core/guardrails.py

Guardrail pipeline: input sanitization, injection detection, output cleaning, optional off-topic check.
- sanitize_input: strip injection attempts, normalize whitespace, expand abbreviations, enforce max length
- sanitize_output: remove PII, remove AI disclaimers, truncate long responses
- check_query: full async guardrail check with optional domain-specific off-topic detection
"""

import asyncio
import re
from dataclasses import dataclass
from typing import Optional

from core.config import config
from observability.logger import log_pipeline_event


@dataclass
class GuardrailResult:
    """Result of a guardrail check."""
    passed: bool
    reason: Optional[str]       # None if passed, explanation if failed
    sanitized_query: str        # cleaned version of the query
    action: Optional[str]       # 'reject' | 'warn' | None


INJECTION_PATTERNS = [
    r'ignore previous instructions',
    r'ignore all previous',
    r'you are now',
    r'pretend you are',
    r'act as',
    r'disregard',
    r'forget everything',
    r'new persona',
    r'jailbreak',
    r'system prompt',
]

ABBREVIATIONS = {
    'rag': 'retrieval augmented generation',
    'llm': 'large language model',
    'nlp': 'natural language processing',
    'ml': 'machine learning',
    'ai': 'artificial intelligence',
}


def sanitize_input(query: str) -> str:
    """Clean the query: strip injection patterns, normalize whitespace, expand abbreviations, enforce max length."""
    cleaned = query.strip()

    # Strip injection attempts
    for pattern in INJECTION_PATTERNS:
        cleaned = re.sub(pattern, '[removed]', cleaned, flags=re.IGNORECASE)

    # Normalize whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    # Expand abbreviations
    for abbr, expansion in ABBREVIATIONS.items():
        cleaned = re.sub(rf'\b{abbr}\b', expansion, cleaned, flags=re.IGNORECASE)

    # Enforce max length (after abbreviation expansion)
    max_chars = config.MAX_QUERY_CHARS
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars]

    return cleaned


def sanitize_output(response: str) -> str:
    """Clean the LLM response: remove AI disclaimers, truncate if too long, then remove PII patterns."""
    cleaned = response

    # Remove AI disclaimers
    disclaimer_patterns = [
        r'As an AI language model[,.]?\s*',
        r'As an AI assistant[,.]?\s*',
        r"I'm just an AI[,.]?\s*",
    ]
    for pattern in disclaimer_patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)

    # Truncate unreasonably long responses (before PII removal to avoid processing long strings)
    max_response_chars = 8000
    if len(cleaned) > max_response_chars:
        cleaned = cleaned[:max_response_chars] + '\n\n[Response truncated]'

    # Remove email addresses
    cleaned = re.sub(r'\b[\w.-]+@[\w.-]+\.\w{2,}\b', '[email removed]', cleaned)

    # Remove phone numbers
    cleaned = re.sub(r'\(?\d{3}\)?[-.\s]?\d{3}[-.]?\d{4}', '[phone removed]', cleaned)

    return cleaned.strip()


async def check_query(
    query: str,
    trace_id: Optional[str] = None,
    domain_description: Optional[str] = None,
) -> GuardrailResult:
    """
    Full guardrail check: sanitize, check injection, optionally check off-topic.
    Returns GuardrailResult — caller decides whether to proceed or reject.
    """
    # Step 1: sanitize
    sanitized = sanitize_input(query)

    # Step 2: check if sanitization removed all content
    if len(sanitized) < 3:
        log_pipeline_event(
            event='guardrail_reject',
            trace_id=trace_id or "",
            metadata={'reason': 'query_too_short_after_sanitization'}
        )
        return GuardrailResult(
            passed=False,
            reason="Your query could not be processed. Please rephrase.",
            sanitized_query=sanitized,
            action='reject'
        )

    # Step 3: log injection attempts (but process sanitized query anyway)
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, query, re.IGNORECASE):
            log_pipeline_event(
                event='guardrail_injection_attempt',
                trace_id=trace_id or "",
                metadata={
                    'pattern': pattern,
                    'query_preview': query[:50]
                }
            )

    # Step 4: optional off-topic check
    if domain_description:
        from core.llm_client import complete
        from core.prompt_registry import PromptRegistry

        template = PromptRegistry.get('off_topic_check')
        user_prompt = PromptRegistry.render_user(
            'off_topic_check',
            domain_description=domain_description,
            query=sanitized
        )
        result = await asyncio.to_thread(
            complete,
            user_prompt,
            system_prompt=template.system,
            model=config.FAST_MODEL,
            max_tokens=10,
            trace_id=trace_id,
        )
        classification = result.get('text', '').strip().lower()
        if 'irrelevant' in classification:
            log_pipeline_event(
                event='guardrail_off_topic',
                trace_id=trace_id or "",
                metadata={'query_preview': sanitized[:50]}
            )
            return GuardrailResult(
                passed=False,
                reason="Your question doesn't appear to be related to the provided documents. Please ask about the document content.",
                sanitized_query=sanitized,
                action='reject'
            )

    return GuardrailResult(
        passed=True,
        reason=None,
        sanitized_query=sanitized,
        action=None
    )

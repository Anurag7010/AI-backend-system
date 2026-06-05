"""
memory/memory_extractor.py

LLM-based fact extraction from conversation exchanges.
"""

import asyncio

from core.config import config
from core.llm_client import complete as llm_complete
from core.output_validator import validate_json_output
from observability.logger import log_pipeline_event

EXTRACTION_PROMPT = """Analyze this conversation and extract factual statements about the USER (not the AI).

Extract ONLY:
- Explicit facts stated by the user about themselves
- Clear preferences expressed by the user
- Domain knowledge the user demonstrates
- Goals or tasks the user mentions

Do NOT extract:
- Information from documents the user uploaded
- Questions the user asked
- Temporary context specific to this conversation
- Obvious or generic facts

Output as a JSON array of strings. Each string is one distinct fact.
If no extractable facts found, output an empty array: []

Example output: ["User works in finance", "User prefers Python over JavaScript", "User's company uses AWS"]"""


async def extract_memories(
    conversation_messages: list[dict],
    trace_id: str = None
) -> list[str]:
    """
    Extract memorable facts from a conversation.

    Args:
        conversation_messages: list of {role, content}
        trace_id: for observability
    Returns:
        list of fact strings to store in long-term memory
    """
    if len(conversation_messages) < 2:
        return []

    formatted = '\n'.join(
        f"{m['role'].upper()}: {m['content']}"
        for m in conversation_messages
        if m['role'] in ('user', 'assistant')
    )

    # complete() is synchronous — run in thread to avoid blocking the event loop
    result = await asyncio.to_thread(
        llm_complete,
        f"Conversation to analyze:\n\n{formatted}\n\nExtracted facts (JSON array):",
        system_prompt=EXTRACTION_PROMPT,
        model=config.FAST_MODEL,
        max_tokens=300,
        trace_id=trace_id,
    )

    if result.get('error'):
        log_pipeline_event(event='memory_extraction_llm_error', trace_id=trace_id, metadata={'error': result.get('error')})
        return []

    raw_output = result.get('text', '[]')
    validation = validate_json_output(raw_output, schema={
        "type": "array",
        "items": {"type": "string"}
    })

    if not validation.valid:
        log_pipeline_event(event='memory_extraction_failed', trace_id=trace_id, metadata={'error': validation.error})
        return []

    facts = validation.data or []
    facts = [f.strip() for f in facts if len(f.strip()) > 10]

    log_pipeline_event(event='memory_extracted', trace_id=trace_id, metadata={
        'count': len(facts),
        'facts_preview': [f[:40] for f in facts[:3]]
    })

    return facts

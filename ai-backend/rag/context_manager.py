"""
rag/context_manager.py

Context window management for the RAG pipeline.

Retrieved chunks must fit within the LLM's context window.
This module handles token counting and smart truncation — always
at chunk boundaries, never mid-chunk.
"""

import tiktoken

from core.config import config


def count_tokens(text: str, model: str = None) -> int:
    """Count tokens for a given text using tiktoken."""
    model = model or config.MODEL_NAME
    try:
        enc = tiktoken.encoding_for_model(model)
    except KeyError:
        enc = tiktoken.get_encoding("cl100k_base")  # fallback
    return len(enc.encode(text))


def build_context(
    chunks: list[dict],
    max_tokens: int = 3000,
    model: str = None,
) -> tuple[str, list[dict]]:
    """
    Build context string from chunks, respecting token limit.

    Returns:
        (context_string, used_chunks)
        context_string: formatted string for injection into prompt
        used_chunks: chunks included (may be fewer than input)

    Format:
        [Source 1]
        {chunk content}

        [Source 2]
        {chunk content}
        ...
    """
    used_chunks = []
    context_parts = []
    total_tokens = 0

    for i, chunk in enumerate(chunks, 1):
        content = chunk.get('content', '')
        citation = f"[Source {i}]"
        chunk_text = f"{citation}\n{content}\n"
        chunk_tokens = count_tokens(chunk_text, model)

        if total_tokens + chunk_tokens > max_tokens:
            break  # stop at chunk boundary — never truncate mid-chunk

        context_parts.append(chunk_text)
        used_chunks.append({**chunk, 'citation_id': i})
        total_tokens += chunk_tokens

    context_string = "\n".join(context_parts) if context_parts else ""
    return context_string, used_chunks


def estimate_prompt_tokens(
    context: str,
    question: str,
    system_prompt: str,
    model: str = None,
) -> int:
    """Estimate total tokens for a complete prompt."""
    return (
        count_tokens(system_prompt, model) +
        count_tokens(context, model) +
        count_tokens(question, model) +
        50  # buffer for formatting
    )

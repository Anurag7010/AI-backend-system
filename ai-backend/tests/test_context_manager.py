# tests/test_context_manager.py

import pytest
from rag.context_manager import count_tokens, build_context, estimate_prompt_tokens


def test_count_tokens_returns_positive_integer():
    count = count_tokens("Hello, world!")
    assert isinstance(count, int)
    assert count > 0


def test_count_tokens_empty_string():
    count = count_tokens("")
    assert count == 0


def test_count_tokens_longer_text_has_more_tokens():
    short = count_tokens("Hi")
    long = count_tokens("Hello, this is a much longer piece of text with many words.")
    assert long > short


def test_build_context_includes_chunks_up_to_max_tokens():
    chunks = [
        {"content": "First chunk content.", "score": 0.9},
        {"content": "Second chunk content.", "score": 0.8},
        {"content": "Third chunk content.", "score": 0.7},
    ]
    ctx, used = build_context(chunks, max_tokens=1000)
    assert len(used) >= 1
    assert len(used) <= 3


def test_build_context_stops_at_chunk_boundary():
    """Verify it never truncates mid-chunk — stops at last fitting whole chunk."""
    # One chunk that fills exactly the budget; second would overflow
    big_content = "word " * 200  # ~200 tokens worth
    chunks = [
        {"content": big_content, "score": 0.9},
        {"content": big_content, "score": 0.8},
    ]
    ctx, used = build_context(chunks, max_tokens=250)
    # Should include exactly 1 chunk — second would overflow
    assert len(used) == 1
    # The context should not contain partial content from chunk 2
    assert ctx.count("[Source") == 1


def test_build_context_assigns_correct_citation_ids():
    chunks = [
        {"content": "Chunk A", "score": 0.9},
        {"content": "Chunk B", "score": 0.8},
        {"content": "Chunk C", "score": 0.7},
    ]
    ctx, used = build_context(chunks, max_tokens=5000)
    assert used[0]["citation_id"] == 1
    assert used[1]["citation_id"] == 2
    assert used[2]["citation_id"] == 3


def test_build_context_returns_empty_string_when_no_chunks():
    ctx, used = build_context([], max_tokens=3000)
    assert ctx == ""
    assert used == []


def test_build_context_formats_with_source_labels():
    chunks = [{"content": "Some content here.", "score": 0.9}]
    ctx, used = build_context(chunks, max_tokens=1000)
    assert "[Source 1]" in ctx
    assert "Some content here." in ctx


def test_estimate_prompt_tokens_includes_buffer():
    tokens = estimate_prompt_tokens(
        context="context text",
        question="what is this?",
        system_prompt="You are a helpful assistant.",
    )
    # Should be more than just the sum of individual parts (50-token buffer)
    raw_sum = (
        count_tokens("context text") +
        count_tokens("what is this?") +
        count_tokens("You are a helpful assistant.")
    )
    assert tokens == raw_sum + 50

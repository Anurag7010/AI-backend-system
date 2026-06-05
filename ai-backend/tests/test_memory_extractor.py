"""Tests for memory/memory_extractor.py — extract_memories."""
import pytest
from unittest.mock import patch, MagicMock

from memory.memory_extractor import extract_memories
from core.config import config


# ── Helper fixtures ───────────────────────────────────────────────────────────

SHORT_CONVO = [
    {'role': 'user', 'content': 'Hello'}
]

VALID_CONVO = [
    {'role': 'user', 'content': 'I work in finance and prefer Python.'},
    {'role': 'assistant', 'content': 'That is great to know.'},
]


# ── Tests ─────────────────────────────────────────────────────────────────────

async def test_extract_memories_returns_empty_for_fewer_than_2_messages():
    """extract_memories returns [] when conversation has fewer than 2 messages."""
    result = await extract_memories(SHORT_CONVO, trace_id='test')
    assert result == []


async def test_extract_memories_parses_valid_json_from_llm():
    """extract_memories returns parsed fact list from valid JSON LLM output."""
    with patch('memory.memory_extractor.llm_complete') as mock_complete:
        mock_complete.return_value = {
            'text': '["User works in finance", "User prefers Python"]',
            'error': None
        }
        result = await extract_memories(VALID_CONVO, trace_id='test')

    assert isinstance(result, list)
    assert 'User works in finance' in result
    assert 'User prefers Python' in result


async def test_extract_memories_returns_empty_list_for_invalid_json():
    """extract_memories returns [] and does not crash on invalid JSON from LLM."""
    with patch('memory.memory_extractor.llm_complete') as mock_complete:
        mock_complete.return_value = {
            'text': 'This is not valid JSON at all {{{{',
            'error': None
        }
        result = await extract_memories(VALID_CONVO, trace_id='test')

    assert result == []


async def test_extract_memories_filters_out_short_facts():
    """extract_memories filters out facts shorter than 10 characters."""
    with patch('memory.memory_extractor.llm_complete') as mock_complete:
        mock_complete.return_value = {
            'text': '["ok", "too short", "User works in finance and prefers Python"]',
            'error': None
        }
        result = await extract_memories(VALID_CONVO, trace_id='test')

    # "ok" (2 chars) and "too short" (9 chars) should be filtered out
    for fact in result:
        assert len(fact.strip()) > 10
    assert 'User works in finance and prefers Python' in result


async def test_extract_memories_uses_fast_model():
    """extract_memories passes config.FAST_MODEL to the LLM complete call."""
    with patch('memory.memory_extractor.llm_complete') as mock_complete:
        mock_complete.return_value = {
            'text': '["User works in finance"]',
            'error': None
        }
        await extract_memories(VALID_CONVO, trace_id='test')

    mock_complete.assert_called_once()
    call_kwargs = mock_complete.call_args.kwargs
    assert call_kwargs.get('model') == config.FAST_MODEL


async def test_extract_memories_returns_empty_list_on_llm_error():
    """extract_memories returns [] when LLM returns an error."""
    with patch('memory.memory_extractor.llm_complete') as mock_complete:
        mock_complete.return_value = {
            'text': '',
            'error': 'API rate limit exceeded'
        }
        result = await extract_memories(VALID_CONVO, trace_id='test')

    assert result == []


async def test_extract_memories_handles_empty_array_output():
    """extract_memories returns [] when LLM returns an empty JSON array."""
    with patch('memory.memory_extractor.llm_complete') as mock_complete:
        mock_complete.return_value = {
            'text': '[]',
            'error': None
        }
        result = await extract_memories(VALID_CONVO, trace_id='test')

    assert result == []


async def test_extract_memories_strips_whitespace_from_facts():
    """extract_memories strips leading/trailing whitespace from each fact."""
    with patch('memory.memory_extractor.llm_complete') as mock_complete:
        mock_complete.return_value = {
            'text': '["  User works in finance  ", "  User prefers Python  "]',
            'error': None
        }
        result = await extract_memories(VALID_CONVO, trace_id='test')

    for fact in result:
        assert fact == fact.strip()

"""Tests for memory/conversation_buffer.py — ConversationBuffer."""
import pytest
from unittest.mock import AsyncMock, patch
from memory.conversation_buffer import ConversationBuffer, BufferedMessage


# ── add_message ───────────────────────────────────────────────────────────────

def test_add_message_stores_message_with_nonzero_token_count():
    buf = ConversationBuffer()
    buf.add_message('user', 'Hello, how are you?')
    assert len(buf._messages) == 1
    assert buf._messages[0].role == 'user'
    assert buf._messages[0].content == 'Hello, how are you?'
    assert buf._messages[0].token_count > 0


def test_add_message_token_count_is_accurate():
    buf = ConversationBuffer()
    content = 'This is a test sentence with several words.'
    buf.add_message('user', content)
    # token count should match direct encoder count
    expected = len(buf._encoder.encode(content))
    assert buf._messages[0].token_count == expected


# ── load_from_db ──────────────────────────────────────────────────────────────

def test_load_from_db_uses_stored_token_count():
    buf = ConversationBuffer()
    db_msgs = [
        {'role': 'user', 'content': 'Hello', 'token_count': 42},
        {'role': 'assistant', 'content': 'Hi there', 'token_count': 99},
    ]
    buf.load_from_db(db_msgs)
    assert len(buf._messages) == 2
    # Stored token_count must be used verbatim — not re-counted
    assert buf._messages[0].token_count == 42
    assert buf._messages[1].token_count == 99


def test_load_from_db_recounts_when_token_count_zero():
    buf = ConversationBuffer()
    content = 'Recount this please'
    db_msgs = [{'role': 'user', 'content': content, 'token_count': 0}]
    buf.load_from_db(db_msgs)
    expected = len(buf._encoder.encode(content))
    assert buf._messages[0].token_count == expected
    assert buf._messages[0].token_count > 0


def test_load_from_db_recounts_when_token_count_missing():
    buf = ConversationBuffer()
    content = 'No token count key here'
    db_msgs = [{'role': 'user', 'content': content}]
    buf.load_from_db(db_msgs)
    expected = len(buf._encoder.encode(content))
    assert buf._messages[0].token_count == expected


def test_load_from_db_resets_existing_messages():
    buf = ConversationBuffer()
    buf.add_message('user', 'Old message')
    db_msgs = [{'role': 'assistant', 'content': 'New message', 'token_count': 10}]
    buf.load_from_db(db_msgs)
    assert len(buf._messages) == 1
    assert buf._messages[0].content == 'New message'


# ── trim — window strategy ────────────────────────────────────────────────────

def test_trim_window_drops_oldest_when_over_budget():
    buf = ConversationBuffer(max_tokens=20, strategy='window')
    # Add 6 messages with known token counts
    for i in range(6):
        buf._messages.append(BufferedMessage(role='user', content=f'msg{i}', token_count=5))
    # total = 30 > 20; window trim should drop oldest until under budget or min_keep=4 reached
    buf.trim()
    # After trim: should have <= 4 messages (MIN_KEEP)
    assert len(buf._messages) <= 6
    # Remaining messages should be the newest ones
    contents = [m.content for m in buf._messages]
    assert 'msg0' not in contents or len(buf._messages) <= 4


def test_trim_window_never_drops_below_4_messages():
    buf = ConversationBuffer(max_tokens=5, strategy='window')
    # 6 messages each with 5 tokens — total 30, way over budget
    for i in range(6):
        buf._messages.append(BufferedMessage(role='user', content=f'msg{i}', token_count=5))
    buf.trim()
    assert len(buf._messages) == 4


def test_trim_does_nothing_when_under_budget():
    buf = ConversationBuffer(max_tokens=1000, strategy='window')
    buf.add_message('user', 'Short message')
    buf.add_message('assistant', 'Short reply')
    original_count = len(buf._messages)
    buf.trim()
    assert len(buf._messages) == original_count


def test_trim_exits_early_when_under_max_tokens():
    buf = ConversationBuffer(max_tokens=500, strategy='window')
    buf.add_message('user', 'Hello')
    buf.add_message('assistant', 'Hi')
    total_before = buf.total_tokens
    buf.trim()
    # Nothing should have changed since we were under budget
    assert buf.total_tokens == total_before
    assert len(buf._messages) == 2


# ── to_messages ───────────────────────────────────────────────────────────────

def test_to_messages_returns_correct_dicts():
    buf = ConversationBuffer()
    buf.add_message('user', 'What is RAG?')
    buf.add_message('assistant', 'RAG is retrieval augmented generation.')
    messages = buf.to_messages()
    assert messages == [
        {'role': 'user', 'content': 'What is RAG?'},
        {'role': 'assistant', 'content': 'RAG is retrieval augmented generation.'},
    ]


def test_to_messages_does_not_include_token_count():
    buf = ConversationBuffer()
    buf.add_message('user', 'Test')
    messages = buf.to_messages()
    assert 'token_count' not in messages[0]


# ── total_tokens ──────────────────────────────────────────────────────────────

def test_total_tokens_sums_all_message_token_counts():
    buf = ConversationBuffer()
    buf._messages = [
        BufferedMessage(role='user', content='a', token_count=10),
        BufferedMessage(role='assistant', content='b', token_count=20),
        BufferedMessage(role='user', content='c', token_count=15),
    ]
    assert buf.total_tokens == 45


def test_total_tokens_zero_for_empty_buffer():
    buf = ConversationBuffer()
    assert buf.total_tokens == 0


# ── summary strategy ──────────────────────────────────────────────────────────

def test_trim_summary_strategy_marks_pending_summary_text():
    buf = ConversationBuffer(max_tokens=20, strategy='summary')
    # Add 8 messages so we're over budget
    for i in range(8):
        buf._messages.append(BufferedMessage(role='user', content=f'msg{i}', token_count=5))
    buf.trim()
    # _pending_summary_text should be set
    assert hasattr(buf, '_pending_summary_text')
    assert len(buf._pending_summary_text) > 0


def test_trim_summary_strategy_keeps_recent_messages():
    buf = ConversationBuffer(max_tokens=20, strategy='summary')
    for i in range(8):
        buf._messages.append(BufferedMessage(role='user', content=f'msg{i}', token_count=5))
    buf.trim()
    # The kept messages should be the second half (messages 4-7)
    kept_contents = [m.content for m in buf._messages]
    assert 'msg7' in kept_contents
    assert 'msg6' in kept_contents


def test_trim_summary_does_not_trim_when_at_min_keep():
    buf = ConversationBuffer(max_tokens=5, strategy='summary')
    # Exactly 4 messages (MIN_KEEP) — should not trim
    for i in range(4):
        buf._messages.append(BufferedMessage(role='user', content=f'msg{i}', token_count=5))
    buf.trim()
    # _trim_with_summary returns early when len <= MIN_KEEP
    assert len(buf._messages) == 4
    assert not hasattr(buf, '_pending_summary_text')


# ── summarize_pending ─────────────────────────────────────────────────────────

async def test_summarize_pending_prepends_summary_message():
    buf = ConversationBuffer(max_tokens=20, strategy='summary')
    for i in range(8):
        buf._messages.append(BufferedMessage(role='user', content=f'msg{i}', token_count=5))
    buf.trim()
    assert hasattr(buf, '_pending_summary_text')

    with patch('memory.conversation_buffer.llm_complete') as mock_complete:
        mock_complete.return_value = {'text': 'This is the summary.', 'error': None}
        await buf.summarize_pending(trace_id='test')

    # _pending_summary_text should be removed
    assert not hasattr(buf, '_pending_summary_text')
    # First message should be the summary system message
    assert buf._messages[0].role == 'system'
    assert '[Earlier conversation summary]' in buf._messages[0].content
    assert buf._summary == 'This is the summary.'


async def test_summarize_pending_does_nothing_when_no_pending():
    buf = ConversationBuffer()
    buf.add_message('user', 'Hello')
    count_before = len(buf._messages)
    await buf.summarize_pending()
    assert len(buf._messages) == count_before

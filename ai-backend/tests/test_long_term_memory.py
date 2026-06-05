"""Tests for memory/long_term_memory.py — LongTermMemoryStore (ChromaDB mocked)."""
import pytest
import asyncio
from unittest.mock import MagicMock, patch

from memory.long_term_memory import LongTermMemoryStore


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_collection():
    col = MagicMock()
    col.get.return_value = {'ids': [], 'documents': [], 'metadatas': []}
    col.query.return_value = {
        'ids': [[]], 'documents': [[]], 'metadatas': [[]], 'distances': [[]]
    }
    col.add.return_value = None
    col.delete.return_value = None
    col.update.return_value = None
    return col


@pytest.fixture
def memory_store(mock_collection):
    with patch('chromadb.PersistentClient') as mock_client:
        mock_client.return_value.get_or_create_collection.return_value = mock_collection
        store = LongTermMemoryStore()
    # Ensure the collection stays mocked after the context manager exits
    store.collection = mock_collection
    return store


# ── store_memory ──────────────────────────────────────────────────────────────

async def test_store_memory_adds_to_collection(memory_store, mock_collection):
    """store_memory calls collection.add with correct ids/documents/metadatas."""
    result = await memory_store.store_memory(user_id='user1', content='User works in finance')
    assert result is True
    mock_collection.add.assert_called_once()
    call_kwargs = mock_collection.add.call_args
    # add was called with keyword args: ids, documents, metadatas
    ids = call_kwargs.kwargs.get('ids') or call_kwargs.args[0] if call_kwargs.args else call_kwargs.kwargs['ids']
    documents = call_kwargs.kwargs.get('documents') or call_kwargs.args[1] if len(call_kwargs.args) > 1 else call_kwargs.kwargs['documents']
    metadatas = call_kwargs.kwargs.get('metadatas') or call_kwargs.args[2] if len(call_kwargs.args) > 2 else call_kwargs.kwargs['metadatas']
    assert len(ids) == 1
    assert documents[0] == 'User works in finance'
    assert metadatas[0]['user_id'] == 'user1'
    assert 'created_at' in metadatas[0]
    assert metadatas[0]['access_count'] == 0


async def test_store_memory_returns_false_for_near_duplicate(memory_store, mock_collection):
    """store_memory returns False when _is_duplicate returns True (similarity >= 0.95)."""
    # Set up query to return a very close match (distance 0.02 = similarity 0.98)
    mock_collection.query.return_value = {
        'ids': [['existing-id']],
        'documents': [['User works in finance']],
        'metadatas': [[]],
        'distances': [[0.02]]
    }
    result = await memory_store.store_memory(user_id='user1', content='User works in finance')
    assert result is False
    mock_collection.add.assert_not_called()


# ── retrieve_memories ─────────────────────────────────────────────────────────

async def test_retrieve_memories_returns_empty_list_when_no_results(memory_store, mock_collection):
    """retrieve_memories returns [] when collection returns no results."""
    mock_collection.query.return_value = {
        'ids': [[]], 'documents': [[]], 'metadatas': [[]], 'distances': [[]]
    }
    results = await memory_store.retrieve_memories(user_id='user1', query='finance')
    assert results == []


async def test_retrieve_memories_returns_correct_structure(memory_store, mock_collection):
    """retrieve_memories returns dicts with id, content, similarity, access_count."""
    mock_collection.query.return_value = {
        'ids': [['mem-123']],
        'documents': [['User works in finance']],
        'metadatas': [[{
            'user_id': 'user1',
            'created_at': '2024-01-01T00:00:00',
            'last_accessed': '2024-01-01T00:00:00',
            'access_count': 3
        }]],
        'distances': [[0.1]]
    }
    results = await memory_store.retrieve_memories(user_id='user1', query='finance')
    assert len(results) == 1
    assert results[0]['id'] == 'mem-123'
    assert results[0]['content'] == 'User works in finance'
    assert results[0]['similarity'] == round(1 - 0.1, 3)
    assert results[0]['access_count'] == 3


async def test_retrieve_memories_calls_update_to_increment_access(memory_store, mock_collection):
    """retrieve_memories updates access metadata after retrieving."""
    mock_collection.query.return_value = {
        'ids': [['mem-abc']],
        'documents': [['User prefers Python']],
        'metadatas': [[{
            'user_id': 'user1',
            'created_at': '2024-01-01T00:00:00',
            'last_accessed': '2024-01-01T00:00:00',
            'access_count': 1
        }]],
        'distances': [[0.2]]
    }
    await memory_store.retrieve_memories(user_id='user1', query='language')
    mock_collection.update.assert_called_once()
    update_call = mock_collection.update.call_args.kwargs
    assert update_call['metadatas'][0]['access_count'] == 2


# ── delete_memory ─────────────────────────────────────────────────────────────

async def test_delete_memory_returns_false_when_not_found(memory_store, mock_collection):
    """delete_memory returns False when memory_id doesn't exist."""
    mock_collection.get.return_value = {'ids': [], 'documents': [], 'metadatas': []}
    result = await memory_store.delete_memory(memory_id='nonexistent', user_id='user1')
    assert result is False
    mock_collection.delete.assert_not_called()


async def test_delete_memory_returns_false_when_user_id_mismatch(memory_store, mock_collection):
    """delete_memory returns False when user_id does not match stored metadata."""
    mock_collection.get.return_value = {
        'ids': ['mem-xyz'],
        'documents': ['some fact'],
        'metadatas': [{'user_id': 'other_user', 'created_at': '2024-01-01T00:00:00', 'access_count': 0}]
    }
    result = await memory_store.delete_memory(memory_id='mem-xyz', user_id='user1')
    assert result is False
    mock_collection.delete.assert_not_called()


async def test_delete_memory_returns_true_and_deletes_when_ownership_verified(memory_store, mock_collection):
    """delete_memory calls collection.delete and returns True when ownership matches."""
    mock_collection.get.return_value = {
        'ids': ['mem-xyz'],
        'documents': ['some fact'],
        'metadatas': [{'user_id': 'user1', 'created_at': '2024-01-01T00:00:00', 'access_count': 0}]
    }
    result = await memory_store.delete_memory(memory_id='mem-xyz', user_id='user1')
    assert result is True
    mock_collection.delete.assert_called_once()


# ── _is_duplicate ─────────────────────────────────────────────────────────────

async def test_is_duplicate_returns_true_when_similarity_above_threshold(memory_store, mock_collection):
    """_is_duplicate returns True when distance <= 0.05 (similarity >= 0.95)."""
    mock_collection.query.return_value = {
        'ids': [['existing']],
        'documents': [['same content']],
        'metadatas': [[]],
        'distances': [[0.03]]  # similarity = 0.97 >= 0.95
    }
    result = await memory_store._is_duplicate(user_id='user1', content='same content')
    assert result is True


async def test_is_duplicate_returns_false_for_different_content(memory_store, mock_collection):
    """_is_duplicate returns False when distance is high (very different content)."""
    mock_collection.query.return_value = {
        'ids': [['different']],
        'documents': [['completely different topic']],
        'metadatas': [[]],
        'distances': [[0.8]]  # similarity = 0.2 — far below threshold
    }
    result = await memory_store._is_duplicate(user_id='user1', content='new unique content')
    assert result is False


async def test_is_duplicate_returns_false_when_no_existing_memories(memory_store, mock_collection):
    """_is_duplicate returns False when no memories exist yet."""
    mock_collection.query.return_value = {
        'ids': [[]], 'documents': [[]], 'metadatas': [[]], 'distances': [[]]
    }
    result = await memory_store._is_duplicate(user_id='user1', content='brand new fact')
    assert result is False

"""Tests for core/cache.py LRUCache and make_cache_key."""
import time
from unittest.mock import patch
from core.cache import LRUCache, make_cache_key


def test_get_returns_none_for_missing_key():
    cache = LRUCache()
    assert cache.get("nonexistent") is None


def test_set_and_get_round_trip():
    cache = LRUCache()
    cache.set("key1", {"data": 42})
    result = cache.get("key1")
    assert result == {"data": 42}


def test_ttl_expiry():
    # cache.py uses `time.time()` via `import time; time.time()`.
    # Patch the time module inside core.cache so _is_expired sees the future time.
    cache = LRUCache(ttl_seconds=1)
    cache.set("key1", "value")
    with patch("core.cache.time") as mock_time:
        mock_time.time.return_value = time.time() + 10  # 10 seconds in the future
        result = cache.get("key1")
    assert result is None


def test_lru_eviction():
    cache = LRUCache(max_size=3)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    # Access "a" to make it recently used
    cache.get("a")
    # Insert "d" — should evict "b" (LRU)
    cache.set("d", 4)
    assert cache.get("a") == 1   # recently accessed — still present
    assert cache.get("b") is None  # was LRU — evicted
    assert cache.get("c") == 3
    assert cache.get("d") == 4


def test_hit_rate_calculation():
    cache = LRUCache()
    cache.set("k", "v")
    cache.get("k")  # hit
    cache.get("missing")  # miss
    assert cache.hit_rate == 0.5


def test_hit_rate_zero_when_no_operations():
    cache = LRUCache()
    assert cache.hit_rate == 0.0


def test_make_cache_key_stable():
    key1 = make_cache_key(query="hello", top_k=5)
    key2 = make_cache_key(query="hello", top_k=5)
    assert key1 == key2
    assert len(key1) == 16


def test_make_cache_key_different_for_different_inputs():
    key1 = make_cache_key(query="hello")
    key2 = make_cache_key(query="world")
    assert key1 != key2


def test_invalidate_removes_key():
    cache = LRUCache()
    cache.set("key", "value")
    cache.invalidate("key")
    assert cache.get("key") is None


def test_clear_empties_cache():
    cache = LRUCache()
    cache.set("a", 1)
    cache.set("b", 2)
    cache.clear()
    assert cache.stats["size"] == 0

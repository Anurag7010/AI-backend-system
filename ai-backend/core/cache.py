"""
core/cache.py

LRU caches with TTL support for retrieval and LLM response caching.
Module-level singletons: retrieval_cache and llm_cache.
"""

import time
import hashlib
import json
from collections import OrderedDict
from typing import Any, Optional
from observability.logger import log_pipeline_event


class LRUCache:
    """LRU cache with TTL support. Thread-safe for single-threaded async use."""

    def __init__(self, max_size: int = 100, ttl_seconds: int = 300):
        self._cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._hits = 0
        self._misses = 0

    def _is_expired(self, timestamp: float) -> bool:
        """Return True if the entry at timestamp is past its TTL."""
        return time.time() - timestamp > self._ttl

    def get(self, key: str) -> Optional[Any]:
        """Return cached value or None if missing/expired."""
        if key not in self._cache:
            self._misses += 1
            return None
        value, timestamp = self._cache[key]
        if self._is_expired(timestamp):
            del self._cache[key]
            self._misses += 1
            return None
        self._cache.move_to_end(key)
        self._hits += 1
        return value

    def set(self, key: str, value: Any) -> None:
        """Store value under key, evicting LRU entry if at capacity."""
        if key in self._cache:
            self._cache.move_to_end(key)
        else:
            if len(self._cache) >= self._max_size:
                evicted_key = next(iter(self._cache))
                del self._cache[evicted_key]
        self._cache[key] = (value, time.time())

    def invalidate(self, key: str) -> None:
        """Remove a specific key from cache."""
        self._cache.pop(key, None)

    def clear(self) -> None:
        """Remove all entries from cache."""
        self._cache.clear()

    @property
    def hit_rate(self) -> float:
        """Fraction of lookups that returned a cached value."""
        total = self._hits + self._misses
        return self._hits / total if total > 0 else 0.0

    @property
    def stats(self) -> dict:
        """Current cache statistics."""
        return {
            "size": len(self._cache),
            "max_size": self._max_size,
            "ttl_seconds": self._ttl,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self.hit_rate, 3),
        }


def make_cache_key(*args: Any, **kwargs: Any) -> str:
    """Create a stable 16-char hex cache key from any arguments."""
    key_data = {"args": args, "kwargs": kwargs}
    key_str = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.sha256(key_str.encode()).hexdigest()[:16]


# Module-level singletons
retrieval_cache = LRUCache(max_size=200, ttl_seconds=300)
llm_cache = LRUCache(max_size=100, ttl_seconds=3600)

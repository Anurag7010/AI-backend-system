"""Tests for observability/metrics.py.

metrics.py does `from core.config import config` inside read_log_lines(),
so we mock `core.config.config` (the config object) and set LOG_FILE on it.
"""
import json
import os
import tempfile
from datetime import datetime, timezone
from unittest.mock import patch

from observability.metrics import compute_metrics


def _now_str() -> str:
    """Return current UTC ISO timestamp — inside the 24h window."""
    return datetime.now(timezone.utc).isoformat()


def _write_tmplog(lines: list[dict]) -> str:
    """Write JSON log lines to a temp file and return its path."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.log', delete=False) as f:
        for line in lines:
            f.write(json.dumps(line) + '\n')
        return f.name


def _compute_with_log(lines: list[dict], since_hours: int = 24) -> dict:
    """Helper: write lines to a temp log, run compute_metrics, clean up."""
    tmpfile = _write_tmplog(lines)
    try:
        with patch("core.config.config") as mock_config:
            mock_config.LOG_FILE = tmpfile
            return compute_metrics(since_hours=since_hours)
    finally:
        os.unlink(tmpfile)


# ── empty / missing log ───────────────────────────────────────────────────────

def test_empty_log_returns_zero_metrics(tmp_path):
    log_file = tmp_path / "test.log"
    log_file.write_text("")
    with patch("core.config.config") as mock_config:
        mock_config.LOG_FILE = str(log_file)
        result = compute_metrics(since_hours=24)
    assert result["total_queries"] == 0
    assert result["avg_latency_ms"] == 0
    assert result["error_rate"] == 0.0


# ── total_queries ─────────────────────────────────────────────────────────────

def test_counts_pipeline_starts():
    """compute_metrics counts pipeline_start events as total_queries."""
    now_str = _now_str()
    lines = [
        {"msg": "pipeline_start", "time": now_str, "trace_id": "t1"},
        {"msg": "pipeline_start", "time": now_str, "trace_id": "t2"},
    ]
    result = _compute_with_log(lines)
    assert result["total_queries"] == 2


# ── avg_latency_ms ────────────────────────────────────────────────────────────

def test_computes_avg_latency():
    now_str = _now_str()
    lines = [
        {"msg": "llm_call", "time": now_str, "latency_ms": 1000, "status": "ok"},
        {"msg": "llm_call", "time": now_str, "latency_ms": 3000, "status": "ok"},
    ]
    result = _compute_with_log(lines)
    assert result["avg_latency_ms"] == 2000


# ── cache_hit_rate ────────────────────────────────────────────────────────────

def test_cache_hit_rate():
    now_str = _now_str()
    lines = [
        {"msg": "cache_hit", "time": now_str},
        {"msg": "cache_hit", "time": now_str},
        {"msg": "cache_miss", "time": now_str},
    ]
    result = _compute_with_log(lines)
    # 2 hits out of 3 cache events = 0.667
    assert abs(result["cache_hit_rate"] - 0.667) < 0.01


# ── slow_queries ──────────────────────────────────────────────────────────────

def test_identifies_slow_queries():
    now_str = _now_str()
    lines = [
        {"msg": "llm_call", "time": now_str, "latency_ms": 6000, "status": "ok"},
        {"msg": "llm_call", "time": now_str, "latency_ms": 1000, "status": "ok"},
    ]
    result = _compute_with_log(lines)
    assert result["slow_queries"] == 1


# ── failed_retrievals ─────────────────────────────────────────────────────────

def test_identifies_failed_retrievals():
    now_str = _now_str()
    lines = [
        {"msg": "retrieval", "time": now_str, "result_count": 0},
        {"msg": "retrieval", "time": now_str, "result_count": 5},
    ]
    result = _compute_with_log(lines)
    assert result["failed_retrievals"] == 1


# ── error_rate ────────────────────────────────────────────────────────────────

def test_computes_error_rate():
    now_str = _now_str()
    lines = [
        {"msg": "llm_call", "time": now_str, "latency_ms": 500, "status": "error"},
        {"msg": "llm_call", "time": now_str, "latency_ms": 500, "status": "ok"},
        {"msg": "llm_call", "time": now_str, "latency_ms": 500, "status": "ok"},
        {"msg": "llm_call", "time": now_str, "latency_ms": 500, "status": "ok"},
    ]
    result = _compute_with_log(lines)
    assert abs(result["error_rate"] - 0.25) < 0.001


# ── token totals ──────────────────────────────────────────────────────────────

def test_totals_tokens():
    now_str = _now_str()
    lines = [
        {"msg": "llm_call", "time": now_str, "latency_ms": 200, "status": "ok",
         "input_tokens": 100, "output_tokens": 50},
        {"msg": "llm_call", "time": now_str, "latency_ms": 200, "status": "ok",
         "input_tokens": 200, "output_tokens": 75},
    ]
    result = _compute_with_log(lines)
    assert result["total_tokens"] == 425
    assert result["token_breakdown"]["input"] == 300
    assert result["token_breakdown"]["output"] == 125


# ── queries_per_hour ──────────────────────────────────────────────────────────

def test_queries_per_hour_divides_by_since_hours():
    now_str = _now_str()
    lines = [
        {"msg": "pipeline_start", "time": now_str},
        {"msg": "pipeline_start", "time": now_str},
    ]
    result = _compute_with_log(lines, since_hours=2)
    assert result["queries_per_hour"] == 1.0

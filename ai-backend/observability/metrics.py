"""
observability/metrics.py

Reads structured JSON log lines and aggregates them into dashboard metrics.
File-based approach — production would use a dedicated log aggregation service.
"""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional


def read_log_lines(since_hours: int = 24) -> list[dict]:
    """Read and parse JSON log lines from the last N hours. Skips malformed lines."""
    from core.config import config
    log_file = Path(config.LOG_FILE)

    if not log_file.exists():
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    lines = []

    with open(log_file) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                ts_str = entry.get('time', '')
                # Handle both 'time' (JSON logger format) and 'timestamp' fields
                if not ts_str:
                    ts_str = entry.get('timestamp', '')
                if not ts_str:
                    continue
                # Strip trailing Z and parse — preserve timezone info
                ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                if ts >= cutoff:
                    lines.append(entry)
            except (json.JSONDecodeError, ValueError):
                continue

    return lines


def compute_metrics(since_hours: int = 24) -> dict:
    """
    Aggregate log lines into metrics for the observability dashboard.

    Returns dict with: period_hours, total_queries, avg_latency_ms, error_rate,
    cache_hit_rate, total_tokens, estimated_cost_usd, slow_queries,
    failed_retrievals, queries_per_hour, token_breakdown.
    """
    lines = read_log_lines(since_hours)

    # Filter by event type using the 'msg' field (how logger.py stores event name)
    llm_calls = [l for l in lines if l.get('msg') == 'llm_call']
    retrieval_calls = [l for l in lines if l.get('msg') == 'retrieval']
    pipeline_starts = [l for l in lines if l.get('msg') == 'pipeline_start']
    cache_events = [l for l in lines if l.get('msg') in ('cache_hit', 'cache_miss')]

    total_queries = len(pipeline_starts)

    latencies = [l['latency_ms'] for l in llm_calls if 'latency_ms' in l]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0

    errors = [l for l in llm_calls if l.get('status') == 'error']
    error_rate = len(errors) / len(llm_calls) if llm_calls else 0

    hits = [l for l in cache_events if l.get('msg') == 'cache_hit']
    cache_hit_rate = len(hits) / len(cache_events) if cache_events else 0

    # Token fields: log_llm_call stores them as top-level keys
    input_tokens = sum(l.get('input_tokens', 0) for l in llm_calls)
    output_tokens = sum(l.get('output_tokens', 0) for l in llm_calls)
    total_tokens = input_tokens + output_tokens

    # gpt-4o pricing
    INPUT_PRICE_PER_1M = 5.0
    OUTPUT_PRICE_PER_1M = 15.0
    estimated_cost = (
        input_tokens / 1_000_000 * INPUT_PRICE_PER_1M
        + output_tokens / 1_000_000 * OUTPUT_PRICE_PER_1M
    )

    slow_queries = len([l for l in llm_calls if l.get('latency_ms', 0) > 5000])

    # retrieval log_retrieval() stores result_count (not chunks_returned)
    failed_retrievals = len([l for l in retrieval_calls if l.get('result_count', 1) == 0])

    return {
        "period_hours": since_hours,
        "total_queries": total_queries,
        "avg_latency_ms": round(avg_latency),
        "error_rate": round(error_rate, 3),
        "cache_hit_rate": round(cache_hit_rate, 3),
        "total_tokens": total_tokens,
        "estimated_cost_usd": round(estimated_cost, 4),
        "slow_queries": slow_queries,
        "failed_retrievals": failed_retrievals,
        "queries_per_hour": round(total_queries / since_hours, 2),
        "token_breakdown": {
            "input": input_tokens,
            "output": output_tokens,
        },
    }

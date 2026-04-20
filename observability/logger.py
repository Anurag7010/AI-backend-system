"""
observability/logger.py

Structured logger for the entire AI backend.

All modules must use get_logger(__name__) — never print() or raw logging.
Outputs JSON-structured lines to stdout for easy parsing by log aggregators.

Log format (JSON per line):
    {"time": "...", "level": "INFO", "module": "core.llm_client", "msg": "..."}
"""

import json
import logging
import sys
import traceback
from datetime import datetime, timezone


class _JSONFormatter(logging.Formatter):
    """
    Formats each log record as a single JSON object on one line.
    Structured output is parseable by Datadog, CloudWatch, Grafana Loki, etc.
    """

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "time":    datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
            "level":   record.levelname,
            "module":  record.name,
            "msg":     record.getMessage(),
        }

        # Attach exception info if present
        if record.exc_info:
            payload["exception"] = "".join(traceback.format_exception(*record.exc_info)).strip()

        # Attach any extra structured fields the caller passed via `extra={}`
        standard_attrs = {
            "name", "msg", "args", "levelname", "levelno", "pathname",
            "filename", "module", "exc_info", "exc_text", "stack_info",
            "lineno", "funcName", "created", "msecs", "relativeCreated",
            "thread", "threadName", "processName", "process", "message",
            "taskName",
        }
        for key, val in record.__dict__.items():
            if key not in standard_attrs:
                payload[key] = val

        return json.dumps(payload, default=str)


def get_logger(name: str) -> logging.Logger:
    """
    Return a named logger configured with the system log level.
    Outputs one JSON object per line to stdout.

    Usage:
        from observability.logger import get_logger
        logger = get_logger(__name__)
        logger.info("Something happened", extra={"latency_ms": 42})
    """
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger  # Already configured — avoid duplicate handlers

    # Import here to avoid circular imports at module level
    from core.config import config
    level = getattr(logging, config.LOG_LEVEL.upper(), logging.INFO)

    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(_JSONFormatter())

    logger.addHandler(handler)
    logger.propagate = False

    return logger
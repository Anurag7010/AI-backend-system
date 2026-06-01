# ai-backend/core/output_validator.py

import json
import re
from dataclasses import dataclass
from typing import Any, Optional

@dataclass
class ValidationResult:
    valid: bool
    data: Optional[Any]      # parsed data if valid
    error: Optional[str]     # error message if invalid
    raw: str                 # original LLM output

def validate_json_output(raw: str, schema: Optional[dict] = None) -> ValidationResult:
    """
    Attempt to parse LLM output as JSON.
    Handles common LLM formatting mistakes:
    - Wrapped in markdown code blocks: ```json ... ```
    - Leading/trailing prose before/after the JSON
    """
    # Strip markdown code blocks
    cleaned = re.sub(r'```(?:json)?\s*', '', raw).strip()
    cleaned = cleaned.strip('`').strip()

    # Try direct parse first
    try:
        data = json.loads(cleaned)
        if schema:
            _validate_against_schema(data, schema)
        return ValidationResult(valid=True, data=data, error=None, raw=raw)
    except (json.JSONDecodeError, ValueError):
        pass

    # Try to extract JSON from within the text
    json_pattern = re.compile(r'\{.*\}|\[.*\]', re.DOTALL)
    match = json_pattern.search(cleaned)
    if match:
        try:
            data = json.loads(match.group())
            if schema:
                _validate_against_schema(data, schema)
            return ValidationResult(valid=True, data=data, error=None, raw=raw)
        except (json.JSONDecodeError, ValueError):
            pass

    return ValidationResult(
        valid=False,
        data=None,
        error=f"Could not parse JSON from LLM output: {raw[:100]}",
        raw=raw
    )

def validate_prose_output(raw: str) -> ValidationResult:
    """
    Validate non-JSON prose output.
    Checks: non-empty, not a refusal, not a model disclaimer.
    """
    stripped = raw.strip()

    if not stripped:
        return ValidationResult(valid=False, data=None, error="Empty response", raw=raw)

    failure_patterns = [
        "as an ai language model",
        "i cannot fulfill",
        "i'm unable to",
        "i am unable to",
        "i don't have access to",
    ]

    lower = stripped.lower()
    for pattern in failure_patterns:
        if pattern in lower:
            return ValidationResult(
                valid=False,
                data=None,
                error=f"LLM refusal detected: {pattern}",
                raw=raw
            )

    return ValidationResult(valid=True, data=stripped, error=None, raw=raw)

def _validate_against_schema(data: Any, schema: dict) -> None:
    """
    Minimal schema validation without jsonschema dependency.
    Checks required fields and basic types.

    Note: property-level type checking is not performed; only top-level type and required fields are validated.
    """
    if schema.get('type') == 'object':
        if not isinstance(data, dict):
            raise ValueError(f"Expected object, got {type(data).__name__}")
        for field in schema.get('required', []):
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
    elif schema.get('type') == 'array':
        if not isinstance(data, list):
            raise ValueError(f"Expected array, got {type(data).__name__}")
        min_items = schema.get('minItems', 0)
        if len(data) < min_items:
            raise ValueError(f"Array too short: {len(data)} < {min_items}")
        max_items = schema.get('maxItems')
        if max_items is not None and len(data) > max_items:
            raise ValueError(f"Array too long: {len(data)} > {max_items}")

# tests/test_output_validator.py

import pytest
from core.output_validator import validate_json_output, validate_prose_output


def test_validate_json_output_parses_clean_json():
    result = validate_json_output('{"key": "value"}')
    assert result.valid is True
    assert result.data == {"key": "value"}


def test_validate_json_output_handles_markdown_code_block():
    raw = '```json\n{"key": "value"}\n```'
    result = validate_json_output(raw)
    assert result.valid is True
    assert result.data == {"key": "value"}


def test_validate_json_output_handles_embedded_json_in_prose():
    raw = 'Here is the result: {"key": "value"} — that is all.'
    result = validate_json_output(raw)
    assert result.valid is True
    assert result.data == {"key": "value"}


def test_validate_json_output_fails_on_unparseable():
    result = validate_json_output("this is not json at all")
    assert result.valid is False
    assert result.error is not None


def test_validate_json_output_validates_required_fields():
    schema = {
        "type": "object",
        "required": ["name", "value"],
        "properties": {
            "name": {"type": "string"},
            "value": {"type": "integer"},
        }
    }
    # Missing 'value' field
    result = validate_json_output('{"name": "test"}', schema)
    assert result.valid is False
    assert result.error is not None


def test_validate_json_output_passes_with_all_required_fields():
    schema = {
        "type": "object",
        "required": ["name", "value"],
    }
    result = validate_json_output('{"name": "test", "value": 42}', schema)
    assert result.valid is True


def test_validate_json_output_validates_array_min_items():
    schema = {"type": "array", "minItems": 3}
    result = validate_json_output('["a", "b"]', schema)
    assert result.valid is False


def test_validate_json_output_validates_array_max_items():
    schema = {"type": "array", "maxItems": 2}
    result = validate_json_output('["a", "b", "c"]', schema)
    assert result.valid is False


def test_validate_prose_output_passes_normal_prose():
    result = validate_prose_output("The answer is 42 because of the theory.")
    assert result.valid is True
    assert result.data == "The answer is 42 because of the theory."


def test_validate_prose_output_fails_on_empty_string():
    result = validate_prose_output("")
    assert result.valid is False
    assert result.error == "Empty response"


def test_validate_prose_output_fails_on_whitespace_only():
    result = validate_prose_output("   \n  ")
    assert result.valid is False


def test_validate_prose_output_detects_ai_disclaimer():
    result = validate_prose_output("As an AI language model, I cannot answer that.")
    assert result.valid is False
    assert "refusal" in result.error.lower()


def test_validate_prose_output_detects_cannot_fulfill():
    result = validate_prose_output("I cannot fulfill this request.")
    assert result.valid is False

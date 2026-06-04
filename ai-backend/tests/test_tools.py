"""Tests for agents/tools/ — BaseTool, ToolRegistry, ToolResult, and 4 implementations."""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from agents.tools.base import BaseTool, ToolRegistry, ToolResult
from agents.tools.implementations import (
    SearchDocumentsTool,
    GetDocumentListTool,
    GetDocumentMetadataTool,
    CalculateTool,
)


# ── ToolResult tests ──────────────────────────────────────────────────────────

def test_tool_result_to_observation_dict():
    r = ToolResult(success=True, output={"key": "value"}, error=None, tool_name="t")
    obs = r.to_observation()
    assert json.loads(obs) == {"key": "value"}


def test_tool_result_to_observation_list():
    r = ToolResult(success=True, output=[1, 2, 3], error=None, tool_name="t")
    obs = r.to_observation()
    assert json.loads(obs) == [1, 2, 3]


def test_tool_result_to_observation_string():
    r = ToolResult(success=True, output="hello", error=None, tool_name="t")
    assert r.to_observation() == "hello"


def test_tool_result_to_observation_error():
    r = ToolResult(success=False, output=None, error="something broke", tool_name="t")
    assert r.to_observation() == "Tool error: something broke"


# ── BaseTool.execute validation tests ─────────────────────────────────────────

async def test_base_tool_execute_catches_validation_error():
    """BaseTool.execute() returns ToolResult with error when input fails schema validation."""
    tool = CalculateTool()
    # CalculateTool.InputSchema requires 'expression' — send empty dict
    result = await tool.execute({})
    assert result.success is False
    assert "Invalid input" in result.error
    assert result.tool_name == "calculate"


async def test_base_tool_execute_catches_runtime_error():
    """BaseTool.execute() returns ToolResult with error if _execute() raises."""
    tool = CalculateTool()
    # This expression will parse but cause a ZeroDivisionError
    result = await tool.execute({"expression": "1/0"})
    # _safe_eval evaluates 1/0 — Python raises ZeroDivisionError
    # CalculateTool._execute catches it and returns {"error": ...}
    assert result.success is True  # _execute itself does not raise; it returns an error dict
    assert "error" in result.output


# ── ToolRegistry tests ────────────────────────────────────────────────────────

async def test_tool_registry_unknown_tool_returns_error_result():
    registry = ToolRegistry()
    result = await registry.execute("nonexistent_tool", {})
    assert result.success is False
    assert "Unknown tool" in result.error
    assert "nonexistent_tool" in result.error


def test_tool_registry_all_schemas_returns_openai_format():
    registry = ToolRegistry()
    registry.register(CalculateTool())
    schemas = registry.all_schemas()
    assert len(schemas) == 1
    assert schemas[0]["type"] == "function"
    assert "function" in schemas[0]
    assert schemas[0]["function"]["name"] == "calculate"


# ── SearchDocumentsTool tests ─────────────────────────────────────────────────

async def test_search_documents_tool_returns_correct_shape():
    mock_rag = AsyncMock()
    mock_rag.retrieve.return_value = [
        {"content": "chunk text", "score": 0.9, "metadata": {"source": "doc.pdf"}}
    ]
    tool = SearchDocumentsTool(rag_interface=mock_rag)
    result = await tool.execute({"query": "test query"})
    assert result.success is True
    assert isinstance(result.output, list)
    assert result.output[0]["content"] == "chunk text"
    assert result.output[0]["score"] == 0.9
    assert result.output[0]["source"] == "doc.pdf"


async def test_search_documents_tool_handles_rag_error():
    mock_rag = AsyncMock()
    mock_rag.retrieve.side_effect = RuntimeError("vectorstore down")
    tool = SearchDocumentsTool(rag_interface=mock_rag)
    result = await tool.execute({"query": "test"})
    assert result.success is False
    assert "Execution failed" in result.error


# ── GetDocumentListTool tests ─────────────────────────────────────────────────

async def test_get_document_list_tool_returns_list():
    from datetime import datetime
    mock_doc = MagicMock()
    mock_doc.id = "abc123"
    mock_doc.filename = "test.pdf"
    mock_doc.status = "ingested"
    mock_doc.chunk_count = 5
    mock_doc.created_at = datetime(2024, 1, 1)

    mock_repo = AsyncMock()
    mock_repo.findByUser.return_value = [mock_doc]

    tool = GetDocumentListTool(documents_repository=mock_repo)
    tool.user_id = "user1"
    result = await tool.execute({})
    assert result.success is True
    assert len(result.output) == 1
    assert result.output[0]["filename"] == "test.pdf"
    assert result.output[0]["chunk_count"] == 5


# ── CalculateTool tests ───────────────────────────────────────────────────────

async def test_calculate_tool_simple_arithmetic():
    tool = CalculateTool()
    result = await tool.execute({"expression": "2 + 2"})
    assert result.success is True
    assert result.output["result"] == 4


async def test_calculate_tool_sqrt():
    tool = CalculateTool()
    result = await tool.execute({"expression": "sqrt(16)"})
    assert result.success is True
    assert result.output["result"] == 4.0


async def test_calculate_tool_percentage():
    tool = CalculateTool()
    result = await tool.execute({"expression": "100 * 0.15"})
    assert result.success is True
    assert result.output["result"] == 15.0


async def test_calculate_tool_rejects_import():
    tool = CalculateTool()
    result = await tool.execute({"expression": "__import__('os')"})
    # AST parser sees ast.Call with ast.Attribute — not in ALLOWED_NAMES
    assert result.success is True  # _execute catches it and returns error dict
    assert "error" in result.output


async def test_calculate_tool_rejects_name_not_in_allowlist():
    tool = CalculateTool()
    result = await tool.execute({"expression": "os.getcwd()"})
    assert result.success is True
    assert "error" in result.output


async def test_calculate_tool_returns_error_dict_not_exception():
    """_execute must return {error: ...} dict, not raise, for invalid expressions."""
    tool = CalculateTool()
    result = await tool.execute({"expression": "not_a_function()"})
    assert result.success is True
    assert "error" in result.output
    assert isinstance(result.output["error"], str)

"""Tests for mcp_server/server.py — MCP tool listing and dispatch."""
from unittest.mock import patch

import pytest

from mcp_server.server import list_tools, call_tool


async def test_list_tools_returns_three_tools():
    tools = await list_tools()
    assert isinstance(tools, list)
    assert len(tools) == 3


async def test_each_tool_has_required_fields():
    tools = await list_tools()
    for tool in tools:
        assert tool.name
        assert tool.description
        assert tool.inputSchema is not None


async def test_search_documents_requires_query():
    tools = await list_tools()
    search = next(t for t in tools if t.name == "search_documents")
    assert "query" in search.inputSchema["required"]


async def test_calculate_requires_expression():
    tools = await list_tools()
    calc = next(t for t in tools if t.name == "calculate")
    assert "expression" in calc.inputSchema["required"]


async def test_calculate_two_plus_two():
    result = await call_tool("calculate", {"expression": "2 + 2"})
    assert "4" in result[0].text


async def test_unknown_tool_returns_error_text():
    result = await call_tool("does_not_exist", {})
    assert "Tool error" in result[0].text


async def test_call_tool_catches_exceptions():
    with patch("mcp_server.server.rag_retrieve", side_effect=RuntimeError("DB error")):
        result = await call_tool("search_documents", {"query": "test"})
    assert "Tool error" in result[0].text


async def test_calculate_sqrt_144():
    result = await call_tool("calculate", {"expression": "sqrt(144)"})
    assert "12" in result[0].text

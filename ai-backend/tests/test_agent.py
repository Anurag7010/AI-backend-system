"""Tests for agents/react_agent.py and agents/router.py."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from agents.react_agent import ReActAgent, AgentResult, AgentStep
from agents.router import route_query, QueryRoute
from agents.tools.base import ToolRegistry


# ── Router tests ──────────────────────────────────────────────────────────────

def test_route_query_agent_for_how_many():
    assert route_query("how many documents do I have?") == QueryRoute.AGENT


def test_route_query_agent_for_list():
    assert route_query("list all my documents") == QueryRoute.AGENT


def test_route_query_agent_for_calculate():
    assert route_query("calculate 10 * 0.15") == QueryRoute.AGENT


def test_route_query_rag_for_factual_question():
    assert route_query("What is retrieval augmented generation?") == QueryRoute.RAG


def test_route_query_rag_for_explain():
    assert route_query("Explain how transformers work") == QueryRoute.RAG


def test_route_query_agent_for_compare():
    assert route_query("compare document A with document B") == QueryRoute.AGENT


# ── ReActAgent tests ──────────────────────────────────────────────────────────

def _make_mock_registry():
    """Build a ToolRegistry with no real tools for agent tests."""
    registry = MagicMock(spec=ToolRegistry)
    registry.all_schemas.return_value = []
    registry.execute = AsyncMock()
    return registry


def _openai_stop_response(content: str):
    """Fake OpenAI response that stops with a text answer."""
    msg = MagicMock()
    msg.content = content
    msg.tool_calls = None
    msg.model_dump.return_value = {"role": "assistant", "content": content}

    choice = MagicMock()
    choice.message = msg
    choice.finish_reason = "stop"

    response = MagicMock()
    response.choices = [choice]
    return response


def _openai_tool_call_response(tool_name: str, tool_args: dict):
    """Fake OpenAI response that calls a tool."""
    import json
    tool_call = MagicMock()
    tool_call.id = "call_123"
    tool_call.function.name = tool_name
    tool_call.function.arguments = json.dumps(tool_args)

    msg = MagicMock()
    msg.content = None
    msg.tool_calls = [tool_call]
    msg.model_dump.return_value = {
        "role": "assistant",
        "tool_calls": [{"id": "call_123", "function": {"name": tool_name, "arguments": json.dumps(tool_args)}}]
    }

    choice = MagicMock()
    choice.message = msg
    choice.finish_reason = "tool_calls"

    response = MagicMock()
    response.choices = [choice]
    return response


async def test_agent_completes_in_one_step_with_direct_answer():
    """Agent returns final answer immediately when LLM gives stop response."""
    registry = _make_mock_registry()
    agent = ReActAgent(tool_registry=registry, max_iterations=8)

    with patch.object(agent.client.chat.completions, "create", new=AsyncMock(
        return_value=_openai_stop_response("Paris is the capital of France.")
    )):
        result = await agent.run(query="What is the capital of France?", user_id="u1")

    assert result.success is True
    assert result.answer == "Paris is the capital of France."
    assert result.stopped_reason == "final_answer"
    assert result.total_steps == 1


async def test_agent_calls_tool_when_llm_requests_it():
    """Agent executes a tool when LLM returns tool_calls finish_reason."""
    from agents.tools.base import ToolResult
    registry = _make_mock_registry()
    registry.execute.return_value = ToolResult(
        success=True, output={"result": 42}, error=None, tool_name="calculate"
    )

    agent = ReActAgent(tool_registry=registry, max_iterations=8)

    responses = [
        _openai_tool_call_response("calculate", {"expression": "6 * 7"}),
        _openai_stop_response("6 times 7 equals 42."),
    ]

    with patch.object(agent.client.chat.completions, "create", new=AsyncMock(
        side_effect=responses
    )):
        result = await agent.run(query="What is 6 times 7?", user_id="u1")

    assert result.success is True
    assert result.total_steps == 2
    assert result.steps[0].action == "calculate"
    registry.execute.assert_called_once_with("calculate", {"expression": "6 * 7"})


async def test_agent_injects_tool_result_as_observation():
    """Tool result appears as observation in the agent step."""
    from agents.tools.base import ToolResult
    registry = _make_mock_registry()
    registry.execute.return_value = ToolResult(
        success=True, output="42", error=None, tool_name="calculate"
    )

    agent = ReActAgent(tool_registry=registry, max_iterations=8)

    responses = [
        _openai_tool_call_response("calculate", {"expression": "2+2"}),
        _openai_stop_response("The answer is 42."),
    ]

    with patch.object(agent.client.chat.completions, "create", new=AsyncMock(
        side_effect=responses
    )):
        result = await agent.run(query="Add 2+2", user_id="u1")

    assert result.steps[0].observation == "42"


async def test_agent_stops_at_max_iterations():
    """Agent stops after max_iterations and returns best-effort answer."""
    registry = _make_mock_registry()
    from agents.tools.base import ToolResult
    registry.execute.return_value = ToolResult(
        success=True, output="result", error=None, tool_name="t"
    )

    agent = ReActAgent(tool_registry=registry, max_iterations=2)

    # Always return tool_calls so the agent never finishes naturally
    tool_response = _openai_tool_call_response("t", {})
    final_response = _openai_stop_response("Best effort answer.")

    # max_iterations=2 tool responses + 1 final summarization call
    with patch.object(agent.client.chat.completions, "create", new=AsyncMock(
        side_effect=[tool_response, tool_response, final_response]
    )):
        result = await agent.run(query="query", user_id="u1")

    assert result.stopped_reason == "max_iterations"
    assert result.total_steps == 2
    assert "Best effort" in result.answer


async def test_agent_handles_tool_error_and_continues():
    """Agent continues the loop even when a tool returns an error result."""
    from agents.tools.base import ToolResult
    registry = _make_mock_registry()
    registry.execute.return_value = ToolResult(
        success=False, output=None, error="tool broke", tool_name="t"
    )

    agent = ReActAgent(tool_registry=registry, max_iterations=8)

    responses = [
        _openai_tool_call_response("t", {}),
        _openai_stop_response("I encountered an error but here is my best answer."),
    ]

    with patch.object(agent.client.chat.completions, "create", new=AsyncMock(
        side_effect=responses
    )):
        result = await agent.run(query="query", user_id="u1")

    assert result.success is True
    assert result.stopped_reason == "final_answer"
    # Observation should contain the error message
    assert "tool broke" in result.steps[0].observation


async def test_agent_respects_wall_clock_deadline():
    """Once the wall-clock budget is spent, the loop stops immediately and the
    agent returns the graceful summarising answer — never running to
    max_iterations. This is what keeps a slow free-tier run from blowing past
    the HTTP timeout and 500ing."""
    registry = _make_mock_registry()
    agent = ReActAgent(tool_registry=registry, max_iterations=8)

    fallback = _openai_stop_response("Here is my best answer so far.")

    # Deadline of -1s is exceeded on the very first check, so no reasoning
    # iteration runs; only the single tools-less fallback call is made.
    with patch("agents.react_agent.AGENT_DEADLINE_SECONDS", -1.0), \
         patch.object(agent.client.chat.completions, "create", new=AsyncMock(
             return_value=fallback
         )) as mock_create:
        result = await agent.run(query="do lots of slow work", user_id="u1")

    assert result.success is True
    assert result.answer == "Here is my best answer so far."
    assert result.steps == []
    assert mock_create.await_count == 1

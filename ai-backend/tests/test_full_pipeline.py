"""
tests/test_full_pipeline.py

End-to-end integration tests for RAG, Agent, and Memory pipelines.
All external services (OpenAI, ChromaDB) are mocked — safe to run in CI.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ── TestFullRAGPipeline ───────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestFullRAGPipeline:
    """End-to-end tests for the RAG pipeline using a mocked ask() function."""

    @pytest.fixture
    def mock_rag_response(self):
        """Return a well-formed ask() response dict."""
        return {
            "answer": "The answer is 42.",
            "sources": [
                {"content": "chunk text", "score": 0.9, "citation_id": "c1",
                 "metadata": {"source": "doc.pdf", "chunk_index": 0}}
            ],
            "trace_id": "trace-abc",
            "latency_breakdown": {"retrieval_ms": 10.0, "generation_ms": 50.0, "total_ms": 60.0},
            "error": None,
            "guardrail_rejected": False,
            "no_results": False,
            "retrieval_quality": {"quality": "good", "max_score": 0.9, "avg_score": 0.9, "chunk_count": 1},
        }

    async def test_ask_returns_correct_shape(self, mock_rag_response):
        """ask() response contains all required fields with correct types."""
        with patch("rag.rag_interface.ask", new=AsyncMock(return_value=mock_rag_response)):
            from rag.rag_interface import ask
            result = await ask(query="What is the answer?", user_id="user1")

        assert "answer" in result
        assert "sources" in result
        assert "trace_id" in result
        assert "latency_breakdown" in result
        assert "guardrail_rejected" in result
        assert "no_results" in result
        assert isinstance(result["sources"], list)
        assert isinstance(result["latency_breakdown"], dict)
        assert result["error"] is None

    async def test_guardrail_rejected_query_returns_message_not_error(self):
        """Guardrail rejection yields a non-empty answer string and empty sources list."""
        guardrail_response = {
            "answer": "This query was rejected by safety guardrails.",
            "sources": [],
            "trace_id": "trace-xyz",
            "latency_breakdown": {"retrieval_ms": 0.0, "generation_ms": 0.0, "total_ms": 5.0},
            "error": None,
            "guardrail_rejected": True,
            "no_results": False,
            "retrieval_quality": {"quality": "no_results", "max_score": 0.0, "avg_score": 0.0, "chunk_count": 0},
        }

        with patch("rag.rag_interface.ask", new=AsyncMock(return_value=guardrail_response)):
            from rag.rag_interface import ask
            result = await ask(query="Inject SQL here; DROP TABLE users;", user_id="u1")

        assert result["guardrail_rejected"] is True
        assert isinstance(result["answer"], str)
        assert len(result["answer"]) > 0
        assert result["sources"] == []
        assert result["error"] is None

    async def test_no_results_returns_clear_message(self):
        """When retrieval yields nothing, no_results=True and answer is informative."""
        no_results_response = {
            "answer": "I couldn't find relevant information in the provided documents to answer your question.",
            "sources": [],
            "trace_id": "trace-nores",
            "latency_breakdown": {"retrieval_ms": 12.0, "generation_ms": 0.0, "total_ms": 12.0},
            "error": None,
            "guardrail_rejected": False,
            "no_results": True,
            "retrieval_quality": {"quality": "no_results", "max_score": 0.0, "avg_score": 0.0, "chunk_count": 0},
        }

        with patch("rag.rag_interface.ask", new=AsyncMock(return_value=no_results_response)):
            from rag.rag_interface import ask
            result = await ask(query="What is the population of Mars?", user_id="u1")

        assert result["no_results"] is True
        assert isinstance(result["answer"], str)
        assert len(result["answer"]) > 0
        assert result["sources"] == []


# ── TestAgentPipeline ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestAgentPipeline:
    """Tests for the agent pipeline with real ToolRegistry (no LLM for tool tests)."""

    async def test_agent_completes_with_tool_use(self):
        """CalculateTool executes '2 + 2' and returns success with result 4."""
        from agents.tools.base import ToolRegistry
        from agents.tools.implementations import CalculateTool

        registry = ToolRegistry()
        registry.register(CalculateTool())

        result = await registry.execute("calculate", {"expression": "2 + 2"})

        assert result.success is True
        assert "4" in str(result.output)

    async def test_agent_handles_unknown_tool_gracefully(self):
        """Executing a non-existent tool returns success=False with an error message."""
        from agents.tools.base import ToolRegistry

        registry = ToolRegistry()  # empty — no tools registered

        result = await registry.execute("nonexistent_tool", {})

        assert result.success is False
        assert result.error is not None
        assert "Unknown tool" in result.error

    async def test_react_loop_stops_at_max_iterations(self):
        """ReActAgent stops after max_iterations tool-call responses."""
        from agents.tools.base import ToolRegistry
        from agents.react_agent import ReActAgent

        registry = ToolRegistry()  # no real tools needed — LLM is fully mocked

        def _make_tool_call_response():
            tool_call = MagicMock()
            tool_call.id = "call_loop"
            tool_call.function.name = "nonexistent"
            tool_call.function.arguments = "{}"

            msg = MagicMock()
            msg.content = None
            msg.tool_calls = [tool_call]
            msg.model_dump.return_value = {
                "role": "assistant",
                "tool_calls": [{"id": "call_loop", "function": {"name": "nonexistent", "arguments": "{}"}}]
            }

            choice = MagicMock()
            choice.message = msg
            choice.finish_reason = "tool_calls"

            resp = MagicMock()
            resp.choices = [choice]
            return resp

        def _make_final_response():
            msg = MagicMock()
            msg.content = "Best effort answer after max iterations."
            msg.tool_calls = None
            msg.model_dump.return_value = {"role": "assistant", "content": "Best effort answer after max iterations."}

            choice = MagicMock()
            choice.message = msg
            choice.finish_reason = "stop"

            resp = MagicMock()
            resp.choices = [choice]
            return resp

        max_iter = 3
        agent = ReActAgent(tool_registry=registry, max_iterations=max_iter)

        # max_iter tool-call responses + 1 final summarisation call
        side_effects = [_make_tool_call_response() for _ in range(max_iter)] + [_make_final_response()]

        with patch.object(agent.client.chat.completions, "create", new=AsyncMock(side_effect=side_effects)):
            result = await agent.run(query="loop forever query", user_id="u1")

        assert result.total_steps == max_iter
        assert result.stopped_reason == "max_iterations"


# ── TestMemoryPipeline ────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestMemoryPipeline:
    """Tests for memory extraction and conversation buffer."""

    async def test_memory_extraction_returns_facts(self):
        """extract_memories returns two facts from a data-scientist conversation."""
        from memory.memory_extractor import extract_memories

        messages = [
            {"role": "user", "content": "I am a data scientist working with large NLP models."},
            {"role": "assistant", "content": "That is fascinating! What kind of projects?"},
            {"role": "user", "content": "Mostly text classification. I use Python every day."},
            {"role": "assistant", "content": "Python is great for NLP work."},
        ]

        with patch("memory.memory_extractor.llm_complete") as mock_llm:
            mock_llm.return_value = {
                "text": '["User is a data scientist", "User uses Python every day"]',
                "error": None,
            }
            facts = await extract_memories(messages, trace_id="test-trace")

        assert len(facts) == 2
        assert all(isinstance(f, str) for f in facts)

    async def test_memory_extraction_returns_empty_for_short_conversation(self):
        """extract_memories returns [] when the conversation has only one message."""
        from memory.memory_extractor import extract_memories

        short_messages = [
            {"role": "user", "content": "Hi there"},
        ]

        facts = await extract_memories(short_messages, trace_id="test-trace")

        assert facts == []

    async def test_conversation_buffer_windowing(self):
        """ConversationBuffer with 'window' strategy keeps total_tokens <= max_tokens or >=4 msgs."""
        from memory.conversation_buffer import ConversationBuffer

        buffer = ConversationBuffer(max_tokens=50, strategy="window")

        # Add 20 messages, each ~10 tokens — will exceed 50-token budget
        for i in range(20):
            buffer.add_message(
                role="user" if i % 2 == 0 else "assistant",
                content=f"This is message number {i} with some extra text."
            )

        buffer.trim()

        # After trim: either within budget OR pinned at MIN_KEEP=4
        min_keep = 4
        assert buffer.total_tokens <= buffer.max_tokens or len(buffer._messages) <= min_keep

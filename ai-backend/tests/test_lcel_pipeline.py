"""Tests for pipelines/lcel_qa_pipeline.py and observability/langchain_callback.py."""
from uuid import uuid4
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

from pipelines.lcel_qa_pipeline import build_qa_chain, run_lcel_qa
from observability.langchain_callback import ObservabilityCallback


async def mock_retriever(q):
    return [{"content": "Some document content", "score": 0.9, "metadata": {}}]


async def empty_retriever(q):
    return []


def _fake_llm(answer: str):
    """Return a Runnable that mimics ChatOpenAI, emitting an AIMessage."""
    return RunnableLambda(lambda _prompt: AIMessage(content=answer))


# ── pipeline tests ────────────────────────────────────────────────────────────

def test_build_qa_chain_returns_runnable():
    chain = build_qa_chain(mock_retriever)
    assert hasattr(chain, "ainvoke")


@patch("pipelines.lcel_qa_pipeline.ChatOpenAI")
async def test_run_lcel_qa_returns_expected_keys(mock_llm_class):
    mock_llm_class.return_value = _fake_llm("An answer [Source 1]")

    result = await run_lcel_qa("What is X?", mock_retriever, trace_id="trace-1")

    assert "answer" in result
    assert "trace_id" in result
    assert "latency_breakdown" in result
    assert "pipeline" in result
    assert result["pipeline"] == "lcel"
    assert result["trace_id"] == "trace-1"


@patch("pipelines.lcel_qa_pipeline.ChatOpenAI")
async def test_answer_non_empty_with_chunks(mock_llm_class):
    mock_llm_class.return_value = _fake_llm("The answer is X")

    result = await run_lcel_qa("Question?", mock_retriever, trace_id="t")

    assert isinstance(result["answer"], str)
    assert len(result["answer"]) > 0
    assert result["answer"] == "The answer is X"


@patch("pipelines.lcel_qa_pipeline.ChatOpenAI")
async def test_answer_fallback_with_empty_retriever(mock_llm_class):
    fallback = "I don't have enough information in the provided documents."
    mock_llm_class.return_value = _fake_llm(fallback)

    result = await run_lcel_qa("Question?", empty_retriever, trace_id="t")

    assert "don't have enough information" in result["answer"]


# ── ObservabilityCallback tests ───────────────────────────────────────────────

@patch("observability.langchain_callback.log_pipeline_event")
def test_on_llm_start_logs_pipeline_event(mock_log_event):
    cb = ObservabilityCallback(trace_id="abc")
    cb.on_llm_start(
        serialized={"kwargs": {"model_name": "gpt-4o"}},
        prompts=["hello"],
        run_id=uuid4(),
    )
    mock_log_event.assert_called_once()
    assert mock_log_event.call_args.kwargs["event"] == "langchain_llm_start"


@patch("observability.langchain_callback.log_llm_call")
def test_on_llm_end_logs_llm_call(mock_log_call):
    cb = ObservabilityCallback(trace_id="abc")
    run_id = uuid4()
    cb.on_llm_start(
        serialized={"kwargs": {"model_name": "gpt-4o"}},
        prompts=["hello"],
        run_id=run_id,
    )

    response = MagicMock()
    response.llm_output = {
        "model_name": "gpt-4o",
        "token_usage": {"prompt_tokens": 10, "completion_tokens": 5},
    }

    cb.on_llm_end(response=response, run_id=run_id)

    mock_log_call.assert_called_once()
    kwargs = mock_log_call.call_args.kwargs
    assert "latency_ms" in kwargs
    assert kwargs["input_tokens"] == 10
    assert kwargs["output_tokens"] == 5


@patch("observability.langchain_callback.log_pipeline_event")
def test_on_chain_error_logs_error_in_metadata(mock_log_event):
    cb = ObservabilityCallback(trace_id="abc")
    cb.on_chain_error(error=RuntimeError("boom"), run_id=uuid4())

    mock_log_event.assert_called_once()
    kwargs = mock_log_event.call_args.kwargs
    assert kwargs["event"] == "langchain_chain_error"
    assert "error" in kwargs["metadata"]
    assert "boom" in kwargs["metadata"]["error"]


@patch("observability.langchain_callback.log_llm_call")
@patch("observability.langchain_callback.log_pipeline_event")
def test_trace_id_carried_through(mock_log_event, mock_log_call):
    cb = ObservabilityCallback(trace_id="my-trace-id")
    run_id = uuid4()

    cb.on_llm_start(
        serialized={"kwargs": {"model_name": "gpt-4o"}},
        prompts=["hello"],
        run_id=run_id,
    )
    response = MagicMock()
    response.llm_output = {
        "model_name": "gpt-4o",
        "token_usage": {"prompt_tokens": 1, "completion_tokens": 1},
    }
    cb.on_llm_end(response=response, run_id=run_id)

    assert mock_log_event.call_args.kwargs["trace_id"] == "my-trace-id"
    assert mock_log_call.call_args.kwargs["trace_id"] == "my-trace-id"

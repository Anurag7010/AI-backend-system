import time
from typing import Any, Union
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult

from observability.logger import log_llm_call, log_pipeline_event, log_retrieval


class ObservabilityCallback(BaseCallbackHandler):
    """
    LangChain callback that logs every chain event to our structured logger.

    Usage:
        callback = ObservabilityCallback(trace_id="abc-123")
        chain.invoke(input, config={"callbacks": [callback]})

    One instance per request — carries trace_id through all events.
    """

    def __init__(self, trace_id: str = ""):
        super().__init__()
        self.trace_id = trace_id or ""
        self._llm_start_times: dict[str, float] = {}
        self._retriever_start_times: dict[str, float] = {}
        self._chain_start_times: dict[str, float] = {}

    def on_llm_start(
        self,
        serialized: dict[str, Any],
        prompts: list[str],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Record LLM call start time and emit a pipeline event."""
        self._llm_start_times[str(run_id)] = time.time()
        log_pipeline_event(
            event="langchain_llm_start",
            trace_id=self.trace_id,
            metadata={
                "model": serialized.get("kwargs", {}).get("model_name", "unknown"),
                "prompt_count": len(prompts),
                "prompt_chars": sum(len(p) for p in prompts),
            },
        )

    def on_llm_end(
        self,
        response: LLMResult,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Log structured LLM call telemetry on completion."""
        start = self._llm_start_times.pop(str(run_id), time.time())
        latency_ms = (time.time() - start) * 1000

        usage = {}
        if response.llm_output:
            usage = response.llm_output.get("token_usage", {})

        log_llm_call(
            trace_id=self.trace_id,
            model=(
                response.llm_output.get("model_name", "unknown")
                if response.llm_output
                else "unknown"
            ),
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            latency_ms=round(latency_ms, 2),
            cost_usd=0.0,
            error=None,
        )

    def on_llm_error(
        self,
        error: Union[Exception, KeyboardInterrupt],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Log LLM error with elapsed latency."""
        start = self._llm_start_times.pop(str(run_id), time.time())
        latency_ms = (time.time() - start) * 1000
        log_llm_call(
            trace_id=self.trace_id,
            model="unknown",
            input_tokens=0,
            output_tokens=0,
            latency_ms=round(latency_ms, 2),
            cost_usd=0.0,
            error=str(error),
        )

    def on_retriever_start(
        self,
        serialized: dict[str, Any],
        query: str,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Record retriever start time and emit a pipeline event."""
        self._retriever_start_times[str(run_id)] = time.time()
        log_pipeline_event(
            event="langchain_retriever_start",
            trace_id=self.trace_id,
            metadata={"query_preview": query[:50]},
        )

    def on_retriever_end(
        self,
        documents: list,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Log structured retrieval telemetry on completion."""
        start = self._retriever_start_times.pop(str(run_id), time.time())
        latency_ms = (time.time() - start) * 1000
        log_retrieval(
            trace_id=self.trace_id,
            query="(from chain)",
            strategy="langchain",
            top_k=len(documents),
            result_count=len(documents),
            latency_ms=round(latency_ms, 2),
        )

    def on_chain_start(
        self,
        serialized: dict[str, Any],
        inputs: dict[str, Any],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Record chain start time."""
        self._chain_start_times[str(run_id)] = time.time()

    def on_chain_end(
        self,
        outputs: dict[str, Any],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Emit a pipeline event with chain latency on completion."""
        start = self._chain_start_times.pop(str(run_id), time.time())
        latency_ms = (time.time() - start) * 1000
        log_pipeline_event(
            event="langchain_chain_end",
            trace_id=self.trace_id,
            metadata={"latency_ms": round(latency_ms, 2)},
        )

    def on_chain_error(
        self,
        error: Union[Exception, KeyboardInterrupt],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Emit a pipeline event when a chain fails."""
        log_pipeline_event(
            event="langchain_chain_error",
            trace_id=self.trace_id,
            metadata={"error": str(error)},
        )

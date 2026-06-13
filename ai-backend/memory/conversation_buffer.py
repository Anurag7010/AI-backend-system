"""
memory/conversation_buffer.py

Token-aware conversation history buffer with window and summary strategies.
"""

import asyncio
from dataclasses import dataclass, field
from typing import Optional

import tiktoken

from core.config import config
from core.llm_client import complete as llm_complete
from observability.logger import log_pipeline_event


@dataclass
class BufferedMessage:
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    token_count: int


class ConversationBuffer:
    """
    Token-aware conversation history buffer.
    Two strategies: 'window' (drop oldest) or 'summary' (LLM compress).
    Always preserves at least the last 4 messages verbatim.
    """

    def __init__(self, max_tokens: int = 2000, strategy: str = "window", model: str = None):
        self.max_tokens = max_tokens
        self.strategy = strategy
        self.model = model or config.MODEL_NAME
        self._messages: list[BufferedMessage] = []
        self._summary: Optional[str] = None
        try:
            self._encoder = tiktoken.encoding_for_model(self.model)
        except KeyError:
            self._encoder = tiktoken.get_encoding("cl100k_base")

    def _count_tokens(self, text: str) -> int:
        """Return the number of tokens in the given text."""
        return len(self._encoder.encode(text))

    @property
    def total_tokens(self) -> int:
        """Return total token count across all buffered messages."""
        return sum(m.token_count for m in self._messages)

    def add_message(self, role: str, content: str) -> None:
        """Add a message. Call trim() after adding to enforce limit."""
        token_count = self._count_tokens(content)
        self._messages.append(BufferedMessage(role=role, content=content, token_count=token_count))

    def load_from_db(self, db_messages: list[dict]) -> None:
        """
        Load messages from DB records {role, content, token_count}.
        Resets the buffer completely before loading.
        Uses stored token_count if available to avoid re-counting.
        """
        self._messages = []
        for msg in db_messages:
            token_count = msg.get("token_count") or self._count_tokens(msg["content"])
            self._messages.append(
                BufferedMessage(role=msg["role"], content=msg["content"], token_count=token_count)
            )

    def trim(self, trace_id: str = None) -> None:
        """Trim buffer to fit within max_tokens using configured strategy."""
        if self.total_tokens <= self.max_tokens:
            return
        if self.strategy == "window":
            self._trim_window(trace_id)
        else:
            self._trim_with_summary(trace_id)

    def _trim_window(self, trace_id: str = None) -> None:
        """Drop oldest messages until under budget. Keep last 4 always."""
        MIN_KEEP = 4
        while self.total_tokens > self.max_tokens and len(self._messages) > MIN_KEEP:
            removed = self._messages.pop(0)
            log_pipeline_event(
                event="memory_window_trim",
                trace_id=trace_id,
                metadata={
                    "removed_role": removed.role,
                    "tokens_freed": removed.token_count,
                    "remaining_messages": len(self._messages),
                },
            )

    def _trim_with_summary(self, trace_id: str = None) -> None:
        """
        Summarize the oldest half of messages.
        Replace them with a single summary system message.
        Marks _pending_summary_text for async LLM call via summarize_pending().
        """
        MIN_KEEP = 4
        if len(self._messages) <= MIN_KEEP:
            return
        split_point = len(self._messages) // 2
        to_summarize = self._messages[:split_point]
        to_keep = self._messages[split_point:]
        formatted = "\n".join(f"{m.role.upper()}: {m.content}" for m in to_summarize)
        self._pending_summary_text = formatted
        self._messages = to_keep
        log_pipeline_event(
            event="memory_summary_triggered",
            trace_id=trace_id,
            metadata={"messages_compressed": split_point, "messages_kept": len(to_keep)},
        )

    async def summarize_pending(self, trace_id: str = None) -> None:
        """
        If a summary is pending, call LLM to generate it.
        Prepend the summary as a system message.
        """
        if not hasattr(self, "_pending_summary_text"):
            return

        # complete() is synchronous — run it in a thread to avoid blocking the event loop
        summary_result = await asyncio.to_thread(
            llm_complete,
            f"Summarize this conversation history concisely in 2-3 sentences, preserving key facts and context:\n\n{self._pending_summary_text}",
            system_prompt="You are a conversation summarizer. Be concise and factual.",
            max_tokens=200,
            trace_id=trace_id,
        )

        summary_text = summary_result.get("text", "").strip()
        summary_tokens = 0
        if summary_text:
            self._summary = summary_text
            summary_tokens = self._count_tokens(f"[Earlier conversation summary]: {summary_text}")
            self._messages.insert(
                0,
                BufferedMessage(
                    role="system",
                    content=f"[Earlier conversation summary]: {summary_text}",
                    token_count=summary_tokens,
                ),
            )
        del self._pending_summary_text
        log_pipeline_event(
            event="memory_summary_complete",
            trace_id=trace_id,
            metadata={"summary_tokens": summary_tokens},
        )

    def to_messages(self) -> list[dict]:
        """Export buffer as list of {role, content} dicts for the LLM."""
        return [{"role": m.role, "content": m.content} for m in self._messages]

    def get_token_counts(self) -> list[int]:
        """Export token counts for saving to DB."""
        return [m.token_count for m in self._messages]

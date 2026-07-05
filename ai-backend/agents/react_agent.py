# ai-backend/agents/react_agent.py
import json
from dataclasses import dataclass, field
from typing import Optional, TYPE_CHECKING

from openai import AsyncOpenAI

from agents.tools.base import ToolRegistry
from core.config import config as Config
from observability.logger import log_pipeline_event

if TYPE_CHECKING:
    from core.user_tier import TierConfig


def _parse_tool_arguments(raw: Optional[str]) -> dict:
    """Parse a tool call's function.arguments into a dict — never raises.

    Groq's function-calling is inconsistent for zero-parameter tools: it has
    been observed sending an empty string, and also the literal string
    "null" (valid JSON that decodes to Python None, not a JSONDecodeError) —
    either one used to reach `InputSchema(**tool_input)` unguarded and crash
    with "argument after ** must be a mapping, not NoneType", well outside
    any tool's own try/except. Any non-dict parse (None, a list, a bare
    string/number) falls back to {}, letting pydantic validation raise its
    own "missing required field" error instead, which the tool layer already
    turns into a normal ToolResult failure rather than an unhandled crash.
    """
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


@dataclass
class AgentStep:
    """Represents one step in the agent's reasoning trace."""

    step_number: int
    thought: Optional[str]
    action: Optional[str]
    action_input: Optional[dict]
    observation: Optional[str]
    is_final: bool = False
    final_answer: Optional[str] = None


@dataclass
class AgentResult:
    """Final result of an agent run."""

    success: bool
    answer: str
    steps: list[AgentStep]
    total_steps: int
    stopped_reason: str  # 'final_answer' | 'max_iterations' | 'error'
    trace_id: Optional[str] = None


class ReActAgent:
    """
    ReAct (Reasoning + Acting) agent using OpenAI function calling.

    Maintains full message history across steps. Hard stops at max_iterations.
    """

    SYSTEM_PROMPT = """You are a helpful document assistant with access to tools.

When answering a question:
1. Think about what information you need
2. Use tools to gather that information
3. Reason about the results
4. Provide a clear, accurate final answer

Rules:
- Only use tools when necessary — do not call tools you do not need
- If a tool returns an error, try an alternative approach or explain the limitation
- Always base your final answer on tool results, not assumptions
- Be concise and direct in your final answer
- Cite document sources when answering from document content"""

    def __init__(
        self,
        tool_registry: ToolRegistry,
        max_iterations: int = 8,
        model: str = None,
        tier_config: "TierConfig | None" = None,
    ):
        """Initialize with a tool registry and tier configuration."""
        self.tools = tool_registry
        self.max_iterations = max_iterations
        self.tier_config = tier_config

        if tier_config and tier_config.llm_provider == "groq":
            # Groq exposes an OpenAI-compatible API — reuse AsyncOpenAI with different base_url
            self.model = tier_config.llm_model
            self.client = AsyncOpenAI(
                api_key=Config.GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1",
            )
        else:
            self.model = model or (tier_config.llm_model if tier_config else Config.MODEL_NAME)
            self.client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)

    async def run(
        self,
        query: str,
        user_id: str,
        trace_id: str = None,
        conversation_history: list[dict] = None,
        user_memories: list[str] = None,
        tier_config: "TierConfig | None" = None,
    ) -> AgentResult:
        """
        Run the ReAct loop for a given query.

        Injects user_id into document tools, appends up to 6 prior messages for context.
        Injects user_memories into the system prompt when provided.
        """
        # Inject user_id into tools that need it
        for tool_name in ["get_document_list", "get_document_metadata"]:
            tool = self.tools.get(tool_name)
            if tool:
                tool.user_id = user_id

        system_prompt = self.SYSTEM_PROMPT
        if user_memories:
            facts = "\n".join(f"- {f}" for f in user_memories)
            system_prompt += f"\n\nWhat you know about this user:\n{facts}"
        messages: list[dict] = [{"role": "system", "content": system_prompt}]

        if conversation_history:
            messages.extend(conversation_history[-6:])

        messages.append({"role": "user", "content": query})

        steps: list[AgentStep] = []

        log_pipeline_event(
            event="agent_start",
            trace_id=trace_id,
            metadata={"query_preview": query[:50], "max_iterations": self.max_iterations},
        )

        for iteration in range(1, self.max_iterations + 1):
            step = AgentStep(
                step_number=iteration,
                thought=None,
                action=None,
                action_input=None,
                observation=None,
            )

            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=self.tools.all_schemas(),
                    tool_choice="auto",
                )
            except Exception as exc:
                # Groq's function-calling occasionally emits malformed tool-call
                # syntax as plain text (e.g. "<function=search_documents {...}"),
                # which Groq's own API then rejects with its own 400
                # tool_use_failed error — raised here, outside any tool's error
                # handling, and previously crashed the whole request. `messages`
                # is untouched at this point (nothing malformed was appended),
                # so falling through to the same tools-less "best answer so far"
                # completion used for max_iterations below is always safe.
                log_pipeline_event(
                    event="agent_llm_call_failed",
                    trace_id=trace_id,
                    metadata={"step": iteration, "error": str(exc)},
                )
                break

            if not response.choices:
                raise ValueError("OpenAI returned empty choices array")
            message = response.choices[0].message
            finish_reason = response.choices[0].finish_reason

            messages.append(message.model_dump(exclude_none=True))

            if finish_reason == "tool_calls" and message.tool_calls:
                # OpenAI may return multiple parallel tool calls in one response.
                # Every tool_call_id in the assistant message MUST have a corresponding
                # tool response message — missing even one causes a 400 on the next call.
                last_observation = ""
                for tool_call in message.tool_calls:
                    tool_name = tool_call.function.name
                    tool_input = _parse_tool_arguments(tool_call.function.arguments)

                    log_pipeline_event(
                        event="agent_tool_call",
                        trace_id=trace_id,
                        metadata={
                            "step": iteration,
                            "tool": tool_name,
                            "input_preview": str(tool_input)[:100],
                        },
                    )

                    result = await self.tools.execute(tool_name, tool_input)
                    observation = result.to_observation()
                    last_observation = observation

                    log_pipeline_event(
                        event="agent_observation",
                        trace_id=trace_id,
                        metadata={
                            "step": iteration,
                            "tool": tool_name,
                            "success": result.success,
                            "output_preview": observation[:100],
                        },
                    )

                    messages.append(
                        {"role": "tool", "tool_call_id": tool_call.id, "content": observation}
                    )

                # Record the primary (first) tool call for the step trace
                primary = message.tool_calls[0]
                step.action = primary.function.name
                step.action_input = _parse_tool_arguments(primary.function.arguments)
                step.observation = last_observation

                steps.append(step)
                continue

            if finish_reason == "stop" and message.content:
                step.is_final = True
                step.final_answer = message.content
                steps.append(step)

                log_pipeline_event(
                    event="agent_complete",
                    trace_id=trace_id,
                    metadata={"steps": iteration, "stopped_reason": "final_answer"},
                )

                return AgentResult(
                    success=True,
                    answer=message.content,
                    steps=steps,
                    total_steps=iteration,
                    stopped_reason="final_answer",
                    trace_id=trace_id,
                )

        log_pipeline_event(
            event="agent_max_iterations", trace_id=trace_id, metadata={"steps": self.max_iterations}
        )

        messages.append(
            {
                "role": "user",
                "content": "Based on what you have found so far, please provide your best answer.",
            }
        )

        final_response = await self.client.chat.completions.create(
            model=self.model, messages=messages
        )

        final_answer = (
            (final_response.choices[0].message.content if final_response.choices else None)
            or "I was unable to complete this task within the allowed steps."
        )

        return AgentResult(
            success=True,
            answer=final_answer,
            steps=steps,
            total_steps=self.max_iterations,
            stopped_reason="max_iterations",
            trace_id=trace_id,
        )

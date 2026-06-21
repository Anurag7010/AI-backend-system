# ai-backend/agents/factory.py
from typing import TYPE_CHECKING

from agents.react_agent import ReActAgent
from agents.tools.base import ToolRegistry
from agents.tools.implementations import (
    CalculateTool,
    GetDocumentListTool,
    GetDocumentMetadataTool,
    SearchDocumentsTool,
)
from agents.tools.web_search import WebSearchTool

if TYPE_CHECKING:
    from core.user_tier import TierConfig


def create_agent(
    rag_interface,
    documents_repository,
    max_iterations: int = 8,
    enable_web_search: bool = True,
    tier_config: "TierConfig | None" = None,
) -> ReActAgent:
    """
    Create a fully wired ReAct agent with all tools registered.

    Called once per request — agents are not shared across requests.
    tier_config determines which LLM provider the agent uses.
    """
    registry = ToolRegistry()
    registry.register(SearchDocumentsTool(rag_interface=rag_interface))
    registry.register(GetDocumentListTool(documents_repository=documents_repository))
    registry.register(GetDocumentMetadataTool(documents_repository=documents_repository))
    registry.register(CalculateTool())
    if enable_web_search:
        registry.register(WebSearchTool())
    return ReActAgent(
        tool_registry=registry,
        max_iterations=max_iterations,
        tier_config=tier_config,
    )

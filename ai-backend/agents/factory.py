# ai-backend/agents/factory.py
from agents.tools.base import ToolRegistry
from agents.tools.implementations import (
    SearchDocumentsTool,
    GetDocumentListTool,
    GetDocumentMetadataTool,
    CalculateTool,
)
from agents.react_agent import ReActAgent


def create_agent(rag_interface, documents_repository, max_iterations: int = 8) -> ReActAgent:
    """
    Create a fully wired ReAct agent with all tools registered.

    Called once per request — agents are not shared across requests.
    """
    registry = ToolRegistry()
    registry.register(SearchDocumentsTool(rag_interface=rag_interface))
    registry.register(GetDocumentListTool(documents_repository=documents_repository))
    registry.register(GetDocumentMetadataTool(documents_repository=documents_repository))
    registry.register(CalculateTool())
    return ReActAgent(
        tool_registry=registry,
        max_iterations=max_iterations
    )

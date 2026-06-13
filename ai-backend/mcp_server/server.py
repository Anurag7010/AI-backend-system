"""
MCP server exposing our AI tools via the Model Context Protocol.

Transport: stdio (standard input/output) — suitable for Claude Desktop / Cursor integration.
Run with: python3 -m mcp_server.server

Exposes three tools:
  - search_documents: RAG semantic search over ingested PDFs
  - calculate: safe AST-based math expression evaluator
  - get_document_list: returns an auth notice (user context not available via MCP)
"""

import asyncio
import json

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import CallToolResult, ListToolsResult, TextContent, Tool

from agents.tools.implementations import CalculateTool
from rag.rag_interface import retrieve as rag_retrieve

_server = Server("ai-product-tools")
_calculate_tool = CalculateTool()


@_server.list_tools()
async def list_tools() -> list[Tool]:
    """MCP discovery endpoint — called first by every MCP client."""
    return [
        Tool(
            name="search_documents",
            description=(
                "Search through ingested documents to find relevant information. "
                "Use when you need to look up content from uploaded PDF documents."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                    "top_k": {
                        "type": "integer",
                        "description": "Number of results to return",
                        "default": 3,
                        "minimum": 1,
                        "maximum": 10,
                    },
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="calculate",
            description=(
                "Evaluate a mathematical expression safely. "
                "Supports arithmetic, sqrt, percentages, and other math functions."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Math expression e.g. '2 + 2', 'sqrt(16)', '100 * 0.15'",
                    },
                },
                "required": ["expression"],
            },
        ),
        Tool(
            name="get_document_list",
            description=(
                "List all documents available in the system. "
                "Returns document names, statuses, and chunk counts."
            ),
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
    ]


@_server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Route MCP tool calls to our existing tool implementations."""
    try:
        if name == "search_documents":
            query = arguments.get("query", "")
            top_k = arguments.get("top_k", 3)
            chunks = await rag_retrieve(query=query, top_k=top_k, strategy="semantic")
            if not chunks:
                text = "No relevant documents found for this query."
            else:
                text = "\n\n".join(
                    f"[Result {i + 1}] (score: {c.get('score') or 0:.2f})\n{c.get('content', '')}"
                    for i, c in enumerate(chunks)
                )
            return [TextContent(type="text", text=text)]

        elif name == "calculate":
            result = await _calculate_tool.execute({"expression": arguments.get("expression", "")})
            return [TextContent(type="text", text=result.to_observation())]

        elif name == "get_document_list":
            return [
                TextContent(
                    type="text",
                    text="Document listing requires authentication. Use the web interface at http://localhost:3000/documents",
                )
            ]

        else:
            raise ValueError(f"Unknown tool: {name}")

    except Exception as exc:
        return [TextContent(type="text", text=f"Tool error: {exc}")]


async def run_mcp_server() -> None:
    """Start the MCP server using stdio transport."""
    async with stdio_server() as (read_stream, write_stream):
        await _server.run(
            read_stream,
            write_stream,
            _server.create_initialization_options(),
        )


if __name__ == "__main__":
    print("Starting MCP server (stdio transport)...")
    asyncio.run(run_mcp_server())

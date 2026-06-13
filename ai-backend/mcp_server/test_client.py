"""
MCP test client — simulates what Claude Desktop or Cursor does.

Run from ai-backend/: python3 -m mcp_server.test_client

Tests:
  1. Tool discovery (list_tools)
  2. Calculate tool invocation
"""

import asyncio
import sys
from pathlib import Path

from mcp.client.session import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.types import CallToolResult, ListToolsResult, TextContent

EXPECTED_TOOLS = {"search_documents", "calculate", "get_document_list"}
TEST_EXPRESSION = "sqrt(144) + 10 * 2"


async def run_tests() -> None:
    """Connect to the MCP server and run discovery + invocation tests."""
    # Resolve path to the server module so the subprocess can import it
    server_dir = Path(__file__).resolve().parent.parent  # ai-backend/

    server_params = StdioServerParameters(
        command=sys.executable,
        args=["-m", "mcp_server.server"],
        cwd=str(server_dir),
    )

    print("=" * 60)
    print("MCP Test Client")
    print("=" * 60)
    print(f"Server: python3 -m mcp_server.server")
    print(f"CWD:    {server_dir}")
    print()

    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            # --- Initialise ---
            init_result = await session.initialize()
            print(
                f"[OK] Connected — server: {init_result.serverInfo.name!r} "
                f"v{init_result.serverInfo.version}"
            )
            print()

            # --- Test 1: Tool discovery ---
            print("Test 1: list_tools")
            list_result: ListToolsResult = await session.list_tools()
            discovered = {t.name for t in list_result.tools}

            print(f"  Discovered {len(list_result.tools)} tool(s): {sorted(discovered)}")

            missing = EXPECTED_TOOLS - discovered
            unexpected = discovered - EXPECTED_TOOLS
            if missing:
                print(f"  [FAIL] Missing tools: {missing}", file=sys.stderr)
                sys.exit(1)
            if unexpected:
                print(f"  [WARN] Unexpected extra tools: {unexpected}")
            print(f"  [OK] All {len(EXPECTED_TOOLS)} expected tools present")
            print()

            # --- Test 2: calculate tool invocation ---
            print(f"Test 2: call_tool('calculate', expression={TEST_EXPRESSION!r})")
            call_result: CallToolResult = await session.call_tool(
                "calculate",
                {"expression": TEST_EXPRESSION},
            )

            if call_result.isError:
                print(f"  [FAIL] Tool returned an error", file=sys.stderr)
                for item in call_result.content:
                    if isinstance(item, TextContent):
                        print(f"  Error: {item.text}", file=sys.stderr)
                sys.exit(1)

            output_texts = [
                item.text for item in call_result.content if isinstance(item, TextContent)
            ]
            if not output_texts:
                print("  [FAIL] No TextContent in response", file=sys.stderr)
                sys.exit(1)

            result_text = output_texts[0]
            print(f"  Result: {result_text}")

            # sqrt(144) = 12, 10 * 2 = 20 → 12 + 20 = 32.0
            if "32" not in result_text:
                print(
                    f"  [FAIL] Expected result to contain '32', got: {result_text!r}",
                    file=sys.stderr,
                )
                sys.exit(1)
            print("  [OK] Result contains expected value (32)")
            print()

    print("=" * 60)
    print("[PASS] All tests passed")
    print("=" * 60)


def main() -> None:
    """Entry point for `python3 -m mcp_server.test_client`."""
    asyncio.run(run_tests())


if __name__ == "__main__":
    main()

# ai-backend/agents/tools/base.py
import json
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

from pydantic import BaseModel, ValidationError


@dataclass
class ToolResult:
    success: bool
    output: Any
    error: Optional[str]
    tool_name: str

    def to_observation(self) -> str:
        """Serialize to a string for injection into the LLM message."""
        if self.success:
            if isinstance(self.output, (dict, list)):
                return json.dumps(self.output, indent=2, default=str)
            return str(self.output)
        return f"Tool error: {self.error}"


class BaseTool(ABC):
    """Base class for all agent tools."""

    name: str
    description: str

    class InputSchema(BaseModel):
        pass

    async def execute(self, raw_input: dict) -> ToolResult:
        """Validate input then execute. Always returns ToolResult — never raises."""
        try:
            validated = self.InputSchema(**raw_input)
        except ValidationError as e:
            return ToolResult(
                success=False,
                output=None,
                error=f"Invalid input: {e.errors()}",
                tool_name=self.name,
            )
        try:
            output = await self._execute(validated)
            return ToolResult(success=True, output=output, error=None, tool_name=self.name)
        except Exception as e:
            return ToolResult(
                success=False, output=None, error=f"Execution failed: {str(e)}", tool_name=self.name
            )

    @abstractmethod
    async def _execute(self, input: InputSchema) -> Any:
        """Implement tool logic here."""
        pass

    def to_openai_schema(self) -> dict:
        """Convert tool to OpenAI function calling schema."""
        schema = self.InputSchema.model_json_schema()
        return {
            "type": "function",
            "function": {"name": self.name, "description": self.description, "parameters": schema},
        }


class ToolRegistry:
    """Maps tool names to tool instances."""

    def __init__(self):
        self._tools: dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        """Register a tool instance."""
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name."""
        return self._tools.get(name)

    def all_schemas(self) -> list[dict]:
        """Returns all tool schemas for passing to the LLM."""
        return [tool.to_openai_schema() for tool in self._tools.values()]

    def names(self) -> list[str]:
        """Return all registered tool names."""
        return list(self._tools.keys())

    async def execute(self, tool_name: str, tool_input: dict) -> ToolResult:
        """Execute a tool by name. Returns error ToolResult if tool not found."""
        tool = self.get(tool_name)
        if not tool:
            return ToolResult(
                success=False,
                output=None,
                error=f"Unknown tool: '{tool_name}'. Available tools: {self.names()}",
                tool_name=tool_name,
            )
        return await tool.execute(tool_input)

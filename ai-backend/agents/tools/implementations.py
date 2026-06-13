# ai-backend/agents/tools/implementations.py
import ast
import math
import operator
from typing import Any, Callable, Optional

from pydantic import BaseModel, Field

from agents.tools.base import BaseTool


class SearchDocumentsTool(BaseTool):
    name = "search_documents"
    description = (
        "Search through ingested documents to find relevant information. "
        "Use this tool when the user asks any question that requires looking up "
        "content from their uploaded documents. Returns relevant text chunks with scores."
    )

    class InputSchema(BaseModel):
        query: str = Field(description="The search query to find relevant document content")
        top_k: int = Field(default=3, ge=1, le=10, description="Number of chunks to return")

    def __init__(self, rag_interface):
        """Initialize with RAGInterface instance."""
        self.rag = rag_interface

    async def _execute(self, input: InputSchema) -> list[dict]:
        """Search documents via RAG retrieve."""
        chunks = await self.rag.retrieve(query=input.query, top_k=input.top_k, strategy="semantic")
        return [
            {
                "content": c.get("content", ""),
                "score": round(c.get("score", 0), 3),
                "source": c.get("metadata", {}).get("source", "unknown"),
            }
            for c in chunks
        ]


class GetDocumentListTool(BaseTool):
    name = "get_document_list"
    description = (
        "Get a list of all documents the user has uploaded. "
        "Use this when the user asks what documents they have, "
        "how many files are ingested, or wants to know what is available to search."
    )

    class InputSchema(BaseModel):
        pass

    def __init__(self, documents_repository):
        """Initialize with documents repository."""
        self.repo = documents_repository
        self.user_id: str = "anonymous"

    async def _execute(self, input: InputSchema) -> list[dict]:
        """List documents for the current user."""
        docs = await self.repo.findByUser(self.user_id)
        return [
            {
                "id": str(d.id),
                "filename": d.filename,
                "status": d.status,
                "chunk_count": d.chunk_count,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in docs
        ]


class GetDocumentMetadataTool(BaseTool):
    name = "get_document_metadata"
    description = (
        "Get detailed metadata for a specific document by its filename or ID. "
        "Use this when the user asks about a specific document — when it was uploaded, "
        "its status, how many chunks it contains, or other document-level details."
    )

    class InputSchema(BaseModel):
        identifier: str = Field(description="The document filename or document ID to look up")

    def __init__(self, documents_repository):
        """Initialize with documents repository."""
        self.repo = documents_repository
        self.user_id: str = "anonymous"

    async def _execute(self, input: InputSchema) -> dict:
        """Get metadata for a specific document."""
        doc = await self.repo.findById(input.identifier)
        if not doc:
            all_docs = await self.repo.findByUser(self.user_id)
            doc = next(
                (d for d in all_docs if input.identifier.lower() in d.filename.lower()), None
            )
        if not doc:
            return {"error": f"Document '{input.identifier}' not found"}
        return {
            "id": str(doc.id),
            "filename": doc.filename,
            "status": doc.status,
            "chunk_count": doc.chunk_count,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        }


class CalculateTool(BaseTool):
    name = "calculate"
    description = (
        "Evaluate a mathematical expression safely. "
        "Use this for any calculation the user needs: arithmetic, percentages, "
        "square roots, rounding. Input must be a valid math expression as a string."
    )

    class InputSchema(BaseModel):
        expression: str = Field(
            description="Mathematical expression to evaluate. Examples: '2 + 2', 'sqrt(16)', '(100 * 0.15)'"
        )

    ALLOWED_NAMES: dict[str, Any] = {
        k: v for k, v in math.__dict__.items() if not k.startswith("_")
    }
    ALLOWED_OPERATORS: dict[type, Any] = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.Mod: operator.mod,
    }

    async def _execute(self, input: InputSchema) -> dict:
        """Safe expression evaluator using AST parsing."""
        try:
            result = self._safe_eval(input.expression)
            return {
                "expression": input.expression,
                "result": result,
                "formatted": f"{input.expression} = {result}",
            }
        except Exception as e:
            return {"error": f"Could not evaluate '{input.expression}': {str(e)}"}

    def _safe_eval(self, expr: str) -> float | int:
        """Parse expression as AST and evaluate only allowed nodes."""
        tree = ast.parse(expr, mode="eval")
        return self._eval_node(tree.body)

    def _eval_node(self, node: ast.AST) -> Any:
        """Recursively evaluate an AST node against the allowlist."""
        if isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.Name):
            if node.id in self.ALLOWED_NAMES:
                return self.ALLOWED_NAMES[node.id]
            raise ValueError(f"Name not allowed: {node.id}")
        elif isinstance(node, ast.BinOp):
            op = self.ALLOWED_OPERATORS.get(type(node.op))
            if not op:
                raise ValueError(f"Operator not allowed: {type(node.op).__name__}")
            return op(self._eval_node(node.left), self._eval_node(node.right))
        elif isinstance(node, ast.UnaryOp):
            op = self.ALLOWED_OPERATORS.get(type(node.op))
            if not op:
                raise ValueError("Operator not allowed")
            return op(self._eval_node(node.operand))
        elif isinstance(node, ast.Call):
            func = self._eval_node(node.func)
            args = [self._eval_node(a) for a in node.args]
            return func(*args)
        else:
            raise ValueError(f"Node type not allowed: {type(node).__name__}")

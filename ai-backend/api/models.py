"""
api/models.py

Pydantic request/response models for the HTTP API contract.

These define what goes over the wire — separate from internal types in rag_interface.py.
Internal functions return plain dicts; these models validate, document, and serialize
them into consistent HTTP responses.

Alignment with web-app TypeScript types in types/api.ts:
  - AskResponse   → AskResponse (camelCase conversion handled by Next.js proxy in Block 2)
  - ErrorResponse → ApiError    (field mapping: error→code, trace_id→requestId)
"""

from datetime import datetime, timezone
from pydantic import BaseModel, Field


# ── Request models ────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    query: str = Field(..., min_length=1, description="The question to answer using the RAG pipeline")
    top_k: int = Field(5, ge=1, le=20, description="Number of document chunks to retrieve")
    strategy: str = Field("semantic", description="Retrieval strategy: semantic | hybrid | multi_query | rrf")
    history: list[dict] | None = Field(None, description="Chat history as list of {role, content} dicts")
    use_multi_query: bool = Field(False, description="Whether to generate query variants for multi-query retrieval")


class IngestRequest(BaseModel):
    # File comes via UploadFile in the route handler — not in this model.
    # This model captures optional form metadata sent alongside the file.
    metadata: dict = Field(default_factory=dict, description="Optional key-value metadata attached to the document")


class RetrieveRequest(BaseModel):
    query: str = Field(..., description="The search query for retrieval")
    top_k: int = Field(5, ge=1, le=20, description="Number of chunks to return")
    strategy: str = Field("semantic", description="Retrieval strategy: semantic | hybrid | multi_query | rrf")


# ── Response models ───────────────────────────────────────────────────────────

class SourceResponse(BaseModel):
    content: str = Field(..., description="Text content of the retrieved chunk")
    score: float | None = Field(None, description="Relevance score from the vectorstore")
    metadata: dict = Field(default_factory=dict, description="Source metadata: file, chunk_index, etc.")
    citation_id: int | None = Field(None, description="[Source N] citation number matching inline answer text")


class AskResponse(BaseModel):
    answer: str = Field(..., description="LLM-generated answer grounded in retrieved documents")
    sources: list[SourceResponse] = Field(..., description="Document chunks used to generate the answer")
    trace_id: str = Field(..., description="Request trace ID for observability correlation")
    latency_breakdown: dict = Field(..., description="{retrieval_ms, generation_ms, total_ms}")
    guardrail_rejected: bool = Field(False, description="True if the query was rejected by guardrails")
    no_results: bool = Field(False, description="True if no relevant document chunks were found")
    retrieval_quality: dict = Field(default_factory=dict, description="{quality, max_score, avg_score, chunk_count}")
    routed_to: str = Field("rag", description="'rag' | 'agent' — pipeline that handled this request")


class IngestResponse(BaseModel):
    status: str = Field(..., description='"ok" or "error"')
    chunk_count: int = Field(..., description="Number of chunks stored in the vectorstore")
    document_id: str | None = Field(None, description="Identifier for the ingested document")
    error: str | None = Field(None, description="Error message if ingestion failed")


class RetrieveResponse(BaseModel):
    chunks: list[SourceResponse] = Field(..., description="Retrieved document chunks")
    trace_id: str = Field(..., description="Request trace ID for observability correlation")


class HealthResponse(BaseModel):
    status: str = Field(..., description='"ok" or "degraded"')
    components: dict = Field(..., description="Per-component status: {llm, rag, logger}")


class ErrorResponse(BaseModel):
    """
    Normalized error shape.
    Maps to TypeScript ApiError in web-app/types/api.ts.
    Field mapping handled by Next.js proxy: error→code, trace_id→requestId.
    """
    error: str = Field(..., description="Error code / type identifier")
    message: str = Field(..., description="Human-readable error description")
    trace_id: str | None = Field(None, description="Request trace ID if available")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 timestamp of when the error occurred",
    )


# ── Agent models ──────────────────────────────────────────────────────────────

class AgentStepResponse(BaseModel):
    """Single step in the agent's reasoning trace."""
    step_number: int = Field(..., description="Step index starting at 1")
    action: str | None = Field(None, description="Tool name called in this step")
    action_input: dict | None = Field(None, description="Input passed to the tool")
    observation: str | None = Field(None, description="Tool result injected back into the loop")
    is_final: bool = Field(False, description="True when this step contains the final answer")
    final_answer: str | None = Field(None, description="The agent's final answer (only on is_final=True steps)")


class AgentRunResponse(BaseModel):
    """Complete result of one agent run including full reasoning trace."""
    answer: str = Field(..., description="The agent's final answer")
    steps: list[AgentStepResponse] = Field(..., description="Full reasoning trace")
    total_steps: int = Field(..., description="Total number of iterations taken")
    stopped_reason: str = Field(..., description="'final_answer' | 'max_iterations' | 'error'")
    trace_id: str = Field(..., description="Request trace ID")
    routed_to: str = Field("agent", description="Always 'agent' for this endpoint")

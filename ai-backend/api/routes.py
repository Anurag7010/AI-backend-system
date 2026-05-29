"""
api/routes.py

All HTTP endpoint handlers. Imported and registered by api/app.py.

Pattern every route follows:
  1. Extract trace_id from request.state (set by middleware in app.py)
  2. Wrap business logic in try/except
  3. On success: return the typed response model
  4. On error: log full error with trace_id, return ErrorResponse — never raw exceptions
"""

import asyncio
import json
import os
import tempfile
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from observability.logger import get_logger
from observability.tracer import new_trace_id
from api.models import (
    AskRequest,
    AskResponse,
    IngestResponse,
    RetrieveResponse,
    HealthResponse,
    SourceResponse,
    ErrorResponse,
)

logger = get_logger(__name__)
router = APIRouter()


# ── Helper ────────────────────────────────────────────────────────────────────

def _error_response(
    error_code: str,
    message: str,
    trace_id: str | None,
    status_code: int,
) -> JSONResponse:
    """Build a normalized ErrorResponse JSON response."""
    body = ErrorResponse(
        error=error_code,
        message=message,
        trace_id=trace_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    return JSONResponse(status_code=status_code, content=body.model_dump())


def _normalize_source(chunk: dict) -> SourceResponse:
    """Convert a raw retrieve() dict to a SourceResponse model."""
    return SourceResponse(
        content=chunk.get("content", ""),
        score=chunk.get("score"),
        metadata=chunk.get("metadata", {}),
    )


# ── GET /health ───────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health(request: Request) -> HealthResponse:
    """
    Component-level health check.

    Always returns HTTP 200. Per-component status is in the body.
    Load balancers use HTTP status for routing decisions — a 500 takes
    the instance out of rotation even if only one component is degraded.
    """
    components: dict = {}

    # Check: logger
    try:
        logger.info("health_check", extra={"check": "logger"})
        components["logger"] = "ok"
    except Exception as exc:
        components["logger"] = f"error: {exc}"

    # Check: config
    try:
        from core.config import config
        _ = config.MODEL_NAME
        _ = config.OPENAI_API_KEY
        components["config"] = "ok"
    except Exception as exc:
        components["config"] = f"error: {exc}"

    # Check: LLM client (import only — no live API call to keep health fast)
    try:
        from core.llm_client import complete  # noqa: F401
        components["llm"] = "ok"
    except Exception as exc:
        components["llm"] = f"error: {exc}"

    # Check: RAG interface importable
    try:
        from rag.rag_interface import retrieve  # noqa: F401
        components["rag"] = "ok"
    except Exception as exc:
        components["rag"] = f"error: {exc}"

    overall = "ok" if all(v == "ok" for v in components.values()) else "degraded"
    return HealthResponse(status=overall, components=components)


# ── POST /ask ─────────────────────────────────────────────────────────────────

@router.post("/ask", response_model=AskResponse, tags=["rag"])
async def ask(body: AskRequest, request: Request) -> AskResponse | JSONResponse:
    """
    Full RAG pipeline: retrieve relevant chunks → generate grounded answer.

    This is the core endpoint — the chat UI calls this for every user message.
    trace_id from X-Request-ID header flows through retrieval, generation, and logs.
    """
    trace_id: str = getattr(request.state, "trace_id", new_trace_id())
    try:
        from rag.rag_interface import ask as rag_ask, retrieve as rag_retrieve

        # Generate answer (internally does retrieval + generation)
        result = rag_ask(
            query=body.query,
            history=body.history,
            trace_id=trace_id,
        )

        if result.get("error"):
            logger.error(
                "ask_pipeline_error",
                extra={"trace_id": trace_id, "error": result["error"]},
            )
            return _error_response(
                "pipeline_error", result["error"], trace_id, 500
            )

        # Retrieve chunks separately for rich SourceResponse objects.
        # ask() returns only source file paths; retrieve() returns {content, score, metadata}.
        # This adds one extra vector search (no extra LLM call).
        raw_chunks = rag_retrieve(
            query=body.query,
            top_k=body.top_k,
            strategy=body.strategy,
        )
        # Filter out any error dicts that retrieve() may return on partial failure
        sources = [
            _normalize_source(c)
            for c in raw_chunks
            if "error" not in c
        ]

        return AskResponse(
            answer=result["answer"],
            sources=sources,
            trace_id=result["trace_id"],
            latency_breakdown=result["latency_breakdown"],
        )

    except Exception as exc:
        logger.error(
            "ask_unhandled_error",
            extra={"trace_id": trace_id, "error": str(exc)},
            exc_info=True,
        )
        return _error_response("ask_failed", str(exc), trace_id, 500)


# ── POST /ask/stream ──────────────────────────────────────────────────────────

def _sse_event(data: dict) -> str:
    """Format a dict as an SSE data event."""
    return f"data: {json.dumps(data)}\n\n"


@router.post("/ask/stream", tags=["rag"])
async def ask_stream(body: AskRequest, request: Request) -> StreamingResponse:
    """
    Streaming version of /ask.

    SSE events emitted in order:
      data: {"type": "token",   "content": "..."}   — one per LLM token
      data: {"type": "sources", "sources": [...]}    — after last token
      data: {"type": "done",    "trace_id": "...", "latency_ms": N}
      data: {"type": "error",   "message": "..."}    — only on failure
    """
    trace_id: str = getattr(request.state, "trace_id", new_trace_id())

    async def generate():
        t0 = time.perf_counter()
        try:
            from rag.rag_interface import retrieve as rag_retrieve
            from core.llm_client import stream as llm_stream

            # Retrieval is synchronous — run in thread pool to avoid blocking the event loop
            chunks: list[dict] = await asyncio.to_thread(
                rag_retrieve, body.query, body.top_k, body.strategy
            )
            valid_chunks = [c for c in chunks if "error" not in c]

            # Build plain-text context from retrieved dicts
            context_parts = [
                f"--- Document {i + 1} ---\n{chunk.get('content', '')}"
                for i, chunk in enumerate(valid_chunks)
            ]
            context_text = "\n\n".join(context_parts)
            prompt = (
                f"Based on the following documents, answer: {body.query}\n\n"
                f"{context_text}\n\nANSWER:"
            )

            # Stream LLM tokens one by one
            async for token in llm_stream(prompt, trace_id=trace_id):
                yield _sse_event({"type": "token", "content": token})

            # Sources arrive after the last token — user sees answer first, sources below
            sources = [
                {
                    "content": c.get("content", ""),
                    "score": c.get("score"),
                    "metadata": c.get("metadata", {}),
                }
                for c in valid_chunks
            ]
            yield _sse_event({"type": "sources", "sources": sources})

            latency_ms = round((time.perf_counter() - t0) * 1000, 2)
            yield _sse_event({"type": "done", "trace_id": trace_id, "latency_ms": latency_ms})

        except Exception as exc:
            logger.error(
                "ask_stream_error",
                extra={"trace_id": trace_id, "error": str(exc)},
                exc_info=True,
            )
            yield _sse_event({"type": "error", "message": str(exc)})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Request-ID": trace_id,
        },
    )


# ── POST /ingest ──────────────────────────────────────────────────────────────

@router.post("/ingest", response_model=IngestResponse, tags=["rag"])
async def ingest(
    request: Request,
    file: UploadFile,
    metadata: str = Form(default="{}"),
) -> IngestResponse | JSONResponse:
    """
    Ingest a document into the vectorstore.

    Accepts multipart/form-data with a 'file' field (required) and
    optional 'metadata' field (JSON string of key-value pairs).
    File is saved to a temp path, ingested, then cleaned up — success or failure.
    python-multipart is required for UploadFile to work.
    """
    trace_id: str = getattr(request.state, "trace_id", new_trace_id())
    tmp_path: str | None = None

    try:
        import json as _json
        from rag.rag_interface import ingest as rag_ingest

        # Parse metadata JSON string from form field
        try:
            parsed_metadata: dict = _json.loads(metadata)
        except _json.JSONDecodeError:
            return _error_response(
                "invalid_metadata",
                "metadata field must be a valid JSON object string",
                trace_id,
                422,
            )

        # Save uploaded file to a temporary path
        suffix = os.path.splitext(file.filename or "upload")[1] or ".bin"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            content = await file.read()
            tmp.write(content)

        logger.info(
            "ingest_file_received",
            extra={
                "trace_id": trace_id,
                "file_name": file.filename,      # "filename" is reserved by Python logging.LogRecord
                "size_bytes": len(content),
                "tmp_path": tmp_path,
            },
        )

        enriched_metadata = {
            **parsed_metadata,
            "source": file.filename or tmp_path,
            "trace_id": trace_id,
        }

        result = rag_ingest(file_path=tmp_path, metadata=enriched_metadata)

        if result.get("error"):
            logger.error(
                "ingest_pipeline_error",
                extra={"trace_id": trace_id, "error": result["error"]},
            )
            return _error_response("ingest_failed", result["error"], trace_id, 500)

        return IngestResponse(
            status=result["status"],
            chunk_count=result["chunk_count"],
            document_id=enriched_metadata.get("document_id"),
            error=None,
        )

    except Exception as exc:
        logger.error(
            "ingest_unhandled_error",
            extra={"trace_id": trace_id, "error": str(exc)},
            exc_info=True,
        )
        return _error_response("ingest_failed", str(exc), trace_id, 500)

    finally:
        # Always clean up the temp file — success or failure
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


# ── GET /retrieve ─────────────────────────────────────────────────────────────

@router.get("/retrieve", response_model=RetrieveResponse, tags=["rag"])
async def retrieve(
    request: Request,
    query: str,
    top_k: int = 5,
    strategy: str = "semantic",
) -> RetrieveResponse | JSONResponse:
    """
    Retrieve document chunks without generating an answer.

    Useful for debugging the retrieval stage independently from generation,
    or for building UI features that show source documents before the answer.
    """
    trace_id: str = getattr(request.state, "trace_id", new_trace_id())
    try:
        from rag.rag_interface import retrieve as rag_retrieve

        raw_chunks = rag_retrieve(query=query, top_k=top_k, strategy=strategy)

        # Check if retrieve() returned an error list
        if raw_chunks and "error" in raw_chunks[0]:
            error_msg = raw_chunks[0]["error"]
            logger.error(
                "retrieve_error",
                extra={"trace_id": trace_id, "error": error_msg},
            )
            return _error_response("retrieve_failed", error_msg, trace_id, 500)

        chunks = [_normalize_source(c) for c in raw_chunks]
        return RetrieveResponse(chunks=chunks, trace_id=trace_id)

    except Exception as exc:
        logger.error(
            "retrieve_unhandled_error",
            extra={"trace_id": trace_id, "error": str(exc)},
            exc_info=True,
        )
        return _error_response("retrieve_failed", str(exc), trace_id, 500)

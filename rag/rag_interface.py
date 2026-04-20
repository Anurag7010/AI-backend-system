"""
rag/rag_interface.py

Clean adapter over the multimodal RAG workflow.
Based on patterns from 8_multi_modal_rag.ipynb.

Public API — exactly 3 methods, nothing LangChain leaks out:
    ingest(file_path, metadata)         → dict
    retrieve(query, top_k, strategy)    → list[dict]
    ask(query, history)                 → dict

All errors are returned as structured dicts with an "error" key.
No exceptions propagate to callers.

All implementation stays in this file; no external/rag_system imports are used.
"""

import json
import time
from typing import Any

from observability.logger import get_logger

logger = get_logger(__name__)

# ── Lazy imports — only pulled in when a method is first called ───────────────
# This prevents import-time crashes when optional deps (unstructured, chromadb) are not installed yet.

def _get_deps() -> dict[str, Any]:
    """Import all heavy RAG dependencies. Raises ImportError with clear message."""
    try:
        from unstructured.partition.pdf import partition_pdf 
        from unstructured.chunking.title import chunk_by_title
        from langchain_core.documents import Document
        from langchain_openai import ChatOpenAI, OpenAIEmbeddings
        from langchain_chroma import Chroma  
        from langchain_core.messages import HumanMessage
        from core.config import config
        return {
            "partition_pdf": partition_pdf,
            "chunk_by_title": chunk_by_title,
            "Document": Document,
            "ChatOpenAI": ChatOpenAI,
            "OpenAIEmbeddings": OpenAIEmbeddings,
            "Chroma": Chroma,
            "HumanMessage": HumanMessage,
            "config": config,
        }
    except ImportError as exc:
        raise ImportError(
            f"[rag_interface] Missing dependency: {exc}.\n"
            "Run: pip install unstructured[pdf] langchain-chroma langchain-openai"
        ) from exc


_vectorstore_cache: Any = None
_PERSIST_DIR = "rag/db/chroma_db"
_EMBED_MODEL  = "text-embedding-3-small"
_LLM_MODEL    = "gpt-4o-mini"


def _get_vectorstore(deps: dict) -> Any:
    """Return a loaded Chroma vectorstore, creating or loading from disk."""
    global _vectorstore_cache
    if _vectorstore_cache is not None:
        return _vectorstore_cache

    Chroma = deps["Chroma"]
    OpenAIEmbeddings = deps["OpenAIEmbeddings"]

    embedding_model = OpenAIEmbeddings(model=_EMBED_MODEL)
    _vectorstore_cache = Chroma(
        persist_directory=_PERSIST_DIR,
        embedding_function=embedding_model,
        collection_metadata={"hnsw:space": "cosine"},
    )
    logger.info(f"[rag] Loaded vectorstore from {_PERSIST_DIR}")
    return _vectorstore_cache


def _invalidate_vectorstore() -> None:
    """Force reload of vectorstore on next access (called after ingestion)."""
    global _vectorstore_cache
    _vectorstore_cache = None


# ── Internal: ingestion helpers ───────────────────────────────────────────────

def _partition_document(file_path: str, deps: dict) -> list:
    partition_pdf = deps["partition_pdf"]
    logger.info(f"[rag] Partitioning: {file_path}")
    return partition_pdf(
        filename=file_path,
        strategy="hi_res",
        infer_table_structure=True,
        extract_image_block_types=["Image"],
        extract_image_block_to_payload=True,
    )


def _chunk_elements(elements: list, deps: dict) -> list:
    chunk_by_title = deps["chunk_by_title"]
    return chunk_by_title(
        elements,
        max_characters=2500,
        new_after_n_chars=2000,
        combine_text_under_n_chars=500,
    )


def _separate_content_types(chunk: Any) -> dict:
    """Extract text, tables, and images from a chunk."""
    content_data: dict = {"text": chunk.text, "tables": [], "images": [], "types": ["text"]}
    if not (hasattr(chunk, "metadata") and hasattr(chunk.metadata, "orig_elements")):
        return content_data

    for element in chunk.metadata.orig_elements:
        element_type = type(element).__name__
        if element_type == "Table":
            content_data["types"].append("table")
            table_html = getattr(element.metadata, "text_as_html", element.text)
            content_data["tables"].append(table_html)
        elif element_type == "Image":
            if hasattr(element, "metadata") and hasattr(element.metadata, "image_base64"):
                content_data["types"].append("image")
                content_data["images"].append(element.metadata.image_base64)

    content_data["types"] = list(set(content_data["types"]))
    return content_data


def _create_ai_summary(text: str, tables: list[str], images: list[str], deps: dict) -> str:
    """Create AI-enhanced summary for mixed-content chunks (text + tables + images)."""
    ChatOpenAI = deps["ChatOpenAI"]
    HumanMessage = deps["HumanMessage"]

    llm = ChatOpenAI(model=_LLM_MODEL, temperature=0)

    prompt_text = (
        "You are creating a searchable description for document content retrieval.\n\n"
        "CONTENT TO ANALYZE:\n"
        f"TEXT CONTENT:\n{text}\n\n"
    )
    if tables:
        prompt_text += "TABLES:\n"
        for i, table in enumerate(tables):
            prompt_text += f"Table {i + 1}:\n{table}\n\n"

    prompt_text += (
        "\nYOUR TASK:\n"
        "Generate a comprehensive, searchable description covering:\n"
        "1. Key facts, numbers, and data points from text and tables\n"
        "2. Main topics and concepts discussed\n"
        "3. Questions this content could answer\n"
        "4. Visual content analysis (charts, diagrams, image content)\n"
        "5. Alternative search terms users might use\n\n"
        "SEARCHABLE DESCRIPTION:"
    )

    message_content: list[dict] = [{"type": "text", "text": prompt_text}]
    for img_b64 in images:
        message_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
        })

    response = llm.invoke([HumanMessage(content=message_content)])
    return response.content


def _summarise_chunks(chunks: list, metadata: dict, deps: dict) -> list:
    """Convert raw chunks into LangChain Documents with AI-enhanced content."""
    Document = deps["Document"]
    documents = []

    for i, chunk in enumerate(chunks):
        content_data = _separate_content_types(chunk)
        has_rich_content = bool(content_data["tables"] or content_data["images"])

        if has_rich_content:
            try:
                enhanced_content = _create_ai_summary(
                    content_data["text"],
                    content_data["tables"],
                    content_data["images"],
                    deps,
                )
            except Exception as exc:
                logger.warning(f"[rag] AI summary failed for chunk {i}: {exc} — using raw text")
                enhanced_content = content_data["text"]
        else:
            enhanced_content = content_data["text"]

        doc = Document(
            page_content=enhanced_content,
            metadata={
                **metadata,
                "chunk_index": i,
                "original_content": json.dumps({
                    "raw_text": content_data["text"],
                    "tables_html": content_data["tables"],
                    "images_base64": content_data["images"],
                }),
            },
        )
        documents.append(doc)

    return documents


def _store_documents(documents: list, deps: dict) -> Any:
    """Create/update ChromaDB vector store from LangChain documents."""
    OpenAIEmbeddings = deps["OpenAIEmbeddings"]
    Chroma = deps["Chroma"]

    embedding_model = OpenAIEmbeddings(model=_EMBED_MODEL)
    vectorstore = Chroma.from_documents(
        documents=documents,
        embedding=embedding_model,
        persist_directory=_PERSIST_DIR,
        collection_metadata={"hnsw:space": "cosine"},
    )
    logger.info(f"[rag] Stored {len(documents)} documents in vectorstore")
    return vectorstore


# ── Internal: retrieval helpers ───────────────────────────────────────────────

def _retrieve_semantic(query: str, top_k: int, vectorstore: Any) -> list:
    retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})
    return retriever.invoke(query)


def _retrieve_mmr(query: str, top_k: int, vectorstore: Any) -> list:
    """MMR (Maximum Marginal Relevance) — reduces redundancy in results."""
    return vectorstore.max_marginal_relevance_search(query, k=top_k, fetch_k=top_k * 2)


def _retrieve_hybrid(query: str, top_k: int, vectorstore: Any) -> list:
    """
    Kept for API compatibility. Uses semantic retrieval only.
    Advanced hybrid logic from external/rag_system/9-13 is intentionally skipped.
    """
    logger.info("[rag] hybrid strategy requested; using semantic retrieval (8_multi_modal_rag-aligned)")
    return _retrieve_semantic(query, top_k, vectorstore)


def _retrieve_multi_query(query: str, top_k: int, vectorstore: Any, deps: dict) -> list:
    """Kept for API compatibility. Uses semantic retrieval only."""
    _ = deps
    logger.info("[rag] multi_query strategy requested; using semantic retrieval (8_multi_modal_rag-aligned)")
    return _retrieve_semantic(query, top_k, vectorstore)


def _retrieve_rrf(query: str, top_k: int, vectorstore: Any) -> list:
    """Kept for API compatibility. Uses semantic retrieval only."""
    logger.info("[rag] rrf strategy requested; using semantic retrieval (8_multi_modal_rag-aligned)")
    return _retrieve_semantic(query, top_k, vectorstore)


def _normalize_docs(docs: list) -> list[dict]:
    """Convert LangChain Document objects → plain dicts. No LangChain outside this file."""
    results = []
    for doc in docs:
        raw_meta = doc.metadata.get("original_content", "{}")
        try:
            original = json.loads(raw_meta)
        except (json.JSONDecodeError, TypeError):
            original = {}

        results.append({
            "content":       doc.page_content,
            "score":         doc.metadata.get("score", None),
            "metadata": {
                "source":       doc.metadata.get("source", "unknown"),
                "chunk_index":  doc.metadata.get("chunk_index", None),
                "has_tables":   bool(original.get("tables_html")),
                "has_images":   bool(original.get("images_base64")),
            },
        })
    return results


# ── Internal: answer generation ───────────────────────────────────────────────

def _build_context_text(docs: list) -> tuple[str, list[str]]:
    """
    Build a formatted context string and source list from retrieved docs.
    Returns (context_str, sources_list).
    """
    parts   = []
    sources = []

    for i, doc in enumerate(docs):
        raw_meta = doc.metadata.get("original_content", "{}")
        try:
            original = json.loads(raw_meta)
        except (json.JSONDecodeError, TypeError):
            original = {}

        section = f"--- Document {i + 1} ---\n"

        raw_text = original.get("raw_text", "") or doc.page_content
        if raw_text:
            section += f"TEXT:\n{raw_text}\n\n"

        for j, table in enumerate(original.get("tables_html", [])):
            section += f"TABLE {j + 1}:\n{table}\n\n"

        parts.append(section)
        source = doc.metadata.get("source", f"chunk_{i}")
        sources.append(source)

    return "\n".join(parts), list(dict.fromkeys(sources))  # deduplicate sources


def _generate_answer(query: str, docs: list, history: list | None, deps: dict) -> str:
    """Send context + query (+ optional history) to the LLM and return the answer."""
    ChatOpenAI = deps["ChatOpenAI"]
    HumanMessage = deps["HumanMessage"]

    llm = ChatOpenAI(model=_LLM_MODEL, temperature=0)
    context_text, _ = _build_context_text(docs)

    prompt_text = (
        f"Based on the following documents, please answer this question: {query}\n\n"
        f"CONTENT TO ANALYZE:\n{context_text}\n\n"
        "Please provide a clear, comprehensive answer using the text, tables, and images above.\n\n"
        "ANSWER:"
    )

    # Build multimodal message
    message_content: list[dict] = [{"type": "text", "text": prompt_text}]
    for doc in docs:
        raw_meta = doc.metadata.get("original_content", "{}")
        try:
            original = json.loads(raw_meta)
        except (json.JSONDecodeError, TypeError):
            original = {}
        for img_b64 in original.get("images_base64", []):
            message_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
            })

    # Build conversation history if provided
    from langchain_core.messages import HumanMessage as HM, AIMessage
    messages = []
    if history:
        for turn in history:
            if turn.get("role") == "user":
                messages.append(HM(content=turn["content"]))
            elif turn.get("role") == "assistant":
                messages.append(AIMessage(content=turn["content"]))

    messages.append(HumanMessage(content=message_content))
    response = llm.invoke(messages)
    return response.content


# ── Public API ────────────────────────────────────────────────────────────────

def ingest(file_path: str, metadata: dict | None = None) -> dict:
    """
    Ingest a document into the vector store.

    Args:
        file_path: Absolute or relative path to a PDF file.
        metadata:  Optional key-value metadata to attach to all chunks
                   (e.g. {"source": "report_q3.pdf", "year": 2024}).

    Returns:
        {
            "status":      "ok" | "error",
            "file_path":   str,
            "chunk_count": int,
            "error":       str | None,
        }
    """
    metadata = metadata or {}
    metadata.setdefault("source", file_path)
    t0 = time.perf_counter()

    try:
        deps      = _get_deps()
        elements  = _partition_document(file_path, deps)
        chunks    = _chunk_elements(elements, deps)
        documents = _summarise_chunks(chunks, metadata, deps)
        _store_documents(documents, deps)
        _invalidate_vectorstore()  # force reload on next retrieve/ask

        latency_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            f"[rag] ingest done: {len(documents)} chunks, "
            f"{latency_ms:.0f}ms, file={file_path}"
        )
        return {
            "status":      "ok",
            "file_path":   file_path,
            "chunk_count": len(documents),
            "error":       None,
        }

    except Exception as exc:
        logger.error(f"[rag] ingest failed: {exc}")
        return {
            "status":      "error",
            "file_path":   file_path,
            "chunk_count": 0,
            "error":       str(exc),
        }


def retrieve(
    query:    str,
    top_k:    int = 5,
    strategy: str = "semantic",
) -> list[dict]:
    """
    Retrieve relevant document chunks for a query.

    Args:
        query:    The search query.
        top_k:    Number of results to return.
        strategy: One of "semantic", "hybrid", "multi_query", "rrf".

    Returns:
        List of dicts: [{content, score, metadata}, ...]
        On error: [{"error": str}]
    """
    try:
        deps        = _get_deps()
        vectorstore = _get_vectorstore(deps)

        strategy_map = {
            "semantic":    lambda: _retrieve_semantic(query, top_k, vectorstore),
            "hybrid":      lambda: _retrieve_hybrid(query, top_k, vectorstore),
            "multi_query": lambda: _retrieve_multi_query(query, top_k, vectorstore, deps),
            "rrf":         lambda: _retrieve_rrf(query, top_k, vectorstore),
        }

        if strategy not in strategy_map:
            raise ValueError(
                f"Unknown strategy '{strategy}'. "
                f"Choose from: {list(strategy_map.keys())}"
            )

        docs = strategy_map[strategy]()
        normalized = _normalize_docs(docs)

        logger.info(
            f"[rag] retrieve: strategy={strategy} top_k={top_k} "
            f"returned={len(normalized)} results"
        )
        return normalized

    except Exception as exc:
        logger.error(f"[rag] retrieve failed: {exc}")
        return [{"error": str(exc)}]


def ask(
    query:   str,
    history: list[dict] | None = None,
) -> dict:
    """
    Full RAG pipeline: retrieve → build context → generate answer.

    Args:
        query:   The user's question.
        history: Optional conversation history for context-aware answers.
                 Format: [{"role": "user"|"assistant", "content": str}, ...]

    Returns:
        {
            "answer":     str,
            "sources":    list[str],
            "latency_ms": float,
            "error":      str | None,
        }
    """
    t0 = time.perf_counter()

    try:
        deps        = _get_deps()
        vectorstore = _get_vectorstore(deps)

        docs   = _retrieve_semantic(query, top_k=5, vectorstore=vectorstore)
        _, sources = _build_context_text(docs)
        answer = _generate_answer(query, docs, history, deps)

        latency_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            f"[rag] ask done: latency={latency_ms:.0f}ms "
            f"sources={sources}"
        )
        return {
            "answer":     answer,
            "sources":    sources,
            "latency_ms": latency_ms,
            "error":      None,
        }

    except Exception as exc:
        latency_ms = (time.perf_counter() - t0) * 1000
        logger.error(f"[rag] ask failed: {exc}")
        return {
            "answer":     "",
            "sources":    [],
            "latency_ms": latency_ms,
            "error":      str(exc),
        }
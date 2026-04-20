"""
main.py

System entry point and smoke test.

Runs a full end-to-end check:
  1. Config load
  2. Document ingestion via rag_interface.ingest()
    3. Semantic retrieval via rag_interface.retrieve()
    4. Ask a question via rag_interface.ask()
    5. Print structured answer + sources + logs
"""

import json
from core.config import config
from observability.logger import get_logger
from rag.rag_interface import ingest, ask, retrieve

logger = get_logger(__name__)

PDF_PATH = "docs/attention-is-all-you-need.pdf"
RETRIEVAL_STRATEGY = "semantic"  # semantic | hybrid | multi_query | rrf

def _section(title: str) -> None:
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


def run_smoke_test() -> None:

    # ── Step 1: Config ────────────────────────────────────────────────────────
    _section("STEP 1 — Config")
    logger.info("AI Backend starting up", extra={
        "model":       config.MODEL_NAME,
        "temperature": config.TEMPERATURE,
        "max_tokens":  config.MAX_TOKENS,
        "log_level":   config.LOG_LEVEL,
    })
    print(f"  model      : {config.MODEL_NAME}")
    print(f"  temperature: {config.TEMPERATURE}")
    print(f"  max_tokens : {config.MAX_TOKENS}")
    print(f"  log_level  : {config.LOG_LEVEL}")
    print("  ✓ Config loaded successfully")

    # ── Step 2: Ingestion ─────────────────────────────────────────────────────
    _section("STEP 2 — Document Ingestion")
    print(f"  Ingesting: {PDF_PATH}")

    ingest_result = ingest(
        file_path=PDF_PATH,
        metadata={"source": PDF_PATH, "type": "smoke_test"},
    )

    print(f"\n  Ingestion result:")
    print(json.dumps(ingest_result, indent=4))

    if ingest_result.get("error"):
        print(f"\n  ✗ Ingestion failed: {ingest_result['error']}")
        print("  Skipping retrieval and QA steps (no data in vectorstore).")
        _section("STEP 3–4 — Skipped (no vectorstore data)")
    else:
        print(f"\n  ✓ Ingested {ingest_result['chunk_count']} chunks")

        # ── Step 3: Retrieval ─────────────────────────────────────────────────
        _section("STEP 3 — Retrieval (semantic)")
        query = "What are the two main components of the Transformer architecture? Explain briefly."
        print(f"  Query: {query!r}")
        print(f"  Strategy: {RETRIEVAL_STRATEGY}")

        chunks = retrieve(query, top_k=3, strategy=RETRIEVAL_STRATEGY)
        print(f"\n  Retrieved {len(chunks)} chunk(s):")
        for i, chunk in enumerate(chunks[:2]):  # Print first 2 for brevity
            if "error" in chunk:
                print(f"  Chunk {i + 1}: ERROR — {chunk['error']}")
            else:
                preview = chunk["content"][:120].replace("\n", " ")
                print(f"  Chunk {i + 1}: {preview}...")
                print(f"           source={chunk['metadata'].get('source', 'unknown')}")

        # ── Step 4: Full RAG answer ───────────────────────────────────────────
        _section("STEP 4 — Full RAG Answer")
        print(f"  Question: {query!r}")

        result = ask(query)

        print(f"\n  Answer:")
        print(f"  {result['answer'][:500]}")
        if len(result["answer"]) > 500:
            print("  [truncated for smoke test]")

        print(f"\n  Sources: {result['sources']}")
        print(f"  Latency: {result['latency_ms']:.0f}ms")

        if result.get("error"):
            print(f"\n  ✗ Ask failed: {result['error']}")
        else:
            print("\n  ✓ RAG pipeline complete")

    # ── Step 5: Log confirmation ──────────────────────────────────────────────
    _section("STEP 5 — Structured Log Confirmation")
    logger.info("Smoke test complete", extra={"status": "done"})
    print()


if __name__ == "__main__":
    run_smoke_test()
"""
Comparison script: LCEL pipeline vs manual pipeline.

Run with: python3 -m pipelines.pipeline_comparison

Verifies:
1. Both pipelines return non-empty answers
2. Logs differences for documentation
"""

import asyncio
import sys

from pipelines.lcel_qa_pipeline import run_lcel_qa
from rag.rag_interface import retrieve as rag_retrieve

TEST_QUESTIONS = [
    "What is the main topic of the ingested documents?",
    "Summarize the key points.",
    "What conclusions does the document reach?",
]


async def compare_pipelines() -> bool:
    """Run all test questions through both pipelines. Returns True if all pass."""
    from rag.rag_interface import ask as rag_ask

    results = []

    for question in TEST_QUESTIONS:
        print(f"\nQuestion: {question}")
        print("-" * 50)

        # Manual pipeline
        manual_result = await rag_ask(question, trace_id="comparison-manual")
        manual_answer = manual_result.get("answer", "")

        # LCEL pipeline — share the same retriever function
        async def retriever_fn(q: str) -> list[dict]:
            return await rag_retrieve(q, top_k=3)

        lcel_result = await run_lcel_qa(
            question=question,
            retriever_fn=retriever_fn,
            trace_id="comparison-lcel",
        )
        lcel_answer = lcel_result.get("answer", "")

        print(f"Manual answer (first 100 chars): {manual_answer[:100]}")
        print(f"LCEL answer   (first 100 chars): {lcel_answer[:100]}")

        manual_ok = len(manual_answer) > 10
        lcel_ok = len(lcel_answer) > 10
        print(f"Manual non-empty: {manual_ok} | LCEL non-empty: {lcel_ok}")

        results.append(
            {
                "question": question,
                "manual_answer_length": len(manual_answer),
                "lcel_answer_length": len(lcel_answer),
                "both_non_empty": manual_ok and lcel_ok,
            }
        )

    print("\n" + "=" * 50)
    print("COMPARISON SUMMARY")
    print("=" * 50)
    all_passed = all(r["both_non_empty"] for r in results)
    print(f"All questions answered by both pipelines: {all_passed}")
    for r in results:
        status = "OK" if r["both_non_empty"] else "FAIL"
        print(f"[{status}] {r['question'][:60]}")

    return all_passed


if __name__ == "__main__":
    passed = asyncio.run(compare_pipelines())
    sys.exit(0 if passed else 1)

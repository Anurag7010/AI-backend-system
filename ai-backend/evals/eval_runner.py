"""
evals/eval_runner.py

Evaluation harness for the RAG pipeline.
Runs test cases against rag_interface.ask() and scores results.

Public functions:
    evaluate(test_case)          → dict (single result)
    run_all(test_cases)          → dict (summary + all results)
"""
import asyncio
from dataclasses import dataclass, field

from observability.logger import get_logger

logger = get_logger(__name__)


@dataclass
class TestCase:
    """Single evaluation case for the RAG pipeline."""
    query:            str
    expected_keywords: list[str] = field(default_factory=list)
    expected_sources:  list[str] = field(default_factory=list)


async def evaluate(test_case: TestCase) -> dict:
    """
    Run a single TestCase through the RAG pipeline and score it.

    Returns:
        {query, answer, keyword_score, source_match, has_answer, passed, error,
         retrieval_quality, guardrail_rejected, no_results, prompt_version}
    """
    from rag.rag_interface import ask

    result = await ask(test_case.query)
    answer = result.get("answer", "")
    error  = result.get("error")
    sources = result.get("sources", [])

    retrieval_quality  = result.get("retrieval_quality", {})
    guardrail_rejected = result.get("guardrail_rejected", False)
    no_results         = result.get("no_results", False)
    prompt_version     = result.get("prompt_version", "unknown")

    has_answer = bool(answer and not error)

    # Keyword score: fraction of expected keywords found in answer (case-insensitive)
    if test_case.expected_keywords:
        answer_lower = answer.lower()
        matched = sum(
            1 for kw in test_case.expected_keywords
            if kw.lower() in answer_lower
        )
        keyword_score = matched / len(test_case.expected_keywords)
    else:
        keyword_score = 1.0  # no keywords specified → full score by default

    # Source match: at least one expected source appears in returned sources
    if test_case.expected_sources:
        source_match = any(
            expected in " ".join(sources)
            for expected in test_case.expected_sources
        )
    else:
        source_match = True  # no sources specified → pass by default

    passed = keyword_score >= 0.5 and has_answer

    logger.info(
        f"[eval] query={test_case.query[:60]!r} "
        f"keyword_score={keyword_score:.2f} passed={passed}"
    )
    return {
        "query":              test_case.query,
        "answer":             answer[:300] if answer else "",
        "keyword_score":      round(keyword_score, 3),
        "source_match":       source_match,
        "has_answer":         has_answer,
        "passed":             passed,
        "error":              error,
        "retrieval_quality":  retrieval_quality,
        "guardrail_rejected": guardrail_rejected,
        "no_results":         no_results,
        "prompt_version":     prompt_version,
    }


async def run_all(test_cases: list[TestCase]) -> dict:
    """
    Run all test cases and print a summary table to stdout.

    Returns:
        {results, total, passed, pass_rate, avg_retrieval_quality,
         guardrail_rejection_rate, no_result_rate, prompt_versions}
    """
    results = []
    for tc in test_cases:
        results.append(await evaluate(tc))
        await asyncio.sleep(5)
    total   = len(results)
    passed  = sum(1 for r in results if r["passed"])

    avg_retrieval_quality = round(
        sum(r.get("retrieval_quality", {}).get("max_score", 0.0) for r in results) / total, 3
    ) if total else 0.0
    guardrail_rejection_rate = round(
        sum(1 for r in results if r.get("guardrail_rejected")) / total, 3
    ) if total else 0.0
    no_result_rate = round(
        sum(1 for r in results if r.get("no_results")) / total, 3
    ) if total else 0.0
    prompt_versions = list({r.get("prompt_version", "unknown") for r in results})

    # ── Summary table ─────────────────────────────────────────────────────────
    print("\n" + "=" * 72)
    pct = f"{100*passed/total:.0f}%" if total else "N/A"
    print(f"  EVAL SUMMARY — {passed}/{total} passed  ({pct})")
    print("=" * 72)
    print(f"  {'#':<3}  {'PASS':<5}  {'KW':>5}  {'SRC':<5}  QUERY")
    print("-" * 72)
    for i, r in enumerate(results, 1):
        status   = "✓" if r["passed"] else "✗"
        src_flag = "✓" if r["source_match"] else "✗"
        query_preview = r["query"][:45]
        print(f"  {i:<3}  {status:<5}  {r['keyword_score']:>5.2f}  {src_flag:<5}  {query_preview}")
    print("-" * 72)
    print(f"  Avg retrieval quality : {avg_retrieval_quality:.3f}")
    print(f"  Guardrail rejection   : {guardrail_rejection_rate:.3f}")
    print(f"  No-result rate        : {no_result_rate:.3f}")
    print(f"  Prompt versions       : {', '.join(prompt_versions)}")
    print("=" * 72 + "\n")

    return {
        "results":                  results,
        "total":                    total,
        "passed":                   passed,
        "pass_rate":                round(passed / total, 3) if total else 0.0,
        "avg_retrieval_quality":    avg_retrieval_quality,
        "guardrail_rejection_rate": guardrail_rejection_rate,
        "no_result_rate":           no_result_rate,
        "prompt_versions":          prompt_versions,
    }
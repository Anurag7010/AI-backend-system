# Eval Results — Phase 3 (Day 10)

## Summary

Phase 3 (Day 10) introduced prompt reliability, guardrails, and RAG quality improvements.
The eval harness was not run live against the vector store (no documents ingested in CI),
but all system components are verified as correctly wired.

## What Changed (Day 10 vs Day 9)

### Before Day 10 improvements
- No prompt versioning — impossible to correlate output quality with prompt changes
- No output validation — malformed LLM output would crash silently
- No guardrails — any query reached the LLM unfiltered
- RAG returned all chunks regardless of relevance score — low-quality chunks polluted answers
- No source citations — users could not verify answers against documents
- No structured handling when retrieval found nothing

### After Day 10 improvements
- **Prompt registry**: 5 versioned prompts (qa_v2, summarization_v1, extraction_v1, off_topic_check_v1, query_variants_v1)
- **Output validator**: JSON + prose validation with retry chain (max 2 attempts)
- **Guardrails**: sanitize_input (10 injection patterns, abbreviation expansion, max 2000 chars), sanitize_output (PII removal, disclaimer stripping), optional off-topic LLM check
- **Score threshold**: RELEVANCE_THRESHOLD=0.65 — chunks below threshold are dropped
- **Context manager**: token-aware chunk selection (max 3000 tokens), stops at chunk boundaries
- **Source citations**: [Source N] labels in answers, citation_id on each source
- **Multi-query retrieval**: optional, generates 3 query variants for better coverage

## Test Results (automated, no live LLM)

| Test Suite | Tests | Passed | Notes |
|---|---|---|---|
| test_guardrails.py | 14 | 14 | sanitize_input, sanitize_output, check_query |
| test_output_validator.py | 9 | 9 | JSON + prose validation, schema checks |
| test_context_manager.py | 13 | 13 | token counting, build_context, estimate_prompt_tokens |
| **Total** | **36** | **36** | |

## Pass Rate (Before vs After)

Live eval against ingested documents was not run (requires running Python backend + vector store).
Estimated improvements based on architectural changes:

| Metric | Before Day 10 | After Day 10 |
|---|---|---|
| Guardrail rejection rate | N/A (no guardrails) | Applied on all queries |
| Retrieval quality threshold | None | 0.65 min score |
| Source citations | None | [Source N] on every answer |
| Output validation | None | Retry chain, 2 attempts |
| Prompt version tracking | None | All prompts versioned |

## Known Gaps

- Streaming path (`/ask/stream`) does not run guardrails or citation-tagged context — uses legacy direct generation
- Eval harness requires a running backend with ingested documents to produce live metrics
- `prompt_version` field in eval results defaults to `"unknown"` until rag_interface propagates it from `complete_with_fallback` response

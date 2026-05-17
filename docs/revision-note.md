# Revision Note — Complete System Summary (Phase 1 + Phase 2)
# Days 1–16 | Tag: v0.2-phase2-complete

This is a permanent reference document. It covers every layer of the system built in Days 1–16 — what each piece is, what problem it solves, why it sits where it sits, what breaks if it is removed, and how it connects to neighbouring layers.

---

## System Overview

The system is a full-stack AI product with three interconnected layers:

```
Browser (Next.js React)
    ↓ hooks → services → fetch
Next.js App Router (API routes, server components, middleware)
    ↓ repositories → Drizzle ORM
PostgreSQL Database

Next.js API routes
    ↓ HTTP (JSON / multipart)
Python AI Backend (FastAPI / plain HTTP)
    ↓ LangChain → OpenAI API
    ↓ ChromaDB (vectorstore on disk)
```

Phase 1 built the Python AI backend (Days 1–8).
Phase 2 built the Next.js web app (Days 9–16).
Phase 3 (Days 17+) wires them together over HTTP.

---

## PHASE 1 — AI Backend (Python)

### `core/config.py` — Environment Configuration

**What it is:** A frozen dataclass (`Config`) that loads all environment variables at import time. A module-level `config` singleton is exported; every other module imports that singleton.

**Problem it solves:** Scattered `os.getenv()` calls throughout the codebase produce silent misconfigurations — a missing key silently returns `None` and surfaces as a confusing runtime error deep in a pipeline. Centralised config catches every missing key at startup with a clear message pointing to `.env.example`.

**Why here:** `core/` is the foundation layer. Everything depends on config; config depends on nothing (except `python-dotenv`). Putting it anywhere else would create circular imports.

**What breaks if removed:** Every module that reads `config.MODEL_NAME`, `config.OPENAI_API_KEY`, etc., would need its own `os.getenv()` call. Missing keys would surface as `AttributeError` or `None`-comparison bugs at runtime, not startup.

**Adjacent connections:** `llm_client.py` reads `config.MODEL_NAME`, `config.TEMPERATURE`, `config.MAX_TOKENS`. `rag_interface.py` reads `config.DEFAULT_TOP_K`, `config.DEFAULT_CHUNK_SIZE`, `config.DEFAULT_RETRIEVAL_STRATEGY`. `logger.py` reads `config.LOG_LEVEL`.

---

### `core/retry.py` — Retry Decorator (Python)

**What it is:** A `@with_retry(max_attempts, base_delay, backoff_factor, retryable_exceptions)` decorator that wraps a function with exponential backoff. Non-retryable HTTP status codes (401, 400) are detected via `exc.status_code` and propagated immediately — no pointless waiting.

**Problem it solves:** The OpenAI API returns transient errors (429 rate limits, 500/502/503 server errors, timeout disconnects). Without retries, a single network blip fails the whole user request. With retries, transient failures are invisible.

**Why here:** `core/` because it is used exclusively by `llm_client.py` to wrap the raw OpenAI call. It is not general infrastructure; it is specific to the LLM call path.

**What breaks if removed:** `_call_openai()` in `llm_client.py` becomes a single-shot call. Any transient OpenAI API error propagates as a `RuntimeError` to the caller.

**Adjacent connections:** Only used by `llm_client.py`. The Python retry logic is separate from the TypeScript `lib/async.ts` retry — they are parallel implementations for their respective environments.

---

### `core/llm_client.py` — LLM Gateway

**What it is:** The single point of entry for all OpenAI calls. Exposes three public functions:
- `complete(prompt, ...)` → normalised dict `{text, tokens_used, model, latency_ms, error}`
- `call_llm(prompt, ...)` → plain string, raises `RuntimeError` on failure
- `call_llm_structured(prompt, schema, ...)` → validated Pydantic model instance

Internally, `_call_openai()` is decorated with `@with_retry` and calls `client.chat.completions.create()`. Every call logs structured telemetry via `log_llm_call()`.

**Problem it solves:** Without a gateway, every pipeline file would call OpenAI directly — retries, token counting, cost estimation, and logging would be duplicated or omitted. A change to the retry policy or the model name would require touching every file.

**Why here:** `core/` because LLM access is the most fundamental capability. Everything else (RAG, evals, pipelines) is built on top of it.

**What breaks if removed:** `rag_interface.py` and `qa_pipeline.py` would need to call OpenAI directly and re-implement retries, error normalisation, and logging. Cost tracking would disappear entirely.

**Adjacent connections:** Calls `core/config.py` for model settings. Calls `core/retry.py` via decorator. Calls `observability/logger.py` → `log_llm_call()` after every completion. Called by `rag_interface.py` (via `ChatOpenAI`) and `pipelines/qa_pipeline.py`.

---

### `core/prompt_engine.py` — Prompt Registry

**What it is:** A named template registry. Templates are defined in `prompts/templates/` (`.py` files with a `TEMPLATE` string). `render(name, **kwargs)` validates that required variables are present, fills in the template, and returns the rendered string. Available templates: `"qa"`, `"rag"`, `"summarization"`, `"extraction"`.

**Problem it solves:** Hardcoding prompt strings directly in pipeline code makes A/B testing, localisation, and prompt versioning impossible. Callers also cannot know which variables a prompt needs without reading its source. The registry enforces the contract — a missing variable raises `ValueError` at call time, not silently producing a broken prompt.

**Why here:** `core/` because prompt construction is a primitive used by every pipeline, not a domain concern.

**What breaks if removed:** Pipeline files would need hardcoded prompt strings. A typo in a template variable would produce a silently malformed prompt that calls the LLM with missing context, degrading answer quality without throwing an error.

**Adjacent connections:** Called by `pipelines/qa_pipeline.py`. `rag_interface.py` constructs prompts inline (because it uses LangChain message objects, not raw strings) — it is the one exception to the "use prompt_engine" rule.

---

### `observability/logger.py` — Structured Logger

**What it is:** A `_JSONFormatter` that serialises every `logging.LogRecord` to a single JSON line. `get_logger(name)` returns a named logger wired to this formatter. Three structured helper functions emit domain-specific telemetry fields: `log_llm_call()`, `log_retrieval()`, `log_pipeline_event()`.

**Problem it solves:** `print()` statements produce unstructured text. Log aggregators (Datadog, CloudWatch, ELK) cannot parse free-form text reliably. JSON-per-line output is machine-readable: every field is queryable, filterable, and alertable without regex parsing.

**Why here:** `observability/` is a cross-cutting concern shared by all layers. It sits outside `core/` because it is infrastructure, not business logic, and `core/` modules themselves import it.

**What breaks if removed:** All structured telemetry disappears. LLM cost, latency, and token counts are not captured. Tracing across a pipeline becomes impossible. The eval runner's pass/fail logs are also emitted through this module.

**Adjacent connections:** Imported by `llm_client.py`, `rag_interface.py`, `eval_runner.py`, `core/retry.py`, `observability/tracer.py`. Everything that produces output goes through this module — there is no `print()` in production paths.

---

### `observability/tracer.py` — Timing Context Manager

**What it is:** A `Tracer` class used as a `with` block. On `__enter__` it logs `{event}_start`. On `__exit__` it records wall-clock latency, sets `status = "error"` if an exception occurred, and logs `{event}_end` with `{latency_ms, status, error}`. A `@tracer()` decorator form wraps functions. `new_trace_id()` generates a UUID4 trace ID string.

**Problem it solves:** Manually timing code blocks with `t0 = time.perf_counter()` / `latency = (time.perf_counter() - t0) * 1000` is error-prone: it can be skipped in error paths, the cleanup must be in `finally`, and the result must be manually logged. `Tracer` makes the correct pattern the easy pattern — timing and logging are automatic.

**Why here:** `observability/` alongside the logger. The two always appear together: `Tracer` calls `log_pipeline_event()` from the logger.

**What breaks if removed:** `rag_interface.ask()` uses `with Tracer("retrieval")` and `with Tracer("generation")` to extract per-phase latency stored in the response's `latency_breakdown`. Removing it means latency breakdown data disappears from every `ask()` response.

**Adjacent connections:** Used in `rag_interface.py`. Calls `log_pipeline_event()` from `observability/logger.py`. The `trace_id` it generates propagates through the entire pipeline and is returned in the `ask()` response so the frontend can log it.

---

### `rag/rag_interface.py` — RAG Adapter

**What it is:** The only file in the codebase that imports LangChain. It exposes three clean public functions with no LangChain types in their signatures:
- `ingest(file_path, metadata)` → `{status, chunk_count, error}`
- `retrieve(query, top_k, strategy)` → `list[{content, score, metadata}]`
- `ask(query, history, trace_id)` → `{answer, sources, latency_breakdown, trace_id, error}`

Internally it does: PDF partitioning (unstructured), title-based chunking, AI-enhanced summaries for image/table chunks, ChromaDB ingestion, and four retrieval strategies (semantic, hybrid/BM25+semantic, multi-query, Reciprocal Rank Fusion).

**Problem it solves:** LangChain is a large, opinionated framework with breaking API changes. If LangChain types (`Document`, `BaseRetriever`, `ChatOpenAI`) leaked into `llm_client.py`, `pipelines/`, or the FastAPI routes, swapping LangChain for another framework would require rewriting most of the codebase. The adapter pattern confines the dependency to one file.

**Why here:** `rag/` is its own subdomain. The interface is the only public surface; the internal retrieval strategy implementations are private helpers (`_retrieve_semantic`, `_retrieve_rrf`, etc.). The vectorstore singleton (`_vectorstore_cache`) lives here because only this file manages it.

**What breaks if removed:** There is no RAG capability — document ingestion, retrieval, and question answering all stop working. The entire product value proposition disappears.

**Adjacent connections:** Calls `core/config.py` for retrieval settings. Calls `observability/logger.py` for pipeline events. Uses `observability/tracer.py` for phase-level timing. Called by `evals/eval_runner.py` (via `ask()`). Will be called by Phase 3 FastAPI routes.

---

### `evals/eval_runner.py` — Evaluation Harness

**What it is:** A `TestCase` dataclass (query + expected keywords + expected sources) and two functions: `evaluate(test_case)` runs a single case through `rag_interface.ask()` and scores it; `run_all(test_cases)` runs the full suite and prints a formatted pass/fail table. Scoring: keyword match rate (fraction of expected keywords present in the answer) and source match (any expected source appears in returned sources). Pass threshold: keyword score ≥ 0.5 AND answer present.

**Problem it solves:** Without evals, any code change to `rag_interface.py` could degrade answer quality and no automated check would catch it. Evals provide a regression signal: if pass rate drops after a prompt change or retrieval strategy change, the change is bad.

**Why here:** `evals/` is a separate subdomain because evals are not production code — they are quality measurement tooling. They import from `rag/` but `rag/` does not import from `evals/`.

**What breaks if removed:** Quality regressions in the RAG pipeline become undetectable until a user notices a bad answer. There is no automated pass rate or keyword coverage metric.

**Adjacent connections:** Imports `rag.rag_interface.ask`. Uses `observability/logger.py` for result logging. `evals/test_cases.py` provides the concrete `TestCase` instances. `main.py` calls `run_all(TEST_CASES)` in smoke test mode.

---

## PHASE 2 — Web App (Next.js + TypeScript)

### `lib/async.ts` — Async Utility Library

**What it is:** A self-contained async primitives library. Six exports:
- `TimeoutError`, `CancellationError`, `RetryExhaustedError` — typed error classes
- `sleep(ms)` — promisified `setTimeout`
- `withRetry(fn, options)` — exponential backoff with full jitter; never retries `CancellationError`
- `withTimeout(fn, ms)` — races `fn` against a `setTimeout`; clears timer in `finally`
- `withCancellation(fn, signal)` — races `fn` against `AbortSignal.abort`; checks if already aborted before starting
- `resilientCall(fn, options)` — combines retry + per-attempt timeout + external cancellation

`resilientCall` has a three-way `CancellationError` disambiguation in its catch block: if the external signal aborted → true cancellation (throw); if `attemptController.signal.aborted` is true → internal timeout fired (convert to `TimeoutError`, retry); if neither → `fn` threw `CancellationError` directly (throw as-is).

**Problem it solves:** Bare `fetch()` calls have no timeout, no retry, and no cancellation. A single network blip fails the user permanently. Without the error classes, callers cannot distinguish "caller cancelled" from "timed out" from "network failed" — all three require different UI responses.

**Why here:** `lib/` for pure utilities that have no framework dependency. This file has no React, no Next.js, no service imports — it is importable in any context.

**What breaks if removed:** `base-service.ts` has no resilience. Every AI backend call is a single-shot, no-timeout, uncancellable fetch. One slow response hangs the UI indefinitely.

**Adjacent connections:** `base-service.ts` calls `resilientCall()` for every HTTP request. `hooks/useAsyncState.ts` imports `CancellationError` to reset to idle instead of showing an error. `hooks/useAsk.ts` imports `CancellationError` to suppress stale responses from aborted requests.

---

### `services/base-service.ts` — HTTP Service Base Class

**What it is:** A `BaseService` class with a protected `request<T>(endpoint, options)` method. It wraps every call in `resilientCall()` (from `lib/async.ts`), merges default + per-request headers, handles `FormData` body detection, checks `response.ok` manually (because `fetch` does not throw on 4xx/5xx), parses JSON, and maps all errors to a typed `ServiceError` envelope via `normalizeError()`. In-flight deduplication: if `deduplicate: true` and the same `method:endpoint:body` key is already in flight, the existing `Promise` is returned — no duplicate network call.

`request()` never throws — it always returns `ServiceResponse<T>` with either `data` or `error` set. Network errors, HTTP errors, parse errors, cancellations, and timeouts all produce a `ServiceError` with a typed `code` field (`NETWORK_ERROR`, `TIMEOUT`, `CANCELLED`, `HTTP_ERROR`, `PARSE_ERROR`).

**Problem it solves:** Without a base class, every API call in the app would need its own retry logic, timeout, error normalisation, deduplication, and logging. A change to the retry policy or error shape would require touching every call site.

**Why here:** `services/` is the HTTP client layer. It sits between React hooks and the network. Hooks call services; services call `fetch` (via `resilientCall`). Nothing else calls `fetch` directly.

**What breaks if removed:** `AIService` loses all resilience, error normalisation, and deduplication. Hooks would need to handle raw `fetch` errors — which have inconsistent shapes depending on where they fail.

**Adjacent connections:** Extended by `ai-service.ts`. Uses `resilientCall`, `TimeoutError`, `CancellationError`, `RetryExhaustedError` from `lib/async.ts`. Calls `logError()` from `lib/error-logger.ts` for network and 5xx errors. Called by React hooks (`useAsk`, `useUpload`).

---

### `services/ai-service.ts` — AI Backend Client

**What it is:** Extends `BaseService` for the specific AI backend contract. Three methods:
- `ask({ query, history, signal })` → `ServiceResponse<AskResponse>` — POST `/ask`, 30s timeout, 2 attempts
- `ingest({ file, signal })` → `ServiceResponse<IngestResponse>` — POST `/ingest` as `FormData`, 60s timeout, 2 attempts
- `retrieve({ query, top_k, strategy })` → `ServiceResponse<RetrieveResponse>` — GET `/retrieve`, deduplicated

All responses are validated via runtime type guards (`isAskResponse`, `isIngestResponse`) before being returned. Unexpected shapes produce a `PARSE_ERROR` rather than silently passing through an invalid object to the UI. A singleton `aiService` is exported — one instance shared across the app.

**Problem it solves:** The AI backend is an external service that can return anything. Type-guard validation at the boundary prevents the TypeScript type system's `as AskResponse` cast from masking a real shape mismatch. Also sets appropriate per-endpoint timeouts — `ingest` takes much longer than `ask`, so they should not share a default.

**Why here:** `services/` alongside `base-service.ts`. One class per external service (AI backend, in future: auth service, analytics, etc.).

**What breaks if removed:** Hooks would call the AI backend directly with raw `fetch`. No retry, no timeout enforcement, no shape validation, no singleton deduplication.

**Adjacent connections:** Extends `BaseService`. Uses `isAskResponse`, `isIngestResponse` from `lib/type-guards.ts`. Consumed by `hooks/useAsk.ts` and `hooks/useUpload.ts`. Gets its `baseUrl` from `NEXT_PUBLIC_AI_BACKEND_URL` env var.

---

### `lib/async.ts` → `lib/error-logger.ts` — Error Logger

**What it is:** Two functions: `logError(error, context?)` and `logWarning(message, context?)`. In development they emit a structured `console.error`/`console.warn` with `{message, name, stack, ...context}`. In production they are stubs — the body is where Sentry/Datadog integration will go.

**Problem it solves:** Scattered `console.error()` calls throughout the codebase produce inconsistent output. They cannot be replaced with a real logging service in one place. By routing all error logging through this module, the production instrumentation switch requires changing one file.

**Why here:** `lib/` — a utility module. Not in `services/` (which is HTTP clients) or `hooks/` (which is React state).

**What breaks if removed:** Build errors in `withErrorHandler.ts`, `base-service.ts`, and `app/error.tsx` (they import it). Errors silently disappear from the server in production instead of being routed to a monitoring service.

**Adjacent connections:** Called by `lib/middleware/withErrorHandler.ts` for uncaught route errors, `services/base-service.ts` for 5xx/network errors, `app/error.tsx` (the React error boundary).

---

### `lib/config.ts` — Web App Startup Config Validator

**What it is:** Runs `validateServerConfig()` at module import time. Checks that `DATABASE_URL`, `JWT_SECRET`, `LOG_LEVEL`, and `NEXT_PUBLIC_AI_BACKEND_URL` are all present. On the server it throws with a clear message listing the missing keys. On the client (browser) it returns immediately — `NEXT_PUBLIC_` vars are the only ones available there anyway. Exports a `config` object typed with `satisfies Record<...>`.

**Problem it solves:** A missing `DATABASE_URL` produces a confusing `Cannot read properties of undefined` deep in the Drizzle ORM rather than a clear startup error. The earlier the error is caught, the faster the developer finds it.

**Why here:** `lib/` — pure utility, no React or Next.js framework dependency. Imported in `app/layout.tsx` so it runs at server startup.

**What breaks if removed:** Missing env vars are not caught until the first database query or JWT operation, producing cryptic errors at runtime rather than a clear startup diagnostic.

**Adjacent connections:** Imported by `app/layout.tsx`. Parallel to `ai-backend/core/config.py` — same principle, different environment.

---

### `lib/auth.ts` — Auth Module (Server-Only)

**What it is:** JWT verification utilities using `jose`. Contains `import 'server-only'` as first line. Currently partially stubbed; full implementation is Day 19.

**Problem it solves:** Auth logic must never run in the browser. The `import 'server-only'` import makes Next.js throw a build error if this module is ever imported by a Client Component or a browser bundle. The constraint is enforced at build time, not runtime.

**Why here:** `lib/` for shared server utilities. JWT verification is needed by both the `withAuth` middleware and potentially by server components.

**What breaks if removed:** The auth middleware has no JWT verification capability. `withAuth` would need to inline the verification logic, or JWT secrets could accidentally be bundled into the client.

**Adjacent connections:** Used by `lib/middleware/withAuth.ts`. Protected by `import 'server-only'`.

---

### `lib/middleware/` — HTTP Middleware Stack

**What it is:** A composable middleware system for Next.js API routes. Each middleware is a higher-order function: `Middleware = (handler) => handler`. The stack is composed left-to-right: `compose(withErrorHandler, withRateLimit, withAuth(...), withRequestId)(routeHandler)`.

Four middleware:
- `withRequestId` — attaches a UUID request ID to `context`; every response includes it for tracing
- `withErrorHandler` — wraps the handler in `try/catch`; maps `AppError`/`ValidationError` to correct HTTP status codes; catches unknown errors and returns 500 without exposing internals; calls `logError()` for unknown errors
- `withAuth(options)` — extracts Bearer token, verifies with `jose`, attaches `context.userId = toUserId(payload.sub)`, returns 401 on failure
- `withRateLimit` — tracks request counts per IP in memory; returns 429 after threshold

**Problem it solves:** Without a middleware stack, every route handler would need its own try/catch, auth check, rate limit check, and request ID generation. The middleware pattern lets each concern be written once and composed at the route level.

**Why here:** `lib/middleware/` — HTTP infrastructure. Routes use it, but it does not depend on routes.

**What breaks if removed:** Routes have no error handling (unhandled promise rejections), no auth protection, no request IDs, no rate limiting. Any thrown error produces an unformatted 500. Any route is accessible without authentication.

**Adjacent connections:** `withAuth.ts` uses `toUserId()` from `types/domain.ts` to brand the user ID. `withErrorHandler.ts` calls `logError()` from `lib/error-logger.ts`. All four are imported by API route files in `app/api/`.

---

### `db/connection.ts` — Database Connection (Server-Only)

**What it is:** Creates a single shared `postgres` connection pool (max 10 connections, 30s idle timeout) and a `drizzle` ORM instance wrapping it. First line is `import 'server-only'`. The `db` instance is the default export. The `pool` is a named export for tests that need to close it explicitly.

**Problem it solves:** Connection pools are expensive. Creating a new pool per request exhausts available PostgreSQL connections almost immediately. One pool per process is the correct pattern. The `server-only` guard prevents the `DATABASE_URL` connection string (which contains credentials) from being bundled into the browser.

**Why here:** `db/` — the database layer. Connection is the foundation; schema and repositories build on it.

**What breaks if removed:** No database access anywhere. All repositories crash on import. The `DATABASE_URL` guard also disappears, potentially allowing a browser bundle to contain DB credentials.

**Adjacent connections:** Imported by `db/repositories/documents.ts` and `db/repositories/queries.ts`. The `pool` export is used in `tests/setup/db.ts` to close the connection after tests.

---

### `db/schema.ts` — Drizzle Schema

**What it is:** Three PostgreSQL tables defined with Drizzle's type-safe builders: `users` (id, email, createdAt), `documents` (id, userId→cascade, filename, status enum, chunkCount, createdAt, updatedAt), `queries` (id, userId→cascade, documentId→set null, queryText, answerText, latencyMs, retrievalMetadata as jsonb, createdAt). Indices on `userId` and `status`/`documentId`. Relations defined for Drizzle's relational query API. Inferred types (`User`, `Document`, `Query`, `NewUser`, etc.) exported for use in repositories.

**Problem it solves:** Without Drizzle's inferred types, repositories would need manually maintained TypeScript interfaces that drift from the actual schema. `$inferSelect` and `$inferInsert` guarantee the types match what the database actually returns.

**Why here:** `db/` — schema is pure data model definition, the lowest layer of the database tier.

**What breaks if removed:** Repositories have no table references. No migrations can be generated. Drizzle cannot run any queries.

**Adjacent connections:** Imported by `db/connection.ts` (passed to `drizzle(pool, { schema })`) and by both repository files. The schema types (`Document`, `Query`) are used inside repositories but are converted to domain types (`DomainDocument`, `DomainQuery`) before crossing the repository boundary.

---

### `db/repositories/documents.ts` and `queries.ts` — Repository Layer (Server-Only)

**What they are:** Database access functions grouped by entity. Documents repository: `create`, `findById`, `findByUser`, `updateStatus`, `deleteDocument`. Queries repository: `create`, `findById`, `findByDocument`, `findByUser`. Both files have `import 'server-only'` as first line.

The critical design decision: each file has a private `toDomainDocument()` / `toDomainQuery()` mapper function. Raw Drizzle rows (plain `string` IDs) are converted to domain types (branded `DocumentId`, `UserId`, `QueryId`) at this boundary. Nothing outside the repository ever receives a raw Drizzle row — the domain type is the only public surface.

**Problem it solves:** If raw Drizzle types leaked into route handlers or components, branded ID types would not exist anywhere the application logic runs. Branded IDs (see below) require that every string that claims to be a `DocumentId` passed through `toDocumentId()` — the mapper is the only place this happens at the DB boundary.

**Why here:** `db/repositories/` — the repository pattern separates "how data is fetched" from "what the data means". Routes and services describe intent (`findById(id)`); repositories describe the SQL.

**What breaks if removed:** Routes would need to write SQL queries directly. The branded ID guarantee breaks — raw strings would flow unvalidated throughout the app. The `server-only` guard disappears, making it possible to accidentally import DB code into a Client Component.

**Adjacent connections:** Import `db/connection.ts` for the `db` instance. Import `db/schema.ts` for table references. Import `types/domain.ts` for `toDocumentId`, `toUserId`, `toQueryId`. Called by API route handlers in `app/api/`.

---

### `types/` — TypeScript Type System

**What it is:** Three files unified by a barrel `types/index.ts`:

`types/domain.ts` — Core entity types and branded ID types. Branded IDs: `UserId`, `DocumentId`, `QueryId` are `string & { readonly __brand: 'UserId' }` etc. Brand constructors `toUserId(s)`, `toDocumentId(s)`, `toQueryId(s)` cast a plain string to the branded type. `assertNever(x, msg)` for exhaustive switch checking.

`types/api.ts` — Request/response shapes for every API endpoint. `ApiResponse<T>` is a discriminated union: `{ success: true, data: T } | { success: false, error: ApiError }`. Runtime guards `isApiSuccess()` and `isApiError()`. `isAskResponse()` and `isIngestResponse()` are runtime shape validators used by `ai-service.ts`.

`types/state.ts` — UI async state types. `AsyncState<T>` is a discriminated union: `{ status: 'idle' } | { status: 'loading' } | { status: 'success', data: T } | { status: 'error', error: string }`. `UploadStateWithProgress` adds `'uploading'` (with `progress: number`) and `'processing'` intermediate states. Helper functions: `isIdle`, `isLoading`, `isSuccess`, `isError`, `mapAsyncState`.

**Problem it solves:** Without branded IDs, a `documentId` argument and a `userId` argument are both `string` — TypeScript cannot catch `findById(userId)` where `documentId` was expected. Branded types make the compiler enforce correct usage at every call site.

Without discriminated union state, UI components use `if (loading && !error)` boolean combinations that allow impossible states (`loading: true, error: true` simultaneously). Discriminated unions make impossible states unrepresentable.

**Why here:** `types/` — the type system is shared across the entire web-app layer: hooks, services, components, API routes. Every other module imports from here; this module imports nothing from the app.

**What breaks if removed:** The entire TypeScript type system collapses. Services return `unknown`. Hooks lose their state machine guarantees. Branded ID boundary enforcement disappears. Type guards in `ai-service.ts` stop compiling.

**Adjacent connections:** Imported by every layer — services, hooks, repositories, route handlers, components. This is the single source of truth for all shared types.

---

### `hooks/useAsyncState.ts` — Async State Machine Hook

**What it is:** A `useReducer`-based hook that manages `AsyncState<T>`. Four actions: `LOADING`, `SUCCESS`, `ERROR`, `RESET`. Returns `{ state, execute, reset }`. `execute(fn)` dispatches `LOADING`, awaits `fn()`, dispatches `SUCCESS` or `ERROR`. Special case: if `fn()` throws `CancellationError`, dispatch `RESET` (idle) instead of `ERROR` — cancellation is intentional, not a failure.

**Problem it solves:** Multiple `useState` flags (`loading`, `error`, `data`) allow impossible states. `useReducer` enforces that state transitions are atomic and valid. The `CancellationError` special case prevents a cancelled request from showing an error to the user — it simply disappears.

**Why here:** `hooks/` — React state management. `useAsyncState` is the primitive that all other data-fetching hooks build on.

**What breaks if removed:** `useAsk`, `useDocuments` would need their own state machine logic. Each would likely use multiple `useState` flags and would likely have race conditions.

**Adjacent connections:** Used by `useAsk.ts` and `useDocuments.ts`. Imports `CancellationError` from `lib/async.ts`. Imports `AsyncState`, `assertNever` from `types/`.

---

### `hooks/useAbortController.ts` — AbortController Lifecycle Hook

**What it is:** Wraps a `useRef<AbortController>` with three operations: `signal` (getter — always returns the current controller's signal), `abort()` (calls `.abort()` on current controller), `reset()` (replaces with a `new AbortController()`). A `useEffect` cleanup calls `abort()` on unmount.

The `signal` property is a getter, not a stored value. This is the critical design decision: if you destructure `{ signal }` once, that variable captures the signal at that moment. After `abort()` + `reset()`, the captured variable is the old (already-aborted) signal. The getter always reflects the current controller.

**Problem it solves:** React's lifecycle and async operations conflict: a component unmounts while a fetch is in-flight, the response arrives, `setState` is called on an unmounted component, React logs a warning. The `useEffect` cleanup abort prevents this. The `abort` + `reset` pattern allows one active request at a time.

**Why here:** `hooks/` — React lifecycle concern.

**What breaks if removed:** `useAsk` has no abort capability. Rapid queries race — whichever response arrives last wins, regardless of which query was most recent. Components that unmount during a fetch may produce React warnings.

**Adjacent connections:** Used by `useAsk.ts`. The getter pattern is what makes `useAsk`'s `currentSignal` capture work correctly.

---

### `hooks/useAsk.ts` — Chat Query Hook

**What it is:** Combines `useAsyncState`, `useAbortController`, and `aiService.ask()`. Manages `messages: Message[]` alongside the async state. `ask(query)` does:
1. `abortCtrl.abort()` + `abortCtrl.reset()` — cancels any in-flight previous ask
2. `const currentSignal = abortCtrl.signal` — captures the NEW signal after reset
3. Appends user message to `messages` immediately (optimistic UI)
4. Calls `execute(async () => { ... })` which calls `aiService.ask({ query, history, signal: currentSignal })`
5. After `await`, checks `if (currentSignal.aborted)` — if a third ask came in and aborted this one, throws `CancellationError` to prevent a stale answer appearing
6. On success, appends assistant message to `messages`

**Problem it solves:** Without the abort + re-signal pattern: rapid queries race. The `signal` captured before reset is already aborted, so every subsequent ask would immediately cancel itself. The `currentSignal.aborted` check after `await` prevents a stale response from a slow first query overwriting the correct response from a fast second query.

**Why here:** `hooks/` — domain-specific React state logic. This hook encapsulates the entire chat interaction model.

**What breaks if removed:** `ChatInterface` component would need to manage message history, abort controllers, and async state directly — mixing concerns that belong in a hook.

**Adjacent connections:** Uses `useAsyncState` (for async state) and `useAbortController` (for cancellation). Calls `aiService.ask()` (from `services/ai-service.ts`). Imports `CancellationError` from `lib/async.ts`. Used by the `ChatInterface` component.

---

### `hooks/useUpload.ts` — File Upload Hook

**What it is:** A `useReducer` hook with a custom `UploadStateWithProgress` state machine. Five states: `idle → uploading(0%) → uploading(100%) → processing → success/error`. The reason for a custom reducer rather than `useAsyncState`: file upload has two extra intermediate states (`uploading` with progress percentage, `processing` while the backend pipeline runs) that `AsyncState` cannot represent.

**Problem it solves:** Upload UX requires precise state communication — users need to see "uploading (60%)", then "processing", not just a spinner. Using `AsyncState` (only `loading`) would lose this distinction.

**Why here:** `hooks/` — domain-specific state. Separate from `useAsk` because upload is a separate flow with separate state.

**What breaks if removed:** `FileUpload` component would need to inline the state machine. The progress/processing distinction disappears.

**Adjacent connections:** Calls `aiService.ingest()`. Uses `UploadStateWithProgress` from `types/state.ts`. Consumed by the `FileUpload` component.

---

### `hooks/useDocuments.ts` — Document List Hook

**What it is:** Uses `useAsyncState` to manage a list of `DocumentSummary[]`. Fetches on mount via `useEffect`. `refresh()` re-fetches the list. `deleteDocument(id)` calls `DELETE /api/documents/{id}`, then does an optimistic local update: filters the ID out of `state.data` immediately without re-fetching. Delete errors are logged but do not corrupt the list state — a failed delete means the document still exists, so the list is still correct.

**Problem it solves:** Optimistic updates make delete feel instant. Re-fetching the full list on every delete would cause a visible flicker and an extra round-trip. The hook knows exactly what changed (one document removed), so it applies that delta directly.

**Why here:** `hooks/` — co-located with other data hooks.

**What breaks if removed:** Document list management moves into the component. The optimistic delete pattern disappears.

**Adjacent connections:** Uses `useAsyncState`. Uses `DocumentSummary`, `DocumentId` from `types/`. Calls `/api/documents` Next.js routes (not `aiService` — document metadata is stored in PostgreSQL, not the AI backend). Consumed by `DocumentManager` component.

---

### `components/ui/AccessibilityWrapper.tsx` — Screen Reader Route Announcer

**What it is:** A Client Component mounted at the root layout. Uses `usePathname()` to detect route changes. On each navigation, sets the text of an `aria-live="polite"` paragraph (visually hidden with `sr-only`) to `"Navigated to {page title}"` after a 100ms delay (to let the page render its title first). `aria-atomic="true"` ensures the full text is read, not just the changed characters.

**Problem it solves:** Next.js App Router does client-side navigation — the browser does not reload. Screen readers detect page changes via focus movement or URL changes; neither is reliable in SPAs. Without an `aria-live` region, a screen reader user clicks a link, the page changes, and they receive no indication that navigation occurred. They remain on the "previous page" conceptually.

**Why here:** `components/ui/` — a UI primitive. Mounted once in `app/layout.tsx` so it covers every page.

**What breaks if removed:** Screen reader users lose route change announcements. The application is inaccessible for users depending on assistive technology.

**Adjacent connections:** Imported in `app/layout.tsx` directly. Uses `usePathname` (Next.js) and `useEffect`, `useRef` (React). No dependency on other app modules.

---

### `app/layout.tsx` — Root Layout

**What it is:** The Next.js root layout. Server Component by default. Imports `@/lib/config` (triggering startup env validation), mounts `AccessibilityWrapper` around `{children}`, mounts `ThemeProvider` and `ToastProvider`, sets HTML `lang` attribute and font.

**Problem it solves:** Root layout is the only place in the component tree that is guaranteed to run once on every page. It is the correct mount point for global providers and startup validation.

**Why here:** Next.js App Router convention — `app/layout.tsx` wraps every page.

**What breaks if removed:** No global providers, no startup env validation, no accessibility wrapper, no consistent font or language metadata.

**Adjacent connections:** Imports `lib/config` (startup validation), `components/ui/AccessibilityWrapper`, `components/providers/ThemeProvider`, `hooks/useToast.ToastProvider`. Wraps all page `{children}`.

---

### Design Token System

**What it is:** All colours are defined as CSS custom properties in `styles/globals.css` under `:root` and `.dark`. Components reference tokens (`text-foreground`, `bg-muted`, `bg-card`, `text-primary`, `bg-primary`, `text-muted-foreground`, `border`, etc.) via Tailwind's arbitrary value syntax or extended theme config — never literal colour names like `gray-500` or `blue-600`.

**Problem it solves:** Hardcoded colours make dark mode require duplicating every colour decision. A single token definition in `:root` / `.dark` gives both themes from one change. Hardcoded colours also make design consistency impossible — `gray-500` in one component and `gray-400` in another are not the same shade, and there is no way to enforce consistency.

**Why this way:** Tailwind's semantic token approach is the recommended pattern for multi-theme apps. The `satisfies` typing in the Tailwind config catches token name typos at build time.

**What breaks if violated:** Dark mode breaks for any component that uses hardcoded colours — the component looks correct in light mode and broken in dark mode, with no TypeScript error to catch it.

**Adjacent connections:** Every UI component (`MessageBubble`, `Sidebar`, `FileUpload`, `DocumentCard`, `NavLink`, `SignOutButton`, `Modal`, `Drawer`, `ChatInterface`, `DocumentManager`, `error.tsx`) depends on these tokens. `styles/globals.css` is the single source of truth.

---

## Cross-Cutting Invariants

These rules are enforced by the architecture itself, not just convention:

**1. Server-Only Boundary**
`db/connection.ts`, `db/repositories/documents.ts`, `db/repositories/queries.ts`, `lib/auth.ts` all have `import 'server-only'` as their first line. Next.js treats this as a build-time error if these modules are imported by any Client Component or browser bundle. Database credentials and auth secrets cannot reach the browser.

**2. Branded ID Types**
`UserId`, `DocumentId`, `QueryId` are distinct types at compile time. The only way to create one is through the brand constructor (`toDocumentId(str)`). These constructors are called exactly once each — in the repository mapper functions (`toDomainDocument`, `toDomainQuery`) and in `withAuth.ts`. From that point forward, TypeScript enforces that a `DocumentId` can never be passed where a `UserId` is expected.

**3. Services Never Throw**
`BaseService.request()` catches all errors and returns them in the `ServiceResponse` envelope. Hooks call services inside `execute()` which also catches. The only place errors surface to the user is `state.error` — never an uncaught exception.

**4. No Direct fetch() in Components**
All HTTP calls go through `aiService` (for AI backend) or the internal Next.js fetch (for `/api/` routes in hooks like `useDocuments`). Components have no knowledge of HTTP — they receive state and callbacks from hooks.

**5. No LangChain Outside rag_interface.py**
All LangChain types (`Document`, `BaseRetriever`, `ChatOpenAI`, `Chroma`) are confined to `rag/rag_interface.py`. The public functions return plain Python dicts and lists. No LangChain object crosses the module boundary.

---

## What Is Not Yet Built (Phase 3+)

- **HTTP integration layer** (Days 17–18): FastAPI routes in `ai-backend` that the Next.js `aiService` calls. Currently `aiService` targets `localhost:8000` but there is no server there yet.
- **Real auth** (Day 19): `lib/auth.ts` JWT creation/signing. Currently only verification is stubbed.
- **Agent layer** (Day 20+): LangGraph or custom agent loop on the Python side.
- **Production error monitoring**: `logError()` is a dev stub; Sentry/Datadog integration is marked `TODO Day 17+`.
- **XHR upload progress**: `useUpload` jumps from 0% to 100% immediately because `fetch` has no progress events. Real progress requires XHR.

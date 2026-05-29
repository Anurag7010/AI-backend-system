# AI Product

A production-level AI-powered full-stack product — RAG pipeline, Next.js web app, PostgreSQL database.

## Architecture

```
Browser
  Next.js App (web-app/)
  Components → Hooks → Services → API Routes → Repositories
                                                      ↓
                                               PostgreSQL (Drizzle ORM)
                    ↓ HTTP
  Python AI Backend (ai-backend/) — port 8000
  LLM Client → RAG Interface → ChromaDB → OpenAI
```

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| State | React hooks, discriminated union state machines |
| HTTP client | Custom `BaseService` with retry, timeout, cancellation |
| API | Next.js App Router, composable middleware |
| Database | PostgreSQL, Drizzle ORM, branded ID types |
| AI Backend | Python, OpenAI, LangChain, ChromaDB |
| Observability | Structured JSON logging, distributed tracing |
| Testing | Vitest + Testing Library (web), pytest (backend) |

## Quick Start

```bash
# AI Backend
cd ai-backend
pip install -r requirements.txt
cp .env.example .env        # add OPENAI_API_KEY
python main.py

# Web App (new terminal)
cd web-app
npm install
cp .env.example .env.local  # fill in DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_AI_BACKEND_URL
npm run dev
```

## Status

**Phase 1 — AI Backend** `complete`
- LLM client with retry and cost tracking
- RAG pipeline: PDF ingestion, chunking, 4 retrieval strategies (semantic, hybrid, multi-query, RRF)
- Structured JSON observability: logger, tracer, eval harness

**Phase 2 — Web App** `complete` — `v0.2-phase2-complete`
- Branded TypeScript ID types enforced at the DB boundary
- Resilient HTTP service layer: per-attempt timeout, exponential backoff, AbortController cancellation
- React hook state machines: `useAsk`, `useUpload`, `useDocuments`, `useAsyncState`
- Composable middleware: auth (JWT), error handling, rate limiting, request IDs
- Design token system — full dark mode support
- Accessibility: `aria-live` route announcements
- 105/105 tests passing, 0 TypeScript errors

**Phase 3 — Integration** `in progress`
- FastAPI routes connecting web app to AI backend
- Real JWT auth, caching, agents

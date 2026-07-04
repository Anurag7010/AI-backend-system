---
title: Prometheon Backend
emoji: 📚
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 8000
pinned: false
---

# Prometheon — AI Backend

FastAPI backend for Prometheon: RAG-powered document Q&A with tiered API access, ReAct agent, guardrails, caching, and observability.

- `POST /ask` — question answering (auto-routed: RAG pipeline or agent)
- `POST /ask/stream` — SSE token streaming
- `POST /ingest` — PDF ingestion into ChromaDB
- `GET /retrieve` — raw retrieval
- `POST /agent/run` — ReAct agent with tools
- `GET /health` — health + cache/queue/memory stats (no auth)

All routes except `/health` require the `X-API-Key` header (set via the
`INTERNAL_API_KEY` secret). The Next.js frontend is the only intended caller.

**Note:** this Space has no persistent storage — ingested documents are wiped
on every restart or redeploy. This is a showcase deployment.

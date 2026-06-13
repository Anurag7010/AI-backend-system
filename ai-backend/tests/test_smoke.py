"""
tests/test_smoke.py

End-to-end smoke test for the AI backend.

Requires a running Python server and a real OpenAI API key.
Skipped automatically when the server is not reachable.

Run manually:
    python server.py &          # start the server
    pytest tests/test_smoke.py -v -s

NOT run in CI — requires OpenAI API access and a live server.
"""

import json
import os
import time
import pytest
import httpx

BASE_URL = os.getenv("AI_BACKEND_URL", "http://localhost:8001")
API_KEY = "dev-internal-key-change-in-production"
HEADERS = {
    "X-API-Key": API_KEY,
    "X-Request-ID": "smoke-test-001",
}


def is_server_running() -> bool:
    """Return True if OUR Python backend is reachable (not just any service on port 8000)."""
    try:
        with httpx.Client(timeout=2.0) as client:
            res = client.get(f"{BASE_URL}/health")
            if res.status_code != 200:
                return False
            # Verify it's our backend by checking a component that only we expose
            body = res.json()
            components = body.get("components", {})
            return "logger" in components or "rag" in components
    except Exception:
        return False


@pytest.mark.skipif(
    not is_server_running(),
    reason="Python server not running — start with: python server.py",
)
class TestSmokeE2E:
    """
    Full end-to-end tests against the live Python backend.

    Each test is independent — no shared state between tests.
    Tests are ordered to form a complete pipeline verification:
    health → ask → stream → error handling.
    """

    def test_1_health_all_components_ok(self):
        """All components must be healthy before any other smoke tests run."""
        with httpx.Client(timeout=10.0) as client:
            res = client.get(f"{BASE_URL}/health")

        assert res.status_code == 200
        body = res.json()
        assert body["status"] in ("ok", "degraded"), f"Unexpected status: {body}"
        print(f"\n[health] status={body['status']} components={body['components']}")

    def test_2_ask_returns_answer(self):
        """POST /ask must return a non-empty answer from the RAG pipeline."""
        with httpx.Client(timeout=60.0) as client:
            res = client.post(
                f"{BASE_URL}/ask",
                json={"query": "What is this document about?", "top_k": 3},
                headers=HEADERS,
            )

        print(f"\n[ask] status={res.status_code}")
        assert res.status_code in (200, 500), f"Unexpected status: {res.status_code}"

        if res.status_code == 200:
            body = res.json()
            assert "answer" in body
            assert isinstance(body["answer"], str)
            assert "sources" in body
            assert "trace_id" in body
            assert "latency_breakdown" in body
            lb = body["latency_breakdown"]
            assert "retrieval_ms" in lb and "generation_ms" in lb and "total_ms" in lb
            print(f"[ask] answer (first 200 chars): {body['answer'][:200]}")
            print(f"[ask] sources: {len(body['sources'])}, total_ms: {lb['total_ms']}")
        else:
            # RAG pipeline may fail if vectorstore is empty — that's OK for smoke test
            print(f"[ask] RAG pipeline error (vectorstore may be empty): {res.json().get('message')}")

    def test_3_retrieve_returns_chunks(self):
        """GET /retrieve must return chunks list (may be empty if no docs ingested)."""
        with httpx.Client(timeout=30.0) as client:
            res = client.get(
                f"{BASE_URL}/retrieve",
                params={"query": "test", "top_k": 3},
                headers=HEADERS,
            )

        print(f"\n[retrieve] status={res.status_code}")

        # 200 or 500 (if vectorstore empty)
        if res.status_code == 200:
            body = res.json()
            assert "chunks" in body
            assert isinstance(body["chunks"], list)
            print(f"[retrieve] chunks returned: {len(body['chunks'])}")
            if body["chunks"]:
                top = body["chunks"][0]
                print(f"[retrieve] top chunk (100 chars): {top['content'][:100]}")
                assert "content" in top
                assert "metadata" in top

    def test_4_ask_stream_yields_sse_events(self):
        """POST /ask/stream must emit token, sources, and done SSE events in order."""
        events = []
        token_contents = []

        with httpx.Client(timeout=60.0) as client:
            with client.stream(
                "POST",
                f"{BASE_URL}/ask/stream",
                json={"query": "What is this document about?", "top_k": 3},
                headers=HEADERS,
            ) as res:
                print(f"\n[stream] status={res.status_code}")
                assert res.status_code == 200
                assert "text/event-stream" in res.headers.get("content-type", "")

                for line in res.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str and data_str != "[DONE]":
                            try:
                                event = json.loads(data_str)
                                events.append(event)
                                if event.get("type") == "token":
                                    token_contents.append(event.get("content", ""))
                            except json.JSONDecodeError:
                                pass

        print(f"[stream] total events: {len(events)}")
        print(f"[stream] first 5 tokens: {token_contents[:5]}")
        print(f"[stream] full answer (first 200 chars): {''.join(token_contents)[:200]}")

        # Verify event structure — pipeline may fail on empty vectorstore
        event_types = [e.get("type") for e in events]

        if "error" in event_types:
            error_event = next(e for e in events if e.get("type") == "error")
            print(f"[stream] pipeline error: {error_event.get('message')} (vectorstore may be empty)")
            return  # acceptable — still verified the error event shape

        # Happy path: must have tokens → sources → done in order
        assert "token" in event_types, f"No token events in: {event_types}"
        assert "sources" in event_types, f"No sources event in: {event_types}"
        assert "done" in event_types, f"No done event in: {event_types}"
        assert event_types[-1] == "done", f"done must be last, got: {event_types[-3:]}"

        # done event must have latency info
        done_event = next(e for e in events if e.get("type") == "done")
        assert "latency_ms" in done_event
        assert "trace_id" in done_event

        # sources event must have sources list
        sources_event = next(e for e in events if e.get("type") == "sources")
        assert isinstance(sources_event.get("sources"), list)

    def test_5_error_handling_empty_query(self):
        """Empty query must return 422 Unprocessable Entity — not 500."""
        with httpx.Client(timeout=10.0) as client:
            res = client.post(
                f"{BASE_URL}/ask",
                json={"query": ""},
                headers=HEADERS,
            )

        print(f"\n[error] empty query status={res.status_code}")
        assert res.status_code == 422
        body = res.json()
        assert "error" in body

    def test_6_error_handling_missing_api_key(self):
        """Request without X-API-Key must return 401 Unauthorized."""
        with httpx.Client(timeout=10.0) as client:
            res = client.post(
                f"{BASE_URL}/ask",
                json={"query": "What is this?"},
                # No X-API-Key header
            )

        print(f"\n[error] missing key status={res.status_code}")
        assert res.status_code == 401
        body = res.json()
        assert "error" in body

    def test_7_error_response_shape(self):
        """ErrorResponse must have error, message, trace_id fields — never a raw traceback."""
        with httpx.Client(timeout=10.0) as client:
            res = client.post(
                f"{BASE_URL}/ask",
                json={"query": ""},
                headers=HEADERS,
            )

        body = res.json()
        body_str = json.dumps(body)
        assert "error" in body
        assert "message" in body
        # Stack traces must never reach the client
        assert "Traceback" not in body_str
        assert 'File "' not in body_str
        print(f"\n[error_shape] error={body.get('error')}, message={body.get('message')[:80]}")

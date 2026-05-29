"""
server.py

HTTP server entry point. Starts the FastAPI application via uvicorn.

Usage:
    python server.py                          # starts on port 8000
    API_PORT=9000 python server.py            # custom port
    uvicorn api.app:app --reload --port 8000  # direct uvicorn (alternative)

main.py remains the CLI entry point for health checks, smoke tests, and eval runs.
"""

import os
import uvicorn
from api.app import app  # noqa: F401 — imported so uvicorn can find it

if __name__ == "__main__":
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("API_RELOAD", "true").lower() == "true"

    uvicorn.run(
        "api.app:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
    )

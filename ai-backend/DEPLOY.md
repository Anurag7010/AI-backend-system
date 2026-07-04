# Deploying the Python Backend

**Primary (free): Hugging Face Spaces** — 16GB RAM Docker Space, $0.
**Alternative (paid): Railway** — see the section at the bottom (config in `railway.toml`).

---

## Hugging Face Spaces (free showcase deployment)

### What you get / what you give up
- Free CPU Space: 2 vCPU, 16GB RAM, HTTPS at `https://<user>-<space>.hf.space`
- **No persistent storage**: ingested documents are wiped on every restart or
  redeploy (acceptable for a showcase; re-upload PDFs after restarts)
- Space sleeps after 48h with no requests — UptimeRobot pings keep it awake

### Prerequisites
- Hugging Face account (huggingface.co)
- `pip install -U huggingface_hub`

### 1. Create the Space
On huggingface.co: **New Space** →
- Name: `docmind-backend`
- SDK: **Docker** (blank template)
- Hardware: **CPU basic (free)**
- Visibility: Public (private Spaces work too; the API stays protected by X-API-Key either way)

### 2. Set secrets
In the Space → **Settings → Variables and secrets**, add as **Secrets**:

| Secret | Value |
|---|---|
| `OPENAI_API_KEY` | your OpenAI key |
| `GROQ_API_KEY` | your Groq key |
| `TAVILY_API_KEY` | your Tavily key (optional — web search degrades gracefully) |
| `INTERNAL_API_KEY` | generate: `openssl rand -hex 32` |
| `FRONTEND_URL` | your Vercel URL (set a placeholder like `https://example.com` until Vercel is deployed) |

And as **Variables** (non-secret):

| Variable | Value |
|---|---|
| `ENVIRONMENT` | `production` |
| `OWNER_EMAIL` | `rautanurag9@gmail.com` |
| `MODEL_NAME` | `gpt-4o` |
| `FAST_MODEL` | `gpt-4o-mini` |
| `LOG_LEVEL` | `WARNING` |

### 3. Upload the backend
From the project root — note the excludes; **never upload `.env`**:

```bash
huggingface-cli login   # paste a write token from hf.co/settings/tokens

huggingface-cli upload <your-hf-username>/docmind-backend ./ai-backend . \
  --repo-type space \
  --exclude ".env" --exclude ".env.*" --exclude "chroma_db/*" \
  --exclude "logs/*" --exclude "external/*" --exclude "venv/*" \
  --exclude "__pycache__/*" --exclude "*/__pycache__/*" --exclude ".pytest_cache/*"
```

The Space builds the Dockerfile automatically (~10 min first time — it bakes
the sentence-transformers model into the image). Watch the build in the
Space's **Logs** tab.

### 4. Verify
```bash
curl https://<your-username>-docmind-backend.hf.space/health | jq '.status'
# "ok"

curl "https://<your-username>-docmind-backend.hf.space/retrieve?query=test&top_k=1" \
  -H "X-API-Key: <your-INTERNAL_API_KEY>" \
  -H "X-User-Email: someone@example.com"
# {"chunks":[],"trace_id":"..."} — empty store is expected before ingestion
```

### 5. After Vercel is deployed
Update the `FRONTEND_URL` secret to the real Vercel URL (Space restarts
automatically) so CORS allows the frontend.

### 6. Redeploying after code changes
Re-run the `huggingface-cli upload` command from step 3. Remember: this wipes
ingested documents (ephemeral storage).

---

## Railway (paid alternative — $5/mo Hobby)

Config lives in `railway.toml`. Summary:

1. `railway login && railway init --name docmind-backend` (from `ai-backend/`)
2. Dashboard → Settings → Volumes: mount `/app/chroma_db` (1GB) — this is what
   makes documents survive restarts, and why this option costs money
3. Set the same env vars as the HF Spaces table above via `railway variables set`
4. `railway up`, then `railway domain` for the URL
5. After Vercel: `railway variables set FRONTEND_URL=<vercel-url>` and `railway up`

---

## Notes (both platforms)

- **Single uvicorn worker**: ChromaDB is file-based and not safe for concurrent
  writes from multiple workers. Do not increase `--workers`.
- **SSE keep-alive**: the Dockerfile passes `--timeout-keep-alive 120` because
  proxy timeouts are typically 60s and LLM streaming responses can run longer.
- **HuggingFace model**: `all-MiniLM-L6-v2` is baked into the Docker image at
  build time — no runtime download on the free tier's first request.
- **Non-root**: the container runs as UID 1000 (`appuser`) — required by HF
  Spaces, harmless elsewhere.
- **Logs**: structured JSON goes to stdout — both platforms capture it.

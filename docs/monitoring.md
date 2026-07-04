# Production Monitoring

## UptimeRobot (free tier — 50 monitors, 5 min interval)

### Setup
1. Create account at uptimerobot.com
2. Add two monitors:

**Monitor 1 — Python Backend**
- Type: HTTP(s)
- URL: `https://<user>-prometheon-backend.hf.space/health`
- Interval: 5 minutes
- Alert: Email on downtime

**Monitor 2 — Next.js Frontend**
- Type: HTTP(s)
- URL: `https://<vercel-url>`
- Interval: 5 minutes
- Alert: Email on downtime

### What the health endpoint reports
```json
{
  "status": "ok",
  "components": { "llm": "ok", "rag": "ok", "logger": "ok" },
  "cache": { ... },
  "queue": { "max_concurrent": 10, "currently_queued": 0 },
  "rate_limiter": { "tracked_users": 0 },
  "system": { "memory_mb": 250.0, "memory_warning": false }
}
```

If `status` is not `"ok"` or HTTP is not 200, UptimeRobot alerts.

### HF Spaces-specific notes
- Free Spaces sleep after 48h with no requests — UptimeRobot's 5-min pings
  keep the Space awake indefinitely
- A restarted/redeployed Space wipes ChromaDB (no persistent storage on the
  free tier) — documents must be re-ingested
- First request after a rebuild takes a few extra seconds (model loads into
  memory from the image; no download)

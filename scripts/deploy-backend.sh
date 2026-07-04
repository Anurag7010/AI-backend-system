#!/usr/bin/env bash
# Deploy ai-backend/ to the Hugging Face Space and verify no secrets shipped.
#
# The Space is PUBLIC: any file uploaded here is world-readable, and old
# revisions remain fetchable even after deletion. A .env leak from an earlier
# manual upload cost real money (drained OpenAI credits) — this script exists
# so that can never happen silently again.
#
# Usage: ./scripts/deploy-backend.sh
set -euo pipefail

SPACE="Anurag0710/prometheon-backend"
cd "$(dirname "$0")/../ai-backend"

echo "==> Pre-flight: refusing to continue if hf CLI is not authenticated"
huggingface-cli whoami >/dev/null

echo "==> Uploading ai-backend/ to $SPACE"
# All patterns MUST be values of a single --exclude flag: repeating the flag
# makes argparse keep only the last occurrence, which silently dropped the
# .env exclusion and shipped secrets to the public Space on 2026-07-04.
huggingface-cli upload "$SPACE" ./ . \
  --repo-type space \
  --exclude \
    ".env" ".env.*" "*/.env" "**/.env" \
    "chroma_db/*" "**/chroma_db/*" \
    "logs/*" "external/*" "venv/*" \
    "__pycache__/*" "**/__pycache__/*" ".pytest_cache/*" "**/.pytest_cache/*" \
    "rag/db/*" "tests/__pycache__/*"

echo "==> Post-upload safety check: scanning Space file tree for env files"
TREE=$(curl -sf -L "https://huggingface.co/api/spaces/${SPACE}/tree/main?recursive=true")
LEAKS=$(echo "$TREE" | python3 -c "
import sys, json
files = json.load(sys.stdin)
# .env.example is intentionally shipped (placeholders only)
bad = [f['path'] for f in files
       if f['path'].split('/')[-1].startswith('.env')
       and f['path'].split('/')[-1] != '.env.example']
print('\n'.join(bad))
")

if [ -n "$LEAKS" ]; then
  echo "!!! SECRET FILES FOUND ON THE PUBLIC SPACE — DELETE AND ROTATE NOW:"
  echo "$LEAKS"
  echo "    huggingface-cli repo-files $SPACE delete <path> --repo-type space"
  exit 1
fi

echo "==> Clean: no env files on the Space."
echo "==> Space is rebuilding. Poll until ready with:"
echo "    curl -s https://huggingface.co/api/spaces/anurag0710/prometheon-backend/runtime"

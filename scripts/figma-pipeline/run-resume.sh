#!/bin/bash
set -a
source .env
set +a
# Run from repo root (user-story-agent)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"
node --expose-gc --max-old-space-size=512 node_modules/.bin/tsx scripts/figma-pipeline/generate-stories-resume.ts "$@"

#!/usr/bin/env bash
# Idempotent Cloud Agent install — dependencies only (no long-running servers).
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci --prefix apps/web
npm ci --prefix apps/api

# PWA icons used by web build; cheap and idempotent.
node scripts/generate-icons.mjs

echo "cloud-agent install ok"

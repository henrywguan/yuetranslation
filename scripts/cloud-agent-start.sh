#!/usr/bin/env bash
# Per-boot cleanup so Cloud Agents don't inherit stale Vite/API listeners.
# Does not start servers — those belong in environment.json terminals.
set -euo pipefail

free_port() {
  local port="$1"
  local pids
  pids="$(fuser "${port}/tcp" 2>/dev/null || true)"
  if [[ -n "${pids// /}" ]]; then
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 0.4
    pids="$(fuser "${port}/tcp" 2>/dev/null || true)"
    if [[ -n "${pids// /}" ]]; then
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
    echo "freed port ${port}"
  fi
}

# Canonical Cloud Agent ports (see AGENTS.md).
free_port 5173
free_port 8787

echo "cloud-agent start ok"

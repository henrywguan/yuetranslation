#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/unpacked"
mkdir -p "$OUT"
shopt -s nullglob
for vendor in kaykit kenney quaternius polyhaven; do
  for zip in "$ROOT/$vendor"/*.zip; do
    name="$(basename "$zip" .zip)"
    dest="$OUT/$vendor/$name"
    if [[ -d "$dest" ]]; then
      echo "skip $dest"
      continue
    fi
    echo "unpack $zip -> $dest"
    mkdir -p "$dest"
    unzip -qo "$zip" -d "$dest"
  done
done
echo "done -> $OUT"

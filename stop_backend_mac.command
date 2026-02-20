#!/bin/bash
set -euo pipefail

echo "[INFO] Stopping process listening on :8787..."
PIDS="$(lsof -ti tcp:8787 || true)"

if [ -z "$PIDS" ]; then
  echo "[INFO] No process found on port 8787."
  exit 0
fi

for PID in $PIDS; do
  echo "[INFO] Killing PID $PID"
  kill -9 "$PID" || true
done

echo "[INFO] Done."

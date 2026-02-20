#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
VENV_PY="$SERVER_DIR/.venv/bin/python"

cd "$SERVER_DIR"

echo "[INFO] Starting macOS backend launcher..."

if [ ! -x "$VENV_PY" ]; then
  echo "[INFO] Creating virtual environment..."
  python3 -m venv .venv
fi

echo "[INFO] Installing dependencies..."
"$VENV_PY" -m pip install -r requirements.txt

echo "[INFO] Starting backend at http://127.0.0.1:8787"
"$VENV_PY" -m uvicorn app:app --host 0.0.0.0 --port 8787

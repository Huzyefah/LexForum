#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -x .venv/bin/python ]]; then
  echo "Installing Python dependencies..."
  uv sync --python 3.12 --locked
fi
if [[ ! -d frontend/node_modules ]]; then
  npm --prefix frontend ci
fi
if [[ ! -f .env ]]; then
  cp .env.example .env
  chmod 600 .env
  echo "Created .env. Add a Gemini API key there for live analysis; the offline sample works without one."
fi
npm --prefix frontend run build
printf '\nLexForum: http://127.0.0.1:8000\nAPI docs: http://127.0.0.1:8000/docs\n\n'
export PYTHONPATH="$PWD/backend"
exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

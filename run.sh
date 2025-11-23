#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$PATH"

# Load .env if present to pass DATABASE_URL / demo creds through to dev servers.
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
fi

backend_cmd=(pnpm --filter nexus-backend dev)
frontend_cmd=(pnpm --filter nexus-frontend dev)

mode="${1:-both}"

case "$mode" in
  backend)
    echo "Starting backend (http://localhost:3001)..."
    (cd "$ROOT" && "${backend_cmd[@]}")
    ;;
  frontend)
    echo "Starting frontend (http://localhost:3000)..."
    (cd "$ROOT" && "${frontend_cmd[@]}")
    ;;
  both)
    echo "Starting backend + frontend..."
    (cd "$ROOT" && "${backend_cmd[@]}") &
    backend_pid=$!
    trap 'kill "$backend_pid" 2>/dev/null || true' EXIT
    (cd "$ROOT" && "${frontend_cmd[@]}")
    wait "$backend_pid"
    ;;
  *)
    echo "Usage: $0 [backend|frontend|both]"
    exit 1
    ;;
esac

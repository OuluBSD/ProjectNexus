#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$HOME/.local/node_modules/.bin:$PATH"

# Configuration file path
CONFIG_FILE="$HOME/.config/agent-manager/config.env"

# Load config from ~/.config/agent-manager/config.env if it exists (preferred)
if [ -f "$CONFIG_FILE" ]; then
  echo "Loading configuration from $CONFIG_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a
# Otherwise, load .env from repository root (fallback)
elif [ -f "$ROOT/.env" ]; then
  echo "Loading configuration from $ROOT/.env"
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
else
  echo "Warning: No configuration file found."
  echo "Run ./install.sh to create $CONFIG_FILE"
  echo "Or create $ROOT/.env manually"
fi

# Terminal streams close after 10 minutes idle by default. Override or disable (0) here.
DEFAULT_TERMINAL_IDLE_MS=600000
if [ -z "${TERMINAL_IDLE_MS:-}" ]; then
  export TERMINAL_IDLE_MS=$DEFAULT_TERMINAL_IDLE_MS
else
  export TERMINAL_IDLE_MS
fi
echo "TERMINAL_IDLE_MS=${TERMINAL_IDLE_MS} (set to 0 to disable idle shutdowns)"

backend_cmd=(pnpm --filter nexus-backend dev)
frontend_cmd=(pnpm --filter nexus-frontend dev)
manager_cmd=(node "$ROOT/scripts/local-manager-server.js")

mode="${1:-all}"

cleanup_pids=()

cleanup() {
  for pid in "${cleanup_pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}

case "$mode" in
  backend)
    echo "Starting backend (http://localhost:3001)..."
    (cd "$ROOT" && "${backend_cmd[@]}")
    ;;
  frontend)
    echo "Starting frontend (http://localhost:3000)..."
    # Ensure environment variables are available to frontend
    if [ -f "$CONFIG_FILE" ]; then
      # Source the config file to make variables available
      set -a
      # shellcheck disable=SC1090
      source "$CONFIG_FILE"
      set +a
    fi
    # Force Next.js to use port 3000 (backend uses PORT=3001)
    (cd "$ROOT" && PORT=3000 "${frontend_cmd[@]}")
    ;;
  manager)
    echo "Starting local manager server (http://${LOCAL_MANAGER_HOST:-127.0.0.1}:${LOCAL_MANAGER_PORT:-4301})..."
    (cd "$ROOT" && "${manager_cmd[@]}")
    ;;
  servers|both|all)
    echo "Starting backend + manager + frontend..."
    # Ensure environment variables are available to both processes
    if [ -f "$CONFIG_FILE" ]; then
      # Source the config file to make variables available
      set -a
      # shellcheck disable=SC1090
      source "$CONFIG_FILE"
      set +a
    fi
    (cd "$ROOT" && "${manager_cmd[@]}") &
    manager_pid=$!
    cleanup_pids+=("$manager_pid")

    (cd "$ROOT" && "${backend_cmd[@]}") &
    backend_pid=$!
    cleanup_pids+=("$backend_pid")
    trap cleanup EXIT

    # Force Next.js to use port 3000 (backend uses PORT=3001)
    (cd "$ROOT" && PORT=3000 "${frontend_cmd[@]}") &
    frontend_pid=$!
    cleanup_pids+=("$frontend_pid")

    wait
    ;;
  *)
    echo "Usage: $0 [backend|frontend|manager|servers|both|all]"
    exit 1
    ;;
esac

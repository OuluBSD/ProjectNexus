#!/usr/bin/env bash
set -euo pipefail

# Determine the project root directory and add its bin directory to PATH
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
export PATH="$PATH:$PROJECT_ROOT_DIR/bin"

# Simple deterministic smoke test for nexus-agent-tool without Qwen.
# This is intended as a fast, local sanity check.

echo "[meta-agent] Starting meta-agent smoke test..."

# 1) Create temp project directory
PROJECT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/nexus-meta-agent-XXXXXX")"
SESSION_ID="meta-$(date +%s)"

echo "[meta-agent] Project dir: $PROJECT_DIR"
echo "[meta-agent] Session id: $SESSION_ID"

# 2) Start session
echo "[meta-agent] Starting session..."
nexus-agent-tool start \
  --session-id "$SESSION_ID" \
  --project-path "$PROJECT_DIR" \
  >"$PROJECT_DIR/start.json"

# 3) Log a note
echo "[meta-agent] Logging a note..."
nexus-agent-tool log \
  --session-id "$SESSION_ID" \
  --message "Meta-agent smoke test started" \
  >"$PROJECT_DIR/log.json"

# 4) Write a probe file
PROBE_REL_PATH="meta-agent-probe.txt"
PROBE_FILE="$PROJECT_DIR/$PROBE_REL_PATH"

echo "[meta-agent] Writing probe file: $PROBE_FILE"
printf 'Hello from meta-agent smoke test\nSESSION_ID=%s\n' "$SESSION_ID" | \
  nexus-agent-tool write-file \
    --session-id "$SESSION_ID" \
    --rel-path "$PROBE_REL_PATH" \
    >"$PROJECT_DIR/write-file.json"

# 5) Run a simple command (ls)
echo "[meta-agent] Running ls via run-command..."
nexus-agent-tool run-command \
  --session-id "$SESSION_ID" \
  --cmd "ls -1" \
  >"$PROJECT_DIR/run-command.json"

# 6) Describe state
echo "[meta-agent] Describing state..."
nexus-agent-tool describe-state \
  --session-id "$SESSION_ID" \
  >"$PROJECT_DIR/state.json"

# 7) Assertions

echo "[meta-agent] Asserting probe file exists..."
if [[ ! -f "$PROBE_FILE" ]]; then
  echo "[meta-agent][ERROR] Probe file was not created: $PROBE_FILE"
  exit 1
fi

echo "[meta-agent] Asserting probe file contains session id..."
if ! grep -q "SESSION_ID=$SESSION_ID" "$PROBE_FILE"; then
  echo "[meta-agent][ERROR] Probe file does not contain expected SESSION_ID line."
  exit 1
fi

SESSION_STATE_FILE="$HOME/.nexus/agent-sessions/$SESSION_ID.json"
echo "[meta-agent] Asserting session state file: $SESSION_STATE_FILE"

if [[ ! -f "$SESSION_STATE_FILE" ]]; then
  echo "[meta-agent][ERROR] Session state file not found: $SESSION_STATE_FILE"
  exit 1
fi

# Quick heuristic check: ensure meta-agent-probe.txt appears in the state
if ! grep -q "meta-agent-probe.txt" "$SESSION_STATE_FILE"; then
  echo "[meta-agent][WARN] meta-agent-probe.txt not mentioned in session state changes."
fi

echo "[meta-agent] SUCCESS: meta-agent smoke test passed."
echo "[meta-agent] Project dir:     $PROJECT_DIR"
echo "[meta-agent] Session state:   $SESSION_STATE_FILE"
echo "[meta-agent] Start output:    $PROJECT_DIR/start.json"
echo "[meta-agent] State snapshot:  $PROJECT_DIR/state.json"

# Optional cleanup: uncomment if you want automatic removal
# rm -rf "$PROJECT_DIR"

exit 0


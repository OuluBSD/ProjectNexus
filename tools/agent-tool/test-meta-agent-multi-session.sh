#!/usr/bin/env bash
# Meta-Session Multi-Session E2E Test for Nexus Agent Tool
# Tests the pattern: 1 meta session + 3 child sessions using Qwen and nexus-agent-tool

set -euo pipefail

# Add the project's bin directory to PATH to ensure nexus-agent-tool is found
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
export PATH="$PATH:$PROJECT_ROOT_DIR/bin"

# Check if QWEN_MULTI_E2E environment variable is set to run the test
if [[ -z "${QWEN_MULTI_E2E:-}" ]]; then
  echo "Skipping test: QWEN_MULTI_E2E environment variable not set"
  echo "To run this test, set QWEN_MULTI_E2E=1"
  exit 0
fi

echo "Starting Meta-Session Multi-Session E2E Test..."

# Create temporary project directory
PROJECT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/nexus-meta-multi-XXXXXX")"
echo "Created temporary project directory: $PROJECT_DIR"

# Generate session IDs
META_SESSION_ID="meta-$(date +%s)"
CHILD_A_SESSION_ID="${META_SESSION_ID}-a"
CHILD_B_SESSION_ID="${META_SESSION_ID}-b"
CHILD_C_SESSION_ID="${META_SESSION_ID}-c"

echo "Generated session IDs:"
echo "  Meta:  $META_SESSION_ID"
echo "  Child A: $CHILD_A_SESSION_ID"
echo "  Child B: $CHILD_B_SESSION_ID"
echo "  Child C: $CHILD_C_SESSION_ID"

# Pre-create all sessions via nexus-agent-tool
echo "Creating sessions..."

nexus-agent-tool start \
  --session-id "$META_SESSION_ID" \
  --project-path "$PROJECT_DIR"

nexus-agent-tool start \
  --session-id "$CHILD_A_SESSION_ID" \
  --project-path "$PROJECT_DIR"

nexus-agent-tool start \
  --session-id "$CHILD_B_SESSION_ID" \
  --project-path "$PROJECT_DIR"

nexus-agent-tool start \
  --session-id "$CHILD_C_SESSION_ID" \
  --project-path "$PROJECT_DIR"

echo "All sessions created successfully!"

# Run Qwen in meta mode to create meta-plan.json
echo "Running meta session with Qwen..."
(
  cd "$PROJECT_DIR"
  qwen -y --output-format text "
    You are the META orchestrator for a Nexus agent test.

    Context:
    - The project directory is the current working directory.
    - There is already an active meta session with ID: $META_SESSION_ID.
    - There are three child sessions:
      - $CHILD_A_SESSION_ID
      - $CHILD_B_SESSION_ID
      - $CHILD_C_SESSION_ID

    Rules:
    - You MUST use the \"nexus-agent-tool\" CLI for all actions.
    - Do NOT write files or run commands directly; always go through nexus-agent-tool.
    - When writing file content, use stdin and the --content-from-stdin flag.

    Task:
    1. Use \"nexus-agent-tool log --session-id $META_SESSION_ID --message ...\" to log that you are planning work for three child sessions.
    2. Use \"nexus-agent-tool write-file --session-id $META_SESSION_ID --rel-path meta-plan.json --content-from-stdin\"
       to create a JSON file named meta-plan.json in the project directory.
       The JSON MUST have this structure (fill in the appropriate IDs and filenames):

       {
         \"childSessions\": [
           { \"sessionId\": \"$CHILD_A_SESSION_ID\", \"file\": \"child-a.txt\" },
           { \"sessionId\": \"$CHILD_B_SESSION_ID\", \"file\": \"child-b.txt\" },
           { \"sessionId\": \"$CHILD_C_SESSION_ID\", \"file\": \"child-c.txt\" }
         ]
       }

    3. After the plan is written, stop. Do not spawn other tools.

    You are in YOLO mode. You may auto-approve tool executions.
  "
)

# Run Qwen for each child session
echo "Running child A session with Qwen..."
(
  cd "$PROJECT_DIR"
  qwen -y --output-format text "
    You are the CHILD A worker for Nexus agent test.

    Context:
    - Project directory is the current working directory.
    - Your session ID is: $CHILD_A_SESSION_ID.

    Rules:
    - Use only the \"nexus-agent-tool\" CLI for any file writes or commands.
    - Do NOT write files directly.

    Task:
    1. Use \"nexus-agent-tool write-file --session-id $CHILD_A_SESSION_ID --rel-path child-a.txt --content-from-stdin\"
       to create a file named child-a.txt in the project directory.
       The content MUST include the line:
       \"SESSION_ID=$CHILD_A_SESSION_ID\"
    2. Optionally use \"nexus-agent-tool log\" to record what you did.
    3. Then stop.
  "
)

echo "Running child B session with Qwen..."
(
  cd "$PROJECT_DIR"
  qwen -y --output-format text "
    You are the CHILD B worker for Nexus agent test.

    Context:
    - Project directory is the current working directory.
    - Your session ID is: $CHILD_B_SESSION_ID.

    Rules:
    - Use only the \"nexus-agent-tool\" CLI for any file writes or commands.
    - Do NOT write files directly.

    Task:
    1. Use \"nexus-agent-tool write-file --session-id $CHILD_B_SESSION_ID --rel-path child-b.txt --content-from-stdin\"
       to create a file named child-b.txt in the project directory.
       The content MUST include the line:
       \"SESSION_ID=$CHILD_B_SESSION_ID\"
    2. Optionally use \"nexus-agent-tool log\" to record what you did.
    3. Then stop.
  "
)

echo "Running child C session with Qwen..."
(
  cd "$PROJECT_DIR"
  qwen -y --output-format text "
    You are the CHILD C worker for Nexus agent test.

    Context:
    - Project directory is the current working directory.
    - Your session ID is: $CHILD_C_SESSION_ID.

    Rules:
    - Use only the \"nexus-agent-tool\" CLI for any file writes or commands.
    - Do NOT write files directly.

    Task:
    1. Use \"nexus-agent-tool write-file --session-id $CHILD_C_SESSION_ID --rel-path child-c.txt --content-from-stdin\"
       to create a file named child-c.txt in the project directory.
       The content MUST include the line:
       \"SESSION_ID=$CHILD_C_SESSION_ID\"
    2. Optionally use \"nexus-agent-tool log\" to record what you did.
    3. Then stop.
  "
)

echo "All Qwen sessions completed!"

# Post-run assertions
echo "Verifying results..."

# 1. Verify that meta-plan.json exists
META_PLAN="$PROJECT_DIR/meta-plan.json"
if [[ ! -f "$META_PLAN" ]]; then
  echo "ERROR: meta-plan.json was not created."
  exit 1
else
  echo "✓ meta-plan.json exists"
fi

# 2. Optionally validate that meta-plan.json is parseable JSON and has 3 child entries
if ! grep -q "$CHILD_A_SESSION_ID" "$META_PLAN" \
   || ! grep -q "$CHILD_B_SESSION_ID" "$META_PLAN" \
   || ! grep -q "$CHILD_C_SESSION_ID" "$META_PLAN"; then
  echo "WARNING: meta-plan.json does not contain expected child session IDs."
else
  echo "✓ meta-plan.json contains expected child session IDs"
fi

# 3. Verify that the three child files exist
for f in child-a.txt child-b.txt child-c.txt; do
  if [[ ! -f "$PROJECT_DIR/$f" ]]; then
    echo "ERROR: Expected child file $f was not created."
    exit 1
  else
    echo "✓ $f exists"
  fi
done

# 4. Verify that each child file contains its session ID
if ! grep -q "SESSION_ID=$CHILD_A_SESSION_ID" "$PROJECT_DIR/child-a.txt"; then
  echo "ERROR: child-a.txt does not contain SESSION_ID for child A."
  exit 1
else
  echo "✓ child-a.txt contains correct session ID"
fi

if ! grep -q "SESSION_ID=$CHILD_B_SESSION_ID" "$PROJECT_DIR/child-b.txt"; then
  echo "ERROR: child-b.txt does not contain SESSION_ID for child B."
  exit 1
else
  echo "✓ child-b.txt contains correct session ID"
fi

if ! grep -q "SESSION_ID=$CHILD_C_SESSION_ID" "$PROJECT_DIR/child-c.txt"; then
  echo "ERROR: child-c.txt does not contain SESSION_ID for child C."
  exit 1
else
  echo "✓ child-c.txt contains correct session ID"
fi

# 5. Verify that all four session state JSON files exist
META_STATE="$HOME/.nexus/agent-sessions/$META_SESSION_ID.json"
CHILD_A_STATE="$HOME/.nexus/agent-sessions/$CHILD_A_SESSION_ID.json"
CHILD_B_STATE="$HOME/.nexus/agent-sessions/$CHILD_B_SESSION_ID.json"
CHILD_C_STATE="$HOME/.nexus/agent-sessions/$CHILD_C_SESSION_ID.json"

for s in "$META_STATE" "$CHILD_A_STATE" "$CHILD_B_STATE" "$CHILD_C_STATE"; do
  if [[ ! -f "$s" ]]; then
    echo "ERROR: Session state file $s not found."
    exit 1
  else
    echo "✓ Session state file exists: $(basename "$s")"
  fi
done

# 6. Optionally check that the session JSONs mention the files they wrote
if ! grep -q "meta-plan.json" "$META_STATE"; then
  echo "WARNING: meta session state does not mention meta-plan.json."
else
  echo "✓ Meta session state mentions meta-plan.json"
fi

if ! grep -q "child-a.txt" "$CHILD_A_STATE"; then
  echo "WARNING: child A state does not mention child-a.txt."
else
  echo "✓ Child A session state mentions child-a.txt"
fi

if ! grep -q "child-b.txt" "$CHILD_B_STATE"; then
  echo "WARNING: child B state does not mention child-b.txt."
else
  echo "✓ Child B session state mentions child-b.txt"
fi

if ! grep -q "child-c.txt" "$CHILD_C_STATE"; then
  echo "WARNING: child C state does not mention child-c.txt."
else
  echo "✓ Child C session state mentions child-c.txt"
fi

# 7. Print summary
echo ""
echo "SUCCESS: Meta + 3 child sessions executed via Qwen and nexus-agent-tool."
echo "Project dir: $PROJECT_DIR"
echo "Meta state:  $META_STATE"
echo "Child A:     $CHILD_A_STATE"
echo "Child B:     $CHILD_B_STATE"
echo "Child C:     $CHILD_C_STATE"

# Optional cleanup function (uncomment to enable automatic cleanup)
# cleanup() {
#   echo "Cleaning up temporary project directory: $PROJECT_DIR"
#   rm -rf "$PROJECT_DIR"
# }
#
# # Run cleanup on exit if desired
# # trap cleanup EXIT
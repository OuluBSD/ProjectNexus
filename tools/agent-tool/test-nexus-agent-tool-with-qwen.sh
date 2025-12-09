#!/usr/bin/env bash
set -euo pipefail

# Create temporary project directory
PROJECT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/nexus-agent-qwen-XXXXXX")"
echo "Created temporary project directory: $PROJECT_DIR"

# Generate session ID
SESSION_ID="sess-qwen-$(date +%s)"
echo "Generated session ID: $SESSION_ID"

# Start nexus-agent-tool session
echo "Starting nexus-agent-tool session..."
nexus-agent-tool start \
  --session-id "$SESSION_ID" \
  --project-path "$PROJECT_DIR"

# Define the prompt for Qwen
PROMPT="You are running inside a test harness for Nexus.

Rules:
- Treat the current working directory as your project directory.
- You MUST use the \"nexus-agent-tool\" CLI for all actions related to:
  - session state,
  - writing files,
  - running commands.
- Do NOT write files or run commands directly; always go through nexus-agent-tool.

Task:
1. Use \"nexus-agent-tool log --session-id $SESSION_ID --message ...\" to record that the test started.
2. Use \"nexus-agent-tool write-file --session-id $SESSION_ID --rel-path probe.txt --content-from-stdin\"
   to create a file named \"probe.txt\" in the project directory with the content:
   \"Hello from Qwen via nexus-agent-tool\".
3. Optionally, use \"nexus-agent-tool run-command --session-id $SESSION_ID --cmd 'ls -1'\" to list files.
4. Finally, stop. Do not perform any other actions.

You are running in YOLO mode, so you may auto-approve tool executions."

# Run Qwen with the prompt in the project directory
echo "Running Qwen in YOLO mode..."
cd "$PROJECT_DIR"
qwen -y --output-format text <<< "$PROMPT"

# After Qwen exits, verify the expected artifacts

# 1. Check that probe.txt exists
if [[ ! -f "$PROJECT_DIR/probe.txt" ]]; then
  echo "ERROR: probe.txt was not created by Qwen via nexus-agent-tool."
  exit 1
fi

# 2. Verify the content
if ! grep -q "Hello from Qwen via nexus-agent-tool" "$PROJECT_DIR/probe.txt"; then
  echo "ERROR: probe.txt does not contain the expected content."
  exit 1
fi

# 3. Check that the session state JSON exists
SESSION_FILE="$HOME/.nexus/agent-sessions/$SESSION_ID.json"
if [[ ! -f "$SESSION_FILE" ]]; then
  echo "ERROR: Session state file $SESSION_FILE not found."
  exit 1
fi

# 4. Optionally, check if probe.txt is mentioned in the session state
if ! grep -q "probe.txt" "$SESSION_FILE"; then
  echo "WARNING: probe.txt not mentioned in session state (changes[])."
fi

# 5. Print success message
echo "SUCCESS: Qwen used nexus-agent-tool to create probe.txt and update session $SESSION_ID."
echo "Project dir: $PROJECT_DIR"
echo "Session file: $SESSION_FILE"

# Output the content of probe.txt for verification
echo ""
echo "Content of probe.txt:"
cat "$PROJECT_DIR/probe.txt"
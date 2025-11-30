#!/bin/bash
# Kill script for AgentManager backend processes
# Gracefully terminates processes, waits, then force kills if necessary

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Also get the real path (resolving symlinks)
REAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# Optional configuration file (mirrors run.sh)
CONFIG_FILE="$HOME/.config/agent-manager/config.env"

echo "=== AgentManager Process Killer ==="
echo "Script directory: $SCRIPT_DIR"
if [ "$SCRIPT_DIR" != "$REAL_DIR" ]; then
    echo "Real directory:   $REAL_DIR"
fi
if [ -f "$CONFIG_FILE" ]; then
    echo "Loading configuration from $CONFIG_FILE"
    set -a
    # shellcheck disable=SC1090
    source "$CONFIG_FILE"
    set +a
fi
echo

BACKEND_PORT=${PORT:-3001}
FRONTEND_PORT=${PORT_FRONTEND:-3000}
MANAGER_PORT=${LOCAL_MANAGER_PORT:-4301}
WORKER_PORT=${LOCAL_WORKER_PORT:-4302}
AI_PORT=${LOCAL_AI_PORT:-4303}

# Helper to find processes by listening port (TCP)
find_port_pids() {
    local port="$1"
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null | tr '\n' ' '
    elif command -v ss >/dev/null 2>&1; then
        ss -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {print $6}' | sed 's/[^0-9]//g' | tr '\n' ' '
    elif command -v netstat >/dev/null 2>&1; then
        netstat -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {print $7}' | sed 's/[^0-9]//g' | tr '\n' ' '
    else
        echo ""
    fi
}

# Accumulate PIDs with reasons in an associative array for deduplication
declare -A PID_MAP=()
add_pid() {
    local pid="$1"
    local reason="$2"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        PID_MAP["$pid"]="$reason"
    fi
}

# Kill orphaned qwen processes using PID file
QWEN_PID_FILE="$HOME/.config/agent-manager/qwen.pid"
if [ -f "$QWEN_PID_FILE" ]; then
    QWEN_PID=$(cat "$QWEN_PID_FILE" 2>/dev/null)
    if [ -n "$QWEN_PID" ]; then
        if kill -0 "$QWEN_PID" 2>/dev/null; then
            echo "Killing orphaned qwen process (PID: $QWEN_PID) from PID file..."
            kill -TERM "$QWEN_PID" 2>/dev/null || true
            sleep 2
            if kill -0 "$QWEN_PID" 2>/dev/null; then
                echo "  Force killing qwen process..."
                kill -9 "$QWEN_PID" 2>/dev/null || true
            fi
        fi
    fi
    rm -f "$QWEN_PID_FILE"
    echo "✓ Cleaned up qwen PID file"
    echo
fi

# Find PIDs of node processes in this directory (check both paths in case of symlinks)
if [ "$SCRIPT_DIR" != "$REAL_DIR" ]; then
    while read -r pid; do
        add_pid "$pid" "node@repo"
    done < <(ps aux | grep node | grep -E "($SCRIPT_DIR|$REAL_DIR)" | grep -v grep | grep -v "kill.sh" | awk '{print $2}')
else
    while read -r pid; do
        add_pid "$pid" "node@repo"
    done < <(ps aux | grep node | grep "$SCRIPT_DIR" | grep -v grep | grep -v "kill.sh" | awk '{print $2}')
fi

# Find processes bound to the known ports (frontend, backend, manager, worker, ai)
PORT_TARGETS=(
    "$FRONTEND_PORT:frontend"
    "$BACKEND_PORT:backend"
    "$MANAGER_PORT:manager"
    "$WORKER_PORT:worker"
    "$AI_PORT:ai-server"
)
if [ "${QWEN_MODE:-}" = "tcp" ]; then
    PORT_TARGETS+=("${QWEN_TCP_PORT:-7777}:qwen-tcp")
fi

for target in "${PORT_TARGETS[@]}"; do
    IFS=":" read -r port label <<<"$target"
    if [ -z "$port" ]; then
        continue
    fi
    for pid in $(find_port_pids "$port"); do
        add_pid "$pid" "$label@port:$port"
    done
done

# Convert PIDs to array
PID_ARRAY=("${!PID_MAP[@]}")

if [ ${#PID_ARRAY[@]} -eq 0 ]; then
    echo "No matching processes found."
    exit 0
fi

echo "Found processes:"
ps -fp "${PID_ARRAY[@]}" || true
for pid in "${PID_ARRAY[@]}"; do
    printf "  PID %s -> %s\n" "$pid" "${PID_MAP[$pid]}"
done
echo

# Send SIGTERM to all processes
echo "Sending SIGTERM to processes..."
for pid in "${PID_ARRAY[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
        echo "  Terminating PID $pid (${PID_MAP[$pid]})"
        kill -TERM "$pid" 2>/dev/null || true
    fi
done
echo

# Wait up to 120 seconds for processes to terminate
echo "Waiting for processes to terminate (up to 120 seconds)..."
for i in {1..120}; do
    # Check if any processes are still alive
    ALIVE=()
    for pid in "${PID_ARRAY[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            ALIVE+=("$pid")
        fi
    done

    if [ ${#ALIVE[@]} -eq 0 ]; then
        echo "✓ All processes terminated successfully after $i seconds"
        exit 0
    fi

    # Show progress every 10 seconds
    if [ $((i % 10)) -eq 0 ]; then
        echo "  Still waiting... ${#ALIVE[@]} process(es) alive: ${ALIVE[@]}"
    fi

    sleep 1
done

echo

# If we get here, some processes are still alive after 120 seconds
echo "⚠ Timeout reached. Checking for remaining processes..."
STILL_ALIVE=()
for pid in "${PID_ARRAY[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
        STILL_ALIVE+=("$pid")
    fi
done

if [ ${#STILL_ALIVE[@]} -eq 0 ]; then
    echo "✓ All processes terminated successfully"
    exit 0
fi

echo "✗ ${#STILL_ALIVE[@]} process(es) still alive: ${STILL_ALIVE[@]}"
echo "Sending SIGKILL to remaining processes..."
for pid in "${STILL_ALIVE[@]}"; do
    echo "  Force killing PID $pid"
    kill -9 "$pid" 2>/dev/null || true
done

# Final verification
sleep 1
FINAL_CHECK=()
for pid in "${STILL_ALIVE[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
        FINAL_CHECK+=("$pid")
    fi
done

if [ ${#FINAL_CHECK[@]} -eq 0 ]; then
    echo "✓ All processes terminated (some required force kill)"
    exit 0
else
    echo "✗ Failed to kill ${#FINAL_CHECK[@]} process(es): ${FINAL_CHECK[@]}"
    exit 1
fi

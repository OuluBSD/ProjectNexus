#!/bin/bash
# Qwen Chat Test Script
# Uses TypeScript CLI with shared state management

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to CLI directory
cd "$SCRIPT_DIR/apps/cli"

# Pass all arguments to the CLI
exec pnpm dev "$@"
exit 0

# Old Node.js implementation below (kept for reference)
exec node - <<'EOF'
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

// Color codes
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Get qwen-code path from environment or local submodule
const defaultQwenPath = path.resolve(process.cwd(), 'deps/qwen-code/script/qwen-code');
const qwenPath = process.env.QWEN_CODE_SCRIPT || process.env.QWEN_PATH || defaultQwenPath;
const workspaceRoot = process.cwd();

console.log(`${colors.blue}Spawning qwen-code backend...${colors.reset}`);

// Spawn qwen-code backend process
const qwenProcess = spawn(qwenPath, ['--server-mode', 'stdin'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: workspaceRoot,
  env: process.env
});

let initReceived = false;
let responseInProgress = false;
let currentResponse = '';

// Set up readline for stdout
const rlStdout = readline.createInterface({
  input: qwenProcess.stdout,
  crlfDelay: Infinity
});

// Handle messages from qwen-code
rlStdout.on('line', (line) => {
  if (!line.trim()) return;

  try {
    const msg = JSON.parse(line);

    switch (msg.type) {
      case 'init':
        console.log(`${colors.green}✓ Connected to qwen-code ${msg.version}${colors.reset}`);
        console.log(`${colors.green}✓ Model: ${msg.model}${colors.reset}`);
        console.log('');
        initReceived = true;
        promptForInput();
        break;

      case 'conversation':
        if (msg.role === 'assistant') {
          if (!responseInProgress) {
            process.stdout.write(`${colors.cyan}Assistant: ${colors.reset}`);
            responseInProgress = true;
          }
          process.stdout.write(msg.content);
          currentResponse += msg.content;

          // Check if streaming is complete
          if (msg.isStreaming === false) {
            console.log('\n');
            responseInProgress = false;
            currentResponse = '';
            promptForInput();
          }
        }
        break;

      case 'status':
        if (msg.state === 'responding') {
          // Optionally show thinking message
          if (msg.thought) {
            console.log(`${colors.yellow}[Thinking: ${msg.thought}]${colors.reset}`);
          }
        } else if (msg.state === 'idle' && responseInProgress) {
          // Response is complete
          console.log('\n');
          responseInProgress = false;
          currentResponse = '';
          promptForInput();
        }
        break;

      case 'error':
        console.error(`${colors.yellow}Error: ${msg.message}${colors.reset}`);
        responseInProgress = false;
        promptForInput();
        break;

      case 'info':
        console.log(`${colors.blue}[Info] ${msg.message}${colors.reset}`);
        break;

      case 'completion_stats':
        // Optionally show completion stats
        break;

      default:
        // Unknown message type
        break;
    }
  } catch (err) {
    console.error(`Failed to parse message: ${line}`, err);
  }
});

// Handle process events
qwenProcess.on('exit', (code, signal) => {
  console.log(`\n${colors.yellow}Qwen process exited (code: ${code}, signal: ${signal})${colors.reset}`);
  process.exit(code || 0);
});

qwenProcess.on('error', (err) => {
  console.error(`${colors.yellow}Process error:${colors.reset}`, err);
  process.exit(1);
});

// Set up readline for user input
const rlInput = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: ''
});

function promptForInput() {
  if (!initReceived) return;

  process.stdout.write(`${colors.green}You: ${colors.reset}`);
}

rlInput.on('line', (input) => {
  const trimmed = input.trim();

  // Handle empty input
  if (!trimmed) {
    promptForInput();
    return;
  }

  // Handle special commands
  if (trimmed === '/exit' || trimmed === '/quit') {
    console.log(`${colors.blue}Goodbye!${colors.reset}`);
    qwenProcess.kill();
    process.exit(0);
    return;
  }

  if (trimmed === '/help') {
    console.log(`${colors.blue}Commands:${colors.reset}`);
    console.log('  /exit, /quit - Exit the chat');
    console.log('  /help - Show this help message');
    console.log('');
    promptForInput();
    return;
  }

  // Send user input to qwen-code
  const cmd = JSON.stringify({
    type: 'user_input',
    content: trimmed
  }) + '\n';

  qwenProcess.stdin.write(cmd);
  responseInProgress = true;
});

rlInput.on('close', () => {
  console.log(`\n${colors.blue}Goodbye!${colors.reset}`);
  qwenProcess.kill();
  process.exit(0);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n${colors.blue}Goodbye!${colors.reset}`);
  qwenProcess.kill();
  process.exit(0);
});
EOF

#!/usr/bin/env node
/**
 * Minimal local manager server stub.
 *
 * Provides health and placeholder worker/AI endpoints so the backend can
 * register and talk to a local manager during development.
 */
const http = require("node:http");
const { spawn } = require("node:child_process");
const readline = require("node:readline");
const WebSocketLib = require("ws");
const WebSocketServer =
  // Prefer modern export when available (ws >= 8)
  WebSocketLib.WebSocketServer || WebSocketLib.Server;

const host = process.env.LOCAL_MANAGER_HOST || "127.0.0.1";
const port = Number(process.env.LOCAL_MANAGER_PORT || 4301);
const workerPort = Number(process.env.LOCAL_WORKER_PORT || 4302);
const aiPort = Number(process.env.LOCAL_AI_PORT || 4303);

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    json(res, 404, { error: "not_found" });
    return;
  }

  if (req.url.startsWith("/health")) {
    json(res, 200, { status: "ok", role: "manager" });
    return;
  }

  if (req.url.startsWith("/workers")) {
    json(res, 200, [
      {
        id: "local-worker",
        host,
        port: workerPort,
        status: "online",
        repo: process.env.LOCAL_WORKER_REPO || process.cwd(),
        aiPort,
      },
    ]);
    return;
  }

  if (req.url.startsWith("/ai")) {
    json(res, 200, [
      {
        id: "local-ai",
        host,
        port: aiPort,
        status: "online",
        model: process.env.DEFAULT_AI_MODEL || "qwen-2.5-flash",
        workerId: "local-worker",
      },
    ]);
    return;
  }

  json(res, 404, { error: "not_found" });
});

// WebSocket proxy for AI chat (manager -> worker -> ai-server)
const wss = new WebSocketServer({ noServer: true });

function attachAiProxy(ws) {
  const qwenPath = process.env.QWEN_PATH || `${process.env.HOME}/Dev/qwen-code/script/qwen-code`;
  const workspace = process.env.LOCAL_WORKER_REPO || process.cwd();
  const model = process.env.DEFAULT_AI_MODEL || "qwen-2.5-flash";

  const child = spawn(
    qwenPath,
    ["--server-mode", "stdin", "--approval-mode", "yolo", "--model", model],
    {
      cwd: workspace,
      stdio: ["pipe", "pipe", "inherit"],
    }
  );

  const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line);
      ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error("[LocalManager] Failed to parse AI output", err, line);
    }
  });

  child.on("exit", (code, signal) => {
    console.log(`[LocalManager] AI subprocess exited code=${code} signal=${signal}`);
    ws.close();
  });

  ws.on("message", (data) => {
    try {
      const raw = data.toString();
      const payload = raw.endsWith("\n") ? raw : `${raw}\n`;
      child.stdin.write(payload);
    } catch (err) {
      console.error("[LocalManager] Failed to forward message to AI", err);
    }
  });

  ws.on("close", () => {
    rl.close();
    if (child.exitCode === null) {
      child.kill();
    }
  });
}

server.on("upgrade", (request, socket, head) => {
  if (request.url && request.url.startsWith("/proxy/ai-chat")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      attachAiProxy(ws);
    });
    return;
  }

  socket.destroy();
});

server.listen(port, host, () => {
  console.log(`[LocalManager] listening on http://${host}:${port}`);
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

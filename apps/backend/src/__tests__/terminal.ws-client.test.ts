import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import Fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { test } from "node:test";
import { terminalRoutes } from "../routes/terminal";
import { createSession, store } from "../services/mockStore";
import { closeTerminalSession } from "../services/terminalManager";

const WebSocketImpl = (globalThis as any).WebSocket as any;

function withTempProjectsRoot() {
  const original = process.env.PROJECTS_ROOT;
  const root = mkdtempSync(path.join(tmpdir(), "nexus-term-client-"));
  process.env.PROJECTS_ROOT = root;
  return {
    root,
    restoreEnv: () => {
      process.env.PROJECTS_ROOT = original;
    },
  };
}

function getPort(app: FastifyInstance) {
  const addr = app.server.address();
  if (addr && typeof addr === "object") {
    return addr.port;
  }
  throw new Error("Failed to resolve listening port");
}

test("terminal websocket sends idle timeout message to clients", async () => {
  const { root, restoreEnv } = withTempProjectsRoot();
  const originalIdle = process.env.TERMINAL_IDLE_MS;
  process.env.TERMINAL_IDLE_MS = "25";
  const app = Fastify({ logger: false });
  await app.register(websocket);
  await app.register(terminalRoutes);
  await app.listen({ port: 0, host: "127.0.0.1" });

  const session = createSession("timeout-client");
  let terminalSessionId: string | undefined;

  try {
    const start = await app.inject({
      method: "POST",
      url: "/terminal/sessions",
      headers: { "x-session-token": session.token },
      payload: { cwd: root },
    });
    assert.equal(start.statusCode, 201);
    terminalSessionId = (start.json() as any).sessionId;

    const messages: string[] = [];
    const url = `ws://127.0.0.1:${getPort(app)}/terminal/sessions/${terminalSessionId}/stream?token=${session.token}`;
    const socket = new WebSocketImpl(url);
    await new Promise<void>((resolve, reject) => {
      socket.onmessage = (event: any) => {
        const data = event.data as string | Buffer | ArrayBuffer;
        if (typeof data === "string") {
          messages.push(data);
        } else if (data instanceof ArrayBuffer) {
          messages.push(Buffer.from(data).toString("utf8"));
        } else {
          messages.push(Buffer.from(data).toString("utf8"));
        }
      };
      socket.onclose = () => resolve();
      socket.onerror = (err: unknown) => reject(err);
    });

    const joined = messages.join(" ");
    assert.match(joined, /idle timeout/i);
    assert.equal(socket.readyState, WebSocketImpl.CLOSED);
  } finally {
    if (terminalSessionId) closeTerminalSession(terminalSessionId);
    await app.close();
    rmSync(root, { recursive: true, force: true });
    restoreEnv();
    store.sessions.delete(session.token);
    process.env.TERMINAL_IDLE_MS = originalIdle;
  }
});

test("terminal websocket stays open when idle timer is disabled", async () => {
  const { root, restoreEnv } = withTempProjectsRoot();
  const originalIdle = process.env.TERMINAL_IDLE_MS;
  process.env.TERMINAL_IDLE_MS = "0";
  const app = Fastify({ logger: false });
  await app.register(websocket);
  await app.register(terminalRoutes);
  await app.listen({ port: 0, host: "127.0.0.1" });

  const session = createSession("timeout-disabled-client");
  let terminalSessionId: string | undefined;

  try {
    const start = await app.inject({
      method: "POST",
      url: "/terminal/sessions",
      headers: { "x-session-token": session.token },
      payload: { cwd: root },
    });
    assert.equal(start.statusCode, 201);
    terminalSessionId = (start.json() as any).sessionId;

    const messages: string[] = [];
    const url = `ws://127.0.0.1:${getPort(app)}/terminal/sessions/${terminalSessionId}/stream?token=${session.token}`;
    const socket = new WebSocketImpl(url);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 150);
      socket.onmessage = (event: any) => {
        const data = event.data as string | Buffer | ArrayBuffer;
        if (typeof data === "string") {
          messages.push(data);
        } else if (data instanceof ArrayBuffer) {
          messages.push(Buffer.from(data).toString("utf8"));
        } else {
          messages.push(Buffer.from(data).toString("utf8"));
        }
      };
      socket.onclose = (event: any) => {
        clearTimeout(timer);
        reject(new Error(`socket closed early (${event.code}${event.reason ? `: ${event.reason}` : ""})`));
      };
      socket.onerror = (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      };
    });

    assert.equal(socket.readyState, WebSocketImpl.OPEN);
    const joined = messages.join(" ").toLowerCase();
    assert.ok(!joined.includes("idle timeout"), "no idle timeout message should be sent");

    await new Promise<void>((resolve) => {
      socket.onclose = () => resolve();
      socket.close();
    });
  } finally {
    if (terminalSessionId) closeTerminalSession(terminalSessionId);
    await app.close();
    rmSync(root, { recursive: true, force: true });
    restoreEnv();
    store.sessions.delete(session.token);
    process.env.TERMINAL_IDLE_MS = originalIdle;
  }
});

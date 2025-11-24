import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import Fastify from "fastify";
import { test } from "node:test";
import { terminalRoutes } from "../routes/terminal";
import { createProject, createSession, store } from "../services/mockStore";
import { closeTerminalSession } from "../services/terminalManager";

function withTempProjectsRoot() {
  const original = process.env.PROJECTS_ROOT;
  const root = mkdtempSync(path.join(tmpdir(), "nexus-term-"));
  process.env.PROJECTS_ROOT = root;
  return { root, restoreEnv: () => { process.env.PROJECTS_ROOT = original; } };
}

test("terminal input emits audit metadata", async () => {
  const { root, restoreEnv } = withTempProjectsRoot();
  const project = createProject({ name: "TermProj" });

  const logs: { level: string; obj: unknown; msg?: string }[] = [];
  const logger = {
    info(obj: unknown, msg?: string) {
      logs.push({ level: "info", obj, msg });
    },
    error() {},
    warn() {},
    debug() {},
    trace() {},
    fatal() {},
    child() {
      return this;
    },
  };

  const app = Fastify({ logger });
  await app.register(terminalRoutes);
  await app.ready();
  const session = createSession("term-user");
  let terminalSessionId: string | null = null;
  const ip = "198.51.100.8";

  try {
    const startRes = await app.inject({
      method: "POST",
      url: "/terminal/sessions",
      headers: { "x-session-token": session.token },
      payload: { projectId: project.id },
      remoteAddress: ip,
    });
    assert.equal(startRes.statusCode, 201);
    terminalSessionId = (startRes.json() as any).sessionId;
    assert.ok(terminalSessionId, "terminal session id returned");

    const input = "echo audit-test\n";
    const inputRes = await app.inject({
      method: "POST",
      url: `/terminal/sessions/${terminalSessionId}/input`,
      headers: { "x-session-token": session.token },
      payload: { data: input },
      remoteAddress: ip,
    });
    assert.equal(inputRes.statusCode, 200);

    const startLog = logs.find((log) => (log.obj as any)?.audit?.eventType === "terminal:start");
    assert.ok(startLog, "start audit payload captured");
    assert.equal((startLog!.obj as any).audit.sessionId, terminalSessionId);
    assert.equal((startLog!.obj as any).audit.metadata?.ip, ip);

    const inputLog = logs.find((log) => (log.obj as any)?.audit?.eventType === "terminal:input");
    assert.ok(inputLog, "input audit payload captured");
    const meta = (inputLog!.obj as any).audit.metadata;
    assert.equal(meta?.preview, input.slice(0, 120));
    assert.equal(meta?.bytes, Buffer.byteLength(input, "utf8"));
    assert.equal(meta?.truncated, false);
    assert.equal(meta?.ip, ip);
  } finally {
    if (terminalSessionId) {
      closeTerminalSession(terminalSessionId);
    }
    await app.close();
    rmSync(root, { recursive: true, force: true });
    restoreEnv();
    store.projects.delete(project.id);
    store.sessions.delete(session.token);
  }
});

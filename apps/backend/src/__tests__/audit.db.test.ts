import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import Fastify, { type FastifyInstance } from "fastify";
import * as schema from "@nexus/shared/db/schema";
import { test } from "node:test";
import { fileRoutes } from "../routes/files";
import { terminalRoutes } from "../routes/terminal";
import { createProject, createSession, store } from "../services/mockStore";
import { closeTerminalSession } from "../services/terminalManager";

class FakeDb {
  public auditInserts: Array<typeof schema.auditEvents.$inferInsert> = [];
  constructor(private readonly projects: Array<typeof schema.projects.$inferSelect> = []) {}

  insert(table: unknown) {
    return {
      values: async (payload: typeof schema.auditEvents.$inferInsert) => {
        if (table === schema.auditEvents) {
          this.auditInserts.push(payload);
        }
        return [payload];
      },
    };
  }

  delete() {
    return {
      where: async () => [],
    };
  }

  select() {
    return {
      from: (table: unknown) => {
        if (table === schema.projects) {
          return {
            where: async () => this.projects,
          };
        }
        return {
          leftJoin: () => ({
            where: async () => [],
          }),
          where: async () => [],
        };
      },
    };
  }
}

function withTempProjectsRoot() {
  const original = process.env.PROJECTS_ROOT;
  const root = mkdtempSync(path.join(tmpdir(), "nexus-audit-db-"));
  process.env.PROJECTS_ROOT = root;
  return { root, restoreEnv: () => { process.env.PROJECTS_ROOT = original; } };
}

test("terminal routes persist audit events when db is configured", async () => {
  const { root, restoreEnv } = withTempProjectsRoot();
  const app = Fastify({ logger: false }) as FastifyInstance & { db: FakeDb };
  app.db = new FakeDb();
  await app.register(terminalRoutes);
  await app.ready();

  const session = createSession("db-term");
  const ip = "203.0.113.9";
  let terminalSessionId: string | undefined;

  try {
    const startRes = await app.inject({
      method: "POST",
      url: "/terminal/sessions",
      headers: { "x-session-token": session.token },
      payload: { cwd: root },
      remoteAddress: ip,
    });
    assert.equal(startRes.statusCode, 201);
    terminalSessionId = (startRes.json() as any).sessionId;
    assert.ok(terminalSessionId, "terminal session returned");

    const input = "echo db-audit\n";
    const inputRes = await app.inject({
      method: "POST",
      url: `/terminal/sessions/${terminalSessionId}/input`,
      headers: { "x-session-token": session.token },
      payload: { data: input },
      remoteAddress: ip,
    });
    assert.equal(inputRes.statusCode, 200);

    const startRow = app.db.auditInserts.find((row) => row.eventType === "terminal:start");
    const inputRow = app.db.auditInserts.find((row) => row.eventType === "terminal:input");
    assert.ok(startRow, "start event inserted");
    assert.ok(inputRow, "input event inserted");
    assert.equal(startRow!.sessionId, terminalSessionId);
    assert.equal((startRow!.metadata as any)?.ip, ip);
    assert.equal((inputRow!.metadata as any)?.bytes, Buffer.byteLength(input, "utf8"));
    assert.equal((inputRow!.metadata as any)?.ip, ip);
  } finally {
    if (terminalSessionId) {
      closeTerminalSession(terminalSessionId);
    }
    await app.close();
    rmSync(root, { recursive: true, force: true });
    restoreEnv();
    store.sessions.delete(session.token);
  }
});

test("file routes persist audit events when db is configured", async () => {
  const { root, restoreEnv } = withTempProjectsRoot();
  const project = createProject({ name: "Audit Project" });
  const db = new FakeDb([
    {
      id: project.id,
      name: project.name,
      description: null,
      category: null,
      status: "active",
      theme: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const app = Fastify({ logger: false }) as FastifyInstance & { db: FakeDb };
  app.db = db;
  await app.register(fileRoutes);
  await app.ready();

  const session = createSession("db-fs");
  const ip = "198.51.100.18";
  const filePath = "/notes.txt";
  const content = "db audit content";

  try {
    const writeRes = await app.inject({
      method: "POST",
      url: "/fs/write",
      headers: { "x-session-token": session.token },
      payload: { projectId: project.id, path: filePath, content },
      remoteAddress: ip,
    });
    assert.equal(writeRes.statusCode, 200);

    const readRes = await app.inject({
      method: "GET",
      url: `/fs/file?projectId=${project.id}&path=${encodeURIComponent(filePath)}`,
      headers: { "x-session-token": session.token },
      remoteAddress: ip,
    });
    assert.equal(readRes.statusCode, 200);

    const writeRow = db.auditInserts.find((row) => row.eventType === "fs:write");
    const readRow = db.auditInserts.find((row) => row.eventType === "fs:read");
    assert.ok(writeRow, "write audit inserted");
    assert.ok(readRow, "read audit inserted");
    assert.equal(writeRow!.projectId, project.id);
    assert.equal(writeRow!.path, filePath);
    assert.equal((writeRow!.metadata as any)?.ip, ip);
    assert.equal((readRow!.metadata as any)?.preview, content.slice(0, 200));
    assert.equal((readRow!.metadata as any)?.ip, ip);
  } finally {
    await app.close();
    rmSync(root, { recursive: true, force: true });
    restoreEnv();
    store.sessions.delete(session.token);
    store.projects.delete(project.id);
  }
});

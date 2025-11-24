import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import Fastify from "fastify";
import { test } from "node:test";
import { fileRoutes } from "../routes/files";
import { createProject, createSession, store } from "../services/mockStore";

function withTempProjectsRoot() {
  const original = process.env.PROJECTS_ROOT;
  const root = mkdtempSync(path.join(tmpdir(), "nexus-fs-"));
  process.env.PROJECTS_ROOT = root;
  return { root, restoreEnv: () => { process.env.PROJECTS_ROOT = original; } };
}

test("file routes emit audit metadata for tree and read", async () => {
  const { root, restoreEnv } = withTempProjectsRoot();
  const project = createProject({ name: "FsProj" });
  const workspace = path.join(root, project.id, "workspace");
  mkdirSync(workspace, { recursive: true });
  const filePath = path.join(workspace, "a.txt");
  writeFileSync(filePath, "hello world", "utf8");

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
  await app.register(fileRoutes);
  await app.ready();
  const session = createSession("fs-user");

  try {
    const treeRes = await app.inject({
      method: "GET",
      url: `/fs/tree?projectId=${project.id}`,
      headers: { "x-session-token": session.token },
    });
    assert.equal(treeRes.statusCode, 200);
    const treeLog = logs.find((log) => (log.obj as any)?.audit?.eventType === "fs:tree");
    assert.ok(treeLog, "tree audit payload captured");
    assert.equal((treeLog!.obj as any).audit.metadata?.entryCount, 1);

    const readRes = await app.inject({
      method: "GET",
      url: `/fs/file?projectId=${project.id}&path=a.txt`,
      headers: { "x-session-token": session.token },
    });
    assert.equal(readRes.statusCode, 200);
    const readLog = logs.find((log) => (log.obj as any)?.audit?.eventType === "fs:read");
    assert.ok(readLog, "read audit payload captured");
    assert.equal((readLog!.obj as any).audit.metadata?.bytes, Buffer.byteLength("hello world", "utf8"));
    assert.equal((readLog!.obj as any).audit.metadata?.truncated, false);
  } finally {
    await app.close();
    rmSync(root, { recursive: true, force: true });
    restoreEnv();
    store.projects.delete(project.id);
    store.sessions.delete(session.token);
  }
});

test("file routes emit audit metadata for write and diff", async () => {
  const { root, restoreEnv } = withTempProjectsRoot();
  const project = createProject({ name: "FsWrite" });
  const projectRoot = path.join(root, project.id);
  const workspace = path.join(projectRoot, "workspace");
  mkdirSync(workspace, { recursive: true });

  execSync("git init", { cwd: projectRoot });
  execSync('git config user.email "test@example.com"', { cwd: projectRoot });
  execSync('git config user.name "Test User"', { cwd: projectRoot });

  const filePath = path.join(workspace, "note.txt");
  writeFileSync(filePath, "first\n", "utf8");
  execSync("git add workspace/note.txt", { cwd: projectRoot });
  execSync('git commit -m "init"', { cwd: projectRoot });

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
  await app.register(fileRoutes);
  await app.ready();
  const session = createSession("fs-writer");

  try {
    const updated = "second version\nwith more text\n";
    const writeRes = await app.inject({
      method: "POST",
      url: "/fs/write",
      headers: { "x-session-token": session.token },
      payload: { projectId: project.id, path: "note.txt", content: updated, baseSha: "abc123" },
    });
    assert.equal(writeRes.statusCode, 200);
    const writeLog = logs.find((log) => (log.obj as any)?.audit?.eventType === "fs:write");
    assert.ok(writeLog, "write audit payload captured");
    const writeMeta = (writeLog!.obj as any).audit.metadata;
    assert.equal(writeMeta?.baseSha, "abc123");
    assert.equal(writeMeta?.bytes, Buffer.byteLength(updated, "utf8"));
    assert.equal(writeMeta?.truncated, false);

    const diffRes = await app.inject({
      method: "GET",
      url: `/fs/diff?projectId=${project.id}&path=note.txt`,
      headers: { "x-session-token": session.token },
    });
    assert.equal(diffRes.statusCode, 200);
    const diffLog = logs.find((log) => (log.obj as any)?.audit?.eventType === "fs:diff");
    assert.ok(diffLog, "diff audit payload captured");
    const diffMeta = (diffLog!.obj as any).audit.metadata;
    assert.equal(diffMeta?.baseSha, null);
    assert.equal(diffMeta?.targetSha, "HEAD");
    assert.ok((diffMeta?.diffBytes ?? 0) > 0, "diffBytes captured");
  } finally {
    await app.close();
    rmSync(root, { recursive: true, force: true });
    restoreEnv();
    store.projects.delete(project.id);
    store.sessions.delete(session.token);
  }
});

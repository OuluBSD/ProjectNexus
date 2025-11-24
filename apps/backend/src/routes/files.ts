import type { FastifyPluginAsync } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { recordAuditEvent } from "../services/auditLogger";
import { requireSession } from "../utils/auth";
import { getProjectRoot, resolveWorkspacePath } from "../utils/workspace";
import { findProject } from "../utils/projects";

export const fileRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/fs/tree", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const query = request.query as { projectId?: string; path?: string };
    if (!query.projectId) {
      reply.code(400).send({ error: { code: "missing_project", message: "projectId is required" } });
      return;
    }

    const project = await findProject(fastify, query.projectId);
    if (!project) {
      reply.code(404).send({ error: { code: "not_found", message: "Project not found" } });
      return;
    }

    const inputPath = (query.path ?? ".").replace(/^\//, "");
    const safePath = await resolveWorkspacePath(query.projectId, inputPath);
    if (!safePath) {
      reply.code(400).send({ error: { code: "bad_path", message: "Invalid path" } });
      return;
    }

    try {
      const stats = await fs.stat(safePath.absolutePath);
      if (!stats.isDirectory()) {
        reply.code(400).send({ error: { code: "not_directory", message: "Path is not a directory" } });
        return;
      }
      const entries = await fs.readdir(safePath.absolutePath, { withFileTypes: true });
      const payload = entries
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => ({
          type: entry.isDirectory() ? "dir" : "file",
          name: entry.name,
        }));
      await recordAuditEvent(fastify, {
        userId: session.userId,
        projectId: query.projectId,
        eventType: "fs:tree",
        path: inputPath,
      });
      reply.send({ path: inputPath, entries: payload });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reply.code(404).send({ error: { code: "not_found", message: "Directory not found" } });
        return;
      }
      fastify.log.error({ err }, "Failed to read directory");
      reply.code(500).send({ error: { code: "fs_error", message: "Failed to read directory" } });
    }
  });

  fastify.get("/fs/file", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const query = request.query as { projectId?: string; path?: string };
    if (!query.projectId || !query.path) {
      reply.code(400).send({ error: { code: "missing_params", message: "projectId and path are required" } });
      return;
    }

    const project = await findProject(fastify, query.projectId);
    if (!project) {
      reply.code(404).send({ error: { code: "not_found", message: "Project not found" } });
      return;
    }

    const safePath = await resolveWorkspacePath(query.projectId, query.path.replace(/^\//, ""));
    if (!safePath) {
      reply.code(400).send({ error: { code: "bad_path", message: "Invalid path" } });
      return;
    }

    try {
      const content = await fs.readFile(safePath.absolutePath, "utf8");
      await recordAuditEvent(fastify, {
        userId: session.userId,
        projectId: query.projectId,
        eventType: "fs:read",
        path: query.path,
      });
      reply.send({ path: query.path, content });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reply.code(404).send({ error: { code: "not_found", message: "File not found" } });
        return;
      }
      fastify.log.error({ err }, "Failed to read file");
      reply.code(500).send({ error: { code: "fs_error", message: "Failed to read file" } });
    }
  });

  fastify.post("/fs/write", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = request.body as { projectId?: string; path: string; content: string; baseSha?: string };
    if (!body?.projectId || !body?.path) {
      reply.code(400).send({ error: { code: "missing_params", message: "projectId and path are required" } });
      return;
    }

    const project = await findProject(fastify, body.projectId);
    if (!project) {
      reply.code(404).send({ error: { code: "not_found", message: "Project not found" } });
      return;
    }

    const safePath = await resolveWorkspacePath(body.projectId, body.path.replace(/^\//, ""));
    if (!safePath) {
      reply.code(400).send({ error: { code: "bad_path", message: "Invalid path" } });
      return;
    }

    try {
      await fs.mkdir(path.dirname(safePath.absolutePath), { recursive: true });
      await fs.writeFile(safePath.absolutePath, body.content, "utf8");
      await recordAuditEvent(fastify, {
        userId: session.userId,
        projectId: body.projectId,
        eventType: "fs:write",
        path: body.path,
        metadata: body.baseSha ? { baseSha: body.baseSha } : null,
      });
      reply.send({ success: true, path: body.path, baseSha: body?.baseSha ?? null });
    } catch (err) {
      fastify.log.error({ err }, "Failed to write file");
      reply.code(500).send({ error: { code: "fs_error", message: "Failed to write file" } });
    }
  });

  fastify.get("/fs/diff", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const query = request.query as { projectId?: string; path?: string; baseSha?: string; targetSha?: string };
    if (!query.projectId || !query.path) {
      reply.code(400).send({ error: { code: "missing_params", message: "projectId and path are required" } });
      return;
    }

    const project = await findProject(fastify, query.projectId);
    if (!project) {
      reply.code(404).send({ error: { code: "not_found", message: "Project not found" } });
      return;
    }

    const safePath = await resolveWorkspacePath(query.projectId, query.path.replace(/^\//, ""));
    if (!safePath) {
      reply.code(400).send({ error: { code: "bad_path", message: "Invalid path" } });
      return;
    }

    try {
      await fs.access(safePath.absolutePath);
    } catch {
      reply.code(404).send({ error: { code: "not_found", message: "File not found" } });
      return;
    }

    const projectRoot = getProjectRoot(query.projectId);
    const relPath = path.relative(projectRoot, safePath.absolutePath);
    const baseSha = query.baseSha;
    const targetSha = query.targetSha ?? "HEAD";
    const args = baseSha
      ? ["--no-pager", "diff", `${baseSha}`, `${targetSha}`, "--", relPath]
      : ["--no-pager", "diff", "--", relPath];

    try {
      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const run = promisify(execFile);
      const result = await run("git", args, { cwd: projectRoot });
      await recordAuditEvent(fastify, {
        userId: session.userId,
        projectId: query.projectId,
        eventType: "fs:diff",
        path: query.path,
        metadata: { baseSha: baseSha ?? null, targetSha },
      });
      reply.send({ path: query.path, diff: result.stdout ?? "" });
    } catch (err) {
      fastify.log.warn({ err }, "Failed to produce git diff; returning empty diff");
      reply.send({ path: query.path, diff: "" });
    }
  });
};

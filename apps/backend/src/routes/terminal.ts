import type { FastifyPluginAsync } from "fastify";
import { createTerminalSession, getTerminalSession, sendInput } from "../services/terminalManager";
import { requireSession, validateToken } from "../utils/auth";
import { findProject } from "../utils/projects";

export const terminalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/terminal/sessions", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const body = request.body as { projectId?: string; cwd?: string };
    if (body?.projectId) {
      const project = await findProject(fastify, body.projectId);
      if (!project) {
        reply.code(404).send({ error: { code: "not_found", message: "Project not found" } });
        return;
      }
    }

    const session = await createTerminalSession(body?.projectId, body?.cwd);
    if (!session) {
      reply.code(400).send({ error: { code: "bad_path", message: "Failed to start terminal session" } });
      return;
    }
    reply.code(201).send({ sessionId: session.id });
  });

  fastify.get("/terminal/sessions/:sessionId/stream", { websocket: true }, async (connection, request) => {
    const header = request.headers["authorization"];
    const bearer =
      typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
    const query = request.query as { token?: string };
    const token =
      bearer ??
      (request.headers["x-session-token"] as string | undefined) ??
      query?.token;
    const session = await validateToken(request.server, token);
    if (!session) {
      connection.socket.close(1008, "unauthorized");
      return;
    }

    const params = request.params as { sessionId: string };
    const managed = getTerminalSession(params.sessionId);
    if (!managed) {
      connection.socket.close(1008, "session not found");
      return;
    }

    const handleStdout = (chunk: Buffer) => connection.socket.send(chunk);
    const handleStderr = (chunk: Buffer) => connection.socket.send(chunk);
    const handleExit = (code: number | null) => {
      connection.socket.send(`\n[process exited with code ${code ?? "0"}]\n`);
      connection.socket.close();
    };

    managed.proc.stdout.on("data", handleStdout);
    managed.proc.stderr.on("data", handleStderr);
    managed.proc.on("exit", handleExit);

    connection.socket.on("message", (data: Buffer) => {
      const input = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
      managed.proc.stdin.write(input);
    });

    connection.socket.on("close", () => {
      managed.proc.stdout.off("data", handleStdout);
      managed.proc.stderr.off("data", handleStderr);
      managed.proc.off("exit", handleExit);
    });

    connection.socket.send("terminal stream ready");
  });

  fastify.post("/terminal/sessions/:sessionId/input", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const params = request.params as { sessionId: string };
    const body = request.body as { data?: string };
    if (!body?.data) {
      reply.code(400).send({ error: { code: "missing_input", message: "data is required" } });
      return;
    }
    const ok = sendInput(params.sessionId, body.data);
    if (!ok) {
      reply.code(404).send({ error: { code: "not_found", message: "Session not found" } });
      return;
    }
    reply.send({ accepted: true });
  });
};

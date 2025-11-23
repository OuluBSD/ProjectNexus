import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  getSessionWithUser,
  purgeExpiredSessions,
  type Database,
} from "../services/authRepository";
import { store } from "../services/mockStore";

function extractToken(request: FastifyRequest) {
  const header = request.headers["authorization"];
  const bearer = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
  return bearer ?? (request.headers["x-session-token"] as string | undefined);
}

async function resolveSession(
  fastify: FastifyInstance & { db?: Database },
  token: string,
) {
  if (fastify.db) {
    try {
      await purgeExpiredSessions(fastify.db);
      const session = await getSessionWithUser(fastify.db, token);
      if (session) return session;
    } catch (err) {
      fastify.log.error({ err }, "Failed to resolve session from database; checking memory store.");
    }
  }
  return store.sessions.get(token) ?? null;
}

export async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  const token = extractToken(request);
  if (!token) {
    reply.code(401).send({ error: { code: "unauthorized", message: "Missing or invalid session" } });
    return null;
  }

  const session = await resolveSession(request.server as FastifyInstance & { db?: Database }, token);
  if (!session) {
    reply.code(401).send({ error: { code: "unauthorized", message: "Missing or invalid session" } });
    return null;
  }

  return session;
}

export async function validateToken(
  fastify: FastifyInstance & { db?: Database },
  token: string | undefined,
) {
  if (!token) return null;
  return resolveSession(fastify, token);
}

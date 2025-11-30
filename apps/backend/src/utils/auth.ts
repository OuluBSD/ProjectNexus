import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  getSessionWithUser as pgGetSessionWithUser,
  purgeExpiredSessions as pgPurgeExpiredSessions,
  type Database,
} from "../services/authRepository";
import {
  getSessionWithUser as jsonGetSessionWithUser,
  purgeExpiredSessions as jsonPurgeExpiredSessions,
} from "../services/jsonAuthRepository";
import type { JsonDatabase } from "../services/jsonDatabase";
import { store } from "../services/mockStore";

function extractToken(request: FastifyRequest) {
  const header = request.headers["authorization"];
  const bearer =
    typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
  return bearer ?? (request.headers["x-session-token"] as string | undefined);
}

async function resolveSession(
  fastify: FastifyInstance & { db?: Database; jsonDb?: JsonDatabase },
  token: string
) {
  // Try JSON database first (if available)
  if (fastify.jsonDb) {
    try {
      await jsonPurgeExpiredSessions(fastify.jsonDb);
      const session = await jsonGetSessionWithUser(fastify.jsonDb, token);
      if (session) return session;
    } catch (err) {
      fastify.log?.error?.(
        { err },
        "Failed to resolve session from JSON database; trying PostgreSQL."
      );
    }
  }

  // Try PostgreSQL database
  if (fastify.db) {
    try {
      await pgPurgeExpiredSessions(fastify.db);
      const session = await pgGetSessionWithUser(fastify.db, token);
      if (session) return session;
    } catch (err) {
      fastify.log?.error?.(
        { err },
        "Failed to resolve session from PostgreSQL; checking memory store."
      );
    }
  }

  // Fall back to in-memory store
  const memorySession = store.sessions.get(token);
  fastify.log?.info?.(
    { token, found: !!memorySession, totalSessions: store.sessions.size },
    "Session lookup in memory store"
  );
  return memorySession ?? null;
}

export async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  const token = extractToken(request);
  if (!token) {
    reply
      .code(401)
      .send({ error: { code: "unauthorized", message: "Missing or invalid session" } });
    return null;
  }

  const session = await resolveSession(
    request.server as FastifyInstance & { db?: Database; jsonDb?: JsonDatabase },
    token
  );
  if (!session) {
    reply
      .code(401)
      .send({ error: { code: "unauthorized", message: "Missing or invalid session" } });
    return null;
  }

  return session;
}

export async function validateToken(
  fastify: FastifyInstance & { db?: Database; jsonDb?: JsonDatabase },
  token: string | undefined
) {
  if (!token) return null;
  return resolveSession(fastify, token);
}

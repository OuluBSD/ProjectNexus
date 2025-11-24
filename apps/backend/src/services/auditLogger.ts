import type { FastifyInstance } from "fastify";
import * as schema from "@nexus/shared/db/schema";
import type { Database } from "./authRepository";

type AuditPayload = {
  userId?: string | null;
  projectId?: string | null;
  eventType: string;
  path?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordAuditEvent(
  fastify: FastifyInstance & { db?: Database },
  payload: AuditPayload,
) {
  if (!fastify.db) {
    fastify.log.info({ audit: payload }, "audit event");
    return;
  }

  try {
    await fastify.db.insert(schema.auditEvents).values({
      userId: payload.userId ?? null,
      projectId: payload.projectId ?? null,
      eventType: payload.eventType,
      path: payload.path ?? null,
      sessionId: payload.sessionId ?? null,
      metadata: payload.metadata ?? null,
    });
  } catch (err) {
    fastify.log.error({ err, audit: payload }, "Failed to record audit event");
  }
}

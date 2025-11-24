import { desc, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import * as schema from "@nexus/shared/db/schema";
import { requireSession } from "../utils/auth";

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/audit/events", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    if (!fastify.db) {
      reply.send({ events: [], paging: { hasMore: false } });
      return;
    }
    const query = request.query as { projectId?: string; limit?: string };
    const limit = Math.min(Number(query.limit ?? 50) || 50, 200);

    let builder = fastify.db
      .select({
        id: schema.auditEvents.id,
        eventType: schema.auditEvents.eventType,
        projectId: schema.auditEvents.projectId,
        userId: schema.auditEvents.userId,
        path: schema.auditEvents.path,
        sessionId: schema.auditEvents.sessionId,
        metadata: schema.auditEvents.metadata,
        createdAt: schema.auditEvents.createdAt,
      })
      .from(schema.auditEvents)
      .orderBy(desc(schema.auditEvents.createdAt))
      .limit(limit);

    if (query.projectId) {
      builder = builder.where(eq(schema.auditEvents.projectId, query.projectId));
    }

    const rows = await builder;

    reply.send({ events: rows, paging: { hasMore: rows.length === limit } });
  });
};

import { and, asc, desc, eq, gt, ilike, lt, or, type SQL } from "drizzle-orm";
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
    const query = request.query as {
      projectId?: string;
      limit?: string;
      before?: string;
      cursor?: string;
      eventType?: string;
      userId?: string;
      pathContains?: string;
      sort?: "asc" | "desc";
    };
    const pageSize = Math.min(Number(query.limit ?? 50) || 50, 200);
    const beforeDate = query.before ? new Date(query.before) : null;
    const cursorParts = query.cursor?.split("|");
    const cursorDate = cursorParts?.[0] ? new Date(cursorParts[0]) : null;
    const cursorId = cursorParts?.[1];
    const orderDirection = query.sort === "asc" ? "asc" : "desc";

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
      .orderBy(
        orderDirection === "asc"
          ? asc(schema.auditEvents.createdAt)
          : desc(schema.auditEvents.createdAt),
        orderDirection === "asc" ? asc(schema.auditEvents.id) : desc(schema.auditEvents.id)
      )
      .limit(pageSize + 1);

    const whereClauses: SQL[] = [];
    if (query.projectId) {
      whereClauses.push(eq(schema.auditEvents.projectId, query.projectId));
    }
    if (query.eventType) {
      whereClauses.push(eq(schema.auditEvents.eventType, query.eventType));
    }
    if (query.userId) {
      whereClauses.push(eq(schema.auditEvents.userId, query.userId));
    }
    if (query.pathContains) {
      whereClauses.push(ilike(schema.auditEvents.path, `%${query.pathContains}%`));
    }
    if (beforeDate && !Number.isNaN(beforeDate.getTime())) {
      whereClauses.push(orderDirection === "asc" ? lt(schema.auditEvents.createdAt, beforeDate) : lt(schema.auditEvents.createdAt, beforeDate));
    } else if (cursorDate && cursorId && !Number.isNaN(cursorDate.getTime())) {
      const comparison = orderDirection === "asc" ? gt : lt;
      whereClauses.push(
        or(
          comparison(schema.auditEvents.createdAt, cursorDate),
          and(eq(schema.auditEvents.createdAt, cursorDate), comparison(schema.auditEvents.id, cursorId))
        )
      );
    }
    if (whereClauses.length) {
      builder = builder.where(whereClauses.length === 1 ? whereClauses[0] : and(...whereClauses));
    }

    const rows = await builder;

    const hasMore = rows.length > pageSize;
    const events = hasMore ? rows.slice(0, pageSize) : rows;
    const last = events[events.length - 1];
    const nextCursor =
      hasMore && events.length && last?.createdAt ? `${last.createdAt.toISOString()}|${last.id}` : undefined;

    reply.send({
      events,
      paging: {
        hasMore,
        nextCursor,
      },
    });
  });
};

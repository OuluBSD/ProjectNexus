/**
 * Server management routes
 */
import type { FastifyPluginAsync } from "fastify";
import { createServerRepository } from "../services/serverRepository";
import { requireSession } from "../utils/auth";
import { recordAuditEvent } from "../services/auditLogger";

export const serverRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /servers
   * List all servers
   */
  fastify.get("/servers", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;

    const repo = createServerRepository(fastify.db, fastify.jsonDb);
    if (!repo) {
      reply
        .code(503)
        .send({ error: { code: "service_unavailable", message: "Database not available" } });
      return;
    }

    try {
      const servers = await repo.listServers();
      return servers;
    } catch (err) {
      fastify.log.error({ err }, "Failed to list servers");
      reply
        .code(500)
        .send({ error: { code: "internal_error", message: "Failed to list servers" } });
    }
  });

  /**
   * GET /servers/:serverId
   * Get a specific server by ID
   */
  fastify.get("/servers/:serverId", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;

    const { serverId } = request.params as { serverId: string };
    const repo = createServerRepository(fastify.db, fastify.jsonDb);
    if (!repo) {
      reply
        .code(503)
        .send({ error: { code: "service_unavailable", message: "Database not available" } });
      return;
    }

    try {
      const server = await repo.getServer(serverId);
      if (!server) {
        reply.code(404).send({ error: { code: "not_found", message: "Server not found" } });
        return;
      }
      return server;
    } catch (err) {
      fastify.log.error({ err }, "Failed to get server");
      reply.code(500).send({ error: { code: "internal_error", message: "Failed to get server" } });
    }
  });

  /**
   * POST /servers
   * Create a new server
   */
  fastify.post("/servers", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const body = (request.body as Record<string, unknown>) ?? {};
    const repo = createServerRepository(fastify.db, fastify.jsonDb);
    if (!repo) {
      reply
        .code(503)
        .send({ error: { code: "service_unavailable", message: "Database not available" } });
      return;
    }

    try {
      const server = await repo.createServer(body);

      await recordAuditEvent(fastify, {
        userId: session.userId,
        eventType: "server:create",
        metadata: {
          serverId: server.id,
          name: server.name,
          type: server.type,
          host: server.host,
          port: server.port,
        },
      });

      reply.code(201).send(server);
    } catch (err) {
      fastify.log.error({ err }, "Failed to create server");
      reply
        .code(500)
        .send({ error: { code: "internal_error", message: "Failed to create server" } });
    }
  });

  /**
   * PATCH /servers/:serverId
   * Update a server
   */
  fastify.patch("/servers/:serverId", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const { serverId } = request.params as { serverId: string };
    const body = (request.body as Record<string, unknown>) ?? {};
    const repo = createServerRepository(fastify.db, fastify.jsonDb);
    if (!repo) {
      reply
        .code(503)
        .send({ error: { code: "service_unavailable", message: "Database not available" } });
      return;
    }

    try {
      const updated = await repo.updateServer(serverId, body);
      if (!updated) {
        reply.code(404).send({ error: { code: "not_found", message: "Server not found" } });
        return;
      }

      await recordAuditEvent(fastify, {
        userId: session.userId,
        eventType: "server:update",
        metadata: {
          serverId: updated.id,
          updates: body,
        },
      });

      reply.send(updated);
    } catch (err) {
      fastify.log.error({ err }, "Failed to update server");
      reply
        .code(500)
        .send({ error: { code: "internal_error", message: "Failed to update server" } });
    }
  });

  /**
   * DELETE /servers/:serverId
   * Delete a server
   */
  fastify.delete("/servers/:serverId", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const { serverId } = request.params as { serverId: string };
    const repo = createServerRepository(fastify.db, fastify.jsonDb);
    if (!repo) {
      reply
        .code(503)
        .send({ error: { code: "service_unavailable", message: "Database not available" } });
      return;
    }

    try {
      const deleted = await repo.deleteServer(serverId);
      if (!deleted) {
        reply.code(404).send({ error: { code: "not_found", message: "Server not found" } });
        return;
      }

      await recordAuditEvent(fastify, {
        userId: session.userId,
        eventType: "server:delete",
        metadata: {
          serverId,
        },
      });

      reply.code(204).send();
    } catch (err) {
      fastify.log.error({ err }, "Failed to delete server");
      reply
        .code(500)
        .send({ error: { code: "internal_error", message: "Failed to delete server" } });
    }
  });

  /**
   * POST /servers/:serverId/health
   * Update server health status
   */
  fastify.post("/servers/:serverId/health", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const { serverId } = request.params as { serverId: string };
    const body = (request.body as { status?: string }) ?? {};
    const status = body.status as "online" | "offline" | "degraded" | undefined;

    if (!status || !["online", "offline", "degraded"].includes(status)) {
      reply.code(400).send({
        error: {
          code: "invalid_status",
          message: "Status must be 'online', 'offline', or 'degraded'",
        },
      });
      return;
    }

    const repo = createServerRepository(fastify.db, fastify.jsonDb);
    if (!repo) {
      reply
        .code(503)
        .send({ error: { code: "service_unavailable", message: "Database not available" } });
      return;
    }

    try {
      const updated = await repo.updateServerHealth(serverId, status);
      if (!updated) {
        reply.code(404).send({ error: { code: "not_found", message: "Server not found" } });
        return;
      }

      reply.send(updated);
    } catch (err) {
      fastify.log.error({ err }, "Failed to update server health");
      reply
        .code(500)
        .send({ error: { code: "internal_error", message: "Failed to update server health" } });
    }
  });
};

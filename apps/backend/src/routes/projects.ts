import type { FastifyPluginAsync } from "fastify";
import {
  addSnapshot,
  createProject,
  getProject,
  deleteProject,
  listProjects,
  listRoadmaps,
  listSnapshots,
  updateProject,
} from "../services/mockStore";
import {
  dbAddSnapshot,
  dbCreateProject,
  dbListProjects,
  dbListSnapshots,
  dbProjectDetails,
  dbDeleteProject,
  dbUpdateProject,
} from "../services/projectRepository";
import { requireSession } from "../utils/auth";
import { recordAuditEvent } from "../services/auditLogger";

export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/projects", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    if (fastify.db) {
      try {
        return await dbListProjects(fastify.db);
      } catch (err) {
        fastify.log.error(
          { err },
          "Failed to list projects from database; falling back to memory."
        );
      }
    }
    return listProjects();
  });

  fastify.post("/projects", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const body = (request.body as Record<string, unknown>) ?? {};
    let project;

    if (fastify.db) {
      try {
        project = await dbCreateProject(fastify.db, body);
        reply.code(201).send({ id: project.id });
      } catch (err) {
        fastify.log.error({ err }, "Failed to create project in database; using in-memory store.");
        project = createProject(body);
        reply.code(201).send({ id: project.id });
      }
    } else {
      project = createProject(body);
      reply.code(201).send({ id: project.id });
    }

    await recordAuditEvent(fastify, {
      userId: session.userId,
      projectId: project.id,
      eventType: "project:create",
      metadata: {
        name: project.name,
        category: project.category,
        status: project.status,
      },
    });
  });

  fastify.patch("/projects/:projectId", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const projectId = (request.params as { projectId: string }).projectId;
    const body = (request.body as Record<string, unknown>) ?? {};
    let updated;

    if (fastify.db) {
      try {
        updated = await dbUpdateProject(fastify.db, projectId, body);
        if (!updated) {
          reply.code(404).send({ error: { code: "not_found", message: "Project not found" } });
          return;
        }
        reply.send(updated);
      } catch (err) {
        fastify.log.error({ err }, "Failed to update project in database; falling back to memory.");
        updated = updateProject(projectId, body);
        if (!updated) {
          reply.code(404).send({ error: { code: "not_found", message: "Project not found" } });
          return;
        }
        reply.send(updated);
      }
    } else {
      updated = updateProject(projectId, body);
      if (!updated) {
        reply.code(404).send({ error: { code: "not_found", message: "Project not found" } });
        return;
      }
      reply.send(updated);
    }

    await recordAuditEvent(fastify, {
      userId: session.userId,
      projectId,
      eventType: "project:update",
      metadata: {
        changes: body,
      },
    });
  });

  fastify.delete("/projects/:projectId", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const projectId = (request.params as { projectId: string }).projectId;
    let deletedProject: { name?: string; category?: string; status?: string } | null = null;
    let deleted = false;

    if (fastify.db) {
      try {
        const result = await dbDeleteProject(fastify.db, projectId);
        deleted = result.deleted;
        deletedProject = result.project;
      } catch (err) {
        fastify.log.error({ err }, "Failed to delete project in database; falling back to memory.");
      }
    }

    if (!deleted) {
      const removed = deleteProject(projectId);
      if (!removed) {
        reply.code(404).send({ error: { code: "not_found", message: "Project not found" } });
        return;
      }
      deleted = true;
      deletedProject = removed;
    }

    await recordAuditEvent(fastify, {
      userId: session.userId,
      projectId,
      eventType: "project:delete",
      metadata: {
        name: deletedProject?.name,
        category: deletedProject?.category,
        status: deletedProject?.status,
      },
    });

    reply.code(204).send();
  });

  fastify.get("/projects/:projectId/details", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const projectId = (request.params as { projectId: string }).projectId;
    if (fastify.db) {
      try {
        const details = await dbProjectDetails(fastify.db, projectId);
        if (!details) {
          reply.code(404).send({ error: { code: "not_found", message: "Project not found" } });
          return;
        }
        reply.send(details);
        return;
      } catch (err) {
        fastify.log.error(
          { err },
          "Failed to fetch project details from database; falling back to memory."
        );
      }
    }

    const project = getProject(projectId);
    if (!project) {
      reply.code(404).send({ error: { code: "not_found", message: "Project not found" } });
      return;
    }

    reply.send({
      project,
      roadmapLists: listRoadmaps(projectId),
    });
  });

  fastify.post("/projects/:projectId/snapshots", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const projectId = (request.params as { projectId: string }).projectId;
    const body = request.body as { message?: string };
    if (fastify.db) {
      try {
        const snapshot = await dbAddSnapshot(fastify.db, projectId, body?.message);
        reply.code(201).send({ gitSha: snapshot.gitSha });
        return;
      } catch (err) {
        fastify.log.error({ err }, "Failed to add snapshot in database; falling back to memory.");
      }
    }

    const snapshot = addSnapshot(projectId, `mock-${Date.now()}`, body?.message);
    reply.code(201).send({ gitSha: snapshot.gitSha });
  });

  fastify.get("/projects/:projectId/snapshots", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const projectId = (request.params as { projectId: string }).projectId;
    if (fastify.db) {
      try {
        const snapshots = await dbListSnapshots(fastify.db, projectId);
        reply.send(snapshots);
        return;
      } catch (err) {
        fastify.log.error(
          { err },
          "Failed to read snapshots from database; falling back to memory."
        );
      }
    }

    reply.send(listSnapshots(projectId));
  });
};

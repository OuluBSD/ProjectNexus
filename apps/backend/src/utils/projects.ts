import type { FastifyInstance } from "fastify";
import { dbGetProject } from "../services/projectRepository";
import { getProject } from "../services/mockStore";

export async function findProject(fastify: FastifyInstance, projectId: string) {
  if (fastify.db) {
    try {
      const project = await dbGetProject(fastify.db, projectId);
      if (project) return project;
    } catch (err) {
      fastify.log.error({ err }, "Failed to read project from database; falling back to memory.");
    }
  }
  return getProject(projectId) ?? null;
}

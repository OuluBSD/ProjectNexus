import type { FastifyPluginAsync } from "fastify";
import { authRoutes } from "./auth";
import { chatRoutes } from "./chats";
import { auditRoutes } from "./audit";
import { fileRoutes } from "./files";
import { projectRoutes } from "./projects";
import { roadmapRoutes } from "./roadmaps";
import { templateRoutes } from "./templates";
import { terminalRoutes } from "./terminal";
import { aiChatRoutes } from "./ai-chat";
import { serverRoutes } from "./servers";

export const registerRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(authRoutes, { prefix: "/auth" });
  await fastify.register(projectRoutes);
  await fastify.register(roadmapRoutes);
  await fastify.register(chatRoutes);
  await fastify.register(templateRoutes);
  await fastify.register(fileRoutes);
  await fastify.register(terminalRoutes);
  await fastify.register(auditRoutes);
  await fastify.register(aiChatRoutes);
  await fastify.register(serverRoutes);
};

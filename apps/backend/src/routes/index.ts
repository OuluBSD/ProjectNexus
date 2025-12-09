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
import { aiChatPollingRoutes } from "./ai-chat-polling";
import { serverRoutes } from "./servers";
import { debugRoutes } from "./debug";
import { userSettingsRoutes } from "./user-settings";
import { commandExecutionRoutes } from "./command-execution";
import { qwenProbeRoutes } from "./qwen-probe";

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
  await fastify.register(aiChatPollingRoutes); // HTTP polling fallback
  await fastify.register(serverRoutes);
  await fastify.register(userSettingsRoutes);
  await fastify.register(debugRoutes);
  await fastify.register(commandExecutionRoutes);
  await fastify.register(qwenProbeRoutes);
};

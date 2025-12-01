/**
 * Qwen AI Plugin
 *
 * Connects to an external Qwen C++ TCP server.
 * The Qwen server should be started separately (manually, via systemd, or docker).
 *
 * To start Qwen server:
 *   ./deps/qwen-code/bin/Qwen --mode tcp --port 7777 --workspace /path/to/workspace
 */

import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { QwenClient } from "../services/qwenClient.js";
import { resolveQwenPath } from "@nexus/shared/qwenPath";

declare module "fastify" {
  interface FastifyInstance {
    qwenClient: QwenClient;
  }
}

const qwenPluginFunction: FastifyPluginAsync = async (fastify) => {
  // Check if AI is enabled
  const aiEnabled = process.env.ENABLE_AI === "true";
  fastify.log.info(`[QwenPlugin] ENABLE_AI="${process.env.ENABLE_AI}", aiEnabled=${aiEnabled}`);
  if (!aiEnabled) {
    fastify.log.info("[QwenPlugin] AI is disabled (ENABLE_AI !== true)");
    return;
  }

  // Get configuration from environment
  const mode = (process.env.QWEN_MODE || "stdio") as "stdio" | "tcp";
  const qwenPath = resolveQwenPath();

  fastify.log.info(`[QwenPlugin] Starting Qwen client in ${mode} mode`);

  // Clean up any orphaned processes from previous runs
  QwenClient.cleanupOrphanedProcesses();

  try {
    // Create client
    const client = new QwenClient({
      mode,
      qwenPath,
      workspaceRoot: process.cwd(),
      model: "qwen-2.5-flash",
    });

    // Start the client
    await client.start();
    fastify.log.info(`[QwenPlugin] Connected to qwen-code in ${mode} mode`);

    // Decorate Fastify with the client
    fastify.decorate("qwenClient", client);

    // Cleanup on server shutdown
    fastify.addHook("onClose", async () => {
      fastify.log.info("[QwenPlugin] Shutting down Qwen client...");
      await client.stop();
      fastify.log.info("[QwenPlugin] Qwen client stopped");
    });
  } catch (err) {
    fastify.log.error(`[QwenPlugin] Failed to start Qwen client:`, err);
    // Don't throw - allow backend to start without AI
  }
};

export const qwenPlugin = fp(qwenPluginFunction, {
  name: "qwen",
});

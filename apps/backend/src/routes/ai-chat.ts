import type { FastifyPluginAsync } from "fastify";
import { validateToken } from "../utils/auth.js";
import { AIBackendType } from "@nexus/shared/chat/AIBackend";
import { QwenCommand } from "../services/qwenClient.js";
import { createAiBridge, resolveAiChain } from "../services/aiChatBridge.js";

export const aiChatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/ai-chat/:sessionId", { websocket: true }, async (connection, request) => {
    const { sessionId } = request.params as { sessionId: string };
    const { backend, token } = request.query as {
      backend: AIBackendType;
      token: string;
    };

    const session = await validateToken(request.server, token);
    if (!session) {
      connection.socket.close(1008, "unauthorized");
      return;
    }

    fastify.log.info(
      `[AIChat] WebSocket connection for session ${sessionId} with backend ${backend}`
    );

    if (backend !== "qwen") {
      connection.socket.send(
        JSON.stringify({
          type: "error",
          message: `Backend '${backend}' not implemented`,
        })
      );
      connection.socket.close(1011, `Backend '${backend}' not implemented`);
      return;
    }

    let bridgeCleanup: (() => Promise<void>) | null = null;
    const approvedToolGroups = new Set<number>();

    try {
      const chain = await resolveAiChain(fastify);
      fastify.log.info(
        { manager: chain.manager?.id, worker: chain.worker?.id, ai: chain.ai.id },
        "[AIChat] Using AI chain"
      );

      // Send chain info to frontend for visibility
      connection.socket.send(
        JSON.stringify({
          type: "info",
          message: `Using AI server ${chain.ai.name} (${chain.ai.host}:${chain.ai.port})`,
          chain: {
            managerId: chain.manager?.id,
            workerId: chain.worker?.id,
            aiId: chain.ai.id,
          },
        })
      );

      const bridge = await createAiBridge(fastify.log, chain, (msg: any) => {
        if (connection.socket.readyState !== connection.socket.OPEN) {
          return;
        }

        // Auto-approve tool groups
        if (msg.type === "tool_group") {
          if (!approvedToolGroups.has(msg.id)) {
            approvedToolGroups.add(msg.id);
            fastify.log.info(
              `[AIChat] Auto-approving tool group ${msg.id} with ${msg.tools.length} tools`
            );
            for (const tool of msg.tools) {
              bridge.send({
                type: "tool_approval",
                approved: true,
                tool_id: tool.tool_id,
              });
            }
          }
        }

        connection.socket.send(JSON.stringify(msg));
      });

      connection.socket.send(
        JSON.stringify({
          type: "status",
          state: "idle",
          message: `Connected via ${bridge.transport}`,
          transport: bridge.transport,
        })
      );

      bridgeCleanup = async () => {
        await bridge.shutdown();
      };

      connection.socket.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as QwenCommand;
          bridge.send(message);
        } catch (err) {
          fastify.log.error(err, "Failed to handle message");
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, "[AIChat] Failed to initialize AI bridge");
      connection.socket.send(
        JSON.stringify({
          type: "error",
          message: err?.message || "Failed to initialize AI chat",
        })
      );
      connection.socket.close(1011, "AI bridge error");
      return;
    }

    connection.socket.on("close", async () => {
      fastify.log.info(`[AIChat] WebSocket for session ${sessionId} closed`);
      if (bridgeCleanup) {
        try {
          await bridgeCleanup();
        } catch (err) {
          fastify.log.error({ err }, "[AIChat] Error during bridge cleanup");
        }
      }
    });
  });
};

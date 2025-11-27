import type { FastifyPluginAsync } from "fastify";
import { validateToken } from "../utils/auth.js";
import { AIBackendType } from "@nexus/shared/chat/AIBackend";
import { QwenCommand, QwenServerMessage } from "../services/qwenClient.js";

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

    if (backend === "qwen") {
      if (!fastify.qwenClient || !fastify.qwenClient.isConnected()) {
        connection.socket.send(
          JSON.stringify({
            type: "error",
            message: "Qwen AI backend not connected",
          })
        );
        connection.socket.close(1011, "Qwen AI backend not connected");
        return;
      }

      const qwenClient = fastify.qwenClient;
      let streamingContent = "";

      const messageHandler = (msg: QwenServerMessage) => {
        if (connection.socket.readyState === connection.socket.OPEN) {
          if (msg.type === "conversation" && msg.role === "assistant") {
            if (msg.isStreaming !== false) {
              streamingContent += msg.content;
              connection.socket.send(
                JSON.stringify({
                  ...msg,
                  content: streamingContent,
                })
              );
            } else {
              connection.socket.send(
                JSON.stringify({
                  ...msg,
                  content: streamingContent,
                })
              );
              streamingContent = "";
            }
          } else {
            connection.socket.send(JSON.stringify(msg));
          }
        }
      };

      qwenClient.addMessageHandler(messageHandler);

      connection.socket.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as QwenCommand;
          qwenClient.send(message);
        } catch (err) {
          fastify.log.error(err, "Failed to handle message");
        }
      });

      connection.socket.on("close", () => {
        fastify.log.info(`[AIChat] WebSocket for session ${sessionId} closed`);
        qwenClient.removeMessageHandler(messageHandler);
      });
    } else {
      connection.socket.send(
        JSON.stringify({
          type: "error",
          message: `Backend '${backend}' not implemented`,
        })
      );
      connection.socket.close(1011, `Backend '${backend}' not implemented`);
    }
  });
};

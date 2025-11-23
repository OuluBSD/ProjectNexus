import type { FastifyPluginAsync } from "fastify";
import {
  dbAddMessage,
  dbCreateChat,
  dbGetMessages,
  dbListChats,
  dbSyncMetaFromChats,
  dbUpdateChat,
} from "../services/projectRepository";
import { addMessage, createChat, getMessages, listChats, syncRoadmapMeta, updateChat } from "../services/mockStore";
import { requireSession } from "../utils/auth";

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/roadmaps/:roadmapId/chats", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const roadmapId = (request.params as { roadmapId: string }).roadmapId;
    if (fastify.db) {
      try {
        reply.send(await dbListChats(fastify.db, roadmapId));
        return;
      } catch (err) {
        fastify.log.error({ err }, "Failed to list chats from database; falling back to memory.");
      }
    }
    reply.send(listChats(roadmapId));
  });

  fastify.post("/roadmaps/:roadmapId/chats", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const roadmapId = (request.params as { roadmapId: string }).roadmapId;
    if (fastify.db) {
      try {
        const chat = await dbCreateChat(
          fastify.db,
          roadmapId,
          (request.body as Record<string, unknown>) ?? {},
        );
        await dbSyncMetaFromChats(fastify.db, roadmapId);
        reply.code(201).send({ id: chat.id });
        return;
      } catch (err) {
        fastify.log.error({ err }, "Failed to create chat in database; using in-memory store.");
      }
    }
    const chat = createChat(roadmapId, (request.body as Record<string, unknown>) ?? {});
    syncRoadmapMeta(roadmapId);
    reply.code(201).send({ id: chat.id });
  });

  fastify.post("/roadmaps/:roadmapId/chats/from-template", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const roadmapId = (request.params as { roadmapId: string }).roadmapId;
    const body = request.body as { templateId: string; title?: string; goal?: string; metadata?: unknown };
    const payload = {
      templateId: body?.templateId,
      title: body?.title,
      goal: body?.goal,
      metadata: body?.metadata as Record<string, unknown>,
    };
    if (fastify.db) {
      try {
        const chat = await dbCreateChat(fastify.db, roadmapId, payload);
        await dbSyncMetaFromChats(fastify.db, roadmapId);
        reply.code(201).send({ id: chat.id });
        return;
      } catch (err) {
        fastify.log.error({ err }, "Failed to create chat from template in database; using in-memory store.");
      }
    }
    const chat = createChat(roadmapId, payload);
    syncRoadmapMeta(roadmapId);
    reply.code(201).send({ id: chat.id });
  });

  fastify.patch("/chats/:chatId", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const chatId = (request.params as { chatId: string }).chatId;
    if (fastify.db) {
      try {
        const updated = await dbUpdateChat(
          fastify.db,
          chatId,
          (request.body as Record<string, unknown>) ?? {},
        );
        if (!updated) {
          reply.code(404).send({ error: { code: "not_found", message: "Chat not found" } });
          return;
        }
        reply.send(updated);
        await dbSyncMetaFromChats(fastify.db, updated.roadmapListId);
        return;
      } catch (err) {
        fastify.log.error({ err }, "Failed to update chat in database; falling back to memory.");
      }
    }
    const updated = updateChat(chatId, (request.body as Record<string, unknown>) ?? {});
    if (!updated) {
      reply.code(404).send({ error: { code: "not_found", message: "Chat not found" } });
      return;
    }
    reply.send(updated);
    syncRoadmapMeta(updated.roadmapListId);
  });

  fastify.get("/chats/:chatId/messages", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const chatId = (request.params as { chatId: string }).chatId;
    if (fastify.db) {
      try {
        reply.send(await dbGetMessages(fastify.db, chatId));
        return;
      } catch (err) {
        fastify.log.error({ err }, "Failed to load chat messages from database; falling back to memory.");
      }
    }
    reply.send(getMessages(chatId));
  });

  fastify.post("/chats/:chatId/messages", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const chatId = (request.params as { chatId: string }).chatId;
    const body = request.body as { role: "user" | "assistant" | "system" | "status" | "meta"; content: string };
    if (fastify.db) {
      try {
        const message = await dbAddMessage(fastify.db, chatId, {
          role: body.role ?? "user",
          content: body.content,
        });
        reply.code(201).send({ id: message.id });
        return;
      } catch (err) {
        fastify.log.error({ err }, "Failed to append message in database; using in-memory store.");
      }
    }
    const message = addMessage(chatId, {
      chatId,
      role: body.role ?? "user",
      content: body.content,
    });
    reply.code(201).send({ id: message.id });
  });

  fastify.post("/chats/:chatId/status", async (request, reply) => {
    if (!(await requireSession(request, reply))) return;
    const chatId = (request.params as { chatId: string }).chatId;
    const body = request.body as { status?: string; progress?: number; focus?: string };
    const patch = {
      status: body?.status ?? "in_progress",
      progress: body?.progress ?? 0,
      metadata: { focus: body?.focus },
    };
    if (fastify.db) {
      try {
        const updated = await dbUpdateChat(fastify.db, chatId, patch);
        if (!updated) {
          reply.code(404).send({ error: { code: "not_found", message: "Chat not found" } });
          return;
        }
        reply.send(updated);
        await dbSyncMetaFromChats(fastify.db, updated.roadmapListId);
        return;
      } catch (err) {
        fastify.log.error({ err }, "Failed to update chat status in database; falling back to memory.");
      }
    }
    const updated = updateChat(chatId, patch);
    if (!updated) {
      reply.code(404).send({ error: { code: "not_found", message: "Chat not found" } });
      return;
    }
    reply.send(updated);
    syncRoadmapMeta(updated.roadmapListId);
  });
};

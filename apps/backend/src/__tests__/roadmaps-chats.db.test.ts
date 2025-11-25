import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@nexus/shared/db/schema";
import { roadmapRoutes } from "../routes/roadmaps";
import { chatRoutes } from "../routes/chats";
import { createSession, store } from "../services/mockStore";
import { dbFindChatForMerge } from "../services/projectRepository";

async function buildDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const migrationsFolder = path.resolve(
    new URL("../../../../packages/shared/db/migrations", import.meta.url).pathname
  );
  await migrate(db, { migrationsFolder });
  return { client, db };
}

function makeApp(db: ReturnType<typeof drizzle>) {
  const app = Fastify({ logger: false }) as FastifyInstance & { db: typeof db };
  app.db = db as any;
  return app;
}

test("roadmap endpoints use the database and expose meta-chat linkage", async () => {
  const { client, db } = await buildDb();
  const app = makeApp(db);
  await app.register(roadmapRoutes);
  await app.ready();

  const session = createSession("db-roadmaps");

  try {
    const [project] = await db.insert(schema.projects).values({ name: "Roadmap Host" }).returning();

    const createRes = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/roadmaps`,
      headers: { "x-session-token": session.token },
      payload: { title: "DB Roadmap", tags: ["api", "db"], progress: 0.1 },
    });
    assert.equal(createRes.statusCode, 201);
    const created = createRes.json() as { id: string; metaChatId: string };
    assert.ok(created.id, "roadmap id returned");
    assert.ok(created.metaChatId, "meta-chat id returned");

    const [roadmapRow] = await db
      .select()
      .from(schema.roadmapLists)
      .where(eq(schema.roadmapLists.id, created.id));
    assert.equal(roadmapRow?.title, "DB Roadmap");
    assert.equal(roadmapRow?.tags, "api,db");
    assert.equal(roadmapRow?.metaChatId, created.metaChatId);

    const listRes = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/roadmaps`,
      headers: { "x-session-token": session.token },
    });
    assert.equal(listRes.statusCode, 200);
    const listed = listRes.json() as Array<{
      id: string;
      title: string;
      tags: string[];
      progress: number;
      metaChatId?: string;
    }>;
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, created.id);
    assert.deepEqual(listed[0].tags, ["api", "db"]);
    assert.equal(listed[0].metaChatId, created.metaChatId);
    assert.equal(listed[0].progress, 0.1);

    const patchRes = await app.inject({
      method: "PATCH",
      url: `/roadmaps/${created.id}`,
      headers: { "x-session-token": session.token },
      payload: { title: "Renamed", status: "waiting", progress: 0.5, tags: ["ux"] },
    });
    assert.equal(patchRes.statusCode, 200);
    const patched = patchRes.json() as {
      id: string;
      title: string;
      status: string;
      progress: number;
      tags: string[];
    };
    assert.equal(patched.title, "Renamed");
    assert.equal(patched.status, "waiting");
    assert.equal(patched.progress, 0.5);
    assert.deepEqual(patched.tags, ["ux"]);

    const metaRes = await app.inject({
      method: "GET",
      url: `/roadmaps/${created.id}/meta-chat`,
      headers: { "x-session-token": session.token },
    });
    assert.equal(metaRes.statusCode, 200);
    const meta = metaRes.json() as { id: string; roadmapListId: string };
    assert.equal(meta.id, created.metaChatId);
    assert.equal(meta.roadmapListId, created.id);
  } finally {
    await app.close();
    await client.close();
    store.sessions.delete(session.token);
  }
});

test("chat endpoints persist to the database and keep roadmap meta in sync", async () => {
  const { client, db } = await buildDb();
  const app = makeApp(db);
  await app.register(roadmapRoutes);
  await app.register(chatRoutes);
  await app.ready();

  const session = createSession("db-chats");

  try {
    const [project] = await db.insert(schema.projects).values({ name: "Chat Host" }).returning();
    const roadmapRes = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/roadmaps`,
      headers: { "x-session-token": session.token },
      payload: { title: "Chat Roadmap" },
    });
    assert.equal(roadmapRes.statusCode, 201);
    const roadmap = roadmapRes.json() as { id: string };

    const createChat = await app.inject({
      method: "POST",
      url: `/roadmaps/${roadmap.id}/chats`,
      headers: { "x-session-token": session.token },
      payload: { title: "Chat A", progress: 0.2 },
    });
    assert.equal(createChat.statusCode, 201);
    const chatId = (createChat.json() as { id: string }).id;
    assert.ok(chatId, "chat id returned");

    const [chatRow] = await db.select().from(schema.chats).where(eq(schema.chats.id, chatId));
    assert.equal(chatRow?.title, "Chat A");
    assert.equal(Number(chatRow?.progress ?? 0), 0.2);

    const listRes = await app.inject({
      method: "GET",
      url: `/roadmaps/${roadmap.id}/chats`,
      headers: { "x-session-token": session.token },
    });
    assert.equal(listRes.statusCode, 200);
    const listed = listRes.json() as Array<{ id: string; progress: number; title: string }>;
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, chatId);
    assert.equal(listed[0].progress, 0.2);

    const statusRes = await app.inject({
      method: "GET",
      url: `/roadmaps/${roadmap.id}/status`,
      headers: { "x-session-token": session.token },
    });
    assert.equal(statusRes.statusCode, 200);
    const status = statusRes.json() as { progress: number; status: string };
    assert.equal(status.progress, 0.2);
    assert.equal(status.status, "in_progress");

    const patchRes = await app.inject({
      method: "PATCH",
      url: `/chats/${chatId}`,
      headers: { "x-session-token": session.token },
      payload: { progress: 0.8, status: "waiting", metadata: { focus: "db sync" } },
    });
    assert.equal(patchRes.statusCode, 200);
    const patched = patchRes.json() as {
      id: string;
      progress: number;
      status: string;
      metadata?: Record<string, unknown>;
    };
    assert.equal(patched.progress, 0.8);
    assert.equal(patched.status, "waiting");
    assert.deepEqual(patched.metadata, { focus: "db sync" });

    const statusAfterPatch = await app.inject({
      method: "GET",
      url: `/roadmaps/${roadmap.id}/status`,
      headers: { "x-session-token": session.token },
    });
    assert.equal(statusAfterPatch.statusCode, 200);
    const after = statusAfterPatch.json() as { progress: number; status: string };
    assert.equal(after.progress, 0.8);
    assert.equal(after.status, "waiting");

    const appendMessage = await app.inject({
      method: "POST",
      url: `/chats/${chatId}/messages`,
      headers: { "x-session-token": session.token },
      payload: { role: "user", content: "hello db chat" },
    });
    assert.equal(appendMessage.statusCode, 201);

    const messagesRes = await app.inject({
      method: "GET",
      url: `/chats/${chatId}/messages`,
      headers: { "x-session-token": session.token },
    });
    assert.equal(messagesRes.statusCode, 200);
    const messages = messagesRes.json() as Array<{ role: string; content: string }>;
    assert.equal(messages.length, 1);
    assert.equal(messages[0].role, "user");
    assert.equal(messages[0].content, "hello db chat");
  } finally {
    await app.close();
    await client.close();
    store.sessions.delete(session.token);
  }
});

test("chat merge endpoint moves messages and removes the source chat", async () => {
  const { client, db } = await buildDb();
  const app = makeApp(db);
  await app.register(roadmapRoutes);
  await app.register(chatRoutes);
  await app.ready();

  const session = createSession("db-chats-merge");

  try {
    const [project] = await db.insert(schema.projects).values({ name: "Merge Host" }).returning();
    const roadmapRes = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/roadmaps`,
      headers: { "x-session-token": session.token },
      payload: { title: "Merge Roadmap" },
    });
    assert.equal(roadmapRes.statusCode, 201);
    const roadmap = roadmapRes.json() as { id: string };

    const createSource = await app.inject({
      method: "POST",
      url: `/roadmaps/${roadmap.id}/chats`,
      headers: { "x-session-token": session.token },
      payload: { title: "Source Chat", progress: 0.2, status: "waiting" },
    });
    assert.equal(createSource.statusCode, 201);
    const sourceChatId = (createSource.json() as { id: string }).id;

    const createTarget = await app.inject({
      method: "POST",
      url: `/roadmaps/${roadmap.id}/chats`,
      headers: { "x-session-token": session.token },
      payload: { title: "Target Chat", progress: 0.8, status: "in_progress" },
    });
    assert.equal(createTarget.statusCode, 201);
    const targetChatId = (createTarget.json() as { id: string }).id;

    await app.inject({
      method: "POST",
      url: `/chats/${sourceChatId}/messages`,
      headers: { "x-session-token": session.token },
      payload: { role: "user", content: "message from source" },
    });
    await app.inject({
      method: "POST",
      url: `/chats/${targetChatId}/messages`,
      headers: { "x-session-token": session.token },
      payload: { role: "user", content: "existing target message" },
    });

    const mergeRes = await app.inject({
      method: "POST",
      url: `/chats/${sourceChatId}/merge`,
      headers: { "x-session-token": session.token },
      payload: { targetIdentifier: "Target Chat" },
    });
    assert.equal(mergeRes.statusCode, 200);
    const mergedPayload = mergeRes.json() as {
      target: { id: string; title: string; progress: number };
      removedChatId: string;
    };
    assert.equal(mergedPayload.removedChatId, sourceChatId);
    assert.equal(mergedPayload.target.id, targetChatId);
    assert.equal(mergedPayload.target.title, "Target Chat");
    assert.equal(mergedPayload.target.progress, 0.8);

    const [sourceRow] = await db
      .select()
      .from(schema.chats)
      .where(eq(schema.chats.id, sourceChatId));
    assert.equal(sourceRow, undefined);

    const messageRows = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.chatId, targetChatId));
    assert.equal(messageRows.length, 2);
    assert.ok(messageRows.some((msg) => msg.content === "message from source"));
    assert.ok(messageRows.some((msg) => msg.content === "existing target message"));

    const [metaRow] = await db
      .select()
      .from(schema.metaChats)
      .where(eq(schema.metaChats.roadmapListId, roadmap.id));
    assert.ok(metaRow);
    assert.equal(Number(metaRow?.progress ?? 0), 0.8);
    assert.equal(metaRow?.status, "in_progress");

    const [roadmapRow] = await db
      .select()
      .from(schema.roadmapLists)
      .where(eq(schema.roadmapLists.id, roadmap.id));
    assert.ok(roadmapRow);
    assert.equal(Number(roadmapRow?.progress ?? 0), 0.8);
    assert.equal(roadmapRow?.status, "in_progress");
  } finally {
    await app.close();
    await client.close();
    store.sessions.delete(session.token);
  }
});

test("dbFindChatForMerge tolerates trimmed identifiers and case-insensitive titles", async () => {
  const { client, db } = await buildDb();
  try {
    const [project] = await db.insert(schema.projects).values({ name: "Finder Host" }).returning();
    const [roadmap] = await db
      .insert(schema.roadmapLists)
      .values({
        projectId: project.id,
        title: "Finder Roadmap",
        tags: "merge",
        progress: 0,
        status: "in_progress",
      })
      .returning();
    const [targetChat] = await db
      .insert(schema.chats)
      .values({
        roadmapListId: roadmap.id,
        title: "Target Finder",
        status: "in_progress",
        progress: 0,
      })
      .returning();
    const [sourceChat] = await db
      .insert(schema.chats)
      .values({
        roadmapListId: roadmap.id,
        title: "Source Finder",
        status: "in_progress",
        progress: 0,
      })
      .returning();

    const foundById = await dbFindChatForMerge(
      db,
      roadmap.id,
      `  ${targetChat.id}  `,
      sourceChat.id
    );
    assert.equal(foundById?.id, targetChat.id);

    const foundByTitle = await dbFindChatForMerge(
      db,
      roadmap.id,
      "  TARGET FINDER  ",
      sourceChat.id
    );
    assert.equal(foundByTitle?.id, targetChat.id);

    const skipSelfMatch = await dbFindChatForMerge(db, roadmap.id, targetChat.id, targetChat.id);
    assert.equal(skipSelfMatch, null);
  } finally {
    await client.close();
  }
});

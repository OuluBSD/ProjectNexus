import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@nexus/shared/db/schema";
import type { Chat, Message, MetaChat, Project, RoadmapList, Snapshot, Template } from "../types";

export type Database = NodePgDatabase<typeof schema>;

type ProjectInput = Partial<Project>;
type RoadmapInput = Partial<RoadmapList>;
type ChatInput = Partial<Chat>;
type TemplateInput = Partial<Template>;
type MessageInput = Pick<Message, "role" | "content" | "metadata">;

const UUID_REGEX = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function deriveStatus(statuses: string[]) {
  if (statuses.length === 0) return "idle";
  if (statuses.every((status) => status === "done")) return "done";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "error")) return "error";
  if (statuses.some((status) => status === "waiting")) return "waiting";
  return "in_progress";
}

function mapProject(row: typeof schema.projects.$inferSelect): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
    status: row.status ?? "active",
    theme: (row.theme as Record<string, unknown> | null) ?? undefined,
  };
}

function mapRoadmap(row: typeof schema.roadmapLists.$inferSelect): RoadmapList {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    tags: row.tags
      ? row.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
    progress: Number(row.progress ?? 0),
    status: row.status ?? "in_progress",
    metaChatId: row.metaChatId ?? undefined,
  };
}

function mapMetaChat(row: typeof schema.metaChats.$inferSelect): MetaChat {
  return {
    id: row.id,
    roadmapListId: row.roadmapListId,
    status: row.status ?? "in_progress",
    progress: Number(row.progress ?? 0),
    summary: row.summary ?? undefined,
  };
}

function mapTemplate(row: typeof schema.templates.$inferSelect): Template {
  return {
    id: row.id,
    title: row.title,
    goal: row.goal ?? undefined,
    systemPrompt: row.systemPrompt ?? undefined,
    starterMessages:
      (row.starterMessages as Array<{ role: string; content: string }> | null) ?? undefined,
    javascriptPrompt: row.javascriptPrompt ?? undefined,
    javascriptLogic: row.javascriptLogic ?? undefined,
    jsonRequired: row.jsonRequired ?? false,
    metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
  };
}

function mapChat(row: typeof schema.chats.$inferSelect): Chat {
  return {
    id: row.id,
    roadmapListId: row.roadmapListId,
    title: row.title,
    goal: row.goal ?? undefined,
    templateId: row.templateId ?? undefined,
    status: row.status ?? "in_progress",
    progress: Number(row.progress ?? 0),
    metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
  };
}

function mapMessage(row: typeof schema.messages.$inferSelect): Message {
  return {
    id: row.id.toString(),
    chatId: row.chatId,
    role: (row.role as Message["role"]) ?? "user",
    content: row.content,
    metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
    createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

function mapSnapshot(row: typeof schema.snapshots.$inferSelect): Snapshot {
  return {
    id: row.id,
    projectId: row.projectId,
    gitSha: row.gitSha,
    message: row.message ?? undefined,
    createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

export async function dbListProjects(db: Database): Promise<Project[]> {
  const rows = await db.select().from(schema.projects);
  return rows.map(mapProject);
}

export async function dbGetProject(db: Database, projectId: string): Promise<Project | null> {
  const [row] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
  return row ? mapProject(row) : null;
}

export async function dbCreateProject(db: Database, payload: ProjectInput): Promise<Project> {
  const [row] = await db
    .insert(schema.projects)
    .values({
      name: payload.name ?? "Untitled Project",
      description: payload.description,
      category: payload.category,
      status: payload.status ?? "active",
      theme: payload.theme as Record<string, unknown> | undefined,
    })
    .returning();
  return mapProject(row);
}

export async function dbUpdateProject(
  db: Database,
  projectId: string,
  patch: ProjectInput
): Promise<Project | null> {
  const [row] = await db
    .update(schema.projects)
    .set({
      name: patch.name,
      description: patch.description,
      category: patch.category,
      status: patch.status,
      theme: patch.theme as Record<string, unknown> | undefined,
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, projectId))
    .returning();
  return row ? mapProject(row) : null;
}

export async function dbListRoadmaps(db: Database, projectId: string): Promise<RoadmapList[]> {
  const rows = await db
    .select()
    .from(schema.roadmapLists)
    .where(eq(schema.roadmapLists.projectId, projectId));
  return rows.map(mapRoadmap);
}

export async function dbCreateRoadmap(
  db: Database,
  projectId: string,
  payload: RoadmapInput
): Promise<{ roadmap: RoadmapList; metaChat: MetaChat }> {
  const [roadmapRow] = await db
    .insert(schema.roadmapLists)
    .values({
      projectId,
      title: payload.title ?? "Untitled Roadmap",
      tags: (payload.tags ?? []).join(","),
      progress: String(payload.progress ?? 0),
      status: payload.status ?? "in_progress",
    })
    .returning();

  const [metaRow] = await db
    .insert(schema.metaChats)
    .values({
      roadmapListId: roadmapRow.id,
      status: "in_progress",
      progress: "0",
      summary: "Awaiting chat updates",
    })
    .returning();

  const [patchedRoadmap] = await db
    .update(schema.roadmapLists)
    .set({ metaChatId: metaRow.id, updatedAt: new Date() })
    .where(eq(schema.roadmapLists.id, roadmapRow.id))
    .returning();

  return { roadmap: mapRoadmap(patchedRoadmap ?? roadmapRow), metaChat: mapMetaChat(metaRow) };
}

export async function dbUpdateRoadmap(
  db: Database,
  roadmapId: string,
  patch: RoadmapInput
): Promise<RoadmapList | null> {
  const [row] = await db
    .update(schema.roadmapLists)
    .set({
      title: patch.title,
      tags: patch.tags ? patch.tags.join(",") : undefined,
      progress: patch.progress != null ? String(patch.progress) : undefined,
      status: patch.status,
      updatedAt: new Date(),
    })
    .where(eq(schema.roadmapLists.id, roadmapId))
    .returning();
  return row ? mapRoadmap(row) : null;
}

export async function dbGetMetaChat(db: Database, roadmapId: string): Promise<MetaChat | null> {
  const [row] = await db
    .select()
    .from(schema.metaChats)
    .where(eq(schema.metaChats.roadmapListId, roadmapId));
  return row ? mapMetaChat(row) : null;
}

export async function dbListTemplates(db: Database): Promise<Template[]> {
  const rows = await db.select().from(schema.templates);
  return rows.map(mapTemplate);
}

export async function dbGetTemplate(db: Database, templateId: string): Promise<Template | null> {
  const [row] = await db.select().from(schema.templates).where(eq(schema.templates.id, templateId));
  return row ? mapTemplate(row) : null;
}

export async function dbCreateTemplate(db: Database, payload: TemplateInput): Promise<Template> {
  const [row] = await db
    .insert(schema.templates)
    .values({
      title: payload.title ?? "Untitled Template",
      goal: payload.goal,
      systemPrompt: payload.systemPrompt,
      starterMessages: payload.starterMessages,
      javascriptPrompt: payload.javascriptPrompt,
      javascriptLogic: payload.javascriptLogic,
      jsonRequired: payload.jsonRequired ?? false,
      metadata: payload.metadata,
    })
    .returning();
  return mapTemplate(row);
}

export async function dbUpdateTemplate(
  db: Database,
  templateId: string,
  patch: TemplateInput
): Promise<Template | null> {
  const [row] = await db
    .update(schema.templates)
    .set({
      title: patch.title,
      goal: patch.goal,
      systemPrompt: patch.systemPrompt,
      starterMessages: patch.starterMessages,
      javascriptPrompt: patch.javascriptPrompt,
      javascriptLogic: patch.javascriptLogic,
      jsonRequired: patch.jsonRequired,
      metadata: patch.metadata,
      updatedAt: new Date(),
    })
    .where(eq(schema.templates.id, templateId))
    .returning();
  return row ? mapTemplate(row) : null;
}

export async function dbListChats(db: Database, roadmapId: string): Promise<Chat[]> {
  const rows = await db
    .select()
    .from(schema.chats)
    .where(eq(schema.chats.roadmapListId, roadmapId));
  return rows.map(mapChat);
}

export async function dbCreateChat(
  db: Database,
  roadmapId: string,
  payload: ChatInput
): Promise<Chat> {
  const [row] = await db
    .insert(schema.chats)
    .values({
      roadmapListId: roadmapId,
      title: payload.title ?? "New Chat",
      goal: payload.goal,
      templateId: payload.templateId,
      status: payload.status ?? "in_progress",
      progress: String(payload.progress ?? 0),
      metadata: payload.metadata,
    })
    .returning();
  return mapChat(row);
}

export async function dbUpdateChat(
  db: Database,
  chatId: string,
  patch: ChatInput
): Promise<Chat | null> {
  const [row] = await db
    .update(schema.chats)
    .set({
      title: patch.title,
      goal: patch.goal,
      templateId: patch.templateId,
      status: patch.status,
      progress: patch.progress != null ? String(patch.progress) : undefined,
      metadata: patch.metadata,
      updatedAt: new Date(),
    })
    .where(eq(schema.chats.id, chatId))
    .returning();
  return row ? mapChat(row) : null;
}

export async function dbGetChat(db: Database, chatId: string): Promise<Chat | null> {
  const [row] = await db.select().from(schema.chats).where(eq(schema.chats.id, chatId));
  return row ? mapChat(row) : null;
}

export async function dbFindChatForMerge(
  db: Database,
  roadmapId: string,
  identifier: string,
  sourceChatId: string
): Promise<Chat | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  if (UUID_REGEX.test(trimmed)) {
    const directMatch = await dbGetChat(db, trimmed);
    if (directMatch && directMatch.roadmapListId === roadmapId && directMatch.id !== sourceChatId) {
      return directMatch;
    }
  }
  const normalized = trimmed.toLowerCase();
  const chats = await dbListChats(db, roadmapId);
  return (
    chats.find(
      (chat) => chat.id !== sourceChatId && (chat.title ?? "").trim().toLowerCase() === normalized
    ) ?? null
  );
}

export async function dbMergeChats(
  db: Database,
  sourceChatId: string,
  targetChatId: string
): Promise<Chat | null> {
  await db
    .update(schema.messages)
    .set({ chatId: targetChatId })
    .where(eq(schema.messages.chatId, sourceChatId));
  await db.delete(schema.chats).where(eq(schema.chats.id, sourceChatId));
  await db
    .update(schema.chats)
    .set({ updatedAt: new Date() })
    .where(eq(schema.chats.id, targetChatId));
  return dbGetChat(db, targetChatId);
}

export async function dbSyncMetaFromChats(
  db: Database,
  roadmapId: string
): Promise<MetaChat | null> {
  const chats = await db
    .select()
    .from(schema.chats)
    .where(eq(schema.chats.roadmapListId, roadmapId));
  const progress =
    chats.length === 0
      ? 0
      : chats.reduce((sum, chat) => sum + Number(chat.progress ?? 0), 0) / chats.length;
  const status = deriveStatus(chats.map((chat) => chat.status ?? "in_progress"));

  const [metaRow] = await db
    .update(schema.metaChats)
    .set({
      progress: String(progress),
      status,
      summary: `Aggregated from ${chats.length} chats`,
      updatedAt: new Date(),
    })
    .where(eq(schema.metaChats.roadmapListId, roadmapId))
    .returning();

  await db
    .update(schema.roadmapLists)
    .set({ progress: String(progress), status, updatedAt: new Date() })
    .where(eq(schema.roadmapLists.id, roadmapId));

  return metaRow ? mapMetaChat(metaRow) : null;
}

export async function dbAddMessage(
  db: Database,
  chatId: string,
  payload: MessageInput
): Promise<Message> {
  const [row] = await db
    .insert(schema.messages)
    .values({
      chatId,
      role: payload.role,
      content: payload.content,
      metadata: payload.metadata,
    })
    .returning();
  return mapMessage(row);
}

export async function dbGetMessages(db: Database, chatId: string): Promise<Message[]> {
  const rows = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.chatId, chatId))
    .orderBy(schema.messages.createdAt);
  return rows.map(mapMessage);
}

export async function dbAddSnapshot(
  db: Database,
  projectId: string,
  message?: string
): Promise<Snapshot> {
  const [row] = await db
    .insert(schema.snapshots)
    .values({
      projectId,
      message,
      gitSha: crypto.randomBytes(20).toString("hex"),
    })
    .returning();
  return mapSnapshot(row);
}

export async function dbListSnapshots(db: Database, projectId: string): Promise<Snapshot[]> {
  const rows = await db
    .select()
    .from(schema.snapshots)
    .where(eq(schema.snapshots.projectId, projectId));
  return rows.map(mapSnapshot);
}

export async function dbProjectDetails(db: Database, projectId: string) {
  const project = await dbGetProject(db, projectId);
  if (!project) return null;
  const roadmapLists = await dbListRoadmaps(db, projectId);
  return { project, roadmapLists };
}

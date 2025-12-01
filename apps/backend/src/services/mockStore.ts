import crypto from "node:crypto";
import type {
  Chat,
  Message,
  MetaChat,
  MetaChatMessage,
  Project,
  RoadmapList,
  Session,
  Snapshot,
  Template,
  TerminalSession,
} from "../types";
import { eventBus } from "./eventBus";

type Store = {
  projects: Map<string, Project>;
  roadmapLists: Map<string, RoadmapList>;
  chats: Map<string, Chat>;
  metaChats: Map<string, MetaChat>;
  messages: Map<string, Message[]>;
  metaChatMessages: Map<string, MetaChatMessage[]>;
  templates: Map<string, Template>;
  snapshots: Map<string, Snapshot[]>;
  sessions: Map<string, Session>;
  terminalSessions: Map<string, TerminalSession>;
};

export const store: Store = {
  projects: new Map(),
  roadmapLists: new Map(),
  chats: new Map(),
  metaChats: new Map(),
  messages: new Map(),
  metaChatMessages: new Map(),
  templates: new Map(),
  snapshots: new Map(),
  sessions: new Map(),
  terminalSessions: new Map(),
};

let persistHandler: (() => void) | null = null;

export function attachPersistence(handler: () => void) {
  persistHandler = handler;
}

function triggerPersist() {
  persistHandler?.();
}

function deriveStatus(statuses: string[]) {
  if (statuses.length === 0) return "idle";
  if (statuses.every((status) => status === "done")) return "done";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "error")) return "error";
  if (statuses.some((status) => status === "waiting")) return "waiting";
  return "in_progress";
}

export function createSession(username: string): Session {
  const token = crypto.randomUUID();
  const session: Session = { token, userId: `user-${username}`, username };
  store.sessions.set(token, session);
  return session;
}

export function listProjects() {
  return Array.from(store.projects.values());
}

export function getProject(projectId: string) {
  return store.projects.get(projectId);
}

export function createProject(payload: Partial<Project>) {
  const project: Project = {
    id: crypto.randomUUID(),
    name: payload.name ?? "Untitled Project",
    category: payload.category,
    status: payload.status ?? "active",
    theme: payload.theme,
    description: payload.description,
    contentPath: payload.contentPath,
    gitUrl: payload.gitUrl,
  };
  store.projects.set(project.id, project);
  triggerPersist();
  return project;
}

export function deleteProject(projectId: string) {
  const project = store.projects.get(projectId);
  if (!project) return null;

  const roadmapsToRemove = listRoadmaps(projectId);
  roadmapsToRemove.forEach((roadmap) => {
    const chatsForRoadmap = listChats(roadmap.id);
    chatsForRoadmap.forEach((chat) => {
      store.messages.delete(chat.id);
      store.chats.delete(chat.id);
    });

    const meta = getMetaChat(roadmap.id);
    if (meta) {
      store.metaChats.delete(meta.id);
      store.metaChatMessages.delete(meta.id);
    }

    store.roadmapLists.delete(roadmap.id);
  });

  store.snapshots.delete(projectId);
  store.projects.delete(projectId);

  triggerPersist();
  return project;
}

export function updateProject(projectId: string, patch: Partial<Project>) {
  const current = store.projects.get(projectId);
  if (!current) return null;
  const next = { ...current, ...patch };
  store.projects.set(projectId, next);
  triggerPersist();
  return next;
}

export function listRoadmaps(projectId: string) {
  return Array.from(store.roadmapLists.values()).filter((r) => r.projectId === projectId);
}

export function createRoadmap(projectId: string, payload: Partial<RoadmapList>) {
  const roadmap: RoadmapList = {
    id: crypto.randomUUID(),
    projectId,
    title: payload.title ?? "Untitled Roadmap",
    tags: payload.tags ?? [],
    progress: payload.progress ?? 0,
    status: payload.status ?? "in_progress",
  };
  store.roadmapLists.set(roadmap.id, roadmap);
  const meta: MetaChat = {
    id: crypto.randomUUID(),
    roadmapListId: roadmap.id,
    status: "in_progress",
    progress: 0,
    summary: "Awaiting chat updates",
  };
  store.metaChats.set(meta.id, meta);
  store.roadmapLists.set(roadmap.id, { ...roadmap, metaChatId: meta.id });
  triggerPersist();
  return { roadmap, meta };
}

export function updateRoadmap(roadmapId: string, patch: Partial<RoadmapList>) {
  const current = store.roadmapLists.get(roadmapId);
  if (!current) return null;
  const next = { ...current, ...patch };
  store.roadmapLists.set(roadmapId, next);
  triggerPersist();
  return next;
}

export function getRoadmap(roadmapId: string) {
  return store.roadmapLists.get(roadmapId) ?? null;
}

export function getMetaChat(roadmapId: string) {
  const match = Array.from(store.metaChats.values()).find((m) => m.roadmapListId === roadmapId);
  return match ?? null;
}

export function listChats(roadmapId: string) {
  return Array.from(store.chats.values()).filter((c) => c.roadmapListId === roadmapId);
}

export function getChat(chatId: string) {
  return store.chats.get(chatId) ?? null;
}

export function findChatForMerge(roadmapListId: string, identifier: string, sourceChatId: string) {
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  const directMatch = store.chats.get(trimmed);
  if (
    directMatch &&
    directMatch.roadmapListId === roadmapListId &&
    directMatch.id !== sourceChatId
  ) {
    return directMatch;
  }
  const normalized = trimmed.toLowerCase();
  return (
    Array.from(store.chats.values()).find(
      (chat) =>
        chat.id !== sourceChatId &&
        chat.roadmapListId === roadmapListId &&
        (chat.title ?? "").trim().toLowerCase() === normalized
    ) ?? null
  );
}

export function syncRoadmapMeta(roadmapId: string) {
  const chats = listChats(roadmapId);
  const progress =
    chats.length === 0
      ? 0
      : chats.reduce((sum, chat) => sum + (chat.progress ?? 0), 0) / chats.length;
  const status = deriveStatus(chats.map((chat) => chat.status ?? "in_progress"));
  const summary = `Aggregated from ${chats.length} chats`;

  const meta = getMetaChat(roadmapId);
  if (meta) {
    store.metaChats.set(meta.id, {
      ...meta,
      progress,
      status,
      summary,
    });
  }
  const roadmap = store.roadmapLists.get(roadmapId);
  if (roadmap) {
    store.roadmapLists.set(roadmapId, { ...roadmap, progress, status });
  }
  triggerPersist();

  // Emit event for real-time WebSocket notifications
  eventBus.emitMetaChatUpdated(roadmapId, {
    status,
    progress,
    summary,
  });
}

/**
 * Synchronize meta chat status from child chat statuses.
 * This function aggregates the status and progress of all chats in a roadmap
 * and updates the associated meta chat with the calculated values.
 *
 * @param roadmapId - The ID of the roadmap whose chats to aggregate
 * @returns Updated meta chat object or null if not found
 */
export function syncMetaFromChats(roadmapId: string) {
  const chats = listChats(roadmapId);
  const progress =
    chats.length === 0
      ? 0
      : chats.reduce((sum, chat) => sum + (chat.progress ?? 0), 0) / chats.length;
  const status = deriveStatus(chats.map((chat) => chat.status ?? "in_progress"));
  const meta = getMetaChat(roadmapId);
  if (meta) {
    store.metaChats.set(meta.id, {
      ...meta,
      progress,
      status,
      summary: `Aggregated from ${chats.length} chats`,
    });
    const updated = { ...meta, progress, status, summary: `Aggregated from ${chats.length} chats` };
    triggerPersist();
    return updated;
  }
  return null;
}

export function createChat(roadmapListId: string, payload: Partial<Chat>) {
  const chat: Chat = {
    id: crypto.randomUUID(),
    roadmapListId,
    title: payload.title ?? "New Chat",
    goal: payload.goal,
    templateId: payload.templateId,
    status: payload.status ?? "in_progress",
    progress: payload.progress ?? 0,
    metadata: payload.metadata,
  };
  store.chats.set(chat.id, chat);
  store.messages.set(chat.id, []);
  triggerPersist();
  return chat;
}

export function updateChat(chatId: string, patch: Partial<Chat>) {
  const current = store.chats.get(chatId);
  if (!current) return null;
  const next = { ...current, ...patch };
  store.chats.set(chatId, next);
  triggerPersist();
  return next;
}

export function mergeChats(sourceChatId: string, targetChatId: string) {
  const source = store.chats.get(sourceChatId);
  const target = store.chats.get(targetChatId);
  if (!source || !target || source.roadmapListId !== target.roadmapListId) {
    return null;
  }
  const sourceMessages = store.messages.get(sourceChatId) ?? [];
  const targetMessages = store.messages.get(targetChatId) ?? [];
  const mergedMessages = [...targetMessages, ...sourceMessages].sort((a, b) => {
    const aTimestamp = Date.parse(a.createdAt);
    const bTimestamp = Date.parse(b.createdAt);
    const aTime = Number.isFinite(aTimestamp) ? aTimestamp : 0;
    const bTime = Number.isFinite(bTimestamp) ? bTimestamp : 0;
    return aTime - bTime;
  });
  store.messages.set(targetChatId, mergedMessages);
  store.messages.delete(sourceChatId);
  store.chats.delete(sourceChatId);
  triggerPersist();
  return { target: { ...target }, removedChatId: sourceChatId };
}

export function addMessage(chatId: string, message: Omit<Message, "id" | "createdAt">) {
  const messages = store.messages.get(chatId) ?? [];
  const nextMessage: Message = {
    ...message,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  store.messages.set(chatId, [...messages, nextMessage]);
  triggerPersist();
  return nextMessage;
}

export function getMessages(chatId: string) {
  return store.messages.get(chatId) ?? [];
}

export function addMetaChatMessage(
  metaChatId: string,
  message: Omit<MetaChatMessage, "id" | "createdAt">
) {
  const messages = store.metaChatMessages.get(metaChatId) ?? [];
  const nextMessage: MetaChatMessage = {
    ...message,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  store.metaChatMessages.set(metaChatId, [...messages, nextMessage]);
  triggerPersist();
  return nextMessage;
}

export function getMetaChatMessages(metaChatId: string) {
  return store.metaChatMessages.get(metaChatId) ?? [];
}

export function listTemplates() {
  return Array.from(store.templates.values());
}

export function getTemplate(templateId: string) {
  return store.templates.get(templateId) ?? null;
}

export function createTemplate(payload: Partial<Template>) {
  const template: Template = {
    id: crypto.randomUUID(),
    title: payload.title ?? "Untitled Template",
    goal: payload.goal,
    systemPrompt: payload.systemPrompt,
    starterMessages: payload.starterMessages,
    javascriptPrompt: payload.javascriptPrompt,
    javascriptLogic: payload.javascriptLogic,
    jsonRequired: payload.jsonRequired ?? false,
    metadata: payload.metadata,
  };
  store.templates.set(template.id, template);
  triggerPersist();
  return template;
}

export function updateTemplate(templateId: string, patch: Partial<Template>) {
  const current = store.templates.get(templateId);
  if (!current) return null;
  const next = { ...current, ...patch };
  store.templates.set(templateId, next);
  triggerPersist();
  return next;
}

/**
 * Restore a project from git storage with a specific ID.
 * This function either updates an existing project or creates a new one with the specified ID.
 * Used for disaster recovery when git storage exists but database is lost.
 *
 * @param payload - Project data with a specific ID to restore
 * @returns The restored project object
 */
export function restoreProject(payload: Partial<Project> & { id: string }) {
  // Check if project already exists in store
  const existing = getProject(payload.id);
  if (existing) {
    // Update existing project
    return updateProject(payload.id, {
      name: payload.name,
      description: payload.description,
      category: payload.category,
      status: payload.status,
      theme: payload.theme,
    });
  } else {
    // Add new project with the specific ID
    const project: Project = {
      id: payload.id,
      name: payload.name ?? "Untitled Project",
      description: payload.description,
      category: payload.category,
      status: payload.status ?? "active",
      theme: payload.theme,
    };
    store.projects.set(project.id, project);
    triggerPersist();
    return project;
  }
}

export function addSnapshot(projectId: string, gitSha: string, message?: string) {
  const snapshot: Snapshot = {
    id: crypto.randomUUID(),
    projectId,
    gitSha,
    message,
    createdAt: new Date().toISOString(),
  };
  const list = store.snapshots.get(projectId) ?? [];
  store.snapshots.set(projectId, [...list, snapshot]);
  triggerPersist();
  return snapshot;
}

export function listSnapshots(projectId: string) {
  return store.snapshots.get(projectId) ?? [];
}

/**
 * Get project details including the project object and its roadmap lists.
 * This function provides detailed information about a project and all its associated roadmaps.
 *
 * @param projectId - The ID of the project to retrieve details for
 * @returns Object containing project and its roadmap lists, or null if project not found
 */
export function projectDetails(projectId: string) {
  const project = getProject(projectId);
  if (!project) return null;
  const roadmapLists = listRoadmaps(projectId);
  return { project, roadmapLists };
}

export function createTerminalSession(projectId?: string, cwd?: string) {
  const session: TerminalSession = { id: crypto.randomUUID(), projectId, cwd };
  store.terminalSessions.set(session.id, session);
  return session;
}

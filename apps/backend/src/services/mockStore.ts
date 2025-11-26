import crypto from "node:crypto";
import type {
  Chat,
  Message,
  MetaChat,
  Project,
  RoadmapList,
  Session,
  Snapshot,
  Template,
  TerminalSession,
} from "../types";

type Store = {
  projects: Map<string, Project>;
  roadmapLists: Map<string, RoadmapList>;
  chats: Map<string, Chat>;
  metaChats: Map<string, MetaChat>;
  messages: Map<string, Message[]>;
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
  templates: new Map(),
  snapshots: new Map(),
  sessions: new Map(),
  terminalSessions: new Map(),
};

function deriveStatus(statuses: string[]) {
  if (statuses.length === 0) return "idle";
  if (statuses.every((status) => status === "done")) return "done";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "error")) return "error";
  if (statuses.some((status) => status === "waiting")) return "waiting";
  return "in_progress";
}

const defaultProjectId = crypto.randomUUID();
const defaultRoadmapId = crypto.randomUUID();
const defaultMetaChatId = crypto.randomUUID();
const defaultChatId = crypto.randomUUID();

function seed() {
  const project: Project = {
    id: defaultProjectId,
    name: "Nexus",
    category: "Product",
    status: "active",
    description: "Multi-agent cockpit",
  };
  store.projects.set(project.id, project);

  const roadmap: RoadmapList = {
    id: defaultRoadmapId,
    projectId: project.id,
    title: "MVP Core",
    tags: ["api", "db"],
    progress: 0.42,
    status: "in_progress",
    metaChatId: defaultMetaChatId,
  };
  store.roadmapLists.set(roadmap.id, roadmap);

  const meta: MetaChat = {
    id: defaultMetaChatId,
    roadmapListId: roadmap.id,
    status: "in_progress",
    progress: 0.4,
    summary: "Aggregating child chats",
  };
  store.metaChats.set(meta.id, meta);

  const template: Template = {
    id: crypto.randomUUID(),
    title: "Status Reporter",
    goal: "Enforce JSON-before-stop",
    jsonRequired: true,
    metadata: { version: "draft" },
  };
  store.templates.set(template.id, template);

  const chat: Chat = {
    id: defaultChatId,
    roadmapListId: roadmap.id,
    title: "Implement FS API",
    goal: "Expose safe FS endpoints",
    templateId: template.id,
    status: "in_progress",
    progress: 0.35,
  };
  store.chats.set(chat.id, chat);

  store.messages.set(chat.id, [
    {
      id: crypto.randomUUID(),
      chatId: chat.id,
      role: "system",
      content: "Follow JSON-before-stop when reporting status.",
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      chatId: chat.id,
      role: "assistant",
      content: "Working on the FS API stub.",
      createdAt: new Date().toISOString(),
    },
  ]);

  store.snapshots.set(project.id, []);
}

seed();

export const ids = {
  projectId: defaultProjectId,
  roadmapId: defaultRoadmapId,
  metaChatId: defaultMetaChatId,
  chatId: defaultChatId,
};

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
  };
  store.projects.set(project.id, project);
  return project;
}

export function updateProject(projectId: string, patch: Partial<Project>) {
  const current = store.projects.get(projectId);
  if (!current) return null;
  const next = { ...current, ...patch };
  store.projects.set(projectId, next);
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
  return { roadmap, meta };
}

export function updateRoadmap(roadmapId: string, patch: Partial<RoadmapList>) {
  const current = store.roadmapLists.get(roadmapId);
  if (!current) return null;
  const next = { ...current, ...patch };
  store.roadmapLists.set(roadmapId, next);
  return next;
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
  const meta = getMetaChat(roadmapId);
  if (meta) {
    store.metaChats.set(meta.id, {
      ...meta,
      progress,
      status,
      summary: `Aggregated from ${chats.length} chats`,
    });
  }
  const roadmap = store.roadmapLists.get(roadmapId);
  if (roadmap) {
    store.roadmapLists.set(roadmapId, { ...roadmap, progress, status });
  }
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
  return chat;
}

export function updateChat(chatId: string, patch: Partial<Chat>) {
  const current = store.chats.get(chatId);
  if (!current) return null;
  const next = { ...current, ...patch };
  store.chats.set(chatId, next);
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
  return nextMessage;
}

export function getMessages(chatId: string) {
  return store.messages.get(chatId) ?? [];
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
  return template;
}

export function updateTemplate(templateId: string, patch: Partial<Template>) {
  const current = store.templates.get(templateId);
  if (!current) return null;
  const next = { ...current, ...patch };
  store.templates.set(templateId, next);
  return next;
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
  return snapshot;
}

export function listSnapshots(projectId: string) {
  return store.snapshots.get(projectId) ?? [];
}

export function createTerminalSession(projectId?: string, cwd?: string) {
  const session: TerminalSession = { id: crypto.randomUUID(), projectId, cwd };
  store.terminalSessions.set(session.id, session);
  return session;
}

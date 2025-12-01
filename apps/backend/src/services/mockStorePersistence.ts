import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyBaseLogger } from "fastify";
import type {
  Chat,
  Message,
  MetaChat,
  MetaChatMessage,
  Project,
  RoadmapList,
  Snapshot,
  Template,
} from "../types";
import { store, attachPersistence } from "./mockStore.js";

type PersistedStore = {
  projects: Project[];
  roadmapLists: RoadmapList[];
  chats: Chat[];
  metaChats: MetaChat[];
  messages: Record<string, Message[]>;
  metaChatMessages: Record<string, MetaChatMessage[]>;
  templates: Template[];
  snapshots: Record<string, Snapshot[]>;
};

let persistenceFile: string | null = null;
let logger: Pick<FastifyBaseLogger, "info" | "warn" | "error"> | Console = console;
let writeChain: Promise<void> | null = null;

function serializeStore(): PersistedStore {
  return {
    projects: Array.from(store.projects.values()),
    roadmapLists: Array.from(store.roadmapLists.values()),
    chats: Array.from(store.chats.values()),
    metaChats: Array.from(store.metaChats.values()),
    messages: Object.fromEntries(store.messages.entries()),
    metaChatMessages: Object.fromEntries(store.metaChatMessages.entries()),
    templates: Array.from(store.templates.values()),
    snapshots: Object.fromEntries(store.snapshots.entries()),
  };
}

function hydrateStore(data: Partial<PersistedStore>) {
  if (data.projects) {
    store.projects = new Map(data.projects.map((p) => [p.id, p]));
  }
  if (data.roadmapLists) {
    store.roadmapLists = new Map(data.roadmapLists.map((r) => [r.id, r]));
  }
  if (data.chats) {
    store.chats = new Map(data.chats.map((c) => [c.id, c]));
  }
  if (data.metaChats) {
    store.metaChats = new Map(data.metaChats.map((m) => [m.id, m]));
  }
  if (data.messages) {
    store.messages = new Map(Object.entries(data.messages));
  }
  if (data.metaChatMessages) {
    store.metaChatMessages = new Map(Object.entries(data.metaChatMessages));
  }
  if (data.templates) {
    store.templates = new Map(data.templates.map((t) => [t.id, t]));
  }
  if (data.snapshots) {
    store.snapshots = new Map(Object.entries(data.snapshots));
  }
}

async function writeStore() {
  if (!persistenceFile) return;
  const payload = serializeStore();
  try {
    await fs.mkdir(path.dirname(persistenceFile), { recursive: true });
    await fs.writeFile(persistenceFile, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    logger.error?.({ err, path: persistenceFile }, "Failed to persist mock store");
  }
}

function schedulePersist() {
  if (!persistenceFile) return;
  writeChain = (writeChain ?? Promise.resolve())
    .then(writeStore)
    .catch((err) => logger.error?.({ err, path: persistenceFile }, "Mock store persist error"));
}

export async function initMockStorePersistence(options: {
  dataDir: string;
  log?: Pick<FastifyBaseLogger, "info" | "warn" | "error">;
}) {
  persistenceFile = path.join(options.dataDir, "db", "mock-store.json");
  logger = options.log ?? logger;

  try {
    const raw = await fs.readFile(persistenceFile, "utf-8");
    if (raw.trim()) {
      const parsed = JSON.parse(raw) as PersistedStore;
      hydrateStore(parsed);
    }
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      logger.warn?.({ err, path: persistenceFile }, "Failed to load persisted mock store");
    }
  }

  attachPersistence(schedulePersist);
  logger.info?.({ path: persistenceFile }, "Mock store persistence enabled");
}

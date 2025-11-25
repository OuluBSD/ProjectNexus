"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  buildTerminalWsUrl,
  createTerminalSession,
  fetchChats,
  fetchFileContent,
  fetchFileTree,
  fetchProjects,
  fetchRoadmapStatus,
  fetchRoadmaps,
  fetchFileDiff,
  fetchChatMessages,
  createProject,
  createRoadmap,
  createChat,
  updateChat,
  mergeChat,
  writeFileContent,
  login,
  fetchAuditEvents,
  sendTerminalInput,
  postChatMessage,
  updateChatStatus,
  fetchTemplates,
  fetchMetaChat,
  fetchProjectDetails,
  ProjectPayload,
  ProjectDetailsResponse,
  updateProject,
  updateRoadmap,
} from "../../lib/api";
import { TemplatePanel } from "../../components/TemplatePanel";
import { useMessageNavigation } from "../../components/MessageNavigation";
import { FileTree, type FileEntry } from "../../components/FileTree";
import { CodeViewer } from "../../components/CodeViewer";
import { DiffViewer } from "../../components/DiffViewer";
import { Terminal } from "../../components/Terminal";

type Status =
  | "inactive"
  | "waiting"
  | "active"
  | "blocked"
  | "done"
  | "in_progress"
  | "idle"
  | "error";
const DEMO_USERNAME = process.env.NEXT_PUBLIC_DEMO_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "demo";
const DEMO_KEYFILE = process.env.NEXT_PUBLIC_DEMO_KEYFILE_TOKEN;
const PROJECT_STORAGE_KEY = "agentmgr:selectedProject";
const ROADMAP_STORAGE_KEY = "agentmgr:selectedRoadmap";
const CHAT_STORAGE_KEY = "agentmgr:selectedChat";

type ProjectItem = {
  id?: string;
  name: string;
  category: string;
  status: Status;
  info: string;
  theme?: ThemeOverride;
};
type RoadmapItem = {
  id?: string;
  title: string;
  tags: string[];
  progress: number;
  status: Status;
  metaChatId?: string;
  summary?: string;
};
type ChatItem = {
  id?: string;
  title: string;
  status: Status;
  progress: number;
  note?: string;
  meta?: boolean;
  goal?: string;
  focus?: string;
  templateId?: string;
  metadata?: Record<string, unknown> | null;
};
type MessageItem = {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system" | "status" | "meta";
  content: string;
  createdAt: string;
};
type AuditEvent = {
  id: string;
  eventType: string;
  path?: string | null;
  createdAt: string;
  sessionId?: string | null;
  userId?: string | null;
  projectId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
};
type ToastMessage = { message: string; detail?: string; tone: "success" | "error" };
type TemplateItem = {
  id: string;
  title: string;
  goal?: string;
  jsonRequired?: boolean;
  metadata?: Record<string, unknown> | null;
};
type MetaChat = {
  id: string;
  roadmapListId: string;
  status: Status;
  progress: number;
  summary?: string;
};
type ContextTarget = "project" | "roadmap" | "chat";
type ContextMenuState =
  | {
      type: "project";
      id: string;
      title: string;
      x: number;
      y: number;
      project: ProjectItem;
    }
  | {
      type: "roadmap";
      id: string;
      title: string;
      x: number;
      y: number;
      roadmap: RoadmapItem;
    }
  | {
      type: "chat";
      id: string;
      title: string;
      x: number;
      y: number;
      chat: ChatItem;
    };

type ContextPanel =
  | {
      kind: "project-settings";
      projectId: string;
      projectName: string;
      loading: boolean;
      error?: string;
      details?: ProjectDetailsResponse;
    }
  | {
      kind: "project-templates";
      projectId: string;
      projectName: string;
    }
  | {
      kind: "roadmap-details";
      roadmapId: string;
      roadmapTitle: string;
      loading: boolean;
      notice?: string;
      error?: string;
      tags?: string[];
      status?: Status;
      progress?: number;
      summary?: string | null;
      metaStatus?: Status;
      metaProgress?: number;
      metaSummary?: string | null;
    };

const contextActionConfig: Record<ContextTarget, { key: string; label: string }[]> = {
  project: [
    { key: "edit", label: "Edit project" },
    { key: "settings", label: "Project settings" },
    { key: "templates", label: "Favorite templates" },
  ],
  roadmap: [
    { key: "edit", label: "Edit roadmap" },
    { key: "add-chat", label: "Add chat" },
    { key: "meta-chat", label: "Open meta chat" },
  ],
  chat: [
    { key: "rename", label: "Rename chat" },
    { key: "open-folder", label: "Open folder" },
    { key: "merge", label: "Merge chat" },
  ],
};
const THEME_VARIABLES = {
  bg: "--bg",
  panel: "--panel",
  card: "--card",
  accent: "--accent",
  text: "--text",
  muted: "--muted",
  border: "--border",
  ghost: "--ghost",
} as const;

type ThemeToken = keyof typeof THEME_VARIABLES;
type ThemePalette = Record<ThemeToken, string> & { colorScheme: "dark" | "light" };
type ThemeOverride = Partial<Record<ThemeToken, string>>;
const THEME_TOKENS = Object.keys(THEME_VARIABLES) as ThemeToken[];

const baseThemes: Record<"dark" | "light", ThemePalette> = {
  dark: {
    colorScheme: "dark",
    bg: "#0f172a",
    panel: "#111827",
    card: "#1f2937",
    accent: "#0ea5e9",
    text: "#e5e7eb",
    muted: "#94a3b8",
    border: "#1f2937",
    ghost: "#1e293b",
  },
  light: {
    colorScheme: "light",
    bg: "#f8fafc",
    panel: "#ffffff",
    card: "#f1f5f9",
    accent: "#2563eb",
    text: "#0f172a",
    muted: "#475569",
    border: "#e2e8f0",
    ghost: "#eef2ff",
  },
};

const projectThemePresets = {
  default: {},
  nebula: {
    panel: "#0f1224",
    card: "#151633",
    accent: "#a855f7",
    border: "#4338ca",
    text: "#fdf2ff",
    muted: "#c4b5fd",
    ghost: "#090611",
  },
  ember: {
    panel: "#1b0e04",
    card: "#2c1404",
    accent: "#fb923c",
    border: "#c2410c",
    text: "#fff7ed",
    muted: "#fdba74",
    ghost: "#140b03",
  },
  forest: {
    panel: "#021411",
    card: "#041c17",
    accent: "#2dd4bf",
    border: "#0f766e",
    text: "#ccfbf1",
    muted: "#5eead4",
    ghost: "#02100d",
  },
} as const;
type ProjectThemePresetKey = keyof typeof projectThemePresets;
const projectThemePresetLabels: Record<ProjectThemePresetKey, string> = {
  default: "Default",
  nebula: "Nebula",
  ember: "Ember",
  forest: "Forest",
};
type GlobalThemeMode = "auto" | "dark" | "light";

const demoSeed = {
  project: {
    name: "Nexus",
    category: "Product",
    status: "active",
    description: "Multi-agent cockpit",
    theme: projectThemePresets.nebula,
  },
  roadmap: {
    title: "MVP Core",
    tags: ["api", "db"],
    progress: 0.42,
    status: "in_progress" as Status,
  },
  chat: {
    title: "Implement FS API",
    goal: "Expose safe FS endpoints",
    status: "in_progress" as Status,
    progress: 0.35,
  },
};

function normalizeTheme(theme?: Record<string, unknown> | null): ThemeOverride | undefined {
  if (!theme) return undefined;
  const normalized: ThemeOverride = {};
  for (const token of THEME_TOKENS) {
    const rawValue =
      typeof theme[token] === "string" && theme[token] ? (theme[token] as string) : undefined;
    const cssVarValue =
      typeof theme[THEME_VARIABLES[token]] === "string"
        ? (theme[THEME_VARIABLES[token]] as string)
        : undefined;
    const value = rawValue?.trim() || cssVarValue?.trim();
    if (value) {
      normalized[token] = value;
    }
  }
  return Object.keys(normalized).length ? normalized : undefined;
}

function mapProjectPayload(project: ProjectPayload): ProjectItem {
  return {
    id: project.id,
    name: project.name,
    category: project.category ?? "Uncategorized",
    status: (project.status as Status) ?? "active",
    info: project.description ?? "",
    theme: normalizeTheme(project.theme ?? undefined),
  };
}

function mergeTheme(base: ThemePalette, override?: ThemeOverride): ThemePalette {
  if (!override) return base;
  const merged: ThemePalette = { ...base };
  for (const token of THEME_TOKENS) {
    const value = override[token];
    if (typeof value === "string" && value.trim()) {
      merged[token] = value.trim();
    }
  }
  return merged;
}

function applyThemePalette(palette: ThemePalette) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("color-scheme", palette.colorScheme);
  for (const token of THEME_TOKENS) {
    root.style.setProperty(THEME_VARIABLES[token], palette[token]);
  }
}

function usePrefersColorScheme(): "dark" | "light" {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setMode(event.matches ? "dark" : "light");
    };
    setMode(query.matches ? "dark" : "light");
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);
  return mode;
}

const statusColor: Record<Status, string> = {
  inactive: "#9CA3AF",
  idle: "#9CA3AF",
  waiting: "#F59E0B",
  active: "#10B981",
  in_progress: "#10B981",
  blocked: "#EF4444",
  error: "#EF4444",
  done: "#2563EB",
};

function progressPercent(value: number) {
  return Math.max(0, Math.min(Math.round((value ?? 0) * 100), 100));
}

function formatStatusLabel(status: Status) {
  return status
    .split("_")
    .map((segment) =>
      segment.length ? `${segment.charAt(0).toUpperCase()}${segment.slice(1)}` : segment
    )
    .join(" ");
}

function summarizeAuditMeta(meta?: Record<string, unknown> | null) {
  if (!meta) return null;
  const data = meta as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof data.preview === "string" && data.preview.length) {
    const withEllipsis = data.truncated ? `${data.preview}…` : data.preview;
    parts.push(`“${withEllipsis}”`);
  }
  if (typeof data.ip === "string" && data.ip.length) {
    parts.push(`ip ${data.ip}`);
  }
  if (typeof data.cwd === "string" && data.cwd.length) {
    parts.push(`cwd ${data.cwd}`);
  }
  if (typeof data.entryCount === "number") {
    parts.push(`${data.entryCount} entries`);
  }
  if (typeof data.code === "number") {
    parts.push(`code ${data.code}`);
  }
  if (typeof data.signal === "string" && data.signal.length) {
    parts.push(`signal ${data.signal}`);
  }
  if (typeof data.reason === "string" && data.reason.length) {
    const idleSeconds =
      typeof data.idleMs === "number" ? Math.round(Number(data.idleMs) / 1000) : null;
    const reasonText = idleSeconds ? `${data.reason} (${idleSeconds}s)` : data.reason;
    parts.push(`reason ${reasonText}`);
  }
  if (typeof data.bytes === "number") {
    parts.push(`${data.bytes} bytes`);
  }
  if (typeof data.length === "number" && data.length !== data.bytes) {
    parts.push(`${data.length} chars`);
  }
  if (typeof data.diffBytes === "number") {
    parts.push(`diff ${data.diffBytes} bytes`);
  }
  if ("baseSha" in data && (typeof data.baseSha === "string" || data.baseSha === null)) {
    parts.push(`base ${data.baseSha ?? "—"}`);
  }
  if (typeof data.targetSha === "string") {
    parts.push(`target ${data.targetSha}`);
  }
  if (!parts.length) {
    const fallback = JSON.stringify(meta);
    return fallback.slice(0, 160) + (fallback.length > 160 ? "…" : "");
  }
  return parts.join(" · ");
}

function readWorkspacePath(meta?: Record<string, unknown> | null) {
  if (!meta) return null;
  const fields = ["workspacePath", "folder", "path", "cwd", "dir", "root"];
  for (const key of fields) {
    const value = (meta as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ segments?: string | string[] }>();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapItem[]>([]);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const resolveChatFolder = useCallback(
    (chat?: ChatItem | null) => {
      if (!chat) return null;
      const directPath = readWorkspacePath(chat.metadata);
      if (directPath) return directPath;
      if (!chat.templateId) return null;
      const template = templates.find((t) => t.id === chat.templateId);
      return readWorkspacePath(template?.metadata ?? null);
    },
    [templates]
  );
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [roadmapStatus, setRoadmapStatus] = useState<
    Record<string, { status: Status; progress: number; summary?: string }>
  >({});
  const [metaChats, setMetaChats] = useState<Record<string, MetaChat>>({});
  const [username, setUsername] = useState(DEMO_USERNAME);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [keyfileToken, setKeyfileToken] = useState(DEMO_KEYFILE ?? "");
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const openFolderForChatRef = useRef<((chat: ChatItem | null) => void) | null>(null);
  const [globalThemeMode, setGlobalThemeMode] = useState<GlobalThemeMode>("auto");
  const [projectThemePreset, setProjectThemePreset] = useState<ProjectThemePresetKey>("default");
  const [activeTab, setActiveTab] = useState<"Chat" | "Terminal" | "Code">("Chat");
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string>("Connect to stream to see output.");
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [terminalConnecting, setTerminalConnecting] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState<string | null>(null);
  const terminalSocket = useRef<WebSocket | null>(null);
  const [fsPath, setFsPath] = useState<string>(".");
  const [fsEntries, setFsEntries] = useState<FileEntry[]>([]);
  const [fsContentPath, setFsContentPath] = useState<string | null>(null);
  const [fsContent, setFsContent] = useState<string>("");
  const [fsDraft, setFsDraft] = useState<string>("");
  const [fsLoading, setFsLoading] = useState(false);
  const [fsSaving, setFsSaving] = useState(false);
  const [fsError, setFsError] = useState<string | null>(null);
  const [fsSaveStatus, setFsSaveStatus] = useState<string | null>(null);
  const [fsDiff, setFsDiff] = useState<string>("");
  const [fsDiffError, setFsDiffError] = useState<string | null>(null);
  const [fsDiffLoading, setFsDiffLoading] = useState(false);
  const [fsDiffLoaded, setFsDiffLoaded] = useState(false);
  const [fsBaseSha, setFsBaseSha] = useState<string>("");
  const [fsTargetSha, setFsTargetSha] = useState<string>("HEAD");
  const [fsToast, setFsToast] = useState<ToastMessage | null>(null);
  const [shareLinkStatus, setShareLinkStatus] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageFilter, setMessageFilter] = useState<
    "all" | "user" | "assistant" | "system" | "status" | "meta"
  >("all");
  const [chatStatusDraft, setChatStatusDraft] = useState<Status>("in_progress");
  const [chatProgressDraft, setChatProgressDraft] = useState<string>("0");
  const [chatFocusDraft, setChatFocusDraft] = useState("");
  const [chatUpdateMessage, setChatUpdateMessage] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditFilters, setAuditFilters] = useState<{
    eventType: string;
    userId: string;
    pathContains: string;
    ipAddress: string;
  }>({
    eventType: "",
    userId: "",
    pathContains: "",
    ipAddress: "",
  });
  const [auditProjectId, setAuditProjectId] = useState<string>("");
  const [auditSort, setAuditSort] = useState<"asc" | "desc">("desc");
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const chatStreamRef = useRef<HTMLDivElement>(null);
  const systemColorScheme = usePrefersColorScheme();
  const resolvedGlobalThemeMode: "dark" | "light" =
    globalThemeMode === "auto" ? systemColorScheme : globalThemeMode;
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const activePalette = useMemo(
    () => mergeTheme(baseThemes[resolvedGlobalThemeMode], selectedProject?.theme),
    [resolvedGlobalThemeMode, selectedProject?.theme]
  );
  useEffect(() => {
    applyThemePalette(activePalette);
  }, [activePalette]);
  const [projectDraft, setProjectDraft] = useState({
    name: "",
    category: "",
    description: "",
  });
  const [roadmapDraft, setRoadmapDraft] = useState({ title: "", tagsInput: "" });
  const [projectFilter, setProjectFilter] = useState("");
  const [roadmapFilter, setRoadmapFilter] = useState("");
  const [chatDraft, setChatDraft] = useState({ title: "", goal: "" });
  const [creatingProject, setCreatingProject] = useState(false);
  const [creatingRoadmap, setCreatingRoadmap] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [updatingProject, setUpdatingProject] = useState(false);
  const [editingRoadmapId, setEditingRoadmapId] = useState<string | null>(null);
  const [updatingRoadmap, setUpdatingRoadmap] = useState(false);
  const [contextPanel, setContextPanel] = useState<ContextPanel | null>(null);
  const normalizedProjectFilter = projectFilter.trim();
  const filteredProjectQuery = normalizedProjectFilter.toLowerCase();
  const filteredProjects = useMemo(() => {
    if (!filteredProjectQuery) return projects;
    return projects.filter((project) => {
      const haystack = [project.name, project.category, project.info]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return haystack.some((value) => value.includes(filteredProjectQuery));
    });
  }, [filteredProjectQuery, projects]);
  const groupedProjects = useMemo(() => {
    const buckets: Record<string, ProjectItem[]> = {};
    filteredProjects.forEach((project) => {
      const category = project.category || "Uncategorized";
      if (!buckets[category]) {
        buckets[category] = [];
      }
      buckets[category].push(project);
    });
    return Object.entries(buckets)
      .map(([category, items]) => ({
        category,
        items,
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [filteredProjects]);
  const normalizedRoadmapFilter = roadmapFilter.trim();
  const filteredRoadmapQuery = normalizedRoadmapFilter.toLowerCase();
  const filteredRoadmaps = useMemo(() => {
    if (!filteredRoadmapQuery) return roadmaps;
    return roadmaps.filter((roadmap) => {
      const haystack = [roadmap.title, ...(roadmap.tags ?? []), roadmap.summary ?? ""]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return haystack.some((value) => value.includes(filteredRoadmapQuery));
    });
  }, [filteredRoadmapQuery, roadmaps]);
  const routeSelection = useMemo(() => {
    const paramSegments = (params as { segments?: string | string[] } | null)?.segments;
    const segments = Array.isArray(paramSegments)
      ? paramSegments
      : typeof paramSegments === "string"
        ? [paramSegments]
        : [];
    const projectId = segments[0] === "projects" && segments[1] ? segments[1] : null;
    const roadmapId = segments[2] === "roadmaps" && segments[3] ? segments[3] : null;
    const chatId = segments[4] === "chats" && segments[5] ? segments[5] : null;
    return { projectId, roadmapId, chatId };
  }, [params]);
  const initialSelectionRef = useRef({
    projectId: routeSelection.projectId ?? searchParams.get("project"),
    roadmapId: routeSelection.roadmapId ?? searchParams.get("roadmap"),
    chatId: routeSelection.chatId ?? searchParams.get("chat"),
  });

  const roadmapStatusRef = useRef(roadmapStatus);
  const auditFiltersRef = useRef(auditFilters);
  const auditCursorRef = useRef(auditCursor);
  const fsPathRef = useRef(fsPath);

  const buildPathFromSelection = useCallback(
    (projectId: string | null, roadmapId: string | null, chatId: string | null) => {
      if (!projectId) return "/";
      let path = `/projects/${projectId}`;
      if (roadmapId) path += `/roadmaps/${roadmapId}`;
      if (chatId) path += `/chats/${chatId}`;
      return path;
    },
    []
  );
  const buildHrefFromSelection = useCallback(
    (projectId: string | null, roadmapId: string | null, chatId: string | null) => {
      const params = new URLSearchParams();
      if (!projectId && roadmapId) params.set("roadmap", roadmapId);
      if (!projectId && chatId) params.set("chat", chatId);
      const query = params.toString();
      const path = buildPathFromSelection(projectId, roadmapId, chatId);
      return query ? `${path}?${query}` : path;
    },
    [buildPathFromSelection]
  );
  const syncUrlSelection = useCallback(
    (projectId: string | null, roadmapId: string | null, chatId: string | null) => {
      if (typeof window === "undefined") return;
      const target = buildHrefFromSelection(projectId, roadmapId, chatId);
      router.replace(target);
    },
    [buildHrefFromSelection, router]
  );

  useEffect(() => {
    roadmapStatusRef.current = roadmapStatus;
  }, [roadmapStatus]);

  useEffect(() => {
    auditFiltersRef.current = auditFilters;
  }, [auditFilters]);

  useEffect(() => {
    auditCursorRef.current = auditCursor;
  }, [auditCursor]);

  useEffect(() => {
    fsPathRef.current = fsPath;
  }, [fsPath]);

  useEffect(() => {
    if (!contextMenu || typeof window === "undefined") return;
    const handleGlobalClose = () => setContextMenu(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    window.addEventListener("mousedown", handleGlobalClose);
    window.addEventListener("scroll", handleGlobalClose, true);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleGlobalClose);
      window.removeEventListener("scroll", handleGlobalClose, true);
      window.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  const ensureStatus = useCallback(
    async (roadmapId: string, token: string, options?: { forceRefresh?: boolean }) => {
      const existing = roadmapStatusRef.current[roadmapId];
      if (existing && !options?.forceRefresh) return existing;
      try {
        const meta = await fetchMetaChat(token, roadmapId);
        const mapped = {
          status: (meta.status as Status) ?? "active",
          progress: meta.progress ?? 0,
          summary: meta.summary,
        };
        setMetaChats((prev) => ({ ...prev, [roadmapId]: { ...meta, ...mapped } }));
        roadmapStatusRef.current = { ...roadmapStatusRef.current, [roadmapId]: mapped };
        setRoadmapStatus((prev) => ({ ...prev, [roadmapId]: mapped }));
        return mapped;
      } catch {
        try {
          const remote = await fetchRoadmapStatus(token, roadmapId);
          const mapped = {
            status: (remote.status as Status) ?? "active",
            progress: remote.progress ?? 0,
            summary: remote.summary,
          };
          roadmapStatusRef.current = { ...roadmapStatusRef.current, [roadmapId]: mapped };
          setRoadmapStatus((prev) => ({ ...prev, [roadmapId]: mapped }));
          return mapped;
        } catch {
          return null;
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!sessionToken || !selectedRoadmapId) return;
    let cancelled = false;
    const refreshStatus = async () => {
      try {
        await ensureStatus(selectedRoadmapId, sessionToken, { forceRefresh: true });
      } catch {
        // tolerate polling failures
      }
    };
    refreshStatus();
    const interval = setInterval(() => {
      if (cancelled) return;
      refreshStatus();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ensureStatus, selectedRoadmapId, sessionToken]);

  const eventTypeOptions = Array.from(new Set(auditEvents.map((e) => e.eventType))).sort();

  const readStoredChat = useCallback((roadmapId: string | null) => {
    if (typeof window === "undefined" || !roadmapId) return null;
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { roadmapId?: string; chatId?: string };
      if (parsed?.roadmapId === roadmapId && typeof parsed.chatId === "string") {
        return parsed.chatId;
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }, []);

  const persistChatSelection = useCallback((roadmapId: string, chatId: string | null) => {
    if (typeof window === "undefined") return;
    if (!chatId) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      return;
    }
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ roadmapId, chatId }));
  }, []);

  const copySelectionLink = useCallback(async () => {
    const href = buildHrefFromSelection(selectedProjectId, selectedRoadmapId, selectedChatId);
    if (href === "/") {
      setShareLinkStatus({ text: "Select a project to copy a link.", tone: "error" });
      return;
    }
    const url =
      typeof window !== "undefined" && typeof window.location !== "undefined"
        ? new URL(href, window.location.origin).toString()
        : href;
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setShareLinkStatus({ text: "Link copied", tone: "success" });
    } catch {
      setShareLinkStatus({ text: "Copy failed", tone: "error" });
    }
  }, [buildHrefFromSelection, selectedChatId, selectedProjectId, selectedRoadmapId]);

  const loadMetaChat = useCallback(async (roadmapId: string, token: string) => {
    try {
      const meta = await fetchMetaChat(token, roadmapId);
      const mapped = {
        id: meta.id,
        roadmapListId: meta.roadmapListId,
        status: (meta.status as Status) ?? "active",
        progress: meta.progress ?? 0,
        summary: meta.summary,
      };
      setMetaChats((prev) => ({ ...prev, [roadmapId]: mapped }));
      roadmapStatusRef.current = { ...roadmapStatusRef.current, [roadmapId]: mapped };
      setRoadmapStatus((prev) => ({ ...prev, [roadmapId]: mapped }));
      return mapped;
    } catch {
      return null;
    }
  }, []);

  const loadMessagesForChat = useCallback(async (chatId: string, token: string) => {
    if (!chatId) {
      setMessages([]);
      setMessagesError("Select a chat to load messages.");
      return;
    }
    if (chatId.startsWith("meta-")) {
      setMessages([]);
      setMessagesError("Meta-chat messages are read-only and not yet surfaced here.");
      return;
    }
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const items = await fetchChatMessages(token, chatId);
      setMessages(items as MessageItem[]);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Failed to load messages");
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const clearWorkspaceState = useCallback(
    (reason?: string) => {
      if (reason) setStatusMessage(reason);
      setSessionToken(null);
      setActiveUser(null);
      setProjects([]);
      setRoadmaps([]);
      setRoadmapStatus({});
      roadmapStatusRef.current = {};
      setChats([]);
      setMetaChats({});
      setTemplates([]);
      setSelectedProjectId(null);
      setSelectedRoadmapId(null);
      setSelectedChatId(null);
      syncUrlSelection(null, null, null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(PROJECT_STORAGE_KEY);
        localStorage.removeItem(ROADMAP_STORAGE_KEY);
        localStorage.removeItem(CHAT_STORAGE_KEY);
      }
      setTerminalSessionId(null);
      setTerminalOutput("Connect to stream to see output.");
      setTerminalStatus(null);
      setFsEntries([]);
      setFsContent("");
      setFsContentPath(null);
      setFsPath(".");
      setFsDraft("");
      setFsSaving(false);
      setFsSaveStatus(null);
      setFsDiff("");
      setFsDiffError(null);
      setFsDiffLoaded(false);
      setFsDiffLoading(false);
      setFsBaseSha("");
      setFsTargetSha("HEAD");
      setProjectDraft({ name: "", category: "", description: "" });
      setRoadmapDraft({ title: "", tagsInput: "" });
      setChatDraft({ title: "", goal: "" });
      setCreatingProject(false);
      setCreatingRoadmap(false);
      setCreatingChat(false);
      setMessages([]);
      setMessagesError(null);
      setMessageDraft("");
      setChatProgressDraft("0");
      setChatStatusDraft("in_progress");
      setChatFocusDraft("");
      setChatUpdateMessage(null);
    },
    [syncUrlSelection]
  );

  const updateTerminalStatusFromText = (text: string) => {
    if (!text) return;
    const idleMatch = text.match(/\[session closed after (\d+)s idle timeout\]/i);
    if (idleMatch?.[1]) {
      setTerminalStatus(`Closed after ${idleMatch[1]}s idle timeout`);
      return;
    }
    const exitMatch = text.match(/\[process exited with code ([^\\]]+)\]/i);
    if (exitMatch?.[1]) {
      setTerminalStatus(`Process exited (code ${exitMatch[1]})`);
    }
  };

  const loadChatsForRoadmap = useCallback(
    async (
      roadmapId: string,
      token: string,
      statusHint?: { status: Status; progress: number; summary?: string },
      chatHint?: string | null,
      projectHint?: string | null
    ) => {
      try {
        const status = statusHint ?? (await ensureStatus(roadmapId, token));
        const cachedMeta = metaChats[roadmapId];
        const meta = cachedMeta ?? (await loadMetaChat(roadmapId, token));
        const chatData = await fetchChats(token, roadmapId);
        const metaSummary = meta?.summary ?? status?.summary;
        const metaStatus = meta ?? (status ? { roadmapListId: roadmapId, ...status } : null);
        const mappedChats: ChatItem[] = [
          metaStatus
            ? {
                id: `meta-${roadmapId}`,
                title: "Meta-Chat",
                status: metaStatus.status,
                progress: metaStatus.progress,
                note: metaSummary ?? "Aggregated from child chats",
                meta: true,
              }
            : null,
          ...chatData.map((c) => {
            const focus =
              c.metadata && typeof (c.metadata as Record<string, unknown>).focus === "string"
                ? (c.metadata as Record<string, unknown>).focus
                : null;
            return {
              id: c.id,
              title: c.title,
              status: (c.status as Status) ?? "active",
              progress: c.progress ?? 0,
              note: focus ?? c.goal,
              focus: focus ?? undefined,
              goal: c.goal,
              templateId: c.templateId,
              metadata: c.metadata ?? null,
            };
          }),
        ].filter(Boolean) as ChatItem[];
        setChats(mappedChats);
        const hintedChatId =
          chatHint && mappedChats.some((c) => c.id === chatHint) ? chatHint : null;
        const storedChatId = readStoredChat(roadmapId);
        const fallbackChatId =
          hintedChatId ??
          (storedChatId && mappedChats.some((c) => c.id === storedChatId)
            ? storedChatId
            : (mappedChats.find((c) => c.id && !c.meta)?.id ?? null));
        setSelectedChatId(fallbackChatId);
        if (fallbackChatId) {
          persistChatSelection(roadmapId, fallbackChatId);
          await loadMessagesForChat(fallbackChatId, token);
        } else {
          setMessages([]);
        }
        syncUrlSelection(projectHint ?? selectedProjectId, roadmapId, fallbackChatId);
        setStatusMessage(mappedChats.length ? null : "No chats for this roadmap yet.");
      } catch (err) {
        setStatusMessage("Failed to load chats.");
        setError(err instanceof Error ? err.message : "Failed to load chats");
        setChats([]);
      }
    },
    [
      ensureStatus,
      loadMetaChat,
      loadMessagesForChat,
      metaChats,
      persistChatSelection,
      readStoredChat,
      selectedProjectId,
      syncUrlSelection,
    ]
  );

  const loadRoadmapsForProject = useCallback(
    async (
      projectId: string,
      token: string,
      selectionHint?: { roadmapId?: string | null; chatId?: string | null }
    ) => {
      try {
        const roadmapData = await fetchRoadmaps(token, projectId);
        const storedRoadmapId =
          typeof window !== "undefined" ? localStorage.getItem(ROADMAP_STORAGE_KEY) : null;
        const statusPairs = await Promise.all(
          roadmapData.map(async (r) => {
            try {
              const status = await fetchRoadmapStatus(token, r.id);
              return [
                r.id,
                {
                  status: (status.status as Status) ?? "active",
                  progress: status.progress ?? 0,
                  summary: status.summary,
                },
              ] as const;
            } catch {
              return [r.id, null] as const;
            }
          })
        );
        const statusMap = Object.fromEntries(
          statusPairs.filter(([, value]) => value !== null) as [
            string,
            { status: Status; progress: number; summary?: string },
          ][]
        );
        setRoadmapStatus((prev) => ({ ...prev, ...statusMap }));
        const mappedRoadmaps = roadmapData.map((r) => ({
          id: r.id,
          title: r.title,
          tags: r.tags ?? [],
          status: (statusMap[r.id]?.status ?? (r.status as Status) ?? "active") as Status,
          progress: statusMap[r.id]?.progress ?? r.progress ?? 0,
          metaChatId: r.metaChatId,
          summary: statusMap[r.id]?.summary,
        }));
        setRoadmaps(mappedRoadmaps);
        setStatusMessage(roadmapData.length ? null : "No roadmaps for this project yet.");
        const hintedRoadmapId =
          selectionHint?.roadmapId && roadmapData.some((r) => r.id === selectionHint.roadmapId)
            ? selectionHint.roadmapId
            : null;
        const preferredRoadmapId =
          hintedRoadmapId ??
          (storedRoadmapId && roadmapData.some((r) => r.id === storedRoadmapId)
            ? storedRoadmapId
            : roadmapData[0]?.id);
        if (preferredRoadmapId) {
          setSelectedRoadmapId(preferredRoadmapId);
          if (typeof window !== "undefined")
            localStorage.setItem(ROADMAP_STORAGE_KEY, preferredRoadmapId);
          setSelectedChatId(null);
          await loadChatsForRoadmap(
            preferredRoadmapId,
            token,
            statusMap[preferredRoadmapId],
            selectionHint?.chatId ?? null,
            projectId
          );
        } else {
          setChats([]);
          setSelectedRoadmapId(null);
          setSelectedChatId(null);
          setMessages([]);
          setMessageDraft("");
          setMessagesError(null);
          syncUrlSelection(projectId, null, null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load roadmaps");
        setStatusMessage("Failed to load roadmaps.");
        setRoadmaps([]);
        setChats([]);
        setSelectedRoadmapId(null);
        setSelectedChatId(null);
        setMessages([]);
        setMessageDraft("");
        setMessagesError(null);
      }
    },
    [loadChatsForRoadmap, syncUrlSelection]
  );

  const hydrateWorkspace = useCallback(
    async (token: string, activeUsername: string) => {
      try {
        setSessionToken(token);
        setActiveUser(activeUsername);
        try {
          const templateData = await fetchTemplates(token);
          setTemplates(templateData as TemplateItem[]);
        } catch {
          setTemplates([]);
        }
        const projectData = await fetchProjects(token);
        const initialSelection = initialSelectionRef.current;
        const storedProjectId =
          typeof window !== "undefined" ? localStorage.getItem(PROJECT_STORAGE_KEY) : null;
        const hintedProjectId =
          initialSelection.projectId && projectData.some((p) => p.id === initialSelection.projectId)
            ? initialSelection.projectId
            : null;
        const mappedProjects = projectData.map(mapProjectPayload);
        setProjects(mappedProjects);
        setStatusMessage(
          projectData.length ? null : "No projects found. Seed demo data to get started."
        );
        const preferredProjectId =
          hintedProjectId ??
          (storedProjectId && projectData.some((p) => p.id === storedProjectId)
            ? storedProjectId
            : projectData[0]?.id);
        if (preferredProjectId) {
          setSelectedProjectId(preferredProjectId);
          if (typeof window !== "undefined")
            localStorage.setItem(PROJECT_STORAGE_KEY, preferredProjectId);
          const roadmapHint =
            preferredProjectId === hintedProjectId
              ? { roadmapId: initialSelection.roadmapId, chatId: initialSelection.chatId }
              : undefined;
          await loadRoadmapsForProject(preferredProjectId, token, roadmapHint);
          initialSelectionRef.current = { projectId: null, roadmapId: null, chatId: null };
        } else {
          setRoadmaps([]);
          setChats([]);
          setSelectedProjectId(null);
          setSelectedRoadmapId(null);
          setStatusMessage("No projects found. Seed demo data to get started.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects");
        clearWorkspaceState("Backend unreachable. Please try again.");
      }
    },
    [clearWorkspaceState, loadRoadmapsForProject]
  );

  const reloadTemplates = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const templateData = await fetchTemplates(sessionToken);
      setTemplates(templateData as TemplateItem[]);
    } catch (err) {
      console.error("Failed to reload templates:", err);
    }
  }, [sessionToken]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { token } = await login(DEMO_USERNAME, DEMO_PASSWORD, DEMO_KEYFILE || undefined);
        if (cancelled) return;
        await hydrateWorkspace(token, DEMO_USERNAME);
      } catch (err) {
        if (!cancelled) {
          clearWorkspaceState("Backend unreachable.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clearWorkspaceState, hydrateWorkspace]);

  const cancelRoadmapEdit = useCallback(() => {
    setEditingRoadmapId(null);
    setRoadmapDraft({ title: "", tagsInput: "" });
  }, []);

  const handleSelectRoadmap = useCallback(
    async (roadmapId: string) => {
      if (selectedRoadmapId && selectedRoadmapId !== roadmapId) {
        cancelRoadmapEdit();
        setContextPanel(null);
      }
      setSelectedRoadmapId(roadmapId);
      setSelectedChatId(null);
      setMessages([]);
      setMessageDraft("");
      setMessagesError(null);
      syncUrlSelection(selectedProjectId, roadmapId, null);
      if (typeof window !== "undefined") localStorage.setItem(ROADMAP_STORAGE_KEY, roadmapId);
      if (sessionToken) {
        await loadChatsForRoadmap(
          roadmapId,
          sessionToken,
          roadmapStatus[roadmapId],
          null,
          selectedProjectId
        );
      }
    },
    [
      cancelRoadmapEdit,
      loadChatsForRoadmap,
      roadmapStatus,
      selectedProjectId,
      selectedRoadmapId,
      sessionToken,
      setContextPanel,
      syncUrlSelection,
    ]
  );

  const handleSelectProject = async (projectId: string) => {
    if (selectedProjectId && selectedProjectId !== projectId) {
      cancelProjectEdit();
    }
    cancelRoadmapEdit();
    setContextPanel(null);
    setSelectedProjectId(projectId);
    setSelectedChatId(null);
    setMessages([]);
    setMessageDraft("");
    setMessagesError(null);
    syncUrlSelection(projectId, null, null);
    if (typeof window !== "undefined") localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
    if (sessionToken) {
      setSelectedRoadmapId(null);
      await loadRoadmapsForProject(projectId, sessionToken);
    }
  };

  const handleSelectChat = useCallback(
    async (chat: ChatItem) => {
      if (!chat.id) return;
      setSelectedChatId(chat.id);
      setMessagesError(null);
      setMessageDraft("");
      if (selectedRoadmapId) {
        persistChatSelection(selectedRoadmapId, chat.id);
      }
      syncUrlSelection(selectedProjectId, selectedRoadmapId, chat.id);
      if (sessionToken && !chat.meta) {
        await loadMessagesForChat(chat.id, sessionToken);
      } else if (chat.meta) {
        setMessages([]);
        setMessagesError("Meta-chat messages are not shown yet.");
      }
    },
    [
      loadMessagesForChat,
      persistChatSelection,
      selectedProjectId,
      selectedRoadmapId,
      sessionToken,
      syncUrlSelection,
    ]
  );

  const openProjectContextMenu = useCallback(
    (event: MouseEvent, project: ProjectItem) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({
        type: "project",
        id: project.id ?? project.name,
        title: project.name,
        x: event.clientX,
        y: event.clientY,
        project,
      });
    },
    [setContextMenu]
  );

  const openRoadmapContextMenu = useCallback(
    (event: MouseEvent, roadmap: RoadmapItem) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({
        type: "roadmap",
        id: roadmap.id ?? roadmap.title,
        title: roadmap.title,
        x: event.clientX,
        y: event.clientY,
        roadmap,
      });
    },
    [setContextMenu]
  );

  const openChatContextMenu = useCallback(
    (event: MouseEvent, chat: ChatItem) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({
        type: "chat",
        id: chat.id ?? chat.title ?? "chat",
        title: chat.title ?? "Chat",
        x: event.clientX,
        y: event.clientY,
        chat,
      });
    },
    [setContextMenu]
  );

  const openRoadmapContextPanel = useCallback(
    async (roadmap: RoadmapItem, notice?: string) => {
      const basePanel: ContextPanel = {
        kind: "roadmap-details",
        roadmapId: roadmap.id ?? roadmap.title,
        roadmapTitle: roadmap.title,
        loading: true,
        notice,
      };
      setContextPanel(basePanel);
      if (!roadmap.id) {
        setContextPanel({ ...basePanel, loading: false, error: "Roadmap identifier unavailable." });
        return;
      }
      if (!sessionToken) {
        setContextPanel({ ...basePanel, loading: false, error: "Login required." });
        return;
      }
      try {
        const statusInfo = await ensureStatus(roadmap.id, sessionToken, { forceRefresh: true });
        const latestStatus = statusInfo ?? roadmapStatus[roadmap.id];
        setContextPanel({
          ...basePanel,
          loading: false,
          status: latestStatus?.status ?? roadmap.status,
          progress: latestStatus?.progress ?? roadmap.progress,
          summary: latestStatus?.summary ?? roadmap.summary ?? null,
          tags: roadmap.tags,
          metaStatus: metaChats[roadmap.id]?.status,
          metaProgress: metaChats[roadmap.id]?.progress,
          metaSummary: metaChats[roadmap.id]?.summary ?? null,
        });
      } catch (err) {
        setContextPanel({
          ...basePanel,
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Unable to load roadmap status and meta chat context.",
        });
      }
    },
    [ensureStatus, metaChats, roadmapStatus, sessionToken]
  );

  const openProjectSettingsPanel = useCallback(
    async (project: ProjectItem) => {
      const basePanel = {
        kind: "project-settings" as const,
        projectId: project.id ?? project.name,
        projectName: project.name,
        loading: true,
      };
      setContextPanel(basePanel);
      if (!project.id) {
        setContextPanel({
          ...basePanel,
          loading: false,
          error: "Project identifier unavailable.",
        });
        return;
      }
      if (!sessionToken) {
        setContextPanel({
          ...basePanel,
          loading: false,
          error: "Login required to view project settings.",
        });
        return;
      }
      try {
        const details = await fetchProjectDetails(sessionToken, project.id);
        setContextPanel({ ...basePanel, loading: false, details });
      } catch (err) {
        setContextPanel({
          ...basePanel,
          loading: false,
          error: err instanceof Error ? err.message : "Unable to load project settings.",
        });
      }
    },
    [sessionToken]
  );

  const openProjectTemplatesPanel = useCallback((project: ProjectItem) => {
    setContextPanel({
      kind: "project-templates",
      projectId: project.id ?? project.name,
      projectName: project.name,
    });
  }, []);

  const startProjectEdit = useCallback((project: ProjectItem) => {
    setEditingProjectId(project.id ?? null);
    setProjectDraft({
      name: project.name,
      category: project.category ?? "",
      description: project.info ?? "",
    });
    setProjectThemePreset("default");
    setStatusMessage(`Editing project ${project.name}.`);
  }, []);

  const startRoadmapEdit = useCallback((roadmap: RoadmapItem) => {
    setEditingRoadmapId(roadmap.id ?? null);
    setRoadmapDraft({ title: roadmap.title, tagsInput: roadmap.tags.join(", ") });
    setStatusMessage(`Editing roadmap ${roadmap.title}.`);
  }, []);

  const promptWithDelay = (message: string, defaultValue?: string) =>
    new Promise<string | null>((resolve) => {
      if (typeof window === "undefined") {
        resolve(null);
        return;
      }
      setTimeout(() => resolve(window.prompt(message, defaultValue ?? "")), 0);
    });

  const handleContextAction = useCallback(
    async (actionKey: string) => {
      if (!contextMenu) return;
      const actions = contextActionConfig[contextMenu.type];
      const action = actions.find((item) => item.key === actionKey);
      let nextMessage = `${action?.label ?? actionKey} requested for ${contextMenu.title || contextMenu.id}.`;
      if (contextMenu.type === "project") {
        const project = contextMenu.project;
        switch (actionKey) {
          case "edit":
            startProjectEdit(project);
            nextMessage = `Editing ${project.name}.`;
            break;
          case "settings":
            await openProjectSettingsPanel(project);
            nextMessage = `Showing settings for ${project.name}.`;
            break;
          case "templates":
            openProjectTemplatesPanel(project);
            nextMessage = `Showing templates for ${project.name}.`;
            break;
        }
      }
      if (contextMenu.type === "roadmap") {
        const roadmap = contextMenu.roadmap;
        switch (actionKey) {
          case "edit":
            startRoadmapEdit(roadmap);
            void openRoadmapContextPanel(roadmap, `Editing ${roadmap.title}.`);
            nextMessage = `Editing ${roadmap.title}.`;
            break;
          case "add-chat":
            if (roadmap.id) {
              await handleSelectRoadmap(roadmap.id);
              setActiveTab("Chat");
              setChatDraft({ title: "", goal: "" });
              void openRoadmapContextPanel(roadmap, `Chat flow ready for ${roadmap.title}.`);
              nextMessage = `Ready to add a chat on ${roadmap.title}.`;
            } else {
              nextMessage = "Roadmap identifier missing.";
            }
            break;
          case "meta-chat":
            if (roadmap.id) {
              await handleSelectRoadmap(roadmap.id);
              const metaChatId = `meta-${roadmap.id}`;
              setSelectedChatId(metaChatId);
              setMessages([]);
              setMessagesError("Meta-chat messages are not shown yet.");
              syncUrlSelection(selectedProjectId, roadmap.id, metaChatId);
              void openRoadmapContextPanel(roadmap, `Meta chat selected for ${roadmap.title}.`);
              nextMessage = `Meta chat selected for ${roadmap.title}.`;
            } else {
              nextMessage = "Roadmap identifier missing.";
            }
            break;
        }
      }
      if (contextMenu.type === "chat") {
        const chat = contextMenu.chat;
        switch (actionKey) {
          case "rename": {
            if (!chat.id) {
              nextMessage = "Chat identifier missing.";
              break;
            }
            if (!sessionToken) {
              nextMessage = "Login required to rename chats.";
              break;
            }
            const promptValue = await promptWithDelay("Rename chat", chat.title ?? "");
            if (promptValue === null) {
              nextMessage = "Rename canceled.";
              break;
            }
            const trimmedTitle = promptValue.trim();
            if (!trimmedTitle) {
              nextMessage = "Chat title cannot be empty.";
              break;
            }
            if (trimmedTitle === (chat.title ?? "").trim()) {
              nextMessage = "Title unchanged.";
              break;
            }
            try {
              const updated = await updateChat(sessionToken, chat.id, { title: trimmedTitle });
              const metadataFocus =
                updated.metadata && typeof updated.metadata.focus === "string"
                  ? updated.metadata.focus
                  : null;
              const normalizedStatus = (updated.status as Status) ?? chat.status;
              const normalizedProgress = updated.progress ?? chat.progress;
              setChats((prev) =>
                prev.map((item) =>
                  item.id === updated.id
                    ? {
                        ...item,
                        title: updated.title ?? item.title,
                        goal: updated.goal ?? item.goal,
                        metadata: updated.metadata ?? item.metadata,
                        status: normalizedStatus,
                        progress: normalizedProgress,
                        note: metadataFocus ?? updated.goal ?? item.note,
                        focus: metadataFocus ?? item.focus,
                      }
                    : item
                )
              );
              nextMessage = `Renamed ${chat.title ?? "chat"} to ${trimmedTitle}.`;
            } catch (err) {
              nextMessage =
                err instanceof Error ? err.message : "Failed to rename chat; try again later.";
            }
            break;
          }
          case "open-folder":
            if (openFolderForChatRef.current) {
              openFolderForChatRef.current(chat);
              nextMessage = `Opening folder for ${chat.title ?? "chat"}.`;
            } else {
              nextMessage = "Folder navigation is not ready yet.";
            }
            break;
          case "merge": {
            if (!chat.id) {
              nextMessage = "Chat identifier missing.";
              break;
            }
            if (!sessionToken) {
              nextMessage = "Login required to merge chats.";
              break;
            }
            const mergeTarget = await promptWithDelay(
              "Merge into chat (enter target title or ID; whitespace/case variations are ignored)",
              ""
            );
            const trimmedTarget = mergeTarget?.trim();
            if (!trimmedTarget) {
              nextMessage = "Merge canceled.";
              break;
            }
            try {
              const response = await mergeChat(sessionToken, chat.id, trimmedTarget);
              const metadataFocus =
                response.target.metadata && typeof response.target.metadata.focus === "string"
                  ? response.target.metadata.focus
                  : null;
              setChats((prev) => {
                const filtered = prev.filter((item) => item.id !== response.removedChatId);
                let foundTarget = false;
                const mapped = filtered.map((item) => {
                  if (item.id === response.target.id) {
                    foundTarget = true;
                    return {
                      ...item,
                      title: response.target.title ?? item.title,
                      goal: response.target.goal ?? item.goal,
                      metadata: response.target.metadata ?? item.metadata,
                      status: (response.target.status as Status) ?? item.status,
                      progress: response.target.progress ?? item.progress,
                      note: metadataFocus ?? response.target.goal ?? item.note,
                      focus: metadataFocus ?? item.focus,
                    };
                  }
                  return item;
                });
                if (!foundTarget) {
                  mapped.push({
                    id: response.target.id,
                    title: response.target.title ?? "Chat",
                    status: (response.target.status as Status) ?? "in_progress",
                    progress: response.target.progress ?? 0,
                    goal: response.target.goal,
                    metadata: response.target.metadata ?? null,
                    note: metadataFocus ?? response.target.goal,
                    focus: metadataFocus ?? undefined,
                  });
                }
                return mapped;
              });
              const shouldSwitch = selectedChatId === chat.id;
              if (shouldSwitch) {
                setSelectedChatId(response.target.id);
              }
              const shouldReloadMessages =
                sessionToken && (shouldSwitch || response.target.id === selectedChatId);
              if (shouldReloadMessages) {
                await loadMessagesForChat(response.target.id, sessionToken);
              }
              nextMessage = `Merged ${chat.title ?? "chat"} into ${
                response.target.title ?? response.target.id ?? "target chat"
              }.`;
            } catch (err) {
              nextMessage = err instanceof Error ? err.message : "Unable to merge chats right now.";
            }
            break;
          }
        }
      }
      setStatusMessage(nextMessage);
      setContextMenu(null);
    },
    [
      contextMenu,
      handleSelectRoadmap,
      loadMessagesForChat,
      openProjectSettingsPanel,
      openProjectTemplatesPanel,
      selectedChatId,
      selectedProjectId,
      sessionToken,
      setActiveTab,
      setChatDraft,
      setChats,
      setContextMenu,
      setMessages,
      setMessagesError,
      setSelectedChatId,
      setStatusMessage,
      startProjectEdit,
      startRoadmapEdit,
      openRoadmapContextPanel,
      syncUrlSelection,
    ]
  );

  const handleLoginSubmit = async () => {
    if (!username) {
      setLoginError("Username is required");
      return;
    }
    if (!password && !keyfileToken) {
      setLoginError("Provide a password or keyfile token");
      return;
    }
    setLoginError(null);
    setLoading(true);
    setError(null);
    try {
      const { token } = await login(username, password, keyfileToken || undefined);
      await hydrateWorkspace(token, username);
    } catch (err) {
      setError("Login failed.");
      setLoginError(err instanceof Error ? err.message : "Login failed");
      clearWorkspaceState("Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const seedDemoData = useCallback(async () => {
    if (!sessionToken) {
      setStatusMessage("Login to seed demo data.");
      return;
    }
    if (projects.length > 0) {
      setStatusMessage("Projects already exist; skipping demo seed.");
      return;
    }
    setSeeding(true);
    setStatusMessage(null);
    setError(null);
    try {
      const { id: projectId } = await createProject(sessionToken, demoSeed.project);
      const { id: roadmapId } = await createRoadmap(sessionToken, projectId, demoSeed.roadmap);
      await createChat(sessionToken, roadmapId, demoSeed.chat);
      setStatusMessage("Demo data created.");
      await hydrateWorkspace(sessionToken, activeUser ?? username ?? DEMO_USERNAME);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to seed demo data";
      setError(message);
      setStatusMessage("Failed to seed demo data.");
    } finally {
      setSeeding(false);
    }
  }, [activeUser, hydrateWorkspace, projects.length, sessionToken, username]);

  const handleCreateProject = useCallback(async () => {
    if (!sessionToken) {
      setStatusMessage("Login to create a project.");
      return;
    }
    const name = projectDraft.name.trim();
    if (!name) {
      setStatusMessage("Project name is required.");
      return;
    }
    setCreatingProject(true);
    setError(null);
    try {
      const themeOverride = projectThemePresets[projectThemePreset];
      const payload = {
        name,
        category: projectDraft.category.trim() || undefined,
        description: projectDraft.description.trim() || undefined,
        theme: Object.keys(themeOverride).length ? themeOverride : undefined,
      };
      const { id } = await createProject(sessionToken, payload);
      setProjectDraft({ name: "", category: "", description: "" });
      setProjectThemePreset("default");
      const projectData = await fetchProjects(sessionToken);
      const mappedProjects = projectData.map(mapProjectPayload);
      setProjects(mappedProjects);
      setSelectedProjectId(id);
      if (typeof window !== "undefined") localStorage.setItem(PROJECT_STORAGE_KEY, id);
      await loadRoadmapsForProject(id, sessionToken);
      setStatusMessage("Project created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setStatusMessage("Failed to create project.");
    } finally {
      setCreatingProject(false);
    }
  }, [loadRoadmapsForProject, projectDraft, projectThemePreset, sessionToken]);

  const cancelProjectEdit = useCallback(() => {
    setEditingProjectId(null);
    setProjectDraft({ name: "", category: "", description: "" });
    setProjectThemePreset("default");
  }, []);

  const handleUpdateProject = useCallback(async () => {
    if (!sessionToken) {
      setStatusMessage("Login to update projects.");
      return;
    }
    if (!editingProjectId) {
      setStatusMessage("Select a project to edit.");
      return;
    }
    const name = projectDraft.name.trim();
    if (!name) {
      setStatusMessage("Project name is required.");
      return;
    }
    setUpdatingProject(true);
    try {
      const themeOverride = projectThemePresets[projectThemePreset];
      const payload = {
        name,
        category: projectDraft.category.trim() || undefined,
        description: projectDraft.description.trim() || undefined,
        theme: Object.keys(themeOverride).length ? themeOverride : undefined,
      };
      const updated = await updateProject(sessionToken, editingProjectId, payload);
      const mapped = mapProjectPayload(updated);
      setProjects((prev) => prev.map((project) => (project.id === mapped.id ? mapped : project)));
      setStatusMessage("Project changes saved.");
      cancelProjectEdit();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to update project.");
    } finally {
      setUpdatingProject(false);
    }
  }, [
    cancelProjectEdit,
    editingProjectId,
    projectDraft.category,
    projectDraft.description,
    projectDraft.name,
    projectThemePreset,
    sessionToken,
  ]);

  const handleUpdateRoadmap = useCallback(async () => {
    if (!sessionToken || !editingRoadmapId) {
      setStatusMessage("Select a roadmap to edit.");
      return;
    }
    const title = roadmapDraft.title.trim();
    if (!title) {
      setStatusMessage("Roadmap title is required.");
      return;
    }
    setUpdatingRoadmap(true);
    try {
      const tags = roadmapDraft.tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const updated = await updateRoadmap(sessionToken, editingRoadmapId, { title, tags });
      setRoadmaps((prev) =>
        prev.map((roadmap) =>
          roadmap.id === updated.id
            ? { ...roadmap, title: updated.title, tags: updated.tags ?? [] }
            : roadmap
        )
      );
      setStatusMessage("Roadmap changes saved.");
      cancelRoadmapEdit();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to update roadmap.");
    } finally {
      setUpdatingRoadmap(false);
    }
  }, [
    cancelRoadmapEdit,
    editingRoadmapId,
    roadmapDraft.tagsInput,
    roadmapDraft.title,
    sessionToken,
  ]);

  const handleCreateRoadmap = useCallback(async () => {
    if (!sessionToken || !selectedProjectId) {
      setStatusMessage("Select a project to add a roadmap.");
      return;
    }
    const title = roadmapDraft.title.trim();
    if (!title) {
      setStatusMessage("Roadmap title is required.");
      return;
    }
    setCreatingRoadmap(true);
    setError(null);
    try {
      const tags = roadmapDraft.tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const { id } = await createRoadmap(sessionToken, selectedProjectId, {
        title,
        tags,
        status: "active",
        progress: 0,
      });
      setRoadmapDraft({ title: "", tagsInput: "" });
      await loadRoadmapsForProject(selectedProjectId, sessionToken);
      setSelectedRoadmapId(id);
      if (typeof window !== "undefined") localStorage.setItem(ROADMAP_STORAGE_KEY, id);
      setStatusMessage("Roadmap created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create roadmap");
      setStatusMessage("Failed to create roadmap.");
    } finally {
      setCreatingRoadmap(false);
    }
  }, [
    loadRoadmapsForProject,
    roadmapDraft.tagsInput,
    roadmapDraft.title,
    selectedProjectId,
    sessionToken,
  ]);

  const handleCreateChat = useCallback(async () => {
    if (!sessionToken || !selectedRoadmapId) {
      setStatusMessage("Select a roadmap to add a chat.");
      return;
    }
    const title = chatDraft.title.trim();
    if (!title) {
      setStatusMessage("Chat title is required.");
      return;
    }
    setCreatingChat(true);
    setError(null);
    try {
      const { id } = await createChat(sessionToken, selectedRoadmapId, {
        title,
        goal: chatDraft.goal.trim() || undefined,
        status: "in_progress",
        progress: 0,
      });
      setChatDraft({ title: "", goal: "" });
      persistChatSelection(selectedRoadmapId, id);
      await loadChatsForRoadmap(
        selectedRoadmapId,
        sessionToken,
        roadmapStatus[selectedRoadmapId],
        id,
        selectedProjectId
      );
      setSelectedChatId(id);
      await loadMessagesForChat(id, sessionToken);
      setStatusMessage("Chat created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create chat");
      setStatusMessage("Failed to create chat.");
    } finally {
      setCreatingChat(false);
    }
  }, [
    chatDraft.goal,
    chatDraft.title,
    loadChatsForRoadmap,
    roadmapStatus,
    selectedProjectId,
    selectedRoadmapId,
    sessionToken,
    persistChatSelection,
    loadMessagesForChat,
  ]);

  const handleSendMessage = useCallback(async () => {
    if (!sessionToken) {
      setMessagesError("Login to send a message.");
      return;
    }
    if (!selectedChatId) {
      setMessagesError("Select a chat to send a message.");
      return;
    }
    if (selectedChatId.startsWith("meta-")) {
      setMessagesError("Meta-chat messages are not supported yet.");
      return;
    }
    const content = messageDraft.trim();
    if (!content) return;
    setSendingMessage(true);
    setMessagesError(null);
    try {
      await postChatMessage(sessionToken, selectedChatId, { role: "user", content });
      setMessageDraft("");
      await loadMessagesForChat(selectedChatId, sessionToken);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  }, [loadMessagesForChat, messageDraft, selectedChatId, sessionToken]);

  const handleUpdateChatStatus = useCallback(
    async (override?: { status?: Status; progressPercent?: number; focus?: string }) => {
      if (!sessionToken || !selectedChatId) {
        setChatUpdateMessage("Select a chat first.");
        return;
      }
      if (selectedChatId.startsWith("meta-")) {
        setChatUpdateMessage("Meta-chat status comes from child chats.");
        return;
      }
      const rawProgress = override?.progressPercent ?? chatProgressDraft;
      const parsedProgress = Math.max(
        0,
        Math.min(100, Number.isFinite(Number(rawProgress)) ? Number(rawProgress) : 0)
      );
      const focusValue = (override?.focus ?? chatFocusDraft).trim();
      const statusValue = override?.status ?? chatStatusDraft;
      try {
        const updated = await updateChatStatus(sessionToken, selectedChatId, {
          status: statusValue,
          progress: parsedProgress / 100,
          focus: focusValue || undefined,
        });
        setChatUpdateMessage("Status updated.");
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === updated.id
              ? {
                  ...chat,
                  status: (updated.status as Status) ?? chat.status,
                  progress: updated.progress ?? chat.progress,
                  note: focusValue || chat.note,
                  focus: focusValue || chat.focus,
                }
              : chat
          )
        );
        await loadMessagesForChat(selectedChatId, sessionToken);
        if (selectedRoadmapId && sessionToken) {
          await loadMetaChat(selectedRoadmapId, sessionToken);
          await ensureStatus(selectedRoadmapId, sessionToken, { forceRefresh: true });
        }
      } catch (err) {
        setChatUpdateMessage(err instanceof Error ? err.message : "Failed to update status");
      }
    },
    [
      chatFocusDraft,
      chatProgressDraft,
      chatStatusDraft,
      ensureStatus,
      loadMessagesForChat,
      loadMetaChat,
      selectedChatId,
      selectedRoadmapId,
      sessionToken,
    ]
  );

  const handleRequestStatusMessage = useCallback(async () => {
    if (!sessionToken || !selectedChatId) {
      setChatUpdateMessage("Select a chat first.");
      return;
    }
    if (selectedChatId.startsWith("meta-")) {
      setChatUpdateMessage("Meta-chat status is aggregated.");
      return;
    }
    try {
      await postChatMessage(sessionToken, selectedChatId, {
        role: "status",
        content: "Status requested by user",
      });
      await loadMessagesForChat(selectedChatId, sessionToken);
      setChatUpdateMessage("Status request sent.");
    } catch (err) {
      setChatUpdateMessage(err instanceof Error ? err.message : "Failed to request status");
    }
  }, [loadMessagesForChat, selectedChatId, sessionToken]);

  const connectTerminalStream = (sessionId: string, token: string) => {
    if (!sessionId || !token) return;
    if (terminalSocket.current) {
      terminalSocket.current.close();
      terminalSocket.current = null;
    }
    setTerminalConnecting(true);
    setTerminalStatus("Connecting to terminal…");
    setTerminalOutput("Connecting to terminal…\n");
    const ws = new WebSocket(buildTerminalWsUrl(token, sessionId));
    terminalSocket.current = ws;

    ws.onopen = () => {
      setTerminalConnecting(false);
      setTerminalStatus(`Connected to session ${sessionId}`);
      setTerminalOutput((prev) => `${prev}[connected to ${sessionId}]\n`);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        setTerminalOutput((prev) => `${prev}${event.data}`);
        updateTerminalStatusFromText(event.data);
      } else if (event.data instanceof Blob) {
        event.data.text().then((text) => {
          setTerminalOutput((prev) => `${prev}${text}`);
          updateTerminalStatusFromText(text);
        });
      } else if (event.data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(new Uint8Array(event.data));
        setTerminalOutput((prev) => `${prev}${text}`);
        updateTerminalStatusFromText(text);
      }
    };

    ws.onerror = (event) => {
      const message = (event as ErrorEvent)?.message ?? "socket error";
      setTerminalOutput((prev) => `${prev}\n[stream error: ${message}]\n`);
      setTerminalConnecting(false);
      setTerminalStatus(`Stream error: ${message}`);
    };
    ws.onclose = (event) => {
      setTerminalConnecting(false);
      const reason =
        event.reason ||
        (event.code === 1008 ? "unauthorized" : event.code === 1006 ? "abnormal closure" : "");
      if (event.code === 1008) {
        setStatusMessage("Terminal auth failed. Try logging in again.");
        setTerminalSessionId(null);
      }
      setTerminalOutput(
        (prev) => `${prev}\n[stream closed (${event.code}${reason ? `: ${reason}` : ""})]\n`
      );
      const idleClosed = reason === "idle timeout" || event.code === 4000;
      if (idleClosed) {
        setTerminalStatus((prev) => prev ?? "Closed after idle timeout");
      } else {
        const summary = reason
          ? `Stream closed (${reason})`
          : event.code
            ? `Stream closed (code ${event.code})`
            : "Stream closed.";
        setTerminalStatus((prev) => prev ?? summary);
      }
    };
  };

  const startTerminalSession = async () => {
    if (!sessionToken) {
      setStatusMessage("Login to start a terminal session.");
      return;
    }
    setTerminalConnecting(true);
    setTerminalStatus("Starting terminal session…");
    setTerminalOutput("Starting terminal session…\n");
    try {
      const { sessionId } = await createTerminalSession(
        sessionToken,
        selectedProjectId ?? undefined
      );
      setTerminalSessionId(sessionId);
      connectTerminalStream(sessionId, sessionToken);
    } catch (err) {
      setTerminalOutput(
        `Failed to start terminal: ${err instanceof Error ? err.message : "unknown error"}\n`
      );
      setTerminalConnecting(false);
      setTerminalStatus("Failed to start terminal session.");
    }
  };

  const handleSendTerminalInput = async () => {
    if (!terminalInput.trim()) return;
    const payload = `${terminalInput}\n`;
    const socket = terminalSocket.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    } else if (sessionToken && terminalSessionId) {
      try {
        await sendTerminalInput(sessionToken, terminalSessionId, payload);
      } catch (err) {
        setTerminalOutput(
          (prev) => `${prev}\n[input failed: ${err instanceof Error ? err.message : "unknown"}]\n`
        );
      }
    }
    setTerminalInput("");
  };

  const loadFsTree = useCallback(
    async (pathOverride?: string) => {
      if (!sessionToken || !selectedProjectId) {
        setFsError("Login and select a project to browse files.");
        return;
      }
      const targetPath = pathOverride ?? fsPathRef.current ?? ".";
      setFsLoading(true);
      setFsError(null);
      setFsDiff("");
      setFsDiffError(null);
      setFsDiffLoaded(false);
      setFsDiffLoading(false);
      setFsContent("");
      setFsContentPath(null);
      setFsDraft("");
      setFsSaving(false);
      setFsSaveStatus(null);
      try {
        const tree = await fetchFileTree(sessionToken, selectedProjectId, targetPath);
        const basePath = tree.path || targetPath || ".";
        // Transform entries to include full paths
        const entriesWithPaths: FileEntry[] = tree.entries.map((entry) => ({
          ...entry,
          path: basePath === "." ? entry.name : `${basePath}/${entry.name}`,
        }));
        setFsEntries(entriesWithPaths);
        setFsPath(basePath);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load tree";
        setFsError(message);
        setFsEntries([]);
        setFsToast({
          message: "File list failed",
          detail: `${targetPath}: ${message}`,
          tone: "error",
        });
      } finally {
        setFsLoading(false);
      }
    },
    [sessionToken, selectedProjectId]
  );

  const openFolderForChat = useCallback(
    (chat: ChatItem | null) => {
      const resolvedPath = resolveChatFolder(chat);
      const targetPath = resolvedPath ?? ".";
      setActiveTab("Code");
      if (!sessionToken || !selectedProjectId) {
        setFsToast({
          message: "Login to browse files",
          detail: "Select a project to open folders.",
          tone: "error",
        });
        return;
      }
      setFsPath(targetPath);
      loadFsTree(targetPath);
      if (resolvedPath) {
        setFsToast({ message: "Opening folder", detail: targetPath, tone: "success" });
      } else {
        setFsToast({
          message: "No folder hint for this chat",
          detail: "Opened project root instead.",
          tone: "error",
        });
      }
    },
    [loadFsTree, resolveChatFolder, selectedProjectId, sessionToken]
  );

  useEffect(() => {
    openFolderForChatRef.current = openFolderForChat;
    return () => {
      openFolderForChatRef.current = null;
    };
  }, [openFolderForChat]);

  const openFile = useCallback(
    async (path: string) => {
      if (!sessionToken || !selectedProjectId) {
        setFsError("Login and select a project to open files.");
        return;
      }
      setFsLoading(true);
      setFsError(null);
      setFsDiff("");
      setFsDiffError(null);
      setFsDiffLoaded(false);
      setFsDiffLoading(false);
      try {
        const file = await fetchFileContent(sessionToken, selectedProjectId, path);
        setFsContentPath(file.path);
        setFsContent(file.content);
        setFsDraft(file.content);
        setFsSaveStatus(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load file";
        setFsError(message);
        setFsContent("");
        setFsContentPath(null);
        setFsDraft("");
        setFsToast({ message: "Open failed", detail: `${path}: ${message}`, tone: "error" });
      } finally {
        setFsLoading(false);
      }
    },
    [sessionToken, selectedProjectId]
  );

  const handleSelectEntry = (entry: FileEntry) => {
    if (entry.type === "dir") {
      loadFsTree(entry.path);
    } else {
      openFile(entry.path);
    }
  };

  const goUpDirectory = () => {
    if (fsPath === "." || fsPath === "") {
      loadFsTree(".");
      return;
    }
    const parts = fsPath.split("/").filter(Boolean);
    parts.pop();
    const parent = parts.length ? parts.join("/") : ".";
    loadFsTree(parent);
  };

  const loadFsDiff = useCallback(async () => {
    if (!sessionToken || !selectedProjectId || !fsContentPath) {
      setFsDiffError("Open a file to view git diff (login required).");
      return;
    }
    setFsDiffLoading(true);
    setFsDiffError(null);
    setFsDiff("");
    setFsDiffLoaded(false);
    try {
      const diff = await fetchFileDiff(
        sessionToken,
        selectedProjectId,
        fsContentPath,
        fsBaseSha.trim() || undefined,
        fsTargetSha.trim() || undefined
      );
      setFsDiff(diff.diff ?? "");
      setFsDiffLoaded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load diff";
      setFsDiffError(message);
      setFsDiff("");
      setFsDiffLoaded(false);
      setFsToast({
        message: "Diff load failed",
        detail: `${fsContentPath}: ${message}`,
        tone: "error",
      });
    } finally {
      setFsDiffLoading(false);
    }
  }, [fsBaseSha, fsContentPath, fsTargetSha, selectedProjectId, sessionToken]);

  const saveFile = async () => {
    if (!sessionToken || !selectedProjectId || !fsContentPath) {
      setFsError("Login and open a file before saving.");
      return;
    }
    setFsSaving(true);
    setFsSaveStatus(null);
    setFsError(null);
    try {
      await writeFileContent(
        sessionToken,
        selectedProjectId,
        fsContentPath,
        fsDraft,
        fsBaseSha.trim() || undefined
      );
      setFsContent(fsDraft);
      setFsSaveStatus("Saved");
      setFsToast({ message: "File saved", detail: fsContentPath, tone: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save file";
      setFsError(message);
      const toastDetail = fsContentPath ? `${fsContentPath}: ${message}` : message;
      setFsToast({
        message: "Save failed",
        detail: toastDetail,
        tone: "error",
      });
    } finally {
      setFsSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (terminalSocket.current) {
        terminalSocket.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!fsSaveStatus) return;
    const timer = setTimeout(() => setFsSaveStatus(null), 2500);
    return () => clearTimeout(timer);
  }, [fsSaveStatus]);

  useEffect(() => {
    setFsEntries([]);
    setFsContent("");
    setFsContentPath(null);
    setFsPath(".");
    setFsDraft("");
    setFsSaving(false);
    setFsSaveStatus(null);
    setFsToast(null);
    setFsDiff("");
    setFsDiffError(null);
    setFsDiffLoaded(false);
    setFsDiffLoading(false);
    setFsBaseSha("");
    setFsTargetSha("HEAD");
    if (sessionToken && selectedProjectId) {
      loadFsTree(".");
    }
  }, [loadFsTree, selectedProjectId, sessionToken]);

  useEffect(() => {
    if (!fsToast) return;
    const timer = setTimeout(() => setFsToast(null), 2400);
    return () => clearTimeout(timer);
  }, [fsToast]);
  useEffect(() => {
    if (!shareLinkStatus) return;
    const timer = setTimeout(() => setShareLinkStatus(null), 2000);
    return () => clearTimeout(timer);
  }, [shareLinkStatus]);

  useEffect(() => {
    if (!selectedChatId) {
      setChatStatusDraft("in_progress");
      setChatProgressDraft("0");
      setChatFocusDraft("");
      setChatUpdateMessage(null);
      setMessageFilter("all");
      return;
    }
    const chat = chats.find((c) => c.id === selectedChatId);
    if (chat) {
      setChatStatusDraft(chat.status);
      setChatProgressDraft(String(progressPercent(chat.progress)));
      setChatFocusDraft(chat.focus ?? chat.note ?? "");
      setChatUpdateMessage(null);
      setMessageFilter("all");
    }
  }, [chats, selectedChatId]);

  const loadAuditLog = useCallback(
    async (
      projectId?: string,
      options?: { reset?: boolean; filtersOverride?: Partial<typeof auditFilters> }
    ) => {
      if (!sessionToken) return;
      const cursor = options?.reset ? undefined : (auditCursorRef.current ?? undefined);
      const baseFilters = auditFiltersRef.current;
      const filters = {
        eventType: (options?.filtersOverride?.eventType ?? baseFilters.eventType) || undefined,
        userId: (options?.filtersOverride?.userId ?? baseFilters.userId) || undefined,
        pathContains:
          (options?.filtersOverride?.pathContains ?? baseFilters.pathContains) || undefined,
        ipAddress: (options?.filtersOverride?.ipAddress ?? baseFilters.ipAddress) || undefined,
      };
      if (options?.reset) {
        setAuditEvents([]);
        setAuditCursor(null);
        setAuditHasMore(false);
      }
      setAuditLoading(true);
      try {
        const { events, paging } = await fetchAuditEvents(
          sessionToken,
          projectId,
          50,
          undefined,
          cursor,
          filters,
          auditSort
        );
        setAuditEvents((prev) => (options?.reset ? events : [...prev, ...events]));
        setAuditCursor(paging?.nextCursor ?? null);
        setAuditHasMore(Boolean(paging?.hasMore));
        setAuditError(null);
      } catch (err) {
        if (options?.reset) {
          setAuditEvents([]);
          setAuditCursor(null);
        }
        setAuditHasMore(false);
        setAuditError(err instanceof Error ? err.message : "Failed to load audit events");
      } finally {
        setAuditLoading(false);
      }
    },
    [auditSort, sessionToken]
  );

  useEffect(() => {
    if (sessionToken) {
      loadAuditLog(auditProjectId || selectedProjectId || undefined, { reset: true });
    } else {
      setAuditEvents([]);
      setAuditCursor(null);
      setAuditHasMore(false);
    }
  }, [auditProjectId, loadAuditLog, selectedProjectId, sessionToken]);

  useEffect(() => {
    if (selectedProjectId && !auditProjectId) {
      setAuditProjectId(selectedProjectId);
    }
  }, [selectedProjectId, auditProjectId]);

  const selectedChat = chats.find((c) => c.id === selectedChatId);
  const isMetaChatSelected = selectedChat?.meta;
  const templateForChat = selectedChat?.templateId
    ? templates.find((t) => t.id === selectedChat.templateId)
    : null;
  const folderHint = resolveChatFolder(selectedChat);
  const roadmapMeta = selectedRoadmapId ? metaChats[selectedRoadmapId] : null;
  const roadmapSummary = selectedRoadmapId ? roadmapStatus[selectedRoadmapId] : null;
  const siblingTasks = chats.filter((chat) => !chat.meta && chat.id && chat.id !== selectedChatId);
  const lastStatusMessage = [...messages].reverse().find((msg) => msg.role === "status");
  const visibleMessages =
    messageFilter === "all"
      ? messages
      : messages.filter((message) => message.role === messageFilter);

  const messageNav = useMessageNavigation(messages, visibleMessages);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatStreamRef.current && messages.length > 0) {
      const stream = chatStreamRef.current;
      const isNearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 100;
      if (isNearBottom || messages.length === 1) {
        setTimeout(() => {
          stream.scrollTo({ top: stream.scrollHeight, behavior: "smooth" });
        }, 100);
      }
    }
  }, [messages.length]);

  const tabBody = (() => {
    switch (activeTab) {
      case "Terminal":
        return sessionToken && selectedProjectId ? (
          <Terminal
            sessionToken={sessionToken}
            projectId={selectedProjectId}
            onSessionCreated={(sid) => setTerminalSessionId(sid)}
            onSessionClosed={() => setTerminalSessionId(null)}
          />
        ) : (
          <div className="panel-card">
            <div className="panel-title">Terminal</div>
            <div className="panel-text">
              {!sessionToken
                ? "Please log in to use the terminal."
                : !selectedProjectId
                  ? "Select a project to start a terminal session."
                  : "Loading terminal..."}
            </div>
          </div>
        );
      case "Code":
        return (
          <div className="panel-card">
            <div className="panel-title">Code Viewer</div>
            <div className="panel-text">
              Browse workspace files for the selected project (read-only).
            </div>
            <div className="login-row" style={{ gap: 8, marginBottom: 6 }}>
              <button className="tab" onClick={goUpDirectory} disabled={fsLoading}>
                ↑ Up
              </button>
              <input
                className="filter"
                placeholder="Path"
                value={fsPath}
                onChange={(e) => setFsPath(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="tab" onClick={() => loadFsTree(fsPath)} disabled={fsLoading}>
                Open
              </button>
            </div>
            {fsError && (
              <div className="item-subtle" style={{ color: "#EF4444" }}>
                {fsError}
              </div>
            )}
            <FileTree
              entries={fsEntries}
              currentPath={fsPath}
              onSelectFile={openFile}
              onNavigateDir={loadFsTree}
              loading={fsLoading}
            />
            {fsContentPath && (
              <>
                <div className="item-subtle" style={{ marginBottom: 6 }}>
                  {fsContentPath} {fsDraft !== fsContent ? "(unsaved)" : null} {fsSaveStatus}
                </div>
                <CodeViewer
                  content={fsDraft}
                  filePath={fsContentPath}
                  readOnly={false}
                  onChange={(newContent) => {
                    setFsDraft(newContent);
                    setFsSaveStatus(null);
                  }}
                />
                <div className="login-row" style={{ gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <button
                    className="ghost"
                    onClick={() => setFsDraft(fsContent)}
                    disabled={fsDraft === fsContent || fsSaving || fsLoading}
                  >
                    Reset
                  </button>
                  <button
                    className="tab"
                    onClick={saveFile}
                    disabled={
                      fsDraft === fsContent ||
                      fsSaving ||
                      fsLoading ||
                      !sessionToken ||
                      !selectedProjectId
                    }
                  >
                    {fsSaving ? "Saving…" : "Save"}
                  </button>
                  {fsSaveStatus && <span className="item-subtle">{fsSaveStatus}</span>}
                </div>
                <div className="login-row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <input
                    className="filter"
                    placeholder="Base SHA (optional)"
                    value={fsBaseSha}
                    onChange={(e) => setFsBaseSha(e.target.value)}
                    style={{ minWidth: 160 }}
                  />
                  <input
                    className="filter"
                    placeholder="Target (default HEAD)"
                    value={fsTargetSha}
                    onChange={(e) => setFsTargetSha(e.target.value)}
                    style={{ minWidth: 140 }}
                  />
                  <button
                    className="tab"
                    onClick={loadFsDiff}
                    disabled={fsDiffLoading || fsLoading}
                  >
                    {fsDiffLoading ? "Loading…" : "View Diff"}
                  </button>
                  <button
                    className="ghost"
                    onClick={() => {
                      setFsDiff("");
                      setFsDiffError(null);
                      setFsDiffLoaded(false);
                    }}
                    disabled={!fsDiff && !fsDiffError && !fsDiffLoaded}
                  >
                    Clear
                  </button>
                </div>
                {fsDiffError && (
                  <div className="item-subtle" style={{ color: "#EF4444" }}>
                    {fsDiffError}
                  </div>
                )}
                {(fsDiffLoaded || fsDiff) && (
                  <DiffViewer
                    diff={fsDiff}
                    filePath={fsContentPath}
                    baseSha={fsBaseSha.trim() || undefined}
                    targetSha={fsTargetSha.trim() || undefined}
                  />
                )}
              </>
            )}
          </div>
        );
      default:
        if (!selectedChat) {
          return (
            <div className="panel-card">
              <div className="panel-title">Chat</div>
              <div className="panel-text">
                Pick a chat in the right column to view messages and update status.
              </div>
              <div className="panel-mono">
                {'{ status: "in_progress", progress: 0.42, focus: "Implement FS API" }'}
              </div>
            </div>
          );
        }
        if (isMetaChatSelected) {
          return (
            <div className="panel-card">
              <div className="panel-title">Meta-Chat</div>
              <div className="panel-text">
                Roadmap-level summaries from child chats will appear here once wired.
              </div>
              <div className="panel-mono">
                Aggregated status: {progressPercent(selectedChat.progress)}% · {selectedChat.status}
              </div>
              <div className="item-subtle">{selectedChat.note}</div>
            </div>
          );
        }
        return (
          <div className="panel-card">
            <div className="item-line" style={{ gap: 10 }}>
              <div className="panel-title" style={{ margin: 0 }}>
                {selectedChat.title}
              </div>
              <span className="item-subtle">
                {progressPercent(selectedChat.progress)}% · {selectedChat.status}
              </span>
              <span
                className="status-dot"
                style={{ background: statusColor[selectedChat.status] ?? statusColor.active }}
              />
              <div style={{ flex: 1 }} />
              <button
                className="ghost"
                onClick={() =>
                  sessionToken &&
                  selectedChatId &&
                  loadMessagesForChat(selectedChatId, sessionToken)
                }
                disabled={!sessionToken || messagesLoading}
              >
                {messagesLoading ? "Refreshing…" : "Refresh"}
              </button>
              <button className="ghost" onClick={copySelectionLink} disabled={!selectedProjectId}>
                Copy link
              </button>
              <button
                className="ghost"
                onClick={() =>
                  handleUpdateChatStatus({
                    status: "done",
                    progressPercent: 100,
                    focus:
                      chatFocusDraft.trim() ||
                      selectedChat.focus ||
                      selectedChat.goal ||
                      "Completed",
                  })
                }
                disabled={!sessionToken || messagesLoading}
              >
                Mark done
              </button>
              <button className="ghost" onClick={() => openFolderForChat(selectedChat)}>
                Open folder
              </button>
              <button
                className="ghost"
                onClick={() => {
                  const metaId = selectedRoadmapId ? `meta-${selectedRoadmapId}` : null;
                  if (!metaId) return;
                  const meta = chats.find((chat) => chat.id === metaId);
                  if (meta) handleSelectChat(meta);
                }}
                disabled={!selectedRoadmapId}
              >
                Open meta-chat
              </button>
              {shareLinkStatus && (
                <span
                  className="item-subtle"
                  style={{ color: shareLinkStatus.tone === "error" ? "#ef4444" : "#94a3b8" }}
                >
                  {shareLinkStatus.text}
                </span>
              )}
            </div>
            <div className="item-line" style={{ gap: 8, flexWrap: "wrap" }}>
              {templateForChat ? (
                <span className="item-pill" title={templateForChat.goal ?? ""}>
                  Template: {templateForChat.title}
                  {templateForChat.jsonRequired ? " · requires JSON" : ""}
                </span>
              ) : (
                <span className="item-subtle">Template: none linked</span>
              )}
              <span className="item-pill" title={selectedChat.goal ?? ""}>
                Goal: {selectedChat.goal ?? "—"}
              </span>
              {folderHint ? (
                <span className="item-pill" title={folderHint}>
                  Folder: {folderHint}
                </span>
              ) : (
                <span className="item-subtle">Folder: project root</span>
              )}
              {roadmapSummary && (
                <span className="item-pill" title={roadmapSummary.summary ?? ""}>
                  Roadmap: {progressPercent(roadmapSummary.progress)}% · {roadmapSummary.status}
                </span>
              )}
            </div>
            <div className="panel-text">
              Focus:{" "}
              {selectedChat.focus || selectedChat.note || selectedChat.goal || "No focus yet."}
            </div>
            <div className="item-subtle" style={{ marginBottom: 6 }}>
              {lastStatusMessage
                ? `Latest status ping: ${lastStatusMessage.content}`
                : "No status messages yet."}
            </div>
            <div className="item-subtle" style={{ marginBottom: 8 }}>
              Roadmap summary:{" "}
              {roadmapMeta?.summary ??
                roadmapSummary?.summary ??
                "Status will sync from meta-chat once available."}
            </div>
            <div className="item-subtle" style={{ marginBottom: 10 }}>
              Roadmap tasks:{" "}
              {siblingTasks.length
                ? siblingTasks
                    .slice(0, 3)
                    .map((chat) => `${chat.title} (${progressPercent(chat.progress)}%)`)
                    .join(" · ")
                : "No sibling tasks."}
            </div>
            <div className="login-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <select
                className="filter"
                value={chatStatusDraft}
                onChange={(e) => setChatStatusDraft(e.target.value as Status)}
                style={{ minWidth: 140 }}
              >
                {["in_progress", "active", "waiting", "blocked", "done", "idle"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                className="filter"
                style={{ width: 90 }}
                value={chatProgressDraft}
                onChange={(e) => setChatProgressDraft(e.target.value)}
                placeholder="%"
              />
              <input
                className="filter"
                style={{ flex: 1, minWidth: 200 }}
                value={chatFocusDraft}
                onChange={(e) => setChatFocusDraft(e.target.value)}
                placeholder="Focus / summary"
              />
              <button
                className="tab"
                onClick={() => handleUpdateChatStatus()}
                disabled={messagesLoading}
              >
                Update status
              </button>
              <button
                className="ghost"
                onClick={handleRequestStatusMessage}
                disabled={messagesLoading}
              >
                Request status
              </button>
              {chatUpdateMessage && (
                <span className="item-subtle" style={{ color: "#94a3b8" }}>
                  {chatUpdateMessage}
                </span>
              )}
            </div>
            {messagesError && (
              <div className="item-subtle" style={{ color: "#ef4444" }}>
                {messagesError}
              </div>
            )}
            <div className="login-row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span className="item-subtle">Messages:</span>
              <select
                className="filter"
                value={messageFilter}
                onChange={(e) => setMessageFilter(e.target.value as typeof messageFilter)}
                style={{ minWidth: 160 }}
              >
                {["all", "user", "assistant", "system", "status", "meta"].map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? "all roles" : value}
                  </option>
                ))}
              </select>
              <span className="item-subtle">
                Showing {visibleMessages.length}/{messages.length} messages
              </span>
            </div>
            <div className="chat-stream" ref={chatStreamRef}>
              {messagesLoading && <div className="item-subtle">Loading messages…</div>}
              {!messagesLoading && messages.length === 0 && (
                <div className="item-subtle">No messages yet.</div>
              )}
              {!messagesLoading && messages.length > 0 && visibleMessages.length === 0 && (
                <div className="item-subtle">No messages match this filter.</div>
              )}
              {visibleMessages.map((message) => (
                <div
                  className="chat-row"
                  key={message.id}
                  ref={(el) => messageNav.registerRef(message.id, el)}
                >
                  <span
                    className="chat-role"
                    style={{
                      background:
                        {
                          user: "rgba(14,165,233,0.2)",
                          assistant: "rgba(94,234,212,0.18)",
                          status: "rgba(245,158,11,0.18)",
                          system: "rgba(148,163,184,0.2)",
                          meta: "rgba(168,85,247,0.2)",
                        }[message.role] ?? "rgba(148,163,184,0.2)",
                      color:
                        {
                          user: "#bae6fd",
                          assistant: "#a7f3d0",
                          status: "#fcd34d",
                          system: "#cbd5e1",
                          meta: "#ddd6fe",
                        }[message.role] ?? "#e5e7eb",
                    }}
                  >
                    {message.role}
                  </span>
                  <div className="bubble">{message.content}</div>
                  <span className="item-subtle">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
            {messageNav.userMessages.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  borderTop: "1px solid #374151",
                  background: "#1F2937",
                }}
              >
                <span className="item-subtle" style={{ fontSize: "0.875rem" }}>
                  User messages: {messageNav.currentUserMessageIndex + 1} /{" "}
                  {messageNav.userMessages.length}
                </span>
                <button
                  type="button"
                  onClick={messageNav.goToPrevious}
                  style={{
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.875rem",
                    background: "#374151",
                    color: "#F9FAFB",
                    border: "1px solid #4B5563",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  title="Previous user message (wraps around)"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={messageNav.goToNext}
                  style={{
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.875rem",
                    background: "#374151",
                    color: "#F9FAFB",
                    border: "1px solid #4B5563",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  title="Next user message (wraps around)"
                >
                  Next →
                </button>
              </div>
            )}
            <div className="login-row" style={{ alignItems: "flex-start", gap: 8 }}>
              <textarea
                className="code-input"
                style={{ minHeight: 120, flex: 1 }}
                placeholder="Send a message to this chat"
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!sessionToken || sendingMessage}
              />
              <button
                className="tab"
                style={{ alignSelf: "stretch", minHeight: 44 }}
                onClick={handleSendMessage}
                disabled={
                  sendingMessage || !messageDraft.trim() || !sessionToken || !selectedChatId
                }
              >
                {sendingMessage ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        );
    }
  })();

  const editingProjectName =
    editingProjectId &&
    (projects.find((project) => project.id === editingProjectId)?.name ?? editingProjectId);
  const editingRoadmapName =
    editingRoadmapId &&
    (roadmaps.find((roadmap) => roadmap.id === editingRoadmapId)?.title ?? editingRoadmapId);
  const contextPanelTitle = contextPanel
    ? contextPanel.kind === "project-settings"
      ? "Project settings"
      : contextPanel.kind === "project-templates"
        ? "Templates"
        : "Roadmap context"
    : "";
  const contextPanelSubject =
    contextPanel?.kind === "roadmap-details"
      ? contextPanel.roadmapTitle
      : contextPanel?.projectName;

  return (
    <main className="page">
      <div className="panel-card" style={{ marginBottom: 12 }}>
        <div className="panel-title">Login</div>
        <div className="panel-text">Use environment defaults or override to test other users.</div>
        <div className="login-row">
          <input
            className="filter"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="filter"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="filter"
            placeholder="Keyfile token (optional)"
            value={keyfileToken}
            onChange={(e) => setKeyfileToken(e.target.value)}
          />
          <button className="tab" onClick={handleLoginSubmit} disabled={loading || !username}>
            {loading ? "Loading…" : "Login"}
          </button>
        </div>
        <div
          className="login-row"
          style={{ gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}
        >
          <span className="item-subtle" style={{ minWidth: 120 }}>
            Theme mode
          </span>
          <select
            className="filter"
            value={globalThemeMode}
            onChange={(event) => setGlobalThemeMode(event.target.value as GlobalThemeMode)}
            style={{ minWidth: 160 }}
          >
            <option value="auto">Auto (OS)</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
          <span className="item-subtle" style={{ minWidth: 220, flex: 1 }}>
            {selectedProject?.theme
              ? `Project overrides ${selectedProject.name}`
              : `Base ${resolvedGlobalThemeMode} theme`}
          </span>
        </div>
        {loginError && (
          <div className="item-subtle" style={{ color: "#EF4444" }}>
            {loginError}
          </div>
        )}
        <div className="item-subtle">
          {activeUser && sessionToken
            ? `Active user: ${activeUser} (token ${sessionToken.slice(0, 6)}…)`
            : "Active user: none (mock data)"}
        </div>
        {statusMessage && (
          <div className="item-subtle" style={{ color: "#F59E0B" }}>
            {statusMessage}
          </div>
        )}
      </div>
      <div className="columns">
        <div className="column projects-column">
          <header className="column-header">
            <span>Projects</span>
            <button
              className="ghost"
              onClick={seedDemoData}
              disabled={!sessionToken || seeding || loading}
              title={sessionToken ? "" : "Login to create demo data"}
            >
              {seeding ? "Seeding…" : "Seed demo"}
            </button>
          </header>
          {selectedProject && (
            <div className="item-subtle project-context">
              Context: {selectedProject.category} · {formatStatusLabel(selectedProject.status)} ·{" "}
              {selectedProject.info || "No project description yet."}
            </div>
          )}
          <div
            className="login-row"
            style={{ gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}
          >
            <input
              className="filter"
              placeholder="Filter projects"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
            />
            <button
              className="ghost"
              onClick={() => setProjectFilter("")}
              disabled={!normalizedProjectFilter}
            >
              Clear
            </button>
          </div>
          <div className="login-row" style={{ gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <input
              className="filter"
              placeholder="Project name"
              value={projectDraft.name}
              onChange={(e) => setProjectDraft((prev) => ({ ...prev, name: e.target.value }))}
              style={{ minWidth: 160 }}
            />
            <input
              className="filter"
              placeholder="Category"
              value={projectDraft.category}
              onChange={(e) => setProjectDraft((prev) => ({ ...prev, category: e.target.value }))}
              style={{ minWidth: 120 }}
            />
            <input
              className="filter"
              placeholder="Description"
              value={projectDraft.description}
              onChange={(e) =>
                setProjectDraft((prev) => ({ ...prev, description: e.target.value }))
              }
              style={{ flex: 1, minWidth: 180 }}
            />
            <select
              className="filter"
              value={projectThemePreset}
              onChange={(event) =>
                setProjectThemePreset(event.target.value as ProjectThemePresetKey)
              }
              style={{ minWidth: 160 }}
            >
              {(Object.entries(projectThemePresetLabels) as [ProjectThemePresetKey, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                )
              )}
            </select>
            <button
              className="tab"
              onClick={editingProjectId ? handleUpdateProject : handleCreateProject}
              disabled={
                editingProjectId
                  ? updatingProject || !sessionToken
                  : creatingProject || !sessionToken
              }
              title={sessionToken ? "" : "Login required"}
            >
              {editingProjectId
                ? updatingProject
                  ? "Saving…"
                  : "Save changes"
                : creatingProject
                  ? "Creating…"
                  : "+ Project"}
            </button>
            {editingProjectId && (
              <button className="ghost" onClick={cancelProjectEdit} disabled={updatingProject}>
                Cancel edit
              </button>
            )}
          </div>
          {editingProjectName && (
            <div className="item-subtle editing-hint">Editing project: {editingProjectName}</div>
          )}
          {loading && <div className="item-subtle">Loading projects…</div>}
          {error && <div className="item-subtle">{error}</div>}
          <div className="list">
            {!loading && groupedProjects.length === 0 && (
              <div className="item-subtle">
                {projects.length === 0
                  ? sessionToken
                    ? "No projects yet. Seed demo data to populate the lists."
                    : "No projects yet. Login to load data."
                  : normalizedProjectFilter
                    ? `No projects match "${normalizedProjectFilter}".`
                    : "No projects match the current filter."}
              </div>
            )}
            {groupedProjects.map((group) => (
              <div className="project-group" key={group.category}>
                <div className="project-group-header">
                  <span>{group.category}</span>
                  <span className="item-subtle">
                    {group.items.length} project{group.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                {group.items.map((p) => (
                  <div
                    className={`item ${selectedProjectId === p.id ? "active" : ""}`}
                    key={p.id ?? `${p.name}-${group.category}`}
                    onClick={() => p.id && handleSelectProject(p.id)}
                    onContextMenu={(event) => openProjectContextMenu(event, p)}
                  >
                    <div className="item-line">
                      <span className="status-dot" style={{ background: statusColor[p.status] }} />
                      <span className="item-title">{p.name}</span>
                      <span className="item-pill">{p.category}</span>
                    </div>
                    <div className="item-sub">{p.info}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="column roadmaps-column">
          <header className="column-header">
            <span>Roadmap Lists</span>
          </header>
          {selectedRoadmapId && (
            <div className="item-subtle roadmap-context">
              {roadmapSummary
                ? `${progressPercent(roadmapSummary.progress)}% · ${formatStatusLabel(
                    roadmapSummary.status
                  )} · ${roadmapSummary.summary ?? "Summary not available for this roadmap."}`
                : "Loading roadmap context…"}
            </div>
          )}
          <div
            className="login-row"
            style={{ gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}
          >
            <input
              className="filter"
              placeholder="Filter roadmaps"
              value={roadmapFilter}
              onChange={(e) => setRoadmapFilter(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
              disabled={!selectedProjectId}
            />
            <button
              className="ghost"
              onClick={() => setRoadmapFilter("")}
              disabled={!selectedProjectId || !normalizedRoadmapFilter}
            >
              Clear
            </button>
          </div>
          <div className="login-row" style={{ gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <input
              className="filter"
              placeholder="Roadmap title"
              value={roadmapDraft.title}
              onChange={(e) => setRoadmapDraft((prev) => ({ ...prev, title: e.target.value }))}
              style={{ minWidth: 160 }}
              disabled={!selectedProjectId}
            />
            <input
              className="filter"
              placeholder="Tags (comma separated)"
              value={roadmapDraft.tagsInput}
              onChange={(e) => setRoadmapDraft((prev) => ({ ...prev, tagsInput: e.target.value }))}
              style={{ flex: 1, minWidth: 180 }}
              disabled={!selectedProjectId}
            />
            <button
              className="tab"
              onClick={editingRoadmapId ? handleUpdateRoadmap : handleCreateRoadmap}
              disabled={
                editingRoadmapId
                  ? updatingRoadmap || !sessionToken || !selectedProjectId
                  : creatingRoadmap || !sessionToken || !selectedProjectId
              }
              title={selectedProjectId ? "" : "Select a project first"}
            >
              {editingRoadmapId
                ? updatingRoadmap
                  ? "Saving…"
                  : "Save changes"
                : creatingRoadmap
                  ? "Creating…"
                  : "+ Roadmap"}
            </button>
            {editingRoadmapId && (
              <button className="ghost" onClick={cancelRoadmapEdit} disabled={updatingRoadmap}>
                Cancel edit
              </button>
            )}
          </div>
          {editingRoadmapName && (
            <div className="item-subtle editing-hint">Editing roadmap: {editingRoadmapName}</div>
          )}
          <div className="list">
            {selectedProjectId && filteredRoadmaps.length === 0 && (
              <div className="item-subtle">
                {roadmaps.length === 0
                  ? "No roadmaps for this project yet."
                  : normalizedRoadmapFilter
                    ? `No roadmaps match "${normalizedRoadmapFilter}".`
                    : "No roadmaps for this project yet."}
              </div>
            )}
            {filteredRoadmaps.map((r) => {
              const statusRecord = r.id ? roadmapStatus[r.id] : undefined;
              const displayProgress = statusRecord?.progress ?? r.progress;
              const displayStatus = statusRecord?.status ?? r.status;
              const displaySummary = statusRecord?.summary ?? r.summary;
              if (!r.title) return null;
              return (
                <div
                  className={`item ${selectedRoadmapId === r.id ? "active" : ""}`}
                  key={r.id ?? r.title}
                  onClick={() => r.id && handleSelectRoadmap(r.id)}
                  onContextMenu={(event) => openRoadmapContextMenu(event, r)}
                >
                  <div className="item-line">
                    <span
                      className="status-dot"
                      style={{
                        background: statusColor[displayStatus] ?? statusColor.active,
                      }}
                    />
                    <span className="item-title">{r.title}</span>
                    <span className="item-subtle">{progressPercent(displayProgress)}%</span>
                  </div>
                  <div className="roadmap-summary-row">
                    <span className="item-subtle">
                      {displaySummary ?? "Summary unavailable for this roadmap."}
                    </span>
                    <span className="item-subtle roadmap-status-text">
                      {formatStatusLabel(displayStatus)}
                    </span>
                  </div>
                  {r.tags.length > 0 && (
                    <div className="roadmap-tags">
                      {r.tags.map((tag) => (
                        <span className="item-pill" key={`${r.title}-${tag}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.metaChatId && (
                    <div className="item-subtle" style={{ marginTop: 4 }}>
                      Meta chat linked
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="column chats-column">
          <header className="column-header">
            <span>Chats</span>
          </header>
          <div className="login-row" style={{ gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <input
              className="filter"
              placeholder="Chat title"
              value={chatDraft.title}
              onChange={(e) => setChatDraft((prev) => ({ ...prev, title: e.target.value }))}
              style={{ minWidth: 160 }}
              disabled={!selectedRoadmapId}
            />
            <input
              className="filter"
              placeholder="Goal"
              value={chatDraft.goal}
              onChange={(e) => setChatDraft((prev) => ({ ...prev, goal: e.target.value }))}
              style={{ flex: 1, minWidth: 200 }}
              disabled={!selectedRoadmapId}
            />
            <button
              className="tab"
              onClick={handleCreateChat}
              disabled={creatingChat || !sessionToken || !selectedRoadmapId}
              title={selectedRoadmapId ? "" : "Select a roadmap first"}
            >
              {creatingChat ? "Creating…" : "+ Chat"}
            </button>
          </div>
          <div className="list">
            {chats.length === 0 && selectedRoadmapId && (
              <div className="item-subtle">No chats for this roadmap yet.</div>
            )}
            {chats.map((c) => (
              <div
                className={`item ${c.meta ? "meta" : ""} ${selectedChatId === c.id ? "active" : ""}`}
                key={c.id ?? c.title}
                onClick={() => handleSelectChat(c)}
                onContextMenu={(event) => openChatContextMenu(event, c)}
                style={{ cursor: c.id ? "pointer" : "default" }}
              >
                <div className="item-line">
                  <span
                    className="status-dot"
                    style={{ background: statusColor[c.status] ?? statusColor.active }}
                  />
                  <span className="item-title">{c.title}</span>
                  <span className="item-subtle">{progressPercent(c.progress)}%</span>
                </div>
                <div className="item-sub">{c.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="column main-panel">
          <header className="column-header">
            <span>Main Panel</span>
            <div className="tabs">
              {["Chat", "Terminal", "Code"].map((tab) => (
                <button
                  key={tab}
                  className={`tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </header>
          <div className="panel-body">{tabBody}</div>
        </div>
      </div>

      <div className="panel-card" style={{ marginTop: 12 }}>
        <div className="panel-title">Recent Activity</div>
        <div className="panel-text">Latest file/terminal actions (backend DB required).</div>
        <div className="login-row" style={{ gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <select
            className="filter"
            value={auditProjectId}
            onChange={(e) => setAuditProjectId(e.target.value)}
          >
            <option value="">All projects</option>
            {projects
              .filter((p) => p.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <select
            className="filter"
            value={auditFilters.eventType}
            onChange={(e) => setAuditFilters((prev) => ({ ...prev, eventType: e.target.value }))}
          >
            <option value="">Any event</option>
            {eventTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            className="filter"
            placeholder="User ID"
            value={auditFilters.userId}
            onChange={(e) => setAuditFilters((prev) => ({ ...prev, userId: e.target.value }))}
          />
          <input
            className="filter"
            placeholder="IP address"
            value={auditFilters.ipAddress}
            onChange={(e) => setAuditFilters((prev) => ({ ...prev, ipAddress: e.target.value }))}
            style={{ minWidth: 140 }}
          />
          <input
            className="filter"
            placeholder="Path contains"
            value={auditFilters.pathContains}
            onChange={(e) => setAuditFilters((prev) => ({ ...prev, pathContains: e.target.value }))}
            style={{ flex: 1, minWidth: 160 }}
          />
          <select
            className="filter"
            value={auditSort}
            onChange={(e) => {
              const value = e.target.value === "asc" ? "asc" : "desc";
              setAuditSort(value);
            }}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
          <button
            className="tab"
            onClick={() => loadAuditLog(auditProjectId || undefined, { reset: true })}
            disabled={auditLoading}
          >
            Apply filters
          </button>
          <button
            className="ghost"
            onClick={() => {
              const cleared = { eventType: "", userId: "", pathContains: "", ipAddress: "" };
              setAuditFilters(cleared);
              loadAuditLog(auditProjectId || undefined, { reset: true, filtersOverride: cleared });
            }}
            disabled={auditLoading}
          >
            Clear
          </button>
        </div>
        <div className="login-row" style={{ gap: 8, marginBottom: 8 }}>
          <button
            className="tab"
            onClick={() => loadAuditLog(auditProjectId || undefined, { reset: true })}
            disabled={auditLoading}
          >
            {auditLoading ? "Loading…" : "Refresh"}
          </button>
          <button
            className="ghost"
            onClick={() => loadAuditLog(auditProjectId || undefined)}
            disabled={!auditHasMore || auditLoading}
          >
            {auditLoading ? "Loading…" : auditHasMore ? "Load more" : "No more events"}
          </button>
        </div>
        {auditError && (
          <div className="item-subtle" style={{ color: "#EF4444" }}>
            {auditError}
          </div>
        )}
        <div className="list" style={{ maxHeight: 260, overflow: "auto" }}>
          {auditEvents.length === 0 && <div className="item-subtle">No audit events yet.</div>}
          {auditEvents.map((event) => (
            <div className="item" key={event.id}>
              <div className="item-line">
                <span className="item-title">{event.eventType}</span>
                <span className="item-subtle">
                  {new Date(event.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="item-sub">{event.path ?? event.sessionId ?? "N/A"}</div>
              {(() => {
                const derivedIp =
                  event.ipAddress ??
                  (event.metadata &&
                  typeof (event.metadata as Record<string, unknown>).ip === "string"
                    ? String((event.metadata as Record<string, unknown>).ip)
                    : null);
                return (
                  <div className="item-subtle">
                    user {event.userId ?? "—"} · session {event.sessionId ?? "—"} · project{" "}
                    {event.projectId ?? "—"} · ip {derivedIp ?? "—"}
                  </div>
                );
              })()}
              {(() => {
                const metaSummary = summarizeAuditMeta(event.metadata);
                return metaSummary ? <div className="item-subtle">meta {metaSummary}</div> : null;
              })()}
            </div>
          ))}
          {auditLoading && <div className="item-subtle">Loading…</div>}
        </div>
      </div>
      {contextPanel && (
        <div className="context-panel">
          <div className="context-panel-header">
            <div>
              <div className="context-panel-title">{contextPanelTitle}</div>
              <div className="item-subtle">{contextPanelSubject}</div>
            </div>
            <button className="ghost" onClick={() => setContextPanel(null)}>
              Close
            </button>
          </div>
          <div className="context-panel-content">
            {contextPanel.kind === "project-settings" ? (
              <>
                {contextPanel.loading ? (
                  <div className="item-subtle">Loading settings…</div>
                ) : contextPanel.error ? (
                  <div className="item-subtle" style={{ color: "#EF4444" }}>
                    {contextPanel.error}
                  </div>
                ) : contextPanel.details ? (
                  <div className="context-panel-section">
                    <div className="context-panel-list-item">
                      <span className="context-panel-label">Status</span>
                      <span className="item-subtle">
                        {formatStatusLabel(contextPanel.details.project.status as Status)}
                      </span>
                    </div>
                    <div className="context-panel-list-item">
                      <span className="context-panel-label">Description</span>
                      <span className="item-subtle">
                        {contextPanel.details.project.description ?? "No description"}
                      </span>
                    </div>
                    <div className="context-panel-list-item">
                      <span className="context-panel-label">Roadmaps</span>
                      <span className="item-subtle">
                        {contextPanel.details.roadmapLists.length} configured
                      </span>
                    </div>
                    {contextPanel.details.roadmapLists.length > 0 && (
                      <div className="context-panel-roadmaps">
                        {contextPanel.details.roadmapLists.slice(0, 3).map((roadmap) => (
                          <div className="context-panel-list-item" key={roadmap.id}>
                            <span>{roadmap.title}</span>
                            <span className="item-subtle">
                              {progressPercent(roadmap.progress)}% ·{" "}
                              {formatStatusLabel(roadmap.status as Status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="item-subtle">No project details available.</div>
                )}
              </>
            ) : contextPanel.kind === "project-templates" ? (
              <TemplatePanel
                templates={templates}
                token={sessionToken ?? ""}
                onTemplateCreated={reloadTemplates}
              />
            ) : (
              <>
                {contextPanel.loading ? (
                  <div className="item-subtle">Loading roadmap context…</div>
                ) : contextPanel.error ? (
                  <div className="item-subtle" style={{ color: "#EF4444" }}>
                    {contextPanel.error}
                  </div>
                ) : (
                  <div className="context-panel-section">
                    {contextPanel.notice && (
                      <div className="item-subtle" style={{ color: "#10B981" }}>
                        {contextPanel.notice}
                      </div>
                    )}
                    <div className="context-panel-list-item">
                      <span className="context-panel-label">Status</span>
                      <span className="item-subtle">
                        {formatStatusLabel(contextPanel.status ?? "active")} ·{" "}
                        {progressPercent(contextPanel.progress ?? 0)}%
                      </span>
                    </div>
                    <div className="context-panel-list-item">
                      <span className="context-panel-label">Summary</span>
                      <span className="item-subtle">
                        {contextPanel.summary ?? "Summary not available yet."}
                      </span>
                    </div>
                    {contextPanel.tags && contextPanel.tags.length > 0 && (
                      <div className="context-panel-list-item">
                        <span className="context-panel-label">Tags</span>
                        <div className="roadmap-tags">
                          {contextPanel.tags.map((tag) => (
                            <span className="item-pill" key={`${contextPanel.roadmapId}-${tag}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(contextPanel.metaStatus || contextPanel.metaSummary) && (
                      <div className="context-panel-list-item">
                        <span className="context-panel-label">Meta chat</span>
                        <span className="item-subtle">
                          {contextPanel.metaSummary ?? "Meta summary unavailable."}
                        </span>
                        <span className="item-subtle">
                          {contextPanel.metaStatus
                            ? `${progressPercent(contextPanel.metaProgress ?? 0)}% · ${formatStatusLabel(
                                contextPanel.metaStatus
                              )}`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {fsToast && (
        <div className={`toast ${fsToast.tone === "error" ? "toast-error" : "toast-success"}`}>
          <span style={{ fontWeight: 700 }}>{fsToast.message}</span>
          {fsToast.detail && <div className="item-subtle">{fsToast.detail}</div>}
        </div>
      )}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.stopPropagation()}
        >
          {contextActionConfig[contextMenu.type].map((action) => (
            <button
              key={action.key}
              type="button"
              className="context-menu-item"
              onClick={() => handleContextAction(action.key)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

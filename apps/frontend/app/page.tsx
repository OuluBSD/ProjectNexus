'use client';

import { useEffect, useRef, useState } from "react";
import {
  buildTerminalWsUrl,
  createTerminalSession,
  fetchChats,
  fetchFileContent,
  fetchFileTree,
  fetchProjects,
  fetchRoadmapStatus,
  fetchRoadmaps,
  login,
  fetchAuditEvents,
  sendTerminalInput,
} from "../lib/api";

type Status = "inactive" | "waiting" | "active" | "blocked" | "done" | "in_progress" | "idle" | "error";
const DEMO_USERNAME = process.env.NEXT_PUBLIC_DEMO_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "demo";
const DEMO_KEYFILE = process.env.NEXT_PUBLIC_DEMO_KEYFILE_TOKEN;
const PROJECT_STORAGE_KEY = "agentmgr:selectedProject";
const ROADMAP_STORAGE_KEY = "agentmgr:selectedRoadmap";

type ProjectItem = { id?: string; name: string; category: string; status: Status; info: string };
type RoadmapItem = {
  id?: string;
  title: string;
  tags: string[];
  progress: number;
  status: Status;
  metaChatId?: string;
  summary?: string;
};
type ChatItem = { id?: string; title: string; status: Status; progress: number; note?: string; meta?: boolean };
type AuditEvent = {
  id: string;
  eventType: string;
  path?: string | null;
  createdAt: string;
  sessionId?: string | null;
  userId?: string | null;
  projectId?: string | null;
};

const mockProjects: ProjectItem[] = [
  { name: "Atlas Compute", category: "Infra", status: "active", info: "LLM orchestration spine" },
  { name: "Nexus", category: "Product", status: "waiting", info: "Multi-agent cockpit" },
  { name: "Helios", category: "Research", status: "inactive", info: "Offline eval bench" },
];

const mockRoadmaps: RoadmapItem[] = [
  { title: "MVP Core", tags: ["api", "db"], progress: 0.42, status: "active" },
  { title: "Templates", tags: ["prompt", "js"], progress: 0.18, status: "waiting" },
  { title: "Terminal", tags: ["pty"], progress: 0.6, status: "active" },
];

const mockChats: ChatItem[] = [
  { title: "Meta-Chat (Roadmap Brain)", status: "active", progress: 0.55, meta: true, note: "Aggregating child statuses" },
  { title: "Implement FS API", status: "waiting", progress: 0.35, note: "Blocked on auth middleware" },
  { title: "UI Shell", status: "active", progress: 0.7, note: "Tabs wired, mock data flowing" },
  { title: "Template JSON Validator", status: "inactive", progress: 0.15, note: "Need schema + tests" },
];

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

export default function Page() {
  const [projects, setProjects] = useState<ProjectItem[]>(mockProjects);
  const [roadmaps, setRoadmaps] = useState<RoadmapItem[]>(mockRoadmaps);
  const [chats, setChats] = useState<ChatItem[]>(mockChats);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);
  const [roadmapStatus, setRoadmapStatus] = useState<
    Record<string, { status: Status; progress: number; summary?: string }>
  >({});
  const [username, setUsername] = useState(DEMO_USERNAME);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [keyfileToken, setKeyfileToken] = useState(DEMO_KEYFILE ?? "");
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Chat" | "Terminal" | "Code">("Chat");
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string>("Connect to stream to see output.");
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [terminalConnecting, setTerminalConnecting] = useState(false);
  const terminalSocket = useRef<WebSocket | null>(null);
  const [fsPath, setFsPath] = useState<string>(".");
  const [fsEntries, setFsEntries] = useState<{ type: "dir" | "file"; name: string }[]>([]);
  const [fsContentPath, setFsContentPath] = useState<string | null>(null);
  const [fsContent, setFsContent] = useState<string>("");
  const [fsLoading, setFsLoading] = useState(false);
  const [fsError, setFsError] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditFilters, setAuditFilters] = useState<{ eventType: string; userId: string; pathContains: string }>({
    eventType: "",
    userId: "",
    pathContains: "",
  });
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  const eventTypeOptions = Array.from(new Set(auditEvents.map((e) => e.eventType))).sort();

  const ensureStatus = async (roadmapId: string, token: string) => {
    const existing = roadmapStatus[roadmapId];
    if (existing) return existing;
    try {
      const remote = await fetchRoadmapStatus(token, roadmapId);
      const mapped = {
        status: (remote.status as Status) ?? "active",
        progress: remote.progress ?? 0,
        summary: remote.summary,
      };
      setRoadmapStatus((prev) => ({ ...prev, [roadmapId]: mapped }));
      return mapped;
    } catch {
      return null;
    }
  };

  const fallbackToMockData = (reason: string) => {
    setStatusMessage(reason);
    setSessionToken(null);
    setActiveUser(null);
    setProjects(mockProjects);
    setRoadmaps(mockRoadmaps);
    setChats(mockChats);
    setSelectedProjectId(null);
    setSelectedRoadmapId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
      localStorage.removeItem(ROADMAP_STORAGE_KEY);
    }
    setTerminalSessionId(null);
    setTerminalOutput("Connect to stream to see output.");
    setFsEntries([]);
    setFsContent("");
    setFsContentPath(null);
    setFsPath(".");
  };

  const loadChatsForRoadmap = async (
    roadmapId: string,
    token: string,
    statusHint?: { status: Status; progress: number; summary?: string }
  ) => {
    try {
      const status = statusHint ?? (await ensureStatus(roadmapId, token));
      const chatData = await fetchChats(token, roadmapId);
      const mappedChats: ChatItem[] = [
        status
          ? {
              id: `meta-${roadmapId}`,
              title: "Meta-Chat",
              status: status.status,
              progress: status.progress,
              note: status.summary ?? "Aggregated from child chats",
              meta: true,
            }
          : null,
        ...chatData.map((c) => ({
          id: c.id,
          title: c.title,
          status: (c.status as Status) ?? "active",
          progress: c.progress ?? 0,
          note: c.goal,
        })),
      ].filter(Boolean) as ChatItem[];
      setChats(mappedChats);
    } catch (err) {
      setStatusMessage("Using mock chats (backend unreachable)");
      setError(err instanceof Error ? err.message : "Failed to load chats");
      setChats(mockChats);
    }
  };

  const loadRoadmapsForProject = async (projectId: string, token: string) => {
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
        statusPairs.filter(([, value]) => value !== null) as [string, { status: Status; progress: number; summary?: string }][]
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
      const preferredRoadmapId =
        storedRoadmapId && roadmapData.some((r) => r.id === storedRoadmapId)
          ? storedRoadmapId
          : roadmapData[0]?.id;
      if (preferredRoadmapId) {
        setSelectedRoadmapId(preferredRoadmapId);
        if (typeof window !== "undefined") localStorage.setItem(ROADMAP_STORAGE_KEY, preferredRoadmapId);
        await loadChatsForRoadmap(preferredRoadmapId, token, statusMap[preferredRoadmapId]);
      } else {
        setChats([]);
        setSelectedRoadmapId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roadmaps");
      setStatusMessage("Failed to load roadmaps; showing mock data.");
      setRoadmaps(mockRoadmaps);
      setChats(mockChats);
      setSelectedRoadmapId(null);
    }
  };

  const hydrateWorkspace = async (token: string, activeUsername: string) => {
    try {
      setSessionToken(token);
      setActiveUser(activeUsername);
      const projectData = await fetchProjects(token);
      const storedProjectId =
        typeof window !== "undefined" ? localStorage.getItem(PROJECT_STORAGE_KEY) : null;
      const mappedProjects = projectData.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category ?? "Uncategorized",
        status: (p.status as Status) ?? "active",
        info: p.description ?? "",
      }));
      setProjects(mappedProjects);
      const preferredProjectId =
        storedProjectId && projectData.some((p) => p.id === storedProjectId)
          ? storedProjectId
          : projectData[0]?.id;
      if (preferredProjectId) {
        setSelectedProjectId(preferredProjectId);
        if (typeof window !== "undefined") localStorage.setItem(PROJECT_STORAGE_KEY, preferredProjectId);
        await loadRoadmapsForProject(preferredProjectId, token);
      } else {
        setRoadmaps([]);
        setChats([]);
        setSelectedProjectId(null);
        setSelectedRoadmapId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
      fallbackToMockData("Backend unreachable; showing mock data.");
    }
  };

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
          fallbackToMockData("Using mock data (backend unreachable)");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectRoadmap = async (roadmapId: string) => {
    setSelectedRoadmapId(roadmapId);
    if (typeof window !== "undefined") localStorage.setItem(ROADMAP_STORAGE_KEY, roadmapId);
    if (sessionToken) {
      await loadChatsForRoadmap(roadmapId, sessionToken, roadmapStatus[roadmapId]);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    setSelectedProjectId(projectId);
    if (typeof window !== "undefined") localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
    if (sessionToken) {
      setSelectedRoadmapId(null);
      await loadRoadmapsForProject(projectId, sessionToken);
    }
  };

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
      setError("Login failed; using mock data");
      setLoginError(err instanceof Error ? err.message : "Login failed");
      fallbackToMockData("Login failed; showing mock data.");
    } finally {
      setLoading(false);
    }
  };

  const connectTerminalStream = (sessionId: string, token: string) => {
    if (!sessionId || !token) return;
    if (terminalSocket.current) {
      terminalSocket.current.close();
      terminalSocket.current = null;
    }
    setTerminalConnecting(true);
    setTerminalOutput("Connecting to terminal…\n");
    const ws = new WebSocket(buildTerminalWsUrl(token, sessionId));
    terminalSocket.current = ws;

    ws.onopen = () => {
      setTerminalConnecting(false);
      setTerminalOutput((prev) => `${prev}[connected to ${sessionId}]\n`);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        setTerminalOutput((prev) => `${prev}${event.data}`);
      } else if (event.data instanceof Blob) {
        event.data.text().then((text) => setTerminalOutput((prev) => `${prev}${text}`));
      } else if (event.data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(new Uint8Array(event.data));
        setTerminalOutput((prev) => `${prev}${text}`);
      }
    };

    ws.onerror = () => setTerminalOutput((prev) => `${prev}\n[stream error]\n`);
    ws.onclose = () => {
      setTerminalConnecting(false);
      setTerminalOutput((prev) => `${prev}\n[stream closed]\n`);
    };
  };

  const startTerminalSession = async () => {
    if (!sessionToken) {
      setStatusMessage("Login to start a terminal session.");
      return;
    }
    setTerminalConnecting(true);
    setTerminalOutput("Starting terminal session…\n");
    try {
      const { sessionId } = await createTerminalSession(sessionToken, selectedProjectId ?? undefined);
      setTerminalSessionId(sessionId);
      connectTerminalStream(sessionId, sessionToken);
    } catch (err) {
      setTerminalOutput(
        `Failed to start terminal: ${err instanceof Error ? err.message : "unknown error"}\n`
      );
      setTerminalConnecting(false);
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
        setTerminalOutput((prev) => `${prev}\n[input failed: ${err instanceof Error ? err.message : "unknown"}]\n`);
      }
    }
    setTerminalInput("");
  };

  const loadFsTree = async (pathOverride?: string) => {
    if (!sessionToken || !selectedProjectId) {
      setFsError("Login and select a project to browse files.");
      return;
    }
    const targetPath = pathOverride ?? fsPath ?? ".";
    setFsLoading(true);
    setFsError(null);
    try {
      const tree = await fetchFileTree(sessionToken, selectedProjectId, targetPath);
      setFsEntries(tree.entries);
      setFsPath(tree.path || targetPath || ".");
    } catch (err) {
      setFsError(err instanceof Error ? err.message : "Failed to load tree");
      setFsEntries([]);
    } finally {
      setFsLoading(false);
    }
  };

  const openFile = async (path: string) => {
    if (!sessionToken || !selectedProjectId) {
      setFsError("Login and select a project to open files.");
      return;
    }
    setFsLoading(true);
    setFsError(null);
    try {
      const file = await fetchFileContent(sessionToken, selectedProjectId, path);
      setFsContentPath(file.path);
      setFsContent(file.content);
    } catch (err) {
      setFsError(err instanceof Error ? err.message : "Failed to load file");
      setFsContent("");
      setFsContentPath(null);
    } finally {
      setFsLoading(false);
    }
  };

  const handleSelectEntry = (entry: { type: "dir" | "file"; name: string }) => {
    const base = fsPath === "." ? "" : fsPath;
    const nextPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.type === "dir") {
      loadFsTree(nextPath);
    } else {
      openFile(nextPath);
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

  useEffect(() => {
    return () => {
      if (terminalSocket.current) {
        terminalSocket.current.close();
      }
    };
  }, []);

  useEffect(() => {
    setFsEntries([]);
    setFsContent("");
    setFsContentPath(null);
    setFsPath(".");
    if (sessionToken && selectedProjectId) {
      loadFsTree(".");
    }
  }, [sessionToken, selectedProjectId]);

  const loadAuditLog = async (
    projectId?: string,
    options?: { reset?: boolean; filtersOverride?: Partial<typeof auditFilters> }
  ) => {
    if (!sessionToken) return;
    const cursor = options?.reset ? undefined : auditCursor ?? undefined;
    const filters = {
      eventType: (options?.filtersOverride?.eventType ?? auditFilters.eventType) || undefined,
      userId: (options?.filtersOverride?.userId ?? auditFilters.userId) || undefined,
      pathContains: (options?.filtersOverride?.pathContains ?? auditFilters.pathContains) || undefined,
    };
    if (options?.reset) {
      setAuditEvents([]);
      setAuditCursor(null);
      setAuditHasMore(false);
    }
    setAuditLoading(true);
    try {
      const { events, paging } = await fetchAuditEvents(sessionToken, projectId, 50, undefined, cursor, filters);
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
  };

  useEffect(() => {
    if (sessionToken) {
      loadAuditLog(selectedProjectId ?? undefined, { reset: true });
    } else {
      setAuditEvents([]);
      setAuditCursor(null);
      setAuditHasMore(false);
    }
  }, [sessionToken, selectedProjectId]);

  const tabBody = (() => {
    switch (activeTab) {
      case "Terminal":
        return (
          <div className="panel-card">
            <div className="panel-title">Persistent PTY</div>
            <div className="panel-text">
              {terminalSessionId
                ? `Session ${terminalSessionId}`
                : "Start a session to stream output."}
            </div>
            <div className="login-row" style={{ gap: 8, alignItems: "center" }}>
              <button className="tab" onClick={startTerminalSession} disabled={terminalConnecting || !sessionToken}>
                {terminalConnecting ? "Connecting…" : terminalSessionId ? "Restart Session" : "Start Session"}
              </button>
              <input
                className="filter"
                placeholder="Type a command"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendTerminalInput();
                }}
                disabled={!terminalSessionId}
                style={{ flex: 1 }}
              />
              <button className="tab" onClick={handleSendTerminalInput} disabled={!terminalSessionId || !terminalInput}>
                Send
              </button>
            </div>
            <div className="panel-mono" style={{ minHeight: 240, whiteSpace: "pre-wrap" }}>
              {terminalOutput}
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
            {fsError && <div className="item-subtle" style={{ color: "#EF4444" }}>{fsError}</div>}
            <div className="panel-text" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {fsEntries.map((entry) => (
                <button
                  key={entry.name}
                  className="tab"
                  onClick={() => handleSelectEntry(entry)}
                  style={{ minWidth: 90 }}
                >
                  {entry.type === "dir" ? "📁" : "📄"} {entry.name}
                </button>
              ))}
              {fsLoading && <span className="item-subtle">Loading…</span>}
            </div>
            {fsContentPath && (
              <div className="panel-mono" style={{ maxHeight: 320, overflow: "auto", whiteSpace: "pre" }}>
                <div className="item-subtle" style={{ marginBottom: 6 }}>
                  {fsContentPath}
                </div>
                {fsContent}
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="panel-card">
            <div className="panel-title">Chat</div>
            <div className="panel-text">JSON-before-stop summaries, template metadata, and message stream go here.</div>
            <div className="panel-mono">{"{ status: \"in_progress\", progress: 0.42, focus: \"Implement FS API\" }"}</div>
          </div>
        );
    }
  })();

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
        {loginError && <div className="item-subtle" style={{ color: "#EF4444" }}>{loginError}</div>}
        <div className="item-subtle">
          {activeUser && sessionToken
            ? `Active user: ${activeUser} (token ${sessionToken.slice(0, 6)}…)`
            : "Active user: none (mock data)"}
        </div>
        {statusMessage && <div className="item-subtle" style={{ color: "#F59E0B" }}>{statusMessage}</div>}
      </div>
      <div className="columns">
        <div className="column">
          <header className="column-header">
            <span>Projects</span>
            <input className="filter" placeholder="Filter" />
          </header>
          {loading && <div className="item-subtle">Loading projects…</div>}
          {error && <div className="item-subtle">{error}</div>}
          <div className="list">
            {projects.map((p) => (
              <div
                className={`item ${selectedProjectId === p.id ? "active" : ""}`}
                key={p.id ?? p.name}
                onClick={() => p.id && handleSelectProject(p.id)}
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
        </div>

        <div className="column">
          <header className="column-header">
            <span>Roadmap Lists</span>
            <button className="ghost">+ New</button>
          </header>
          <div className="list">
            {roadmaps.map((r) => (
              <div
                className={`item ${selectedRoadmapId === r.id ? "active" : ""}`}
                key={r.id ?? r.title}
                onClick={() => r.id && handleSelectRoadmap(r.id)}
              >
                <div className="item-line">
                  <span className="status-dot" style={{ background: statusColor[r.status] ?? statusColor.active }} />
                  <span className="item-title">{r.title}</span>
                  <span className="item-subtle">{progressPercent(r.progress)}%</span>
                </div>
                <div className="item-sub">{r.summary ?? r.tags.join(", ")}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="column">
          <header className="column-header">
            <span>Chats</span>
            <button className="ghost">+ Chat</button>
          </header>
          <div className="list">
            {chats.map((c) => (
              <div className={`item ${c.meta ? "meta" : ""}`} key={c.title}>
                <div className="item-line">
                  <span className="status-dot" style={{ background: statusColor[c.status] ?? statusColor.active }} />
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
            placeholder="Path contains"
            value={auditFilters.pathContains}
            onChange={(e) => setAuditFilters((prev) => ({ ...prev, pathContains: e.target.value }))}
            style={{ flex: 1, minWidth: 160 }}
          />
          <button
            className="tab"
            onClick={() => loadAuditLog(selectedProjectId ?? undefined, { reset: true })}
            disabled={auditLoading}
          >
            Apply filters
          </button>
          <button
            className="ghost"
            onClick={() => {
              const cleared = { eventType: "", userId: "", pathContains: "" };
              setAuditFilters(cleared);
              loadAuditLog(selectedProjectId ?? undefined, { reset: true, filtersOverride: cleared });
            }}
            disabled={auditLoading}
          >
            Clear
          </button>
        </div>
        <div className="login-row" style={{ gap: 8, marginBottom: 8 }}>
          <button
            className="tab"
            onClick={() => loadAuditLog(selectedProjectId ?? undefined, { reset: true })}
            disabled={auditLoading}
          >
            {auditLoading ? "Loading…" : "Refresh"}
          </button>
          <button
            className="ghost"
            onClick={() => loadAuditLog(selectedProjectId ?? undefined)}
            disabled={!auditHasMore || auditLoading}
          >
            {auditLoading ? "Loading…" : auditHasMore ? "Load more" : "No more events"}
          </button>
        </div>
        {auditError && <div className="item-subtle" style={{ color: "#EF4444" }}>{auditError}</div>}
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
              <div className="item-subtle">
                user {event.userId ?? "—"} · session {event.sessionId ?? "—"} · project {event.projectId ?? "—"}
              </div>
            </div>
          ))}
          {auditLoading && <div className="item-subtle">Loading…</div>}
        </div>
      </div>
    </main>
  );
}

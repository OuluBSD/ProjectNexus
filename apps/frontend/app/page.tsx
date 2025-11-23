'use client';

import { useEffect, useMemo, useState } from "react";
import { fetchChats, fetchProjects, fetchRoadmapStatus, fetchRoadmaps, login } from "../lib/api";

type Status = "inactive" | "waiting" | "active" | "blocked" | "done" | "in_progress" | "idle" | "error";
const DEMO_USERNAME = process.env.NEXT_PUBLIC_DEMO_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "demo";
const DEMO_KEYFILE = process.env.NEXT_PUBLIC_DEMO_KEYFILE_TOKEN;

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
  const [activeTab, setActiveTab] = useState<"Chat" | "Terminal" | "Code">("Chat");

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
    } catch {
      setError("Using mock chats (backend unreachable)");
      setChats(mockChats);
    }
  };

  const loadRoadmapsForProject = async (projectId: string, token: string) => {
    const roadmapData = await fetchRoadmaps(token, projectId);
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
    const firstRoadmapId = roadmapData[0]?.id;
    if (firstRoadmapId) {
      setSelectedRoadmapId(firstRoadmapId);
      await loadChatsForRoadmap(firstRoadmapId, token, statusMap[firstRoadmapId]);
    } else {
      setChats([]);
      setSelectedRoadmapId(null);
    }
  };

  const hydrateWorkspace = async (token: string, activeUsername: string) => {
    setSessionToken(token);
    setActiveUser(activeUsername);
    const projectData = await fetchProjects(token);
    const mappedProjects = projectData.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category ?? "Uncategorized",
      status: (p.status as Status) ?? "active",
      info: p.description ?? "",
    }));
    setProjects(mappedProjects);
    const primary = projectData[0];
    if (primary) {
      setSelectedProjectId(primary.id);
      await loadRoadmapsForProject(primary.id, token);
    } else {
      setRoadmaps([]);
      setChats([]);
      setSelectedProjectId(null);
      setSelectedRoadmapId(null);
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
          setError("Using mock data (backend unreachable)");
          setSessionToken(null);
          setActiveUser(null);
          setProjects(mockProjects);
          setRoadmaps(mockRoadmaps);
          setChats(mockChats);
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
    if (sessionToken) {
      await loadChatsForRoadmap(roadmapId, sessionToken, roadmapStatus[roadmapId]);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    setSelectedProjectId(projectId);
    if (sessionToken) {
      setSelectedRoadmapId(null);
      await loadRoadmapsForProject(projectId, sessionToken);
    }
  };

  const handleLoginSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await login(username, password, keyfileToken || undefined);
      await hydrateWorkspace(token, username);
    } catch (err) {
      setError("Login failed; using mock data");
      setSessionToken(null);
      setActiveUser(null);
      setProjects(mockProjects);
      setRoadmaps(mockRoadmaps);
      setChats(mockChats);
    } finally {
      setLoading(false);
    }
  };

  const tabBody = useMemo(() => {
    switch (activeTab) {
      case "Terminal":
        return (
          <div className="panel-card">
            <div className="panel-title">Persistent PTY</div>
            <div className="panel-text">WebSocket placeholder: ws://localhost:3001/terminal/sessions/:id/stream</div>
            <div className="panel-mono">$ tail -f logs/agent.log</div>
          </div>
        );
      case "Code":
        return (
          <div className="panel-card">
            <div className="panel-title">Code Viewer</div>
            <div className="panel-text">Monaco read-only placeholder with diff hook.</div>
            <div className="panel-mono">/projects/nexus/workspace/apps/backend/src/routes/chat.ts</div>
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
  }, [activeTab]);

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
        <div className="item-subtle">
          {activeUser && sessionToken
            ? `Active user: ${activeUser} (token ${sessionToken.slice(0, 6)}…)`
            : "Active user: none (mock data)"}
        </div>
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
    </main>
  );
}

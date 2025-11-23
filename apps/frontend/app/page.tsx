'use client';

import { useEffect, useMemo, useState } from "react";
import { fetchProjects } from "../lib/api";

type Status = "inactive" | "waiting" | "active" | "blocked" | "done";

const mockProjects = [
  { name: "Atlas Compute", category: "Infra", status: "active" as Status, info: "LLM orchestration spine" },
  { name: "Nexus", category: "Product", status: "waiting" as Status, info: "Multi-agent cockpit" },
  { name: "Helios", category: "Research", status: "inactive" as Status, info: "Offline eval bench" },
];

const roadmapLists = [
  { title: "MVP Core", tags: ["api", "db"], progress: 42, status: "active" as Status },
  { title: "Templates", tags: ["prompt", "js"], progress: 18, status: "waiting" as Status },
  { title: "Terminal", tags: ["pty"], progress: 60, status: "active" as Status },
];

const chats = [
  { title: "Meta-Chat (Roadmap Brain)", status: "active" as Status, progress: 55, meta: true, note: "Aggregating child statuses" },
  { title: "Implement FS API", status: "waiting" as Status, progress: 35, note: "Blocked on auth middleware" },
  { title: "UI Shell", status: "active" as Status, progress: 70, note: "Tabs wired, mock data flowing" },
  { title: "Template JSON Validator", status: "inactive" as Status, progress: 15, note: "Need schema + tests" },
];

const statusColor: Record<Status, string> = {
  inactive: "#9CA3AF",
  waiting: "#F59E0B",
  active: "#10B981",
  blocked: "#EF4444",
  done: "#2563EB",
};

export default function Page() {
  const [projects, setProjects] = useState<typeof mockProjects>(mockProjects);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Chat" | "Terminal" | "Code">("Chat");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProjects();
        if (cancelled) return;
        const mapped = data.map((p) => ({
          name: p.name,
          category: p.category ?? "Uncategorized",
          status: (p.status as Status) ?? "active",
          info: p.description ?? "",
        }));
        setProjects(mapped);
      } catch (err) {
        if (!cancelled) {
          setError("Using mock data (backend unreachable)");
          setProjects(mockProjects);
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
              <div className="item" key={p.name}>
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
            {roadmapLists.map((r) => (
              <div className="item" key={r.title}>
                <div className="item-line">
                  <span className="status-dot" style={{ background: statusColor[r.status] }} />
                  <span className="item-title">{r.title}</span>
                  <span className="item-subtle">{r.progress}%</span>
                </div>
                <div className="item-sub">{r.tags.join(", ")}</div>
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
                  <span className="status-dot" style={{ background: statusColor[c.status] }} />
                  <span className="item-title">{c.title}</span>
                  <span className="item-subtle">{c.progress}%</span>
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

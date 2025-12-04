/**
 * Network Component
 * Displays and manages worker servers, manager servers, and AI servers
 */

"use client";

import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent } from "react";

interface Server {
  id: string;
  name: string;
  type: "worker" | "manager" | "ai";
  host: string;
  port: number;
  status: "online" | "offline" | "degraded";
  metadata?: any;
  lastHealthCheck?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface NetworkProps {
  sessionToken?: string;
}

type NetworkSelection =
  | { kind: "graph" }
  | { kind: "server"; server: Server }
  | { kind: "connection"; connection: NetworkConnection };

type NetworkConnection = {
  id: string;
  type: "qwen" | "terminal" | "git" | "other";
  name: string;
  pid?: number;
  command: string;
  args: string[];
  cwd: string;
  startTime: string;
  endTime?: string;
  status: "starting" | "running" | "exited" | "error";
  attachments?: {
    transport?: string;
    chainInfo?: {
      managerId?: string;
      workerId?: string;
      aiId?: string;
    };
  };
  metadata?: Record<string, any>;
};

export function Network({ sessionToken }: NetworkProps) {
  const [servers, setServers] = useState<Server[]>([]);
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [selectedItem, setSelectedItem] = useState<NetworkSelection>({ kind: "graph" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "worker" as Server["type"],
    host: "localhost",
    port: 3002,
    status: "offline" as Server["status"],
  });

  // Fetch servers and stdio-backed network connections from backend
  useEffect(() => {
    const fetchServers = async () => {
      const res = await fetch(`/api/servers`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch servers");
      }

      return (await res.json()) as Server[];
    };

    const fetchConnections = async () => {
      const res = await fetch(`/api/debug/processes`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch processes");
      }

      return (await res.json()) as NetworkConnection[];
    };

    const load = async () => {
      if (!sessionToken) {
        setError("No session token available");
        setConnectionsError(null);
        setServers([]);
        setConnections([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const [serversResult, connectionsResult] = await Promise.allSettled([
        fetchServers(),
        fetchConnections(),
      ]);

      if (serversResult.status === "fulfilled") {
        setServers(serversResult.value);
        setError(null);
      } else {
        const message =
          serversResult.reason instanceof Error
            ? serversResult.reason.message
            : "Failed to fetch servers";
        setError(message);
        setServers([]);
      }

      if (connectionsResult.status === "fulfilled") {
        setConnections(connectionsResult.value);
        setConnectionsError(null);
      } else {
        const message =
          connectionsResult.reason instanceof Error
            ? connectionsResult.reason.message
            : "Failed to fetch network connections";
        setConnectionsError(message);
        setConnections([]);
      }

      setLoading(false);
    };

    load();
  }, [sessionToken]);

  const getStatusColor = (status: Server["status"]) => {
    switch (status) {
      case "online":
        return "green";
      case "offline":
        return "red";
      case "degraded":
        return "yellow";
    }
  };

  const handleFormChange =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = field === "port" ? Number(event.target.value) || 0 : event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleCreateServer = async (event: FormEvent) => {
    event.preventDefault();
    if (!sessionToken) {
      setFormError("No session token available");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create server");
      }

      const created = (await res.json()) as Server;
      setServers((prev) => [created, ...prev]);
      setSelectedItem({ kind: "server", server: created });
      setShowAddForm(false);
      setForm({
        name: "",
        type: "worker",
        host: "localhost",
        port: 3002,
        status: "offline",
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create server");
    } finally {
      setSaving(false);
    }
  };

  const networkConnections = useMemo(
    () =>
      connections
        .filter(
          (connection) =>
            connection.status !== "exited" &&
            (connection.type === "qwen" || connection.attachments?.transport === "stdio")
        )
        .sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        ),
    [connections]
  );

  const selectedServer = selectedItem.kind === "server" ? selectedItem.server : null;
  const selectedConnection = selectedItem.kind === "connection" ? selectedItem.connection : null;

  const renderGraph = () => {
    const managers = servers.filter((s) => s.type === "manager");
    const workers = servers.filter((s) => s.type === "worker");
    const aiServers = servers.filter((s) => s.type === "ai");

    type GraphNode = {
      id: string;
      label: string;
      type: "manager" | "worker" | "ai" | "connection";
      x: number;
      y: number;
    };

    type GraphEdge = {
      from: string;
      to: string;
    };

    const columnSpacing = 220;
    const rowSpacing = 110;

    const managerNodes: GraphNode[] = managers.map((m, index) => ({
      id: m.id,
      label: m.name || m.host,
      type: "manager",
      x: 40,
      y: 80 + index * rowSpacing,
    }));

    const workerNodes: GraphNode[] = workers.map((w, index) => ({
      id: w.id,
      label: w.name || w.host,
      type: "worker",
      x: 40 + columnSpacing,
      y: 80 + index * rowSpacing,
    }));

    const aiNodes: GraphNode[] = aiServers.map((ai, index) => ({
      id: ai.id,
      label: ai.name || ai.host,
      type: "ai",
      x: 40 + columnSpacing * 2,
      y: 80 + index * rowSpacing,
    }));

    const connectionNodes: GraphNode[] = networkConnections.map((conn, index) => ({
      id: `conn-${conn.id}`,
      label: conn.name || conn.command || conn.type,
      type: "connection",
      x: 40 + columnSpacing * 3,
      y: 80 + index * rowSpacing,
    }));

    const nodes = [...managerNodes, ...workerNodes, ...aiNodes, ...connectionNodes];
    const nodeMap = nodes.reduce<Record<string, GraphNode>>((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});

    const edges: GraphEdge[] = [];

    workers.forEach((worker) => {
      const managerId = (worker.metadata as { managerId?: string } | undefined)?.managerId;
      const targetManager = managerId || managers[0]?.id;
      if (targetManager) {
        edges.push({ from: targetManager, to: worker.id });
      }
    });

    aiServers.forEach((ai) => {
      const workerId = (ai.metadata as { workerId?: string } | undefined)?.workerId;
      const targetWorker = workerId || workers[0]?.id;
      if (targetWorker) {
        edges.push({ from: targetWorker, to: ai.id });
      }
    });

    networkConnections.forEach((conn) => {
      const chain = conn.attachments?.chainInfo;
      const workerId = chain?.workerId || workers[0]?.id;
      const aiId = chain?.aiId || aiServers[0]?.id;
      const connectionNodeId = `conn-${conn.id}`;

      if (workerId && nodeMap[workerId]) {
        edges.push({ from: workerId, to: connectionNodeId });
      }

      if (aiId && nodeMap[aiId]) {
        edges.push({ from: connectionNodeId, to: aiId });
      }
    });

    const maxRows = Math.max(
      managerNodes.length,
      workerNodes.length,
      aiNodes.length,
      connectionNodes.length,
      2
    );
    const width = columnSpacing * 3 + 200;
    const height = maxRows * rowSpacing + 140;

    const colors: Record<GraphNode["type"], string> = {
      manager: "#6366f1",
      worker: "#10b981",
      ai: "#f59e0b",
      connection: "#0ea5e9",
    };

    return (
      <div className="network-graph-card">
        <div className="network-graph-header">
          <div>
            <h2>Network Graph</h2>
            <p className="network-graph-subtitle">
              Servers with stdio-backed AI connections (qwen and similar subprocesses)
            </p>
          </div>
        </div>
        <div className="network-graph-legend">
          <span className="legend-dot manager" /> Manager
          <span className="legend-dot worker" /> Worker
          <span className="legend-dot ai" /> AI
          <span className="legend-dot connection" /> Stdio connection
        </div>
        <svg
          className="network-graph"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Network connections graph"
        >
          {edges.map((edge, idx) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;
            return (
              <line
                key={`${edge.from}-${edge.to}-${idx}`}
                x1={from.x + 60}
                y1={from.y}
                x2={to.x - 60}
                y2={to.y}
                stroke="#475569"
                strokeWidth={2}
                markerEnd="url(#arrow)"
              />
            );
          })}
          <defs>
            <marker
              id="arrow"
              markerWidth="10"
              markerHeight="10"
              refX="10"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#475569" />
            </marker>
          </defs>
          {nodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <rect
                x={-60}
                y={-24}
                width={120}
                height={48}
                rx={10}
                fill={colors[node.type]}
                opacity={0.12}
                stroke={colors[node.type]}
                strokeWidth={2}
              />
              <text
                x={0}
                y={0}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="var(--text)"
                fontSize="13"
                fontWeight={700}
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="network-view">
        <div style={{ padding: "20px", textAlign: "center" }}>Loading network data...</div>
      </div>
    );
  }

  return (
    <div className="network-view">
      <div className="network-sidebar">
        <div className="network-sidebar-header">
          <h2>Network</h2>
          <button className="btn-primary" onClick={() => setShowAddForm((open) => !open)}>
            {showAddForm ? "Close" : "+ Add Server"}
          </button>
        </div>

        {showAddForm && (
          <form className="network-add-form" onSubmit={handleCreateServer}>
            <div className="network-add-grid">
              <div>
                <label htmlFor="server-name">Name</label>
                <input
                  id="server-name"
                  type="text"
                  value={form.name}
                  placeholder="My server"
                  onChange={handleFormChange("name")}
                  required
                />
              </div>
              <div>
                <label htmlFor="server-type">Type</label>
                <select id="server-type" value={form.type} onChange={handleFormChange("type")}>
                  <option value="worker">Worker</option>
                  <option value="manager">Manager</option>
                  <option value="ai">AI</option>
                </select>
              </div>
              <div>
                <label htmlFor="server-host">Host</label>
                <input
                  id="server-host"
                  type="text"
                  value={form.host}
                  placeholder="localhost"
                  onChange={handleFormChange("host")}
                  required
                />
              </div>
              <div>
                <label htmlFor="server-port">Port</label>
                <input
                  id="server-port"
                  type="number"
                  value={form.port}
                  onChange={handleFormChange("port")}
                  min={1}
                  max={65535}
                  required
                />
              </div>
              <div>
                <label htmlFor="server-status">Status</label>
                <select
                  id="server-status"
                  value={form.status}
                  onChange={handleFormChange("status")}
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="degraded">Degraded</option>
                </select>
              </div>
            </div>

            {formError && <div className="network-inline-error">{formError}</div>}

            <div className="network-add-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div
            style={{
              padding: "12px",
              margin: "12px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "6px",
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        )}

        <div className="network-server-sections">
          <div className="network-server-section">
            <h3>Network Views</h3>
            <div className="network-server-list">
              <div
                className={`network-server-item ${
                  selectedItem.kind === "graph" ? "selected" : ""
                }`}
                onClick={() => setSelectedItem({ kind: "graph" })}
              >
                <span className="status-indicator" style={{ backgroundColor: "#0ea5e9" }} />
                <span className="server-name">Connection Graph</span>
              </div>
            </div>
          </div>

          <div className="network-server-section">
            <h3>Manager Servers</h3>
            <div className="network-server-list">
              {servers
                .filter((s) => s.type === "manager")
                .map((server) => (
                  <div
                    key={server.id}
                    className={`network-server-item ${
                      selectedServer?.id === server.id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedItem({ kind: "server", server })}
                  >
                    <span
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(server.status) }}
                    />
                    <span className="server-name">{server.name}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="network-server-section">
            <h3>Worker Servers</h3>
            <div className="network-server-list">
              {servers
                .filter((s) => s.type === "worker")
                .map((server) => (
                  <div
                    key={server.id}
                    className={`network-server-item ${
                      selectedServer?.id === server.id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedItem({ kind: "server", server })}
                  >
                    <span
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(server.status) }}
                    />
                    <span className="server-name">{server.name}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="network-server-section">
            <h3>AI Servers</h3>
            <div className="network-server-list">
              {servers
                .filter((s) => s.type === "ai")
                .map((server) => (
                  <div
                    key={server.id}
                    className={`network-server-item ${
                      selectedServer?.id === server.id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedItem({ kind: "server", server })}
                  >
                    <span
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(server.status) }}
                    />
                    <span className="server-name">{server.name}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="network-server-section">
            <h3>Network Connections</h3>
            <div className="network-server-list">
              {connectionsError && (
                <div className="network-inline-error">{connectionsError}</div>
              )}
              {!connectionsError && networkConnections.length === 0 && (
                <div className="network-empty-note">No stdio network connections yet.</div>
              )}
              {networkConnections.map((connection) => (
                <div
                  key={connection.id}
                  className={`network-server-item ${
                    selectedConnection?.id === connection.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedItem({ kind: "connection", connection })}
                >
                  <span
                    className="status-indicator"
                    style={{
                      backgroundColor:
                        connection.status === "running"
                          ? "green"
                          : connection.status === "starting"
                          ? "yellow"
                          : "red",
                    }}
                  />
                  <span className="server-name">
                    {connection.name || connection.command || connection.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="network-main">
        {selectedItem.kind === "server" && selectedServer ? (
          <div className="network-server-details">
            <h2>{selectedServer.name}</h2>
            <div className="server-info">
              <div className="info-row">
                <label>Type:</label>
                <span>{selectedServer.type}</span>
              </div>
              <div className="info-row">
                <label>Host:</label>
                <input type="text" value={selectedServer.host} readOnly />
              </div>
              <div className="info-row">
                <label>Port:</label>
                <input type="number" value={selectedServer.port} readOnly />
              </div>
              <div className="info-row">
                <label>Status:</label>
                <span
                  style={{
                    color: getStatusColor(selectedServer.status),
                    fontWeight: "bold",
                  }}
                >
                  {selectedServer.status}
                </span>
              </div>
            </div>
            <div className="server-actions">
              <button className="btn-secondary">Edit</button>
              <button className="btn-danger">Remove</button>
            </div>
          </div>
        ) : selectedItem.kind === "connection" && selectedConnection ? (
          <div className="network-server-details">
            <h2>{selectedConnection.name || selectedConnection.command || "Network connection"}</h2>
            <div className="server-info">
              <div className="info-row">
                <label>Status:</label>
                <span
                  style={{
                    color:
                      selectedConnection.status === "running"
                        ? "green"
                        : selectedConnection.status === "starting"
                        ? "yellow"
                        : "red",
                    fontWeight: "bold",
                  }}
                >
                  {selectedConnection.status}
                </span>
              </div>
              <div className="info-row">
                <label>Transport:</label>
                <span>{selectedConnection.attachments?.transport || "stdio"}</span>
              </div>
              <div className="info-row">
                <label>PID:</label>
                <span>{selectedConnection.pid ?? "n/a"}</span>
              </div>
              <div className="info-row">
                <label>Command:</label>
                <span>{selectedConnection.command}</span>
              </div>
              <div className="info-row">
                <label>Args:</label>
                <span>{selectedConnection.args?.join(" ") || "—"}</span>
              </div>
              <div className="info-row">
                <label>Working dir:</label>
                <span>{selectedConnection.cwd}</span>
              </div>
              <div className="info-row">
                <label>Started:</label>
                <span>{new Date(selectedConnection.startTime).toLocaleString()}</span>
              </div>
              {selectedConnection.attachments?.chainInfo && (
                <>
                  {selectedConnection.attachments.chainInfo.managerId && (
                    <div className="info-row">
                      <label>Manager:</label>
                      <span>{selectedConnection.attachments.chainInfo.managerId}</span>
                    </div>
                  )}
                  {selectedConnection.attachments.chainInfo.workerId && (
                    <div className="info-row">
                      <label>Worker:</label>
                      <span>{selectedConnection.attachments.chainInfo.workerId}</span>
                    </div>
                  )}
                  {selectedConnection.attachments.chainInfo.aiId && (
                    <div className="info-row">
                      <label>AI:</label>
                      <span>{selectedConnection.attachments.chainInfo.aiId}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          renderGraph()
        )}
      </div>
    </div>
  );
}

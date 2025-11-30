/**
 * Network Component
 * Displays and manages worker servers, manager servers, and AI servers
 */

"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";

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

export function Network({ sessionToken }: NetworkProps) {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch servers from backend
  useEffect(() => {
    const fetchServers = async () => {
      if (!sessionToken) {
        setError("No session token available");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/servers`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch servers");
        }

        const data = await res.json();
        setServers(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch servers");
        setServers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
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
      setSelectedServer(created);
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

  if (loading) {
    return (
      <div className="network-view">
        <div style={{ padding: "20px", textAlign: "center" }}>Loading servers...</div>
      </div>
    );
  }

  return (
    <div className="network-view">
      <div className="network-sidebar">
        <div className="network-sidebar-header">
          <h2>Servers</h2>
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
            <h3>Worker Servers</h3>
            <div className="network-server-list">
              {servers
                .filter((s) => s.type === "worker")
                .map((server) => (
                  <div
                    key={server.id}
                    className={`network-server-item ${selectedServer?.id === server.id ? "selected" : ""}`}
                    onClick={() => setSelectedServer(server)}
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
            <h3>Manager Servers</h3>
            <div className="network-server-list">
              {servers
                .filter((s) => s.type === "manager")
                .map((server) => (
                  <div
                    key={server.id}
                    className={`network-server-item ${selectedServer?.id === server.id ? "selected" : ""}`}
                    onClick={() => setSelectedServer(server)}
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
                    className={`network-server-item ${selectedServer?.id === server.id ? "selected" : ""}`}
                    onClick={() => setSelectedServer(server)}
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
        </div>
      </div>

      <div className="network-main">
        {selectedServer ? (
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
        ) : (
          <div className="network-empty-state">
            <p>Select a server to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

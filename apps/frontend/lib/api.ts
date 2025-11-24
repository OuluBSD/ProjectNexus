const API_BASE = process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE ?? "http://localhost:3001";

type LoginResponse = { token: string; user: { id: string; username: string } };

async function fetchWithAuth<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json();
}

export async function login(
  username: string,
  password: string,
  keyfileToken?: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, keyfileToken }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status})`);
  }
  return res.json();
}

export async function fetchProjects(
  token: string
): Promise<{ id: string; name: string; category?: string; status: string; description?: string }[]> {
  return fetchWithAuth(token, "/api/projects");
}

export async function fetchRoadmaps(
  token: string,
  projectId: string
): Promise<{ id: string; title: string; progress: number; status: string; tags: string[]; metaChatId?: string }[]> {
  return fetchWithAuth(token, `/api/projects/${projectId}/roadmaps`);
}

export async function fetchRoadmapStatus(
  token: string,
  roadmapId: string
): Promise<{ roadmapId: string; status: string; progress: number; summary?: string }> {
  return fetchWithAuth(token, `/api/roadmaps/${roadmapId}/status`);
}

export async function fetchChats(
  token: string,
  roadmapId: string
): Promise<{ id: string; title: string; status: string; progress: number; goal?: string }[]> {
  return fetchWithAuth(token, `/api/roadmaps/${roadmapId}/chats`);
}

export async function fetchFileTree(
  token: string,
  projectId: string,
  path = "."
): Promise<{ path: string; entries: { type: "dir" | "file"; name: string }[] }> {
  return fetchWithAuth(token, `/api/fs/tree?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(path)}`);
}

export async function fetchFileContent(
  token: string,
  projectId: string,
  path: string
): Promise<{ path: string; content: string }> {
  return fetchWithAuth(
    token,
    `/api/fs/file?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(path)}`
  );
}

export async function createTerminalSession(
  token: string,
  projectId?: string,
  cwd?: string
): Promise<{ sessionId: string }> {
  const res = await fetch(`${API_BASE}/api/terminal/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ projectId, cwd }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create terminal session (${res.status})`);
  }
  return res.json();
}

export async function sendTerminalInput(
  token: string,
  sessionId: string,
  data: string
): Promise<{ accepted: boolean }> {
  const res = await fetch(`${API_BASE}/api/terminal/sessions/${sessionId}/input`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    throw new Error(`Failed to send input (${res.status})`);
  }
  return res.json();
}

export function buildTerminalWsUrl(token: string, sessionId: string) {
  const wsBase = API_BASE.replace(/^http/, (proto) => (proto === "https" ? "wss" : "ws"));
  const url = `${wsBase}/api/terminal/sessions/${sessionId}/stream?token=${encodeURIComponent(token)}`;
  return url;
}

export async function fetchAuditEvents(
  token: string,
  projectId?: string,
  limit = 50,
  before?: string,
  cursor?: string,
  filters?: { eventType?: string; userId?: string; pathContains?: string }
): Promise<{
  events: {
    id: string;
    eventType: string;
    path?: string | null;
    createdAt: string;
    sessionId?: string | null;
    userId?: string | null;
    projectId?: string | null;
  }[];
  paging?: { hasMore: boolean; nextCursor?: string };
}> {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (limit) params.set("limit", String(limit));
  if (before) params.set("before", before);
  if (cursor) params.set("cursor", cursor);
  if (filters?.eventType) params.set("eventType", filters.eventType);
  if (filters?.userId) params.set("userId", filters.userId);
  if (filters?.pathContains) params.set("pathContains", filters.pathContains);
  return fetchWithAuth(token, `/api/audit/events?${params.toString()}`);
}

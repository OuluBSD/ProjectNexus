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
): Promise<
  { id: string; name: string; category?: string; status: string; description?: string }[]
> {
  return fetchWithAuth(token, "/api/projects");
}

export async function createProject(
  token: string,
  payload: { name: string; category?: string; status?: string; description?: string }
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to create project (${res.status})`);
  }
  return res.json();
}

export async function fetchRoadmaps(
  token: string,
  projectId: string
): Promise<
  {
    id: string;
    title: string;
    progress: number;
    status: string;
    tags: string[];
    metaChatId?: string;
  }[]
> {
  return fetchWithAuth(token, `/api/projects/${projectId}/roadmaps`);
}

export async function createRoadmap(
  token: string,
  projectId: string,
  payload: { title: string; tags?: string[]; progress?: number; status?: string }
): Promise<{ id: string; metaChatId?: string }> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/roadmaps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to create roadmap (${res.status})`);
  }
  return res.json();
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

export async function createChat(
  token: string,
  roadmapId: string,
  payload: {
    title: string;
    goal?: string;
    status?: string;
    progress?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/roadmaps/${roadmapId}/chats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to create chat (${res.status})`);
  }
  return res.json();
}

export async function fetchFileTree(
  token: string,
  projectId: string,
  path = "."
): Promise<{ path: string; entries: { type: "dir" | "file"; name: string }[] }> {
  return fetchWithAuth(
    token,
    `/api/fs/tree?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(path)}`
  );
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

export async function fetchFileDiff(
  token: string,
  projectId: string,
  path: string,
  baseSha?: string | null,
  targetSha?: string | null
): Promise<{ path: string; diff: string }> {
  const params = new URLSearchParams({
    projectId,
    path,
  });
  if (baseSha) params.set("baseSha", baseSha);
  if (targetSha) params.set("targetSha", targetSha);
  return fetchWithAuth(token, `/api/fs/diff?${params.toString()}`);
}

export async function writeFileContent(
  token: string,
  projectId: string,
  path: string,
  content: string,
  baseSha?: string | null
): Promise<{ success: boolean; path: string; baseSha: string | null }> {
  const res = await fetch(`${API_BASE}/api/fs/write`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ projectId, path, content, baseSha }),
  });
  if (!res.ok) {
    throw new Error(`Failed to write file (${res.status})`);
  }
  return res.json();
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
  filters?: { eventType?: string; userId?: string; pathContains?: string; ipAddress?: string },
  sort: "asc" | "desc" = "desc"
): Promise<{
  events: {
    id: string;
    eventType: string;
    path?: string | null;
    createdAt: string;
    sessionId?: string | null;
    userId?: string | null;
    projectId?: string | null;
    ipAddress?: string | null;
    metadata?: Record<string, unknown> | null;
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
  if (filters?.ipAddress) params.set("ipAddress", filters.ipAddress);
  if (sort) params.set("sort", sort);
  return fetchWithAuth(token, `/api/audit/events?${params.toString()}`);
}

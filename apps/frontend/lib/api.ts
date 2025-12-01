const API_BASE = process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE ?? "http://localhost:3001";

export type ProjectPayload = {
  id: string;
  name: string;
  category?: string;
  status: string;
  description?: string;
  theme?: Record<string, unknown> | null;
};

export type RoadmapSummary = {
  id: string;
  title: string;
  status: string;
  progress: number;
  tags?: string[];
};

export type ProjectDetailsResponse = {
  project: ProjectPayload;
  roadmapLists: RoadmapSummary[];
};

export type ProjectUpdatePayload = {
  name?: string;
  category?: string;
  description?: string;
  status?: string;
  theme?: Record<string, unknown> | null;
};

export type RoadmapUpdatePayload = {
  title?: string;
  tags?: string[];
  status?: string;
  progress?: number;
};

export type MergeChatResponse = {
  target: {
    id: string;
    title: string;
    status: string;
    progress: number;
    goal?: string;
    metadata?: Record<string, unknown> | null;
    templateId?: string;
  };
  removedChatId: string;
};

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
  password?: string,
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

export async function fetchProjects(token: string): Promise<ProjectPayload[]> {
  return fetchWithAuth(token, "/api/projects");
}

export async function createProject(
  token: string,
  payload: {
    name: string;
    category?: string;
    status?: string;
    description?: string;
    theme?: Record<string, unknown> | null;
  }
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

export async function updateProject(
  token: string,
  projectId: string,
  payload: ProjectUpdatePayload
): Promise<ProjectPayload> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to update project (${res.status})`);
  }
  return res.json();
}

export async function deleteProject(token: string, projectId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to delete project (${res.status})`);
  }
}

export async function fetchProjectDetails(
  token: string,
  projectId: string
): Promise<ProjectDetailsResponse> {
  return fetchWithAuth(token, `/api/projects/${projectId}/details`);
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

export async function updateRoadmap(
  token: string,
  roadmapId: string,
  payload: RoadmapUpdatePayload
): Promise<{ id: string; title: string; tags: string[]; status: string; progress: number }> {
  const res = await fetch(`${API_BASE}/api/roadmaps/${roadmapId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to update roadmap (${res.status})`);
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
): Promise<
  {
    id: string;
    title: string;
    status: string;
    progress: number;
    goal?: string;
    templateId?: string;
    metadata?: Record<string, unknown> | null;
  }[]
> {
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

export async function fetchChatMessages(
  token: string,
  chatId: string
): Promise<{ id: string; chatId: string; role: string; content: string; createdAt: string }[]> {
  return fetchWithAuth(token, `/api/chats/${chatId}/messages`);
}

export async function postChatMessage(
  token: string,
  chatId: string,
  payload: { role: "user" | "assistant" | "system" | "status" | "meta"; content: string }
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to append message (${res.status})`);
  }
  return res.json();
}

export async function fetchMetaChatMessages(
  token: string,
  metaChatId: string
): Promise<{ id: string; metaChatId: string; role: string; content: string; createdAt: string }[]> {
  return fetchWithAuth(token, `/api/meta-chats/${metaChatId}/messages`);
}

export async function postMetaChatMessage(
  token: string,
  metaChatId: string,
  payload: { role: "user" | "assistant" | "system" | "status"; content: string }
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/meta-chats/${metaChatId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to append meta-chat message (${res.status})`);
  }
  return res.json();
}

export async function updateChatStatus(
  token: string,
  chatId: string,
  payload: { status?: string; progress?: number; focus?: string }
): Promise<{ id: string; status: string; progress: number; metadata?: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to update chat status (${res.status})`);
  }
  return res.json();
}

export async function updateChat(
  token: string,
  chatId: string,
  payload: {
    title?: string;
    goal?: string;
    status?: string;
    progress?: number;
    metadata?: Record<string, unknown> | null;
    templateId?: string;
  }
): Promise<{
  id: string;
  title: string;
  status: string;
  progress: number;
  goal?: string;
  metadata?: Record<string, unknown> | null;
  templateId?: string;
}> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to update chat (${res.status})`);
  }
  return res.json();
}

export async function mergeChat(
  token: string,
  chatId: string,
  targetIdentifier: string
): Promise<MergeChatResponse> {
  const res = await fetch(`${API_BASE}/api/chats/${chatId}/merge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetIdentifier }),
  });
  if (!res.ok) {
    throw new Error(`Failed to merge chat (${res.status})`);
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

export async function fetchTemplates(token: string): Promise<
  {
    id: string;
    title: string;
    goal?: string;
    systemPrompt?: string;
    starterMessages?: Array<{ role: string; content: string }>;
    javascriptPrompt?: string;
    javascriptLogic?: string;
    jsonRequired?: boolean;
    metadata?: Record<string, unknown> | null;
  }[]
> {
  return fetchWithAuth(token, "/api/templates");
}

export async function createTemplate(
  token: string,
  payload: {
    title: string;
    goal?: string;
    systemPrompt?: string;
    starterMessages?: Array<{ role: string; content: string }>;
    javascriptPrompt?: string;
    javascriptLogic?: string;
    jsonRequired?: boolean;
    metadata?: Record<string, unknown> | null;
  }
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/templates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to create template (${res.status})`);
  }
  return res.json();
}

export async function fetchMetaChat(
  token: string,
  roadmapId: string
): Promise<{
  id: string;
  roadmapListId: string;
  status: string;
  progress: number;
  summary?: string;
}> {
  return fetchWithAuth(token, `/api/roadmaps/${roadmapId}/meta-chat`);
}

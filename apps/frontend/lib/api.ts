const API_BASE = process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE ?? "http://localhost:3001";

type LoginResponse = { token: string; user: { id: string; username: string } };

async function login(username: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status})`);
  }
  return res.json();
}

async function fetchWithAuth<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchProjects(username = "demo") {
  const { token } = await login(username);
  return fetchWithAuth<{ id: string; name: string; category?: string; status: string; description?: string }[]>(
    token,
    "/api/projects"
  );
}

import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveWorkspacePath } from "../utils/workspace";

type ManagedSession = {
  id: string;
  projectId?: string;
  cwd?: string;
  proc: ChildProcessWithoutNullStreams;
  createdAt: Date;
};

const sessions = new Map<string, ManagedSession>();

async function resolveWorkingDirectory(projectId?: string, cwd?: string) {
  if (!projectId) {
    return path.resolve(cwd ?? process.cwd());
  }

  const safe = await resolveWorkspacePath(projectId, cwd ?? ".");
  if (!safe) return null;

  try {
    await fs.mkdir(safe.absolutePath, { recursive: true });
  } catch {
    return null;
  }

  return safe.absolutePath;
}

export async function createTerminalSession(projectId?: string, cwd?: string) {
  const workingDir = await resolveWorkingDirectory(projectId, cwd);
  if (!workingDir) return null;

  const shell = process.env.SHELL || "bash";
  const proc = spawn(shell, { cwd: workingDir, stdio: "pipe" });
  const session: ManagedSession = {
    id: randomUUID(),
    projectId,
    cwd: workingDir,
    proc,
    createdAt: new Date(),
  };

  proc.on("exit", () => {
    sessions.delete(session.id);
  });
  sessions.set(session.id, session);
  return session;
}

export function getTerminalSession(sessionId: string) {
  return sessions.get(sessionId);
}

export function sendInput(sessionId: string, data: string) {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.proc.stdin.write(data);
  return true;
}

export function closeTerminalSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.proc.kill();
  sessions.delete(sessionId);
}

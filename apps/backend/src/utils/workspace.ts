import path from "node:path";

const defaultProjectsRoot = path.resolve(process.cwd(), "projects");

export function getProjectsRoot() {
  return process.env.PROJECTS_ROOT ? path.resolve(process.env.PROJECTS_ROOT) : defaultProjectsRoot;
}

export function getProjectRoot(projectId: string) {
  return path.join(getProjectsRoot(), projectId);
}

export function getWorkspaceRoot(projectId: string) {
  return path.join(getProjectRoot(projectId), "workspace");
}

export function sanitizeWorkspacePath(projectId: string, inputPath: string | undefined) {
  const workspaceRoot = getWorkspaceRoot(projectId);
  const normalized = path.normalize(path.join(workspaceRoot, inputPath ?? ""));
  if (!normalized.startsWith(workspaceRoot)) {
    return null;
  }
  return { workspaceRoot, absolutePath: normalized };
}

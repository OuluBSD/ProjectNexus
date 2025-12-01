import fs from "node:fs/promises";
import path from "node:path";
import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FastifyBaseLogger } from "fastify";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

type ContentSetupOptions = {
  contentPath?: string | null;
  gitUrl?: string | null;
  logger?: FastifyBaseLogger;
};

export type ContentSetupResult = {
  contentPath?: string;
  gitUrl?: string;
  clonedFrom?: string | null;
  note?: string;
};

async function pathExists(target: string) {
  try {
    return await fs.stat(target);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function readExistingRemote(repoPath: string) {
  try {
    const { stdout } = await execAsync("git config --get remote.origin.url", { cwd: repoPath });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

function deriveCloneDirName(repoUrl: string) {
  const parsed = repoUrl.trim().replace(/\/$/, "");
  const base = path.basename(parsed);
  const clean = base.replace(/\.git$/, "") || "repo";
  const safe = clean.replace(/[^\w.-]/g, "-").replace(/^-+|-+$/g, "") || "repo";
  return safe;
}

async function findAvailableDir(baseDir: string, desiredName: string) {
  let suffix = 0;
  let candidate = path.join(baseDir, desiredName);
  while (await pathExists(candidate)) {
    suffix += 1;
    candidate = path.join(baseDir, `${desiredName}-${suffix}`);
  }
  return candidate;
}

async function cloneRepo(url: string, targetDir: string) {
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await execFileAsync("git", ["clone", url, targetDir]);
}

/**
 * Handle project content setup rules:
 * - If contentPath points to an existing git repo, read and return its origin URL (no mutations).
 * - If contentPath is missing but gitUrl exists, just record gitUrl.
 * - If contentPath exists (no .git) and gitUrl provided, clone into a subdirectory derived from repo name.
 * - If contentPath does not exist and gitUrl provided, clone directly into that path.
 * - Otherwise, ensure the directory exists and return it.
 */
export async function prepareProjectContent(
  options: ContentSetupOptions
): Promise<ContentSetupResult> {
  const rawContentPath = options.contentPath?.trim();
  const rawGitUrl = options.gitUrl?.trim();
  const logger = options.logger;

  if (!rawContentPath && !rawGitUrl) {
    return {};
  }

  const resolvedContentPath = rawContentPath ? path.resolve(rawContentPath) : undefined;
  let finalGitUrl = rawGitUrl || undefined;

  if (!resolvedContentPath) {
    return { gitUrl: finalGitUrl };
  }

  const existing = await pathExists(resolvedContentPath);
  if (existing && !existing.isDirectory()) {
    throw new Error("Content path must point to a directory.");
  }

  const gitDir = path.join(resolvedContentPath, ".git");
  const isGitRepo = !!(await pathExists(gitDir));
  if (isGitRepo) {
    const remote = await readExistingRemote(resolvedContentPath);
    if (!finalGitUrl && remote) {
      finalGitUrl = remote;
    }
    logger?.info(
      { path: resolvedContentPath, gitUrl: finalGitUrl },
      "[ProjectContent] Using existing git repository for project content"
    );
    return { contentPath: resolvedContentPath, gitUrl: finalGitUrl, clonedFrom: null };
  }

  if (finalGitUrl) {
    if (!existing) {
      await cloneRepo(finalGitUrl, resolvedContentPath);
      logger?.info(
        { path: resolvedContentPath, gitUrl: finalGitUrl },
        "[ProjectContent] Cloned project content to new directory"
      );
      return { contentPath: resolvedContentPath, gitUrl: finalGitUrl, clonedFrom: finalGitUrl };
    }

    const targetName = deriveCloneDirName(finalGitUrl);
    const targetDir = await findAvailableDir(resolvedContentPath, targetName);
    await cloneRepo(finalGitUrl, targetDir);
    logger?.info(
      { base: resolvedContentPath, targetDir, gitUrl: finalGitUrl },
      "[ProjectContent] Cloned project content into subdirectory"
    );
    return { contentPath: targetDir, gitUrl: finalGitUrl, clonedFrom: finalGitUrl };
  }

  await fs.mkdir(resolvedContentPath, { recursive: true });
  logger?.info({ path: resolvedContentPath }, "[ProjectContent] Initialized empty content path");
  return { contentPath: resolvedContentPath, gitUrl: finalGitUrl };
}

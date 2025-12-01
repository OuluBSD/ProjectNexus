import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const repoQwenPath = path.join(repoRoot, "deps", "qwen-code", "script", "qwen-code");
const homeQwenPath = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  "Dev",
  "qwen-code",
  "script",
  "qwen-code"
);

function expandHome(p?: string): string {
  if (!p) return "";
  if (p.startsWith("~/")) {
    return path.join(process.env.HOME || process.env.USERPROFILE || "", p.slice(2));
  }
  return p;
}

/**
 * Resolve qwen-code executable path.
 * Priority:
 * 1. Explicit override (argument or QWEN_PATH env), with ~ expansion
 * 2. Local submodule at deps/qwen-code/script/qwen-code (if present)
 * 3. Legacy ~/Dev/qwen-code/script/qwen-code path
 * 4. Local submodule path (even if missing) as final fallback
 */
export function resolveQwenPath(explicitPath?: string): string {
  const override = expandHome(explicitPath || process.env.QWEN_PATH);
  if (override) {
    return override;
  }

  if (existsSync(repoQwenPath)) {
    return repoQwenPath;
  }

  if (existsSync(homeQwenPath)) {
    return homeQwenPath;
  }

  return repoQwenPath;
}

export function getRepoQwenPath(): string {
  return repoQwenPath;
}

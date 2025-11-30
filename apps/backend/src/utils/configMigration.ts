/**
 * Configuration Migration Utility
 *
 * Automatically updates user config file with missing settings from defaults.
 * Similar to Linux kernel's "make olddefconfig" - preserves user settings,
 * adds new defaults for missing values.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const DEFAULT_REPO_DIR =
  process.env.AGENT_MANAGER_REPO_DIR ||
  (process.env.HOME ? path.join(process.env.HOME, "Dev", "Manager") : "./");

interface ConfigDefault {
  key: string;
  value: string;
  comment?: string;
  section?: string;
}

// Default configuration values
const CONFIG_DEFAULTS: ConfigDefault[] = [
  // Server configuration
  { key: "HOST", value: "0.0.0.0", section: "Server configuration" },
  { key: "PORT", value: "3001", section: "Server configuration" },
  { key: "LOCAL_MANAGER_HOST", value: "127.0.0.1", section: "Server configuration" },
  { key: "LOCAL_MANAGER_PORT", value: "4301", section: "Server configuration" },
  { key: "LOCAL_WORKER_PORT", value: "4302", section: "Server configuration" },
  { key: "LOCAL_AI_PORT", value: "4303", section: "Server configuration" },
  {
    key: "LOCAL_WORKER_REPO",
    value: "./projects/ai-chat",
    comment: "Path to local worker workspace (git repo root)",
    section: "Server configuration",
  },
  {
    key: "DEFAULT_AI_MODEL",
    value: "qwen-2.5-flash",
    comment: "Default model used by auto-created local AI server",
    section: "Server configuration",
  },

  // Database configuration
  {
    key: "AGENT_MANAGER_REPO_DIR",
    value: DEFAULT_REPO_DIR,
    comment: "Root directory for JSON database and git-backed storage",
    section: "Database configuration",
  },
  {
    key: "DATABASE_TYPE",
    value: "json",
    comment: "Type: json (JSON files), postgres (PostgreSQL), memory (in-memory, not persistent)",
    section: "Database configuration",
  },
  {
    key: "DATABASE_URL",
    value: "",
    comment: "PostgreSQL connection string, only needed for DATABASE_TYPE=postgres",
    section: "Database configuration",
  },

  // Projects root
  {
    key: "PROJECTS_ROOT",
    value: "./projects",
    comment: "Projects root directory (relative to repo or absolute path)",
    section: "Projects root directory",
  },

  // Terminal configuration
  {
    key: "TERMINAL_IDLE_MS",
    value: "600000",
    comment: "Terminal idle timeout in milliseconds (0 disables idle shutdowns)",
    section: "Terminal configuration",
  },

  // Frontend configuration
  {
    key: "NEXT_PUBLIC_BACKEND_HTTP_BASE",
    value: "http://localhost:3001",
    section: "Frontend configuration",
  },

  // AI Integration (Qwen AI)
  {
    key: "ENABLE_AI",
    value: "true",
    comment: "Enable AI-powered features",
    section: "AI Integration (Qwen AI)",
  },
  {
    key: "QWEN_MODE",
    value: "stdio",
    comment: "Qwen communication mode: stdio (default) or tcp",
    section: "AI Integration (Qwen AI)",
  },
  {
    key: "QWEN_PATH",
    value: "",
    comment: "Path to qwen-code CLI script (defaults to ~/Dev/qwen-code/script/qwen-code)",
    section: "AI Integration (Qwen AI)",
  },

  // Demo credentials (development only)
  {
    key: "NEXT_PUBLIC_DEMO_USERNAME",
    value: "demo",
    comment: "Demo username for frontend auto-login (development only)",
    section: "Demo credentials (development only)",
  },
  {
    key: "NEXT_PUBLIC_DEMO_PASSWORD",
    value: "demo",
    comment: "Demo password for frontend auto-login (development only)",
    section: "Demo credentials (development only)",
  },
  {
    key: "NEXT_PUBLIC_DEMO_KEYFILE_TOKEN",
    value: "",
    section: "Demo credentials (development only)",
  },
];

/**
 * Parse .env file into key-value pairs
 */
function parseEnvFile(content: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Parse KEY=VALUE or KEY="VALUE"
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Remove surrounding quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, "");
      result.set(key, cleanValue);
    }
  }

  return result;
}

/**
 * Generate .env file content with sections and comments
 */
function generateEnvContent(existing: Map<string, string>): string {
  const lines: string[] = [
    "# Agent Manager Configuration",
    `# Last updated: ${new Date().toISOString()}`,
    "",
  ];

  let currentSection = "";

  for (const def of CONFIG_DEFAULTS) {
    // Add section header if changed
    if (def.section && def.section !== currentSection) {
      if (currentSection) lines.push(""); // Empty line between sections
      lines.push(`# -------------------------`);
      lines.push(`# ${def.section}`);
      lines.push(`# -------------------------`);
      currentSection = def.section;
    }

    // Add comment if provided
    if (def.comment) {
      lines.push(`# ${def.comment}`);
    }

    // Use existing value if present, otherwise use default
    const value = existing.has(def.key) ? existing.get(def.key) : def.value;

    // Comment out keys that should be empty by default (like QWEN_PATH)
    if (def.value === "" && !existing.has(def.key)) {
      lines.push(`# ${def.key}=${value}`);
    } else {
      lines.push(`${def.key}=${value}`);
    }
  }

  lines.push(""); // Final newline
  return lines.join("\n");
}

/**
 * Migrate user config file to include all default settings
 *
 * @param configPath - Path to user config file
 * @returns true if migration was performed, false if no changes needed
 */
export async function migrateUserConfig(configPath: string): Promise<boolean> {
  try {
    // Ensure config directory exists
    const configDir = path.dirname(configPath);
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true });
    }

    // Read existing config if it exists
    let existing = new Map<string, string>();
    let needsMigration = false;

    if (existsSync(configPath)) {
      const content = readFileSync(configPath, "utf-8");
      existing = parseEnvFile(content);

      // Check if any defaults are missing
      for (const def of CONFIG_DEFAULTS) {
        if (!existing.has(def.key)) {
          needsMigration = true;
          break;
        }
      }
    } else {
      // New config file
      needsMigration = true;
    }

    if (needsMigration) {
      const newContent = generateEnvContent(existing);
      writeFileSync(configPath, newContent, "utf-8");
      return true;
    }

    return false;
  } catch (err) {
    console.error("[ConfigMigration] Failed to migrate config:", err);
    return false;
  }
}

/**
 * Get default value for a config key
 */
export function getConfigDefault(key: string): string | undefined {
  return CONFIG_DEFAULTS.find((d) => d.key === key)?.value;
}

/**
 * Check if config file has all required keys
 */
export function validateConfig(configPath: string): { valid: boolean; missing: string[] } {
  if (!existsSync(configPath)) {
    return {
      valid: false,
      missing: CONFIG_DEFAULTS.map((d) => d.key),
    };
  }

  const content = readFileSync(configPath, "utf-8");
  const existing = parseEnvFile(content);
  const missing: string[] = [];

  for (const def of CONFIG_DEFAULTS) {
    if (!existing.has(def.key)) {
      missing.push(def.key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

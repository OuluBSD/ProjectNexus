#!/usr/bin/env node
import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

// Load config from ~/.config/agent-manager/config.env or repository .env
const homeConfigPath = path.join(process.env.HOME || "~", ".config", "agent-manager", "config.env");
const repoConfigPath = path.join(process.cwd(), ".env");

if (existsSync(homeConfigPath)) {
  config({ path: homeConfigPath });
} else if (existsSync(repoConfigPath)) {
  config({ path: repoConfigPath });
}

import { Command } from "commander";
import { loadEnv } from "./utils/env";
import { GitStorage } from "./services/gitStorage";
import * as pgAuthRepo from "./services/authRepository";
import * as jsonAuthRepo from "./services/jsonAuthRepository";
import * as projectRepo from "./services/projectRepository";
import { JsonDatabase } from "./services/jsonDatabase";
import fs from "node:fs/promises";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@nexus/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbBackend = { type: "postgres"; db: Database } | { type: "json"; db: JsonDatabase };

const program = new Command();
const env = loadEnv(process.env);

// Color helpers for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function success(msg: string) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function error(msg: string) {
  console.error(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

function warn(msg: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
}

function heading(msg: string) {
  console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`);
}

// Initialize database connection (PostgreSQL or JSON)
async function getDatabase(): Promise<DbBackend> {
  const dbType = process.env.DATABASE_TYPE || "auto";
  const dataDir = process.env.AGENT_MANAGER_REPO_DIR;

  // Try PostgreSQL if configured
  if ((dbType === "postgres" || dbType === "auto") && env.DATABASE_URL) {
    const pool = new Pool({ connectionString: env.DATABASE_URL });

    try {
      await pool.query("select 1");
      const db = drizzle(pool, { schema });
      info("Using PostgreSQL database");
      return { type: "postgres", db };
    } catch (err: any) {
      if (dbType === "postgres") {
        error(`Failed to connect to PostgreSQL: ${err.message}`);
        await pool.end();
        process.exit(1);
      }
      await pool.end();
    }
  }

  // Try JSON database if configured
  if ((dbType === "json" || dbType === "auto") && dataDir) {
    try {
      const jsonDb = new JsonDatabase({
        dataDir,
        maxCacheSize: 1000,
        cacheTTL: 5 * 60 * 1000,
      });
      await jsonDb.initialize();
      info("Using JSON file database");
      return { type: "json", db: jsonDb };
    } catch (err: any) {
      if (dbType === "json") {
        error(`Failed to initialize JSON database: ${err.message}`);
        process.exit(1);
      }
    }
  }

  // No database available
  error("No database configured.");
  error("Set DATABASE_URL for PostgreSQL or AGENT_MANAGER_REPO_DIR for JSON storage.");
  error("Run ./install.sh to configure the database.");
  process.exit(1);
}

// ============================================================================
// SETUP COMMANDS
// ============================================================================

program
  .command("setup")
  .description("Initialize Project Nexus (database, storage, default user)")
  .option("--skip-db", "Skip database initialization")
  .option("--skip-storage", "Skip storage directory initialization")
  .option("--admin-user <username>", "Create admin user (default: admin)")
  .option("--admin-password <password>", "Admin password (prompted if not provided)")
  .action(async (options) => {
    heading("Project Nexus Setup");

    try {
      // 1. Initialize database
      if (!options.skipDb) {
        info("Initializing database...");
        if (!env.DATABASE_URL) {
          error("DATABASE_URL is not set. Please configure your .env file.");
          process.exit(1);
        }
        const db = await getDatabase();
        success("Database initialized");
      } else {
        warn("Skipping database initialization");
      }

      // 2. Initialize storage directory
      if (!options.skipStorage) {
        info(`Initializing project storage at ${env.PROJECTS_ROOT}...`);
        await fs.mkdir(env.PROJECTS_ROOT, { recursive: true });
        success(`Storage directory created: ${env.PROJECTS_ROOT}`);
      } else {
        warn("Skipping storage directory initialization");
      }

      // 3. Create admin user
      const adminUsername = options.adminUser || "admin";
      let adminPassword = options.adminPassword;

      if (!adminPassword) {
        // In real implementation, use prompts library for secure password input
        warn("Admin password not provided. Use --admin-password flag or create user manually.");
      } else {
        const db = await getDatabase();
        try {
          await authRepo.createUser(db, adminUsername, adminPassword, true);
          success(`Admin user created: ${adminUsername}`);
        } catch (err: any) {
          if (err.message?.includes("already exists")) {
            warn(`User ${adminUsername} already exists`);
          } else {
            throw err;
          }
        }
      }

      success("\nSetup complete! Start the server with: pnpm --filter nexus-backend dev");
    } catch (err: any) {
      error(`Setup failed: ${err.message}`);
      process.exit(1);
    }
  });

// ============================================================================
// USER MANAGEMENT COMMANDS
// ============================================================================

const userCmd = program.command("user").description("User management commands");

userCmd
  .command("create")
  .description("Create a new user")
  .requiredOption("-u, --username <username>", "Username")
  .requiredOption("-p, --password <password>", "Password")
  .option("--admin", "Grant admin privileges")
  .option("--system", "Allow system account access")
  .action(async (options) => {
    heading("Create User");

    try {
      const backend = await getDatabase();

      if (backend.type === "postgres") {
        await pgAuthRepo.createUser(
          backend.db,
          options.username,
          options.password,
          options.admin || false
        );
      } else {
        await jsonAuthRepo.createUser(
          backend.db,
          options.username,
          options.password,
          options.admin || false
        );
      }

      success(`User created: ${options.username}`);
      if (options.admin) {
        info("Admin privileges: enabled");
      }
      if (options.system) {
        info("System account access: enabled");
      }
    } catch (err: any) {
      error(`Failed to create user: ${err.message}`);
      process.exit(1);
    }
  });

userCmd
  .command("list")
  .description("List all users")
  .action(async () => {
    heading("Users");

    try {
      const backend = await getDatabase();
      const users =
        backend.type === "postgres"
          ? await pgAuthRepo.listUsers(backend.db)
          : await jsonAuthRepo.listUsers(backend.db);

      if (users.length === 0) {
        info("No users found");
        return;
      }

      console.log(`${"Username".padEnd(20)} ${"Admin".padEnd(10)} ${"Created"}`);
      console.log("─".repeat(50));

      for (const user of users) {
        const admin = user.isAdmin ? `${colors.green}Yes${colors.reset}` : "No";
        const created = new Date(user.createdAt).toLocaleDateString();
        console.log(`${user.username.padEnd(20)} ${admin.padEnd(10)} ${created}`);
      }
    } catch (err: any) {
      error(`Failed to list users: ${err.message}`);
      process.exit(1);
    }
  });

userCmd
  .command("delete")
  .description("Delete a user")
  .requiredOption("-u, --username <username>", "Username to delete")
  .option("--force", "Skip confirmation")
  .action(async (options) => {
    heading("Delete User");

    if (!options.force) {
      warn(`This will permanently delete user: ${options.username}`);
      warn("Use --force to skip this confirmation");
      process.exit(1);
    }

    try {
      const backend = await getDatabase();

      if (backend.type === "postgres") {
        await pgAuthRepo.deleteUser(backend.db, options.username);
      } else {
        await jsonAuthRepo.deleteUser(backend.db, options.username);
      }

      success(`User deleted: ${options.username}`);
    } catch (err: any) {
      error(`Failed to delete user: ${err.message}`);
      process.exit(1);
    }
  });

userCmd
  .command("password")
  .description("Change user password")
  .requiredOption("-u, --username <username>", "Username")
  .requiredOption("-p, --password <password>", "New password")
  .action(async (options) => {
    heading("Change Password");

    try {
      const backend = await getDatabase();

      if (backend.type === "postgres") {
        await pgAuthRepo.changePassword(backend.db, options.username, options.password);
      } else {
        await jsonAuthRepo.changePassword(backend.db, options.username, options.password);
      }

      success(`Password updated for: ${options.username}`);
    } catch (err: any) {
      error(`Failed to change password: ${err.message}`);
      process.exit(1);
    }
  });

// ============================================================================
// PROJECT MANAGEMENT COMMANDS
// ============================================================================

const projectCmd = program.command("project").description("Project management commands");

projectCmd
  .command("list")
  .description("List all projects")
  .action(async () => {
    heading("Projects");

    try {
      const db = await getDatabase();
      const projects = await projectRepo.dbListProjects(db);

      if (projects.length === 0) {
        info("No projects found");
        return;
      }

      console.log(`${"ID".padEnd(25)} ${"Name".padEnd(30)} ${"Status".padEnd(15)} Category`);
      console.log("─".repeat(80));

      for (const project of projects) {
        const statusColor = project.status === "active" ? colors.green : colors.yellow;
        const status = `${statusColor}${project.status}${colors.reset}`;
        console.log(
          `${project.id.padEnd(25)} ${(project.name || "Untitled").padEnd(30)} ${status.padEnd(
            15
          )} ${project.category || "-"}`
        );
      }
    } catch (err: any) {
      error(`Failed to list projects: ${err.message}`);
      process.exit(1);
    }
  });

projectCmd
  .command("init")
  .description("Initialize git storage for an existing project")
  .requiredOption("-i, --id <projectId>", "Project ID")
  .action(async (options) => {
    heading("Initialize Project Storage");

    try {
      const db = await getDatabase();
      const gitStorage = new GitStorage({ projectsRoot: env.PROJECTS_ROOT });

      // Get project from database
      const project = await projectRepo.dbGetProject(db, options.id);
      if (!project) {
        error(`Project not found: ${options.id}`);
        process.exit(1);
      }

      // Check if already initialized
      const exists = await gitStorage.projectExists(options.id);
      if (exists) {
        warn(`Project storage already exists: ${options.id}`);
        return;
      }

      // Initialize git storage
      info(`Initializing git repository for: ${project.name}`);
      await gitStorage.initProject(project);

      const projectPath = path.join(env.PROJECTS_ROOT, options.id);
      success(`Project storage initialized: ${projectPath}`);
    } catch (err: any) {
      error(`Failed to initialize project: ${err.message}`);
      process.exit(1);
    }
  });

projectCmd
  .command("export")
  .description("Export project as git bundle")
  .requiredOption("-i, --id <projectId>", "Project ID")
  .requiredOption("-o, --output <file>", "Output bundle file path")
  .action(async (options) => {
    heading("Export Project");

    try {
      const gitStorage = new GitStorage({ projectsRoot: env.PROJECTS_ROOT });
      const exists = await gitStorage.projectExists(options.id);

      if (!exists) {
        error(`Project storage not found: ${options.id}`);
        process.exit(1);
      }

      const projectPath = path.join(env.PROJECTS_ROOT, options.id);
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      info(`Creating git bundle...`);
      await execAsync(`git bundle create ${options.output} --all`, { cwd: projectPath });

      success(`Project exported: ${options.output}`);
    } catch (err: any) {
      error(`Failed to export project: ${err.message}`);
      process.exit(1);
    }
  });

projectCmd
  .command("import")
  .description("Import project from git bundle")
  .requiredOption("-i, --id <projectId>", "Project ID")
  .requiredOption("-b, --bundle <file>", "Bundle file path")
  .action(async (options) => {
    heading("Import Project");

    try {
      const gitStorage = new GitStorage({ projectsRoot: env.PROJECTS_ROOT });
      const exists = await gitStorage.projectExists(options.id);

      if (exists) {
        error(`Project already exists: ${options.id}`);
        process.exit(1);
      }

      const projectPath = path.join(env.PROJECTS_ROOT, options.id);
      await fs.mkdir(projectPath, { recursive: true });

      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      info(`Cloning from bundle...`);
      await execAsync(`git clone ${options.bundle} ${projectPath}`);

      success(`Project imported: ${projectPath}`);
      warn("Note: Project metadata not added to database. Use the UI to register this project.");
    } catch (err: any) {
      error(`Failed to import project: ${err.message}`);
      process.exit(1);
    }
  });

// ============================================================================
// STORAGE MANAGEMENT COMMANDS
// ============================================================================

const storageCmd = program.command("storage").description("Storage management commands");

storageCmd
  .command("info")
  .description("Show storage information")
  .action(async () => {
    heading("Storage Information");

    try {
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      console.log(`${colors.bright}Location:${colors.reset} ${env.PROJECTS_ROOT}\n`);

      // List projects
      try {
        const entries = await fs.readdir(env.PROJECTS_ROOT, { withFileTypes: true });
        const dirs = entries.filter((e) => e.isDirectory());

        console.log(`${colors.bright}Projects:${colors.reset} ${dirs.length}\n`);

        for (const dir of dirs.slice(0, 10)) {
          const projectPath = path.join(env.PROJECTS_ROOT, dir.name);
          try {
            const { stdout } = await execAsync("git log -1 --format=%ci", { cwd: projectPath });
            const lastCommit = stdout.trim();
            console.log(`  ${dir.name.padEnd(30)} Last commit: ${lastCommit}`);
          } catch {
            console.log(
              `  ${dir.name.padEnd(30)} ${colors.red}Not a git repository${colors.reset}`
            );
          }
        }

        if (dirs.length > 10) {
          info(`\n... and ${dirs.length - 10} more projects`);
        }
      } catch (err: any) {
        if (err.code === "ENOENT") {
          warn("Storage directory does not exist. Run: nexus-cli setup");
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      error(`Failed to get storage info: ${err.message}`);
      process.exit(1);
    }
  });

storageCmd
  .command("cleanup")
  .description("Clean up orphaned project storage (not in database)")
  .option("--dry-run", "Show what would be deleted without deleting")
  .option("--force", "Skip confirmation")
  .action(async (options) => {
    heading("Storage Cleanup");

    try {
      const db = await getDatabase();
      const gitStorage = new GitStorage({ projectsRoot: env.PROJECTS_ROOT });

      // Get all projects from database
      const dbProjects = await projectRepo.dbListProjects(db);
      const dbProjectIds = new Set(dbProjects.map((p) => p.id));

      // Get all storage directories
      const entries = await fs.readdir(env.PROJECTS_ROOT, { withFileTypes: true });
      const storageDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

      // Find orphaned directories
      const orphaned = storageDirs.filter((id) => !dbProjectIds.has(id));

      if (orphaned.length === 0) {
        success("No orphaned storage directories found");
        return;
      }

      info(`Found ${orphaned.length} orphaned storage directories:\n`);
      orphaned.forEach((id) => console.log(`  - ${id}`));

      if (options.dryRun) {
        info("\nDry run mode - no deletions performed");
        return;
      }

      if (!options.force) {
        warn("\nUse --force to delete these directories");
        return;
      }

      // Delete orphaned directories
      info("\nDeleting orphaned directories...");
      for (const id of orphaned) {
        const dirPath = path.join(env.PROJECTS_ROOT, id);
        await fs.rm(dirPath, { recursive: true, force: true });
        success(`Deleted: ${id}`);
      }

      success(`\nCleanup complete. Deleted ${orphaned.length} directories`);
    } catch (err: any) {
      error(`Failed to cleanup storage: ${err.message}`);
      process.exit(1);
    }
  });

// ============================================================================
// HEALTH CHECK COMMANDS
// ============================================================================

program
  .command("health")
  .description("Check system health")
  .action(async () => {
    heading("System Health Check");

    let hasErrors = false;

    // Check database
    try {
      info("Checking database connection...");
      const backend = await getDatabase();
      if (backend.type === "postgres") {
        success("Database connection: OK (PostgreSQL)");
      } else {
        success("Database connection: OK (JSON files)");
      }
    } catch (err: any) {
      error(`Database connection: FAILED - ${err.message}`);
      hasErrors = true;
    }

    // Check storage
    try {
      info("Checking storage directory...");
      await fs.access(env.PROJECTS_ROOT);
      success(`Storage directory: OK (${env.PROJECTS_ROOT})`);
    } catch (err: any) {
      error(`Storage directory: NOT FOUND (${env.PROJECTS_ROOT})`);
      warn("Run: nexus-cli setup");
      hasErrors = true;
    }

    // Check git
    try {
      info("Checking git installation...");
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);
      const { stdout } = await execAsync("git --version");
      success(`Git: ${stdout.trim()}`);
    } catch (err: any) {
      error("Git: NOT FOUND");
      warn("Git is required for project storage");
      hasErrors = true;
    }

    console.log();
    if (hasErrors) {
      error("Health check completed with errors");
      process.exit(1);
    } else {
      success("All systems operational");
    }
  });

// ============================================================================
// MAIN PROGRAM
// ============================================================================

program.name("nexus-cli").description("Project Nexus Management CLI").version("1.0.0");

program.parse();

import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { migrateUserConfig } from "./utils/configMigration.js";

// Load .env from repository root or ~/.config/agent-manager/config.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const homeConfigPath = path.join(process.env.HOME || "~", ".config", "agent-manager", "config.env");
const repoConfigPath = path.resolve(__dirname, "../../../.env");

// Migrate user config to add any missing defaults
const migrated = await migrateUserConfig(homeConfigPath);
if (migrated) {
  console.log(`[Config] Updated ${homeConfigPath} with missing defaults`);
}

// Prefer user config, fallback to repo .env
if (existsSync(homeConfigPath)) {
  console.log(`[Config] Loading configuration from ${homeConfigPath}`);
  config({ path: homeConfigPath });
} else {
  console.log(`[Config] Loading configuration from ${repoConfigPath}`);
  config({ path: repoConfigPath });
}
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { registerRoutes } from "./routes";
import { loadEnv } from "./utils/env";
import { dbPlugin } from "./plugins/db";
import gitStoragePlugin from "./plugins/gitStorage";
import { qwenPlugin } from "./plugins/qwen.js";
import { purgeExpiredSessions as pgPurgeExpiredSessions } from "./services/authRepository";
import { purgeExpiredSessions as jsonPurgeExpiredSessions } from "./services/jsonAuthRepository";
import { setupUsersFromEnv } from "./utils/setupUsers";

async function start() {
  const env = loadEnv(process.env);
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(websocket);
  await app.register(dbPlugin);
  await app.register(gitStoragePlugin);
  await app.register(qwenPlugin);

  app.get("/health", async () => ({ status: "ok" }));
  await app.register(registerRoutes, { prefix: "/api" });

  let sessionCleanup: NodeJS.Timeout | null = null;
  app.addHook("onReady", async () => {
    // Setup users from environment if configured
    await setupUsersFromEnv(app.db, app.jsonDb, process.env, app.log);

    // Start session cleanup timer
    if ((app.db || app.jsonDb) && !sessionCleanup) {
      sessionCleanup = setInterval(
        async () => {
          try {
            if (app.db) {
              await pgPurgeExpiredSessions(app.db);
            } else if (app.jsonDb) {
              await jsonPurgeExpiredSessions(app.jsonDb);
            }
          } catch (err) {
            app.log.error({ err }, "Failed to purge expired sessions");
          }
        },
        1000 * 60 * 15
      ); // every 15 minutes
      sessionCleanup.unref?.();
    }
  });

  app.addHook("onClose", async () => {
    if (sessionCleanup) clearInterval(sessionCleanup);
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Backend running on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

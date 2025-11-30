import path from "node:path";
import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { createServerRepository, type Server } from "../services/serverRepository";

type ServerPorts = {
  managerPort: number;
  workerPort: number;
  aiPort: number;
};

function parsePort(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function findServer(
  servers: Server[],
  type: Server["type"],
  host: string,
  port: number
): Server | undefined {
  return servers.find((s) => s.type === type && s.host === host && s.port === port);
}

/**
 * Ensure there is at least one local manager, worker, and AI server defined.
 *
 * - If no managers exist, create a local manager.
 * - If there is exactly one local manager and no workers, create a local worker tied to it.
 * - If there is a local worker and no AI servers, create a local AI server tied to the worker.
 */
export async function ensureLocalServerTopology(app: FastifyInstance) {
  const repo = createServerRepository(app.db, app.jsonDb);
  if (!repo) {
    app.log.warn(
      "[ServerBootstrap] No database available; skipping automatic manager/worker/ai setup"
    );
    return;
  }

  const host = process.env.LOCAL_MANAGER_HOST || "127.0.0.1";
  const ports: ServerPorts = {
    managerPort: parsePort(process.env.LOCAL_MANAGER_PORT, 4301),
    workerPort: parsePort(process.env.LOCAL_WORKER_PORT, 4302),
    aiPort: parsePort(process.env.LOCAL_AI_PORT, 4303),
  };
  const defaultModel = process.env.DEFAULT_AI_MODEL || "qwen-2.5-flash";
  const configuredWorkerRepo =
    process.env.LOCAL_WORKER_REPO || path.join(process.cwd(), "projects", "ai-chat");
  const workerRepo = fs.existsSync(configuredWorkerRepo)
    ? configuredWorkerRepo
    : (() => {
        // Auto-create workspace so qwen has a valid cwd
        fs.mkdirSync(configuredWorkerRepo, { recursive: true });
        return configuredWorkerRepo;
      })();

  let servers: Server[] = await repo.listServers();
  let managers = servers.filter((s) => s.type === "manager");

  // 1) Ensure local manager exists
  let manager = managers[0];
  if (!manager) {
    manager = await repo.createServer({
      name: "Local Manager",
      type: "manager",
      host,
      port: ports.managerPort,
      status: "online",
      metadata: { autoCreated: true, role: "local" },
    });
    app.log.info(
      { host, port: ports.managerPort, id: manager.id },
      "[ServerBootstrap] Auto-created local manager server"
    );
    servers = await repo.listServers();
    managers = servers.filter((s) => s.type === "manager");
    manager = managers[0];
  } else if (!findServer(managers, "manager", host, ports.managerPort)) {
    app.log.info(
      { host, port: ports.managerPort },
      "[ServerBootstrap] Manager already present; skipping local auto-create"
    );
  }

  // 2) Ensure worker exists when we only have the local manager
  let workers = servers.filter((s) => s.type === "worker");
  let worker = workers[0];

  const onlyLocalManager =
    managers.length === 1 && managers[0].host === host && managers[0].port === ports.managerPort;
  if (!worker && onlyLocalManager) {
    worker = await repo.createServer({
      name: "Local Worker",
      type: "worker",
      host,
      port: ports.workerPort,
      status: "online",
      metadata: {
        autoCreated: true,
        managerId: manager?.id,
        workspace: workerRepo,
      },
    });
    app.log.info(
      { host, port: ports.workerPort, id: worker.id, managerId: manager?.id },
      "[ServerBootstrap] Auto-created local worker server"
    );
    servers = await repo.listServers();
    workers = servers.filter((s) => s.type === "worker");
    worker = workers[0];
  }

  // 3) Ensure AI server exists for the local worker
  const aiServers = servers.filter((s) => s.type === "ai");
  const hasLocalAi = findServer(aiServers, "ai", host, ports.aiPort);
  if (!hasLocalAi && worker) {
    const ai = await repo.createServer({
      name: "Local AI Server",
      type: "ai",
      host,
      port: ports.aiPort,
      status: "online",
      metadata: {
        autoCreated: true,
        workerId: worker.id,
        model: defaultModel,
      },
    });
    app.log.info(
      { host, port: ports.aiPort, id: ai.id, workerId: worker.id, model: defaultModel },
      "[ServerBootstrap] Auto-created local AI server"
    );
  }
}

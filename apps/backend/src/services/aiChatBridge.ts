import WebSocket from "ws";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import { QwenClient, type QwenCommand, type QwenServerMessage } from "./qwenClient.js";
import { createServerRepository, type Server } from "./serverRepository";
import { ensureLocalServerTopology } from "../utils/serverBootstrap.js";
import fs from "node:fs";
import path from "node:path";

export type AiTransport = "manager-proxy" | "direct-qwen";

export interface AiChainSelection {
  manager?: Server;
  worker?: Server;
  ai: Server;
}

export interface AiBridge {
  transport: AiTransport;
  chain: AiChainSelection;
  send: (cmd: QwenCommand) => void;
  shutdown: () => Promise<void>;
}

/**
 * Resolve a manager/worker/ai chain, auto-creating local defaults when needed.
 */
export async function resolveAiChain(app: FastifyInstance): Promise<AiChainSelection> {
  const repo = createServerRepository(app.db, app.jsonDb);
  if (!repo) {
    throw new Error("Server repository not available");
  }

  // Ensure at least local servers exist
  await ensureLocalServerTopology(app);

  const servers = await repo.listServers();
  const aiServers = servers.filter((s) => s.type === "ai");
  if (aiServers.length === 0) {
    throw new Error("No AI servers registered");
  }

  // Prefer online AI server first, then any
  const ai =
    aiServers.find((s) => s.status === "online") ||
    aiServers.find((s) => s.metadata?.autoCreated) ||
    aiServers[0];

  const worker =
    (ai?.metadata?.workerId && servers.find((s) => s.id === ai.metadata.workerId)) ||
    servers.find((s) => s.type === "worker");

  const manager =
    (worker?.metadata?.managerId && servers.find((s) => s.id === worker.metadata.managerId)) ||
    servers.find((s) => s.type === "manager");

  return { manager, worker, ai };
}

/**
 * Bridge that proxies chat over a manager WebSocket endpoint.
 */
class ManagerProxyBridge implements AiBridge {
  transport: AiTransport = "manager-proxy";
  chain: AiChainSelection;
  private ws: WebSocket;
  private log: FastifyBaseLogger;
  ready: Promise<void>;
  private readySettled = false;

  constructor(
    chain: AiChainSelection,
    managerUrl: string,
    log: FastifyBaseLogger,
    onMessage: (msg: any) => void
  ) {
    if (!chain.manager) {
      throw new Error("Manager is required for manager proxy bridge");
    }
    this.chain = chain;
    this.log = log;
    let readyResolve!: () => void;
    let readyReject!: (err: unknown) => void;
    this.ready = new Promise<void>((resolve, reject) => {
      readyResolve = resolve;
      readyReject = reject;
    });
    this.ws = new WebSocket(managerUrl);

    this.ws.on("open", () => {
      this.log.info(
        { manager: `${chain.manager?.host}:${chain.manager?.port}` },
        "[AIChatBridge] Connected to manager proxy"
      );
      this.readySettled = true;
      readyResolve();
    });

    this.ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        onMessage(msg);
      } catch (err) {
        this.log.error(
          { err, data: data.toString() },
          "[AIChatBridge] Failed to parse manager msg"
        );
      }
    });

    this.ws.on("close", () => {
      this.log.info("[AIChatBridge] Manager proxy connection closed");
      // If closed before ready, reject to allow fallback
      if (!this.readySettled) {
        readyReject(new Error("Manager proxy closed before ready"));
      }
    });

    this.ws.on("error", (err) => {
      this.log.error({ err }, "[AIChatBridge] Manager proxy error");
      if (!this.readySettled) {
        readyReject(err);
      }
    });
  }

  send(cmd: QwenCommand) {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(cmd));
    } else {
      throw new Error("Manager proxy socket not open");
    }
  }

  async shutdown(): Promise<void> {
    if (this.ws.readyState === this.ws.OPEN || this.ws.readyState === this.ws.CONNECTING) {
      this.ws.close();
    }
  }
}

/**
 * Bridge that talks directly to a Qwen AI server (local or TCP).
 */
class DirectQwenBridge implements AiBridge {
  transport: AiTransport = "direct-qwen";
  chain: AiChainSelection;
  private client: QwenClient;
  private handler: (msg: QwenServerMessage) => void;
  private log: FastifyBaseLogger;

  constructor(
    chain: AiChainSelection,
    log: FastifyBaseLogger,
    onMessage: (msg: any) => void,
    config?: {
      workspaceRoot?: string;
      model?: string;
      mode?: "stdio" | "tcp";
    }
  ) {
    this.chain = chain;
    this.log = log;
    const ai = chain.ai;
    const mode = config?.mode ?? (ai.metadata?.mode === "tcp" ? "tcp" : "stdio");
    const workspaceRoot = resolveWorkspaceRoot(config?.workspaceRoot);
    this.client = new QwenClient({
      mode,
      tcpPort: ai.port,
      tcpHost: ai.host,
      workspaceRoot,
      model: config?.model ?? ai.metadata?.model ?? process.env.DEFAULT_AI_MODEL,
      qwenPath: process.env.QWEN_PATH,
    });

    this.handler = (msg: QwenServerMessage) => {
      onMessage(msg);
    };
  }

  async start(): Promise<void> {
    await this.client.start();
    this.client.addMessageHandler(this.handler);
  }

  send(cmd: QwenCommand): void {
    this.client.send(cmd);
  }

  async shutdown(): Promise<void> {
    this.client.removeMessageHandler(this.handler);
    await this.client.stop();
  }
}

function resolveWorkspaceRoot(candidate?: string): string {
  if (candidate && fs.existsSync(candidate)) {
    return candidate;
  }

  const fallback = process.env.LOCAL_WORKER_REPO || path.join(process.cwd(), "projects", "ai-chat");
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

/**
 * Create a bridge. Prefers manager proxy when a manager is present; falls back to direct Qwen.
 */
export async function createAiBridge(
  log: FastifyBaseLogger,
  chain: AiChainSelection,
  onMessage: (msg: any) => void
): Promise<AiBridge> {
  const preferProxy = chain.manager !== undefined && process.env.FORCE_DIRECT_AI !== "true";

  if (preferProxy && chain.manager) {
    const url = new URL(
      `/proxy/ai-chat?workerId=${chain.worker?.id || ""}&aiId=${chain.ai.id}`,
      `ws://${chain.manager.host}:${chain.manager.port}`
    );
    const proxyBridge = new ManagerProxyBridge(chain, url.toString(), log, onMessage);
    try {
      await proxyBridge.ready;
      return proxyBridge;
    } catch (err) {
      log.warn(
        { err, manager: `${chain.manager.host}:${chain.manager.port}` },
        "[AIChatBridge] Manager proxy unavailable, falling back to direct connection"
      );
    }
  }

  const bridge = new DirectQwenBridge(chain, log, onMessage, {
    workspaceRoot: chain.worker?.metadata?.workspace,
    model: chain.ai.metadata?.model,
    mode: chain.ai.metadata?.mode,
  });
  await bridge.start();
  return bridge;
}

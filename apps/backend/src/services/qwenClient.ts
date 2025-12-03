/**
 * Qwen AI TCP Client
 *
 * IMPORTANT: Requires qwen-code with C++ TCP server support.
 * Install from: https://github.com/OuluBSD/qwen-code
 *
 * This client connects to the Qwen C++ TCP server which manages
 * the qwen-code TypeScript backend process.
 */

import { spawn, type ChildProcess } from "node:child_process";
import * as net from "node:net";
import * as readline from "node:readline";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveQwenPath } from "@nexus/shared/qwenPath";
import { processLogger } from "./processLogger";

// Protocol message types (matching qwen-code protocol)
export interface QwenInitMessage {
  type: "init";
  version: string;
  workspaceRoot: string;
  model: string;
}

export interface QwenConversationMessage {
  type: "conversation";
  role: "user" | "assistant" | "system";
  content: string;
  id: number;
  timestamp?: number;
  isStreaming?: boolean;
}

export interface QwenStatusUpdate {
  type: "status";
  state: "idle" | "responding" | "waiting_for_confirmation";
  message?: string;
  thought?: string;
}

export interface QwenInfoMessage {
  type: "info";
  message: string;
  id: number;
}

export interface QwenErrorMessage {
  type: "error";
  message: string;
  id: number;
}

export interface QwenCompletionStats {
  type: "completion_stats";
  duration: string;
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface QwenToolGroup {
  type: "tool_group";
  tools: Array<{
    type: "tool_call";
    tool_id: string; // Changed from 'id' to 'tool_id' to match actual protocol
    tool_name: string;
    status: string;
    args: Record<string, any>;
    confirmation_details?: {
      message: string;
      requires_approval: boolean;
    };
  }>;
  id: number;
}

export type QwenServerMessage =
  | QwenInitMessage
  | QwenConversationMessage
  | QwenStatusUpdate
  | QwenInfoMessage
  | QwenErrorMessage
  | QwenCompletionStats
  | QwenToolGroup;

// Client commands
export interface QwenUserInput {
  type: "user_input";
  content: string;
}

export interface QwenInterrupt {
  type: "interrupt";
}

export interface QwenToolApproval {
  type: "tool_approval";
  approved: boolean;
  tool_id: string; // Individual tool ID (from tools array), not tool group ID
}

export type QwenCommand = QwenUserInput | QwenInterrupt | QwenToolApproval;

export type QwenMode = "stdio" | "tcp";

export interface QwenClientConfig {
  qwenPath?: string; // Path to qwen-code CLI script (defaults to repo deps/qwen-code/scripts/qwen-code)
  mode?: QwenMode; // Communication mode: stdio or tcp (default: stdio)
  tcpPort?: number; // TCP port (defaults to 7777, only used in TCP mode)
  tcpHost?: string; // TCP host (defaults to localhost)
  workspaceRoot?: string; // Workspace directory for qwen
  model?: string; // Model to use (e.g., 'qwen-2.5-flash')
  autoStart?: boolean; // Auto-start qwen process on connect (default: true)
  connectOnly?: boolean; // Only connect to existing server, don't spawn process (default: false, TCP only)
  // Session tracking
  purpose?: string; // Why this process was started
  initiator?: {
    type: "user" | "system";
    userId?: string;
    sessionId?: string;
    username?: string;
  };
  attachments?: {
    webSocketId?: string;
    transport?: string;
    chainInfo?: {
      managerId?: string;
      workerId?: string;
      aiId?: string;
    };
  };
  sessionInfo?: {
    sessionId: string;
    reopenCount: number;
    firstOpened: Date;
    lastOpened: Date;
  };
}

/**
 * Client for communicating with qwen-cli via stdio or TCP modes
 *
 * Features:
 * - Automatic process spawning and lifecycle management
 * - Stdio or TCP communication with line-delimited JSON protocol
 * - Request/response handling with streaming support
 * - Cleanup on errors and disconnection
 */
export class QwenClient {
  private static readonly PID_FILE = join(
    process.env.HOME || process.env.USERPROFILE || "",
    ".config",
    "agent-manager",
    "qwen.pid"
  );

  private config: Required<
    Omit<QwenClientConfig, "purpose" | "initiator" | "attachments" | "sessionInfo">
  > & {
    purpose?: string;
    initiator?: {
      type: "user" | "system";
      userId?: string;
      sessionId?: string;
      username?: string;
    };
    attachments?: {
      webSocketId?: string;
      transport?: string;
      chainInfo?: {
        managerId?: string;
        workerId?: string;
        aiId?: string;
      };
    };
    sessionInfo?: {
      sessionId: string;
      reopenCount: number;
      firstOpened: Date;
      lastOpened: Date;
    };
  };
  private process: ChildProcess | null = null;
  private socket: net.Socket | null = null;
  private buffer = "";
  private messageHandlers: ((msg: QwenServerMessage) => void)[] = [];
  private connected = false;
  private initReceived = false;
  private processId: string | null = null;

  /**
   * Clean up any orphaned qwen processes from previous runs
   */
  static cleanupOrphanedProcesses(): void {
    try {
      if (existsSync(QwenClient.PID_FILE)) {
        const pid = parseInt(readFileSync(QwenClient.PID_FILE, "utf-8").trim(), 10);
        if (pid && !isNaN(pid)) {
          try {
            // Check if process exists and kill it
            process.kill(pid, "SIGTERM");
            console.log(`[QwenClient] Killed orphaned qwen process ${pid}`);
          } catch (err: any) {
            // Process doesn't exist (ESRCH) or no permission (EPERM)
            if (err.code !== "ESRCH") {
              console.error(`[QwenClient] Failed to kill orphaned process ${pid}:`, err);
            }
          }
        }
        unlinkSync(QwenClient.PID_FILE);
      }
    } catch (err) {
      console.error("[QwenClient] Error cleaning up orphaned processes:", err);
    }
  }

  addMessageHandler(handler: (msg: QwenServerMessage) => void) {
    this.messageHandlers.push(handler);
    console.log(`[QwenClient] Added handler, total handlers: ${this.messageHandlers.length}`);
  }

  removeMessageHandler(handler: (msg: QwenServerMessage) => void) {
    const before = this.messageHandlers.length;
    this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    console.log(
      `[QwenClient] Removed handler, before: ${before}, after: ${this.messageHandlers.length}`
    );
  }

  constructor(config: QwenClientConfig = {}) {
    this.config = {
      qwenPath: resolveQwenPath(config.qwenPath),
      mode: config.mode ?? "stdio",
      tcpPort: config.tcpPort ?? 7777,
      tcpHost: config.tcpHost ?? "127.0.0.1",
      workspaceRoot: config.workspaceRoot ?? process.cwd(),
      model: config.model ?? "qwen-2.5-flash",
      autoStart: config.autoStart ?? true,
      connectOnly: config.connectOnly ?? false,
      purpose: config.purpose,
      initiator: config.initiator,
      attachments: config.attachments,
      sessionInfo: config.sessionInfo,
    };

    console.log(`[QwenClient] Constructor called with config:`, {
      mode: this.config.mode,
      purpose: this.config.purpose,
      initiatorType: this.config.initiator?.type,
      sessionId: this.config.sessionInfo?.sessionId || this.config.initiator?.sessionId,
      userId: this.config.initiator?.userId,
      username: this.config.initiator?.username,
    });
  }

  /**
   * Start qwen-code process and connect via stdio or TCP
   */
  async start(): Promise<void> {
    if (this.connected) {
      throw new Error("QwenClient already started");
    }

    if (this.config.mode === "stdio") {
      return this.startStdioMode();
    } else {
      return this.startTcpMode();
    }
  }

  /**
   * Start in stdio mode - spawn qwen-code process and communicate via stdin/stdout
   */
  private async startStdioMode(): Promise<void> {
    console.log(`[QwenClient] Starting stdio mode: ${this.config.qwenPath}`);

    this.process = spawn(
      this.config.qwenPath,
      ["--server-mode", "stdin", "--approval-mode", "yolo"],
      {
        stdio: ["pipe", "pipe", "inherit"],
        cwd: this.config.workspaceRoot,
        env: {
          ...process.env,
        },
      }
    );

    // Track process for debugging
    this.processId = `qwen-${Date.now()}`;
    processLogger.registerProcess({
      id: this.processId,
      type: "qwen",
      name: this.config.purpose || "Qwen AI Process",
      pid: this.process.pid,
      command: this.config.qwenPath,
      args: ["--server-mode", "stdin", "--approval-mode", "yolo"],
      cwd: this.config.workspaceRoot,
      startTime: new Date(),
      status: "starting",
      metadata: { model: this.config.model, mode: "stdio" },
      purpose: this.config.purpose,
      initiator: this.config.initiator,
      attachments: this.config.attachments,
      sessionInfo: this.config.sessionInfo,
    });

    // Update to running once PID is available
    if (this.process.pid) {
      processLogger.updateProcess(this.processId, { status: "running", pid: this.process.pid });
    }

    // Track stdout
    this.process.stdout?.on("data", (data: Buffer) => {
      const content = data.toString("utf8");
      processLogger.logIO({
        processId: this.processId!,
        timestamp: new Date(),
        direction: "stdout",
        content,
      });
    });

    // Track stderr
    this.process.stderr?.on("data", (data: Buffer) => {
      const content = data.toString("utf8");
      processLogger.logIO({
        processId: this.processId!,
        timestamp: new Date(),
        direction: "stderr",
        content,
      });
    });

    // Write PID file for cleanup
    if (this.process.pid) {
      try {
        writeFileSync(QwenClient.PID_FILE, this.process.pid.toString(), "utf-8");
        console.log(`[QwenClient] Wrote PID ${this.process.pid} to ${QwenClient.PID_FILE}`);
      } catch (err) {
        console.error("[QwenClient] Failed to write PID file:", err);
      }
    }

    // Handle process exit
    this.process.on("exit", (code, signal) => {
      console.log(`[QwenClient] Process exited with code ${code}, signal ${signal}`);
      if (this.processId) {
        processLogger.markProcessExited(this.processId, code, signal);
      }
      this.cleanup();
    });

    // Handle process errors
    this.process.on("error", (err) => {
      console.error(`[QwenClient] Process error:`, err);
      if (this.processId) {
        processLogger.markProcessError(this.processId, err);
      }
      this.cleanup();
    });

    // Set up stdout reader
    if (this.process.stdout) {
      const rl = readline.createInterface({
        input: this.process.stdout,
        crlfDelay: Infinity,
      });

      rl.on("line", (line) => {
        if (line.trim()) {
          try {
            const msg = JSON.parse(line) as QwenServerMessage;
            this.handleMessage(msg);
          } catch (err) {
            console.error(`[QwenClient] Failed to parse message:`, line, err);
          }
        }
      });

      rl.on("close", () => {
        console.log(`[QwenClient] Stdout closed`);
        this.cleanup();
      });
    }

    this.connected = true;
    console.log(`[QwenClient] Connected in stdio mode`);

    // Wait for init message
    await this.waitForInit();
  }

  /**
   * Start in TCP mode - connect to existing TCP server
   */
  private async startTcpMode(): Promise<void> {
    console.log(`[QwenClient] Connect-only mode: connecting to existing qwen server`);

    // Connect to TCP server
    return new Promise<void>((resolve, reject) => {
      console.log(
        `[QwenClient] Connecting to TCP host ${this.config.tcpHost} port ${this.config.tcpPort}...`
      );

      this.socket = net.createConnection(
        { port: this.config.tcpPort, host: this.config.tcpHost },
        () => {
          console.log(`[QwenClient] Connected to qwen TCP server`);
          this.connected = true;
          resolve();
        }
      );

      this.socket.on("data", (data) => {
        this.handleData(data);
      });

      this.socket.on("error", (err) => {
        console.error(`[QwenClient] Socket error:`, err);
        if (!this.connected) {
          reject(err);
        }
        this.cleanup();
      });

      this.socket.on("close", () => {
        console.log(`[QwenClient] Socket closed`);
        this.cleanup();
      });

      // Connection timeout
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error("Connection timeout"));
          this.cleanup();
        }
      }, 5000);
    });
  }

  /**
   * Stop client and cleanup resources
   */
  async stop(): Promise<void> {
    console.log(
      `[QwenClient] Stopping... processId=${this.processId}, sessionId=${this.config.sessionInfo?.sessionId || this.config.initiator?.sessionId || "none"}`
    );
    this.cleanup();
  }

  /**
   * Send a question and receive the AI response
   *
   * @param question - The question to ask the AI
   * @param onChunk - Optional callback for streaming chunks
   * @returns Full AI response
   */
  async ask(question: string, onChunk?: (chunk: string) => void): Promise<string> {
    if (!this.connected) {
      throw new Error("QwenClient not connected");
    }

    // Wait for init message if not yet received (skip in connectOnly mode as init was sent before connection)
    if (!this.initReceived && !this.config.connectOnly) {
      await this.waitForInit();
    }

    return new Promise<string>((resolve, reject) => {
      let responseContent = "";
      let responseReceived = false;

      // Set up message handler
      const handler = (msg: any) => {
        switch (msg.type) {
          case "conversation":
            if (msg.role === "assistant") {
              responseContent += msg.content;
              if (onChunk) {
                onChunk(msg.content);
              }
              // Check if response is complete (not streaming)
              if (msg.isStreaming === false) {
                responseReceived = true;
              }
            }
            break;

          case "assistant_response":
            // Handle assistant_response messages from C++ TCP server
            responseContent += msg.content;
            if (onChunk) {
              onChunk(msg.content);
            }
            // TCP server sends one message per chunk, response is complete when content ends
            // We'll wait for timeout or a final "status" message
            break;

          case "status":
            // Response is complete when we return to idle state
            if (msg.state === "idle" && responseContent.length > 0) {
              responseReceived = true;
            }
            break;

          case "error":
            // Remove handler and reject
            this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
            reject(new Error(msg.message || msg.content));
            break;
        }

        // Resolve when response is complete
        if (responseReceived) {
          this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
          resolve(responseContent);
        }
      };

      // Add handler
      this.messageHandlers.push(handler);

      // Send user input
      this.sendCommand({
        type: "user_input",
        content: question,
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (!responseReceived) {
          this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
          reject(new Error("Response timeout"));
        }
      }, 60000);
    });
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send command to qwen server
   */
  send(cmd: QwenCommand): void {
    this.sendCommand(cmd);
  }

  /**
   * Send command to qwen server
   */
  private sendCommand(cmd: QwenCommand): void {
    const json = JSON.stringify(cmd) + "\n";

    // Track stdin for debugging
    if (this.processId) {
      processLogger.logStdin(this.processId, json);
    }

    if (this.config.mode === "stdio") {
      if (!this.process || !this.process.stdin) {
        throw new Error("Process stdin not available");
      }
      this.process.stdin.write(json);
    } else {
      if (!this.socket) {
        throw new Error("Socket not available");
      }
      this.socket.write(json);
    }
  }

  /**
   * Handle incoming data from TCP socket
   */
  private handleData(data: Buffer): void {
    this.buffer += data.toString("utf8");

    // Process complete lines
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.substring(0, newlineIndex);
      this.buffer = this.buffer.substring(newlineIndex + 1);

      if (line.trim()) {
        try {
          const msg = JSON.parse(line) as QwenServerMessage;
          this.handleMessage(msg);
        } catch (err) {
          console.error(`[QwenClient] Failed to parse message:`, line, err);
        }
      }
    }
  }

  /**
   * Handle parsed message from server
   */
  private handleMessage(msg: QwenServerMessage): void {
    console.log(`[QwenClient] Received message type: ${msg.type}`);

    // Track init message
    if (msg.type === "init") {
      console.log(`[QwenClient] Received init: ${msg.version}, model: ${msg.model}`);
      this.initReceived = true;
      console.log(`[QwenClient] initReceived flag set to true`);
    }

    // Track conversation messages
    if (this.processId && msg.type === "conversation") {
      processLogger.logConversationMessage({
        processId: this.processId,
        messageId: msg.id,
        timestamp: new Date(msg.timestamp || Date.now()),
        role: msg.role,
        content: msg.content,
        isStreaming: msg.isStreaming,
      });
    }

    // Track tool usage
    if (this.processId && msg.type === "tool_group") {
      for (const tool of msg.tools) {
        processLogger.logToolUsage({
          processId: this.processId,
          timestamp: new Date(),
          toolGroupId: msg.id,
          toolId: tool.tool_id,
          toolName: tool.tool_name,
          status: tool.status,
          args: tool.args,
          confirmationDetails: tool.confirmation_details,
        });
      }
    }

    // Dispatch to handlers
    for (const handler of this.messageHandlers) {
      handler(msg);
    }
  }

  /**
   * Wait for init message
   */
  private async waitForInit(timeout = 5000): Promise<void> {
    console.log(`[QwenClient] waitForInit called, initReceived=${this.initReceived}`);
    if (this.initReceived) return;

    return new Promise<void>((resolve, reject) => {
      const startTime = Date.now();

      const checkInit = () => {
        if (this.initReceived) {
          console.log(`[QwenClient] waitForInit: initReceived became true`);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          console.log(`[QwenClient] waitForInit: timeout after ${Date.now() - startTime}ms`);
          reject(new Error("Init timeout"));
        } else {
          setTimeout(checkInit, 100);
        }
      };

      checkInit();
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    console.log(
      `[QwenClient] cleanup() called for processId=${this.processId}, pid=${this.process?.pid}, sessionId=${this.config.sessionInfo?.sessionId || this.config.initiator?.sessionId || "none"}`
    );

    this.connected = false;
    this.initReceived = false;

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    if (this.process) {
      console.log(`[QwenClient] Killing process pid=${this.process.pid}`);
      this.process.kill();
      this.process = null;
    }

    // Remove PID file
    try {
      if (existsSync(QwenClient.PID_FILE)) {
        unlinkSync(QwenClient.PID_FILE);
        console.log("[QwenClient] Removed PID file");
      }
    } catch (err) {
      console.error("[QwenClient] Failed to remove PID file:", err);
    }

    this.messageHandlers = [];
    this.buffer = "";
  }
}

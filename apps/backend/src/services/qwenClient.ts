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

export type QwenServerMessage =
  | QwenInitMessage
  | QwenConversationMessage
  | QwenStatusUpdate
  | QwenInfoMessage
  | QwenErrorMessage
  | QwenCompletionStats;

// Client commands
export interface QwenUserInput {
  type: "user_input";
  content: string;
}

export interface QwenInterrupt {
  type: "interrupt";
}

export type QwenCommand = QwenUserInput | QwenInterrupt;

export type QwenMode = "stdio" | "tcp";

export interface QwenClientConfig {
  qwenPath?: string; // Path to qwen-code CLI script (defaults to ~/Dev/qwen-code/script/qwen-code)
  mode?: QwenMode; // Communication mode: stdio or tcp (default: stdio)
  tcpPort?: number; // TCP port (defaults to 7777, only used in TCP mode)
  workspaceRoot?: string; // Workspace directory for qwen
  model?: string; // Model to use (e.g., 'qwen-2.5-flash')
  autoStart?: boolean; // Auto-start qwen process on connect (default: true)
  connectOnly?: boolean; // Only connect to existing server, don't spawn process (default: false, TCP only)
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
  private config: Required<QwenClientConfig>;
  private process: ChildProcess | null = null;
  private socket: net.Socket | null = null;
  private buffer = "";
  private messageHandlers: ((msg: QwenServerMessage) => void)[] = [];
  private connected = false;
  private initReceived = false;

  addMessageHandler(handler: (msg: QwenServerMessage) => void) {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler: (msg: QwenServerMessage) => void) {
    this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
  }

  constructor(config: QwenClientConfig = {}) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    this.config = {
      qwenPath: config.qwenPath ?? `${homeDir}/Dev/qwen-code/script/qwen-code`,
      mode: config.mode ?? "stdio",
      tcpPort: config.tcpPort ?? 7777,
      workspaceRoot: config.workspaceRoot ?? process.cwd(),
      model: config.model ?? "qwen-2.5-flash",
      autoStart: config.autoStart ?? true,
      connectOnly: config.connectOnly ?? false,
    };
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

    this.process = spawn(this.config.qwenPath, ["--server-mode", "stdin"], {
      stdio: ["pipe", "pipe", "inherit"],
      cwd: this.config.workspaceRoot,
      env: {
        ...process.env,
      },
    });

    // Handle process exit
    this.process.on("exit", (code, signal) => {
      console.log(`[QwenClient] Process exited with code ${code}, signal ${signal}`);
      this.cleanup();
    });

    // Handle process errors
    this.process.on("error", (err) => {
      console.error(`[QwenClient] Process error:`, err);
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
      console.log(`[QwenClient] Connecting to TCP port ${this.config.tcpPort}...`);

      this.socket = net.createConnection({ port: this.config.tcpPort, host: "localhost" }, () => {
        console.log(`[QwenClient] Connected to qwen TCP server`);
        this.connected = true;
        resolve();
      });

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
    console.log(`[QwenClient] Stopping...`);
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
    this.connected = false;
    this.initReceived = false;

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    if (this.process) {
      this.process.kill();
      this.process = null;
    }

    this.messageHandlers = [];
    this.buffer = "";
  }
}

/**
 * Qwen Chat Client for CLI
 * Connects QwenClient (backend) with QwenChatSession (shared state)
 */

import { spawn, type ChildProcess } from "node:child_process";
import * as readline from "node:readline";
import { QwenChatSession } from "@nexus/shared/chat";
import { resolveQwenPath } from "@nexus/shared/qwenPath";

export interface QwenChatClientConfig {
  qwenPath?: string;
  workspaceRoot?: string;
  model?: string;
}

export class QwenChatClient {
  private process: ChildProcess | null = null;
  private session: QwenChatSession;
  private buffer = "";
  private initReceived = false;

  constructor(
    session: QwenChatSession,
    private config: QwenChatClientConfig = {}
  ) {
    this.session = session;
  }

  async start(): Promise<void> {
    const qwenPath = resolveQwenPath(this.config.qwenPath);
    const workspaceRoot = this.config.workspaceRoot ?? process.cwd();

    this.session.setStatus({ state: "connecting", message: "Starting qwen-code..." });

    this.process = spawn(qwenPath, ["--server-mode", "stdin"], {
      stdio: ["pipe", "pipe", "inherit"],
      cwd: workspaceRoot,
      env: process.env,
    });

    // Handle process events
    this.process.on("exit", (code, signal) => {
      this.session.setStatus({
        state: "error",
        message: `Qwen process exited (code: ${code}, signal: ${signal})`,
      });
    });

    this.process.on("error", (err) => {
      this.session.setStatus({
        state: "error",
        message: `Process error: ${err.message}`,
      });
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
            const msg = JSON.parse(line);
            this.handleMessage(msg);
          } catch (err) {
            console.error(`Failed to parse message:`, line, err);
          }
        }
      });
    }

    // Wait for init message
    await this.waitForInit();
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  sendMessage(content: string): void {
    if (!this.process || !this.process.stdin) {
      throw new Error("Process not running");
    }

    const cmd =
      JSON.stringify({
        type: "user_input",
        content,
      }) + "\n";

    this.process.stdin.write(cmd);
    this.session.sendMessage(content);
  }

  private handleMessage(msg: any): void {
    switch (msg.type) {
      case "init":
        this.initReceived = true;
        this.session.setInfo({
          version: msg.version,
          model: msg.model,
          workspaceRoot: msg.workspaceRoot,
        });
        this.session.setStatus({ state: "idle", message: "Connected" });
        break;

      case "conversation":
        if (msg.role === "assistant") {
          if (!this.session.isStreamingMessage()) {
            this.session.startStreaming();
          }
          this.session.appendToStreaming(msg.content);

          if (msg.isStreaming === false) {
            this.session.finishStreaming();
          }
        }
        break;

      case "status":
        this.session.setStatus({
          state: msg.state,
          message: msg.message,
          thought: msg.thought,
        });

        if (msg.state === "idle" && this.session.isStreamingMessage()) {
          this.session.finishStreaming();
        }
        break;

      case "error":
        this.session.setStatus({
          state: "error",
          message: msg.message || "Unknown error",
        });
        if (this.session.isStreamingMessage()) {
          this.session.finishStreaming();
        }
        break;

      case "info":
        // Optional: handle info messages
        break;
    }
  }

  private async waitForInit(timeout = 5000): Promise<void> {
    if (this.initReceived) return;

    return new Promise<void>((resolve, reject) => {
      const startTime = Date.now();

      const checkInit = () => {
        if (this.initReceived) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error("Init timeout"));
        } else {
          setTimeout(checkInit, 100);
        }
      };

      checkInit();
    });
  }
}

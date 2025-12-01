/**
 * Generic AI Backend Abstraction Layer
 * Supports: qwen-code, claude, gemini, codex (all forked versions)
 */

import type { ChatMessage, ChatStatus } from "./types";
import { resolveQwenPath } from "../qwenPath.js";

export type AIBackendType = "qwen" | "claude" | "gemini" | "codex";

export interface AIBackendConfig {
  type: AIBackendType;
  backendPath?: string;
  workspaceRoot?: string;
  model?: string;
  disableTools?: boolean;
  disableFilesystem?: boolean;
  serverMode?: "stdin" | "tcp";
  tcpPort?: number;
}

export interface AIBackendMessage {
  type: string;
  role?: string;
  content?: string;
  isStreaming?: boolean;
  state?: string;
  message?: string;
  thought?: string;
  version?: string;
  model?: string;
  workspaceRoot?: string;
  [key: string]: unknown;
}

export interface AIBackendEventHandlers {
  onInit?: (info: { version?: string; model?: string; workspaceRoot?: string }) => void;
  onMessage?: (message: ChatMessage) => void;
  onStreamingStart?: () => void;
  onStreamingChunk?: (content: string) => void;
  onStreamingEnd?: () => void;
  onStatus?: (status: ChatStatus) => void;
  onError?: (error: string) => void;
  onDisconnect?: () => void;
}

/**
 * Generic AI Backend Interface
 * All AI backends must implement this interface
 */
export interface AIBackend {
  start(): Promise<void>;
  stop(): Promise<void>;
  sendMessage(content: string): void;
  interrupt(): void;
  isConnected(): boolean;
  getBackendType(): AIBackendType;
}

/**
 * Normalize backend-specific messages to common format
 */
export function normalizeBackendMessage(
  msg: AIBackendMessage,
  backendType: AIBackendType
): AIBackendMessage {
  // All forked backends (qwen/claude/gemini/codex) use similar protocol
  // This can be extended if there are specific differences
  return msg;
}

/**
 * Get default backend path based on type
 */
export function getDefaultBackendPath(type: AIBackendType, homeDir: string): string {
  switch (type) {
    case "qwen":
      return resolveQwenPath();
    case "claude":
      return `${homeDir}/Dev/claude-code/script/claude-code`;
    case "gemini":
      return `${homeDir}/Dev/gemini-code/script/gemini-code`;
    case "codex":
      return `${homeDir}/Dev/codex-code/script/codex-code`;
    default:
      throw new Error(`Unknown backend type: ${type}`);
  }
}

/**
 * Build command-line arguments for backend
 */
export function buildBackendArgs(config: AIBackendConfig): string[] {
  const args: string[] = [];

  // Server mode
  if (config.serverMode === "stdin") {
    args.push("--server-mode", "stdin");
  } else if (config.serverMode === "tcp" && config.tcpPort) {
    args.push("--mode", "tcp", "--port", config.tcpPort.toString());
  }

  // Disable tools if requested
  if (config.disableTools) {
    args.push("--no-tools");
  }

  // Disable filesystem if requested
  if (config.disableFilesystem) {
    args.push("--no-filesystem");
  }

  // Model selection
  if (config.model) {
    args.push("--model", config.model);
  }

  // Workspace
  if (config.workspaceRoot) {
    args.push("--workspace", config.workspaceRoot);
  }

  return args;
}

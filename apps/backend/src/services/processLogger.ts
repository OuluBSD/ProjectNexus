/**
 * Process Logger Service
 * Tracks all spawned processes and their I/O for debugging
 */

import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";

export type ProcessType = "qwen" | "terminal" | "git" | "other";

export interface ProcessLogEntry {
  id: string; // Unique process identifier
  type: ProcessType;
  name: string; // Human-readable name
  pid?: number; // Process ID
  command: string; // Command that was executed
  args: string[]; // Command arguments
  cwd: string; // Working directory
  startTime: Date;
  endTime?: Date;
  exitCode?: number | null;
  signal?: string | null;
  status: "starting" | "running" | "exited" | "error";
  metadata?: Record<string, any>;
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

export interface ProcessIOEntry {
  processId: string;
  timestamp: Date;
  direction: "stdin" | "stdout" | "stderr";
  content: string;
  metadata?: Record<string, any>;
}

export interface WebSocketLogEntry {
  id: string;
  connectionId: string;
  timestamp: Date;
  direction: "send" | "receive";
  messageType: string;
  content: any;
  metadata?: Record<string, any>;
}

export interface ConversationMessageEntry {
  processId: string;
  messageId: number;
  timestamp: Date;
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
  metadata?: Record<string, any>;
}

export interface ToolUsageEntry {
  processId: string;
  timestamp: Date;
  toolGroupId?: number;
  toolId: string;
  toolName: string;
  status: string;
  args: Record<string, any>;
  confirmationDetails?: {
    message: string;
    requires_approval: boolean;
  };
  approved?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Global process logger singleton
 */
class ProcessLoggerService extends EventEmitter {
  private processes: Map<string, ProcessLogEntry> = new Map();
  private ioLogs: Map<string, ProcessIOEntry[]> = new Map();
  private wsLogs: WebSocketLogEntry[] = [];
  private conversationLogs: Map<string, ConversationMessageEntry[]> = new Map();
  private toolLogs: Map<string, ToolUsageEntry[]> = new Map();
  private maxIOEntriesPerProcess = 10000; // Limit to prevent memory issues
  private maxWSEntries = 5000;
  private maxConversationEntriesPerProcess = 5000;
  private maxToolEntriesPerProcess = 1000;

  /**
   * Register a new process
   */
  registerProcess(entry: ProcessLogEntry): void {
    this.processes.set(entry.id, entry);
    this.ioLogs.set(entry.id, []);
    this.conversationLogs.set(entry.id, []);
    this.toolLogs.set(entry.id, []);
    this.emit("process:created", entry);
    console.log(
      `[ProcessLogger] Registered process: ${entry.name} (${entry.id}) PID: ${entry.pid}`,
      {
        purpose: entry.purpose,
        initiatorType: entry.initiator?.type,
        sessionId: entry.sessionInfo?.sessionId || entry.initiator?.sessionId,
        userId: entry.initiator?.userId,
        username: entry.initiator?.username,
      }
    );
  }

  /**
   * Update process status
   */
  updateProcess(id: string, updates: Partial<ProcessLogEntry>): void {
    const process = this.processes.get(id);
    if (!process) return;

    Object.assign(process, updates);
    this.emit("process:updated", process);
  }

  /**
   * Mark process as exited
   */
  markProcessExited(id: string, exitCode: number | null, signal: string | null): void {
    const process = this.processes.get(id);
    if (!process) return;

    process.endTime = new Date();
    process.exitCode = exitCode;
    process.signal = signal;
    process.status = "exited";
    this.emit("process:exited", process);
    console.log(
      `[ProcessLogger] Process exited: ${process.name} (${id}) Code: ${exitCode} Signal: ${signal}`
    );
  }

  /**
   * Mark process as errored
   */
  markProcessError(id: string, error: Error): void {
    const process = this.processes.get(id);
    if (!process) return;

    process.status = "error";
    process.metadata = { ...process.metadata, error: error.message };
    this.emit("process:error", { process, error });
    console.error(`[ProcessLogger] Process error: ${process.name} (${id})`, error.message);
  }

  /**
   * Log I/O data for a process
   */
  logIO(entry: ProcessIOEntry): void {
    const logs = this.ioLogs.get(entry.processId);
    if (!logs) return;

    // Add entry
    logs.push(entry);

    // Trim if too many entries
    if (logs.length > this.maxIOEntriesPerProcess) {
      logs.shift(); // Remove oldest
    }

    this.emit("process:io", entry);
  }

  /**
   * Log WebSocket message
   */
  logWebSocket(entry: WebSocketLogEntry): void {
    this.wsLogs.push(entry);

    // Trim if too many entries
    if (this.wsLogs.length > this.maxWSEntries) {
      this.wsLogs.shift();
    }

    this.emit("websocket:message", entry);
  }

  /**
   * Log conversation message
   */
  logConversationMessage(entry: ConversationMessageEntry): void {
    const logs = this.conversationLogs.get(entry.processId);
    if (!logs) return;

    logs.push(entry);

    // Trim if too many entries
    if (logs.length > this.maxConversationEntriesPerProcess) {
      logs.shift();
    }

    this.emit("conversation:message", entry);
  }

  /**
   * Log tool usage
   */
  logToolUsage(entry: ToolUsageEntry): void {
    const logs = this.toolLogs.get(entry.processId);
    if (!logs) return;

    logs.push(entry);

    // Trim if too many entries
    if (logs.length > this.maxToolEntriesPerProcess) {
      logs.shift();
    }

    this.emit("tool:usage", entry);
  }

  /**
   * Track session reopen
   */
  trackSessionReopen(processId: string): void {
    const process = this.processes.get(processId);
    if (!process || !process.sessionInfo) return;

    process.sessionInfo.reopenCount++;
    process.sessionInfo.lastOpened = new Date();
    this.emit("session:reopened", process);
    console.log(
      `[ProcessLogger] Session reopened: ${process.name} (${processId}) Count: ${process.sessionInfo.reopenCount}`
    );
  }

  /**
   * Get all processes
   */
  getAllProcesses(): ProcessLogEntry[] {
    return Array.from(this.processes.values());
  }

  /**
   * Get process by ID
   */
  getProcess(id: string): ProcessLogEntry | undefined {
    return this.processes.get(id);
  }

  /**
   * Get I/O logs for a process
   */
  getIOLogs(processId: string, limit?: number): ProcessIOEntry[] {
    const logs = this.ioLogs.get(processId) || [];
    if (limit) {
      return logs.slice(-limit);
    }
    return logs;
  }

  /**
   * Get all WebSocket logs
   */
  getWebSocketLogs(limit?: number): WebSocketLogEntry[] {
    if (limit) {
      return this.wsLogs.slice(-limit);
    }
    return this.wsLogs;
  }

  /**
   * Get conversation messages for a process
   */
  getConversationMessages(processId: string, limit?: number): ConversationMessageEntry[] {
    const logs = this.conversationLogs.get(processId) || [];
    if (limit) {
      return logs.slice(-limit);
    }
    return logs;
  }

  /**
   * Get tool usage for a process
   */
  getToolUsage(processId: string, limit?: number): ToolUsageEntry[] {
    const logs = this.toolLogs.get(processId) || [];
    if (limit) {
      return logs.slice(-limit);
    }
    return logs;
  }

  /**
   * Clear logs for a process
   */
  clearProcessLogs(processId: string): void {
    const logs = this.ioLogs.get(processId);
    if (logs) {
      logs.length = 0;
    }
    const conversationLogs = this.conversationLogs.get(processId);
    if (conversationLogs) {
      conversationLogs.length = 0;
    }
    const toolLogs = this.toolLogs.get(processId);
    if (toolLogs) {
      toolLogs.length = 0;
    }
  }

  /**
   * Clear all logs
   */
  clearAllLogs(): void {
    this.ioLogs.clear();
    this.wsLogs = [];
    this.conversationLogs.clear();
    this.toolLogs.clear();
    this.emit("logs:cleared");
  }

  /**
   * Remove a process (for cleanup of old processes)
   */
  removeProcess(id: string): void {
    this.processes.delete(id);
    this.ioLogs.delete(id);
    this.conversationLogs.delete(id);
    this.toolLogs.delete(id);
    this.emit("process:removed", id);
  }

  /**
   * Helper: Create process tracker for child process
   */
  trackChildProcess(
    id: string,
    type: ProcessType,
    name: string,
    command: string,
    args: string[],
    cwd: string,
    proc: ChildProcess,
    metadata?: Record<string, any>
  ): void {
    // Register process
    this.registerProcess({
      id,
      type,
      name,
      pid: proc.pid,
      command,
      args,
      cwd,
      startTime: new Date(),
      status: "starting",
      metadata,
    });

    // Update to running once PID is available
    if (proc.pid) {
      this.updateProcess(id, { status: "running", pid: proc.pid });
    }

    // Track stdout
    proc.stdout?.on("data", (data: Buffer) => {
      const content = data.toString("utf8");
      this.logIO({
        processId: id,
        timestamp: new Date(),
        direction: "stdout",
        content,
      });
    });

    // Track stderr
    proc.stderr?.on("data", (data: Buffer) => {
      const content = data.toString("utf8");
      this.logIO({
        processId: id,
        timestamp: new Date(),
        direction: "stderr",
        content,
      });
    });

    // Track exit
    proc.on("exit", (code, signal) => {
      this.markProcessExited(id, code, signal);
    });

    // Track errors
    proc.on("error", (error) => {
      this.markProcessError(id, error);
    });
  }

  /**
   * Helper: Log stdin write
   */
  logStdin(processId: string, content: string, metadata?: Record<string, any>): void {
    this.logIO({
      processId,
      timestamp: new Date(),
      direction: "stdin",
      content,
      metadata,
    });
  }
}

// Export singleton instance
export const processLogger = new ProcessLoggerService();

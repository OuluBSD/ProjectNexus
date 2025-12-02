/**
 * Hook for managing AI Chat backend connections
 * Connects to AI backends via backend API proxy
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AIBackendType } from "@nexus/shared/chat";
import { resolveBackendBase, toWebSocketBase } from "../lib/backendBase";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  displayRole?: string;
}

export type ChatStatus = "idle" | "connecting" | "responding" | "error";

interface UseAIChatBackendOptions {
  backend: AIBackendType;
  sessionId: string;
  token: string;
  disableTools?: boolean;
  disableFilesystem?: boolean;
  allowChallenge?: boolean;
  workspacePath?: string | null;
  onAssistantMessage?: (payload: { content: string; final: boolean }) => void;
  onStatusChange?: (payload: { status: ChatStatus; message?: string }) => void;
  onInfo?: (payload: { message?: string; raw?: any }) => void;
  onToolMessage?: (payload: {
    content: string;
    displayRole?: string;
    final: boolean;
    messageId?: number;
  }) => void;
}

function formatToolCall(tool: any): { label: string; content: string } {
  const rawLabel = (typeof tool?.tool_name === "string" && tool.tool_name.trim()) || "tool";
  const label =
    rawLabel.toLowerCase().includes("shell") || rawLabel.toLowerCase().includes("bash")
      ? "Shell"
      : rawLabel;
  const args = (tool && typeof tool === "object" && tool.args) || {};
  const primaryArg =
    typeof args.command === "string"
      ? args.command
      : typeof args.cmd === "string"
        ? args.cmd
        : typeof args.input === "string"
          ? args.input
          : null;
  const argPreview =
    primaryArg ||
    (args && typeof args === "object" && Object.keys(args).length
      ? JSON.stringify(args, null, 2)
      : "");
  const statusText = tool?.status ? ` [${tool.status}]` : "";
  const approvalText =
    tool?.confirmation_details?.requires_approval || tool?.requires_approval
      ? " (awaiting approval)"
      : "";
  const header = `${label}${statusText}${approvalText}`;
  const content = argPreview ? `${header}\n${argPreview}` : header;
  return { label, content };
}

function stripStatus(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim() || label;
}

function markToolContentAsDone(content: string): string {
  const lines = content.split("\n");
  if (lines.length === 0) return content;
  const header = lines[0];
  const rest = lines.slice(1).join("\n");
  let updatedHeader: string;
  if (/\[pending]/i.test(header) || /\[waiting/i.test(header)) {
    updatedHeader = header.replace(/\[(pending|waiting[^)]*)]/i, "[done]");
  } else if (!/\[done]/i.test(header)) {
    updatedHeader = `${header} [done]`;
  } else {
    updatedHeader = header;
  }
  return rest ? `${updatedHeader}\n${rest}` : updatedHeader;
}

export function useAIChatBackend(options: UseAIChatBackendOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const nextMessageId = useRef(1);
  const wsRef = useRef<WebSocket | null>(null);
  const connectionId = useRef(Math.random().toString(36));
  const streamingContentRef = useRef("");
  const optionsRef = useRef(options);
  const pendingMessagesRef = useRef<string[]>([]);
  const lastToolMessageId = useRef<number | null>(null);
  const toolPendingRef = useRef(false);
  const lastToolSnapshotRef = useRef<{ content: string; displayRole?: string } | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Log connection ID once on mount for debugging
  useEffect(() => {
    console.log(
      "[useAIChatBackend] Hook instance created with connectionId:",
      connectionId.current
    );
  }, []);

  // Connect to backend via WebSocket
  const connect = useCallback(() => {
    console.log(
      "[useAIChatBackend] connect() called, connectionId:",
      connectionId.current,
      "wsRef.current:",
      wsRef.current
    );
    setIsConnected(false);
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      console.log("[useAIChatBackend] Already connected or connecting, returning");
      return;
    }

    console.log("[useAIChatBackend] Starting connection...");
    setStatus("connecting");
    setStatusMessage(`Connecting to ${options.backend}...`);

    // WebSocket endpoint for AI chat
    const backendUrl = resolveBackendBase();
    const wsBase = toWebSocketBase(backendUrl);
    // Append connectionId to sessionId to ensure unique sessions even with React StrictMode double-mounting
    const uniqueSessionId = `${options.sessionId}-${connectionId.current}`;
    const challengeParam =
      options.allowChallenge === false ? "false" : options.allowChallenge === true ? "true" : "";
    const workspaceParam =
      options.workspacePath && options.workspacePath.trim()
        ? `&workspace=${encodeURIComponent(options.workspacePath.trim())}`
        : "";
    const wsUrl = `${wsBase}/api/ai-chat/${uniqueSessionId}?backend=${
      options.backend
    }&token=${options.token}${
      challengeParam ? `&challenge=${encodeURIComponent(challengeParam)}` : ""
    }${workspaceParam}`;

    if (options.disableTools) {
      // Add query param (will be implemented in backend)
    }

    console.log("[useAIChatBackend] Creating WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[useAIChatBackend] WebSocket opened");
        setStatus("idle");
        setStatusMessage("Connected");
        setIsConnected(true);
        wsRef.current = ws;
        // Flush any queued user messages
        if (pendingMessagesRef.current.length) {
          pendingMessagesRef.current.forEach((queued) => {
            try {
              ws.send(
                JSON.stringify({
                  type: "user_input",
                  content: queued,
                })
              );
            } catch (err) {
              console.error("Failed to send queued message:", err);
            }
          });
          pendingMessagesRef.current = [];
        }
      };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "conversation" && msg.role === "assistant") {
          console.log("[useAIChatBackend] WS message:", {
            type: msg.type,
            role: msg.role,
            contentLength: msg.content?.length || 0,
            isStreaming: msg.isStreaming,
          });
        }
        handleBackendMessageRef.current?.(msg);
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setStatus("error");
      setStatusMessage("Connection error");
      setIsConnected(false);
      optionsRef.current.onStatusChange?.({ status: "error", message: "Connection error" });
    };

      ws.onclose = () => {
        setStatus("idle");
        setStatusMessage("Disconnected");
        setIsConnected(false);
        setIsStreaming(false);
        setStreamingContent("");
        streamingContentRef.current = "";
        wsRef.current = null;
        toolPendingRef.current = false;
        lastToolMessageId.current = null;
      };
  }, [
    options.backend,
    options.sessionId,
    options.token,
    options.disableTools,
    options.allowChallenge,
    options.workspacePath,
  ]);

  // Disconnect from backend
  const disconnect = useCallback(() => {
    console.log("[useAIChatBackend] disconnect() called, current ws:", wsRef.current?.readyState);
    if (wsRef.current) {
      // Remove event listeners before closing to prevent race conditions
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.onopen = null;

      if (wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    // Clear messages and state when disconnecting
    setMessages([]);
    setStreamingContent("");
    streamingContentRef.current = "";
    setIsStreaming(false);
    setStatus("idle");
    setStatusMessage("");
    setIsConnected(false);
    toolPendingRef.current = false;
    lastToolMessageId.current = null;
    pendingMessagesRef.current = [];
  }, []);

  // Send message to backend
  const sendMessage = useCallback((content: string) => {
    const ready = wsRef.current && wsRef.current.readyState === WebSocket.OPEN;

    const userMessage: ChatMessage = {
      id: nextMessageId.current++,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setStatus("responding");
    setIsStreaming(true);
    setStreamingContent("");
    streamingContentRef.current = "";

    if (ready && wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "user_input",
          content,
        })
      );
    } else {
      // Queue until connection opens
      pendingMessagesRef.current.push(content);
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        connect();
      }
    }
  }, [connect]);

  // Send a message without adding it to the visible chat log (used for session hydration)
  const sendBackgroundMessage = useCallback(
    (content: string) => {
      const ready = wsRef.current && wsRef.current.readyState === WebSocket.OPEN;

      if (ready && wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "user_input",
            content,
          })
        );
      } else {
        pendingMessagesRef.current.push(content);
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          connect();
        }
      }
    },
    [connect]
  );

  // Interrupt ongoing response
  const interrupt = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Send interrupt to backend
    wsRef.current.send(
      JSON.stringify({
        type: "interrupt",
      })
    );

    // Finalize any streaming content before clearing
    if (isStreaming && streamingContent) {
      const assistantMessage: ChatMessage = {
        id: nextMessageId.current++,
        role: "assistant",
        content: streamingContent,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }

    setIsStreaming(false);
    setStreamingContent("");
    streamingContentRef.current = "";
    setStatus("idle");
    setStatusMessage("Interrupted");
  }, [isStreaming, streamingContent]);

  // Handle messages from backend
  // Use useRef to avoid recreating this callback when state changes
  const handleBackendMessageRef = useRef<(msg: any) => void>();

  handleBackendMessageRef.current = (msg: any) => {
    switch (msg.type) {
      case "init":
        setStatus("idle");
        setStatusMessage(""); // Clear connecting message
        break;

      case "conversation":
        if (msg.role === "assistant") {
          if (msg.isStreaming !== false) {
            // Streaming chunk - accumulate in frontend
            console.log(
              `[useAIChatBackend:${connectionId.current}] Streaming chunk, chunk length:`,
              msg.content?.length || 0
            );
            setStreamingContent((prev) => {
              const newContent = prev + (msg.content || "");
              console.log(
                `[useAIChatBackend:${connectionId.current}] Accumulated length:`,
                newContent.length
              );
              streamingContentRef.current = newContent;
              optionsRef.current.onAssistantMessage?.({ content: newContent, final: false });
              return newContent;
            });
            setIsStreaming(true);
            setStatusMessage(""); // Clear any tool execution messages
          } else {
            // Streaming ended - finalize the accumulated streaming content
            console.log(
              `[useAIChatBackend:${connectionId.current}] Streaming ended, finalizing accumulated content`
            );
            setStreamingContent((prev) => {
              console.log(
                `[useAIChatBackend:${connectionId.current}] Final accumulated length:`,
                prev.length
              );
              const finalContent = prev || msg.content || "";
              if (finalContent) {
                const assistantMessage: ChatMessage = {
                  id: nextMessageId.current++,
                  role: "assistant",
                  content: finalContent,
                  timestamp: Date.now(),
                };
                console.log(
                  `[useAIChatBackend:${connectionId.current}] Adding message to state, ID:`,
                  assistantMessage.id
                );
                setMessages((msgs) => {
                  // Deduplication: Don't add if the last message has the exact same content
                  const lastMsg = msgs[msgs.length - 1];
                  if (
                    lastMsg &&
                    lastMsg.role === "assistant" &&
                    lastMsg.content === assistantMessage.content
                  ) {
                    console.log(
                      `[useAIChatBackend:${connectionId.current}] Skipping duplicate message`
                    );
                    return msgs;
                  }
                  return [...msgs, assistantMessage];
                });
              }
              streamingContentRef.current = "";
              optionsRef.current.onAssistantMessage?.({ content: finalContent, final: true });
              return ""; // Clear streaming content
            });
            setIsStreaming(false);
            setStatus("idle");
            setStatusMessage("");
          }
        }
        break;

      case "status":
        if (msg.state) {
          // Map Qwen states to our ChatStatus
          const stateMap: Record<string, ChatStatus> = {
            idle: "idle",
            responding: "responding",
            waiting_for_confirmation: "responding",
          };
          const nextStatus = stateMap[msg.state] || "idle";
          setStatus(nextStatus);
          optionsRef.current.onStatusChange?.({ status: nextStatus, message: msg.message });
          if (nextStatus === "idle" && toolPendingRef.current) {
            // Tool run likely finished
            setMessages((prev) =>
              prev.map((m) =>
                m.id === lastToolMessageId.current
                  ? {
                      ...m,
                      content: markToolContentAsDone(m.content),
                      displayRole: m.displayRole
                        ? `${stripStatus(m.displayRole)} (done)`
                        : "Tool (done)",
                    }
                  : m
              )
            );
            if (lastToolMessageId.current !== null) {
              const updated = lastToolSnapshotRef.current;
              const doneContent = updated ? markToolContentAsDone(updated.content) : "";
              const doneLabel = updated?.displayRole
                ? `${stripStatus(updated.displayRole)} (done)`
                : "Tool (done)";
              lastToolSnapshotRef.current = { content: doneContent, displayRole: doneLabel };
              optionsRef.current.onToolMessage?.({
                content: doneContent,
                displayRole: doneLabel,
                final: true,
                messageId: lastToolMessageId.current,
              });
            }
            toolPendingRef.current = false;
            lastToolMessageId.current = null;
            lastToolSnapshotRef.current = null;
          }
        }
        if (msg.message) {
          setStatusMessage(msg.message);
        }
        break;

      case "error":
        setStatus("error");
        setStatusMessage(msg.message || "An error occurred");
        setIsStreaming(false);
        break;

      case "tool_group":
        // Tool execution notification
        setStatusMessage(`Executing ${msg.tools?.length || 0} tool(s)...`);
        if (Array.isArray((msg as any).tools) && (msg as any).tools.length > 0) {
          const toolDetails = (msg as any).tools.map((tool: any) => formatToolCall(tool));
          const content = toolDetails.map((tool) => tool.content).join("\n\n");
          const displayRole =
            toolDetails.length === 1 ? toolDetails[0].label : `${toolDetails.length} tools`;
          const toolMessage: ChatMessage = {
            id: nextMessageId.current++,
            role: "tool",
            content,
            timestamp: Date.now(),
            displayRole,
          };
          setMessages((prev) => [...prev, toolMessage]);
          lastToolMessageId.current = toolMessage.id;
          toolPendingRef.current = true;
          lastToolSnapshotRef.current = { content, displayRole };
          optionsRef.current.onToolMessage?.({
            content,
            displayRole,
            final: false,
            messageId: toolMessage.id,
          });
        }
        break;

      case "completion_stats":
        // Response completed - just clear status (message already finalized by conversation handler)
        setIsStreaming(false);
        setStatus("idle");
        setStatusMessage("Ready");
        if (toolPendingRef.current) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === lastToolMessageId.current
                ? {
                    ...m,
                    content: markToolContentAsDone(m.content),
                    displayRole: m.displayRole
                      ? `${stripStatus(m.displayRole)} (done)`
                      : "Tool (done)",
                  }
                : m
            )
          );
          if (lastToolMessageId.current !== null) {
            const targetId = lastToolMessageId.current;
            const updated = lastToolSnapshotRef.current;
            const doneContent = updated ? markToolContentAsDone(updated.content) : "";
            const doneLabel = updated?.displayRole
              ? `${stripStatus(updated.displayRole)} (done)`
              : "Tool (done)";
            lastToolSnapshotRef.current = { content: doneContent, displayRole: doneLabel };
            optionsRef.current.onToolMessage?.({
              content: doneContent,
              displayRole: doneLabel,
              final: true,
              messageId: targetId,
            });
          }
          toolPendingRef.current = false;
          lastToolMessageId.current = null;
          lastToolSnapshotRef.current = null;
        }
        break;

      case "info":
        // Info messages (e.g., tool execution results)
        setStatusMessage(msg.message || "");
        optionsRef.current.onInfo?.({ message: msg.message, raw: msg });
        break;
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    // Connect is handled manually for now to avoid auto-connecting
    // connect();
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    messages,
    status,
    statusMessage,
    isStreaming,
    streamingContent,
    connect,
    disconnect,
    sendMessage,
    sendBackgroundMessage,
    interrupt,
    isConnected,
  };
}

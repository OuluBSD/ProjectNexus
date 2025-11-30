/**
 * Hook for managing AI Chat backend connections
 * Connects to AI backends via backend API proxy
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AIBackendType } from "@nexus/shared/chat";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export type ChatStatus = "idle" | "connecting" | "responding" | "error";

interface UseAIChatBackendOptions {
  backend: AIBackendType;
  sessionId: string;
  token: string;
  disableTools?: boolean;
  disableFilesystem?: boolean;
  allowChallenge?: boolean;
}

export function useAIChatBackend(options: UseAIChatBackendOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const nextMessageId = useRef(1);
  const wsRef = useRef<WebSocket | null>(null);
  const connectionId = useRef(Math.random().toString(36));

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
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      console.log("[useAIChatBackend] Already connected or connecting, returning");
      return;
    }

    console.log("[useAIChatBackend] Starting connection...");
    setStatus("connecting");
    setStatusMessage(`Connecting to ${options.backend}...`);

    // WebSocket endpoint for AI chat
    // Use NEXT_PUBLIC_BACKEND_HTTP_BASE to determine backend host
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || "http://localhost:3001";
    const backendHost = backendUrl.replace(/^https?:\/\//, "");
    const protocol = backendUrl.startsWith("https") ? "wss:" : "ws:";
    // Append connectionId to sessionId to ensure unique sessions even with React StrictMode double-mounting
    const uniqueSessionId = `${options.sessionId}-${connectionId.current}`;
    const challengeParam =
      options.allowChallenge === false ? "false" : options.allowChallenge === true ? "true" : "";
    const wsUrl = `${protocol}//${backendHost}/api/ai-chat/${uniqueSessionId}?backend=${
      options.backend
    }&token=${options.token}${
      challengeParam ? `&challenge=${encodeURIComponent(challengeParam)}` : ""
    }`;

    if (options.disableTools) {
      // Add query param (will be implemented in backend)
    }

    console.log("[useAIChatBackend] Creating WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[useAIChatBackend] WebSocket opened");
      setStatus("idle");
      setStatusMessage("Connected");
      wsRef.current = ws;
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
    };

    ws.onclose = () => {
      setStatus("idle");
      setStatusMessage("Disconnected");
      wsRef.current = null;
    };
  }, [
    options.backend,
    options.sessionId,
    options.token,
    options.disableTools,
    options.allowChallenge,
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
    setIsStreaming(false);
    setStatus("idle");
    setStatusMessage("");
  }, []);

  // Send message to backend
  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }

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

    wsRef.current.send(
      JSON.stringify({
        type: "user_input",
        content,
      })
    );
  }, []);

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
              if (prev) {
                const assistantMessage: ChatMessage = {
                  id: nextMessageId.current++,
                  role: "assistant",
                  content: prev,
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
          setStatus(stateMap[msg.state] || "idle");
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
        break;

      case "completion_stats":
        // Response completed - just clear status (message already finalized by conversation handler)
        setIsStreaming(false);
        setStatus("idle");
        setStatusMessage("Ready");
        break;

      case "info":
        // Info messages (e.g., tool execution results)
        setStatusMessage(msg.message || "");
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
    interrupt,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}

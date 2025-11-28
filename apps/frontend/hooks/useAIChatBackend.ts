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
}

export function useAIChatBackend(options: UseAIChatBackendOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingContentRef = useRef("");
  const nextMessageId = useRef(1);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to backend via WebSocket
  const connect = useCallback(() => {
    if (wsRef.current) return;

    setStatus("connecting");
    setStatusMessage(`Connecting to ${options.backend}...`);

    // WebSocket endpoint for AI chat
    // Use NEXT_PUBLIC_BACKEND_HTTP_BASE to determine backend host
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || "http://localhost:3001";
    const backendHost = backendUrl.replace(/^https?:\/\//, "");
    const protocol = backendUrl.startsWith("https") ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${backendHost}/api/ai-chat/${options.sessionId}?backend=${options.backend}&token=${options.token}`;

    if (options.disableTools) {
      // Add query param (will be implemented in backend)
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setStatus("idle");
      setStatusMessage("Connected");
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleBackendMessage(msg);
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
  }, [options.backend, options.sessionId, options.token, options.disableTools]);

  // Disconnect from backend
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
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
    streamingContentRef.current = "";

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

    wsRef.current.send(
      JSON.stringify({
        type: "interrupt",
      })
    );

    setIsStreaming(false);
    setStatus("idle");
    setStatusMessage("Interrupted");
  }, []);

  // Handle messages from backend
  const handleBackendMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case "init":
        setStatus("idle");
        setStatusMessage(`Connected to ${msg.model || "AI"}`);
        break;

      case "conversation":
        if (msg.role === "assistant") {
          if (msg.isStreaming !== false) {
            // Streaming chunk
            streamingContentRef.current = msg.content || "";
          } else {
            // Streaming ended
            const assistantMessage: ChatMessage = {
              id: nextMessageId.current++,
              role: "assistant",
              content: streamingContentRef.current,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsStreaming(false);
            setStatus("idle");
            streamingContentRef.current = "";
          }
        }
        break;

      case "status":
        if (msg.state) {
          setStatus(msg.state as ChatStatus);
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
    }
  }, []);

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
    streamingContent: streamingContentRef.current,
    connect,
    disconnect,
    sendMessage,
    interrupt,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}

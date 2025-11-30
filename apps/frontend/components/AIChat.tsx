/**
 * AI Chat Component
 * Generic chat interface supporting multiple AI backends (qwen/claude/gemini/codex)
 */

"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { AIBackendType } from "@nexus/shared/chat";
import { useAIChatBackend } from "../hooks/useAIChatBackend";

interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  name: string;
  backend: AIBackendType;
}

interface AIChatProps {
  sessionToken?: string;
  onBackendConnect?: (backend: AIBackendType) => void;
  onBackendDisconnect?: () => void;
}

export function AIChat({ sessionToken, onBackendConnect, onBackendDisconnect }: AIChatProps) {
  const parseBool = (value: string | undefined, fallback: boolean) => {
    if (!value) return fallback;
    const lowered = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(lowered)) return true;
    if (["false", "0", "no", "off"].includes(lowered)) return false;
    return fallback;
  };

  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: "default",
      name: "New Chat",
      backend: "qwen",
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState("default");
  const [selectedBackend, setSelectedBackend] = useState<AIBackendType>("qwen");
  const [inputValue, setInputValue] = useState("");
  const [allowChallenge, setAllowChallenge] = useState(() =>
    parseBool(process.env.NEXT_PUBLIC_ASSISTANT_CHALLENGE_ENABLED, true)
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Use the AI chat backend hook
  const {
    messages,
    status,
    statusMessage,
    isStreaming,
    streamingContent,
    connect,
    disconnect,
    sendMessage,
    interrupt,
    isConnected,
  } = useAIChatBackend({
    backend: activeSession?.backend || "qwen",
    sessionId: activeSessionId,
    token: sessionToken || "",
    allowChallenge,
  });

  // Auto-connect when session token is available and disconnect on session change
  useEffect(() => {
    if (sessionToken) {
      // Disconnect any existing connection when session changes
      disconnect();
      // Then connect to the new session
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [sessionToken, activeSessionId, connect, disconnect]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || !sessionToken) return;

    sendMessage(inputValue.trim());
    setInputValue("");
  }, [inputValue, sendMessage, sessionToken]);

  const handleStop = useCallback(() => {
    interrupt();
  }, [interrupt]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      name: `Chat ${sessions.length + 1}`,
      messages: [],
      backend: selectedBackend,
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  }, [sessions.length, selectedBackend]);

  const handleCloseSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        if (filtered.length === 0) {
          // Always keep at least one session
          return [
            {
              id: Date.now().toString(),
              name: "New Chat",
              messages: [],
              backend: selectedBackend,
            },
          ];
        }
        return filtered;
      });

      // Switch to another session if we closed the active one
      if (sessionId === activeSessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        }
      }
    },
    [activeSessionId, sessions, selectedBackend]
  );

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="ai-chat-container">
      {/* Header with sessions and controls */}
      <div className="ai-chat-header">
        <div className="ai-chat-sessions">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`ai-chat-session-tab ${session.id === activeSessionId ? "active" : ""}`}
              onClick={() => setActiveSessionId(session.id)}
            >
              <span>{session.name}</span>
              {sessions.length > 1 && (
                <button
                  className="ai-chat-session-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseSession(session.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button className="ghost" onClick={handleNewSession}>
            + New
          </button>
        </div>

        <div className="ai-chat-controls">
          <select
            className="ai-chat-backend-select"
            value={selectedBackend}
            onChange={(e) => setSelectedBackend(e.target.value as AIBackendType)}
          >
            <option value="qwen">Qwen</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
            <option value="codex">Codex</option>
          </select>
          <label className="ai-chat-toggle">
            <input
              type="checkbox"
              checked={allowChallenge}
              onChange={(e) => setAllowChallenge(e.target.checked)}
            />
            Allow challenge
          </label>
        </div>
      </div>

      {/* Chat messages */}
      <div className="ai-chat-main">
        <div className="ai-chat-messages">
          {!sessionToken ? (
            <div className="ai-chat-empty">
              <div className="ai-chat-empty-icon">⚠️</div>
              <div className="ai-chat-empty-text">Not authenticated</div>
              <div className="ai-chat-empty-hint">Please log in to use AI chat</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="ai-chat-empty">
              <div className="ai-chat-empty-icon">💬</div>
              <div className="ai-chat-empty-text">Start a conversation</div>
              <div className="ai-chat-empty-hint">
                Type a message below to chat with {selectedBackend}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`ai-chat-message ${msg.role}`}>
                <div className="ai-chat-message-header">
                  <span className={`ai-chat-message-role ${msg.role}`}>{msg.role}</span>
                  <span className="ai-chat-message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="ai-chat-message-content">{msg.content}</div>
              </div>
            ))
          )}
          {isStreaming && streamingContent && (
            <div className="ai-chat-message assistant">
              <div className="ai-chat-message-header">
                <span className="ai-chat-message-role assistant">assistant</span>
                <span className="ai-chat-message-time">now</span>
              </div>
              <div className="ai-chat-message-content ai-chat-message-streaming">
                {streamingContent}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="ai-chat-input-area">
          <div className="ai-chat-status-bar">
            <div className={`ai-chat-status-dot ${status}`} />
            <span>
              {status === "idle" && "Ready"}
              {status === "connecting" && "Connecting..."}
              {status === "responding" && "Responding..."}
              {status === "error" && "Error"}
              {statusMessage && ` - ${statusMessage}`}
            </span>
          </div>

          <div className="ai-chat-input-container">
            <textarea
              ref={textareaRef}
              className="ai-chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Shift+Enter for new line)"
              rows={1}
              disabled={isStreaming || !sessionToken}
            />
            {isStreaming ? (
              <button className="ai-chat-button stop" onClick={handleStop}>
                ⏹ Stop
              </button>
            ) : (
              <button
                className="ai-chat-button"
                onClick={handleSend}
                disabled={!inputValue.trim() || !sessionToken}
              >
                Send
              </button>
            )}
          </div>

          <div className="ai-chat-hint">Press Enter to send, Shift+Enter for new line</div>
        </div>
      </div>
    </div>
  );
}

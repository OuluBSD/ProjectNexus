import { useEffect, useRef, useState } from "react";

export interface MetaChatStatus {
  roadmapId: string;
  status: string;
  progress: number;
  summary: string;
}

export interface MetaChatMessage {
  metaChatId: string;
  message: {
    id: string;
    role: string;
    content: string;
  };
}

interface UseMetaChatWebSocketOptions {
  roadmapId: string | null;
  sessionToken: string | null;
  enabled?: boolean;
  onStatusUpdate?: (status: MetaChatStatus) => void;
  onMessage?: (message: MetaChatMessage) => void;
  onError?: (error: Event) => void;
}

/**
 * Hook for subscribing to real-time meta-chat updates via WebSocket
 *
 * Features:
 * - Auto-connection when enabled with valid roadmapId and token
 * - Auto-reconnection with exponential backoff (max 30s)
 * - Event-based callbacks for status updates and messages
 * - Proper cleanup on unmount or when dependencies change
 * - Ping/pong keep-alive mechanism
 */
export function useMetaChatWebSocket({
  roadmapId,
  sessionToken,
  enabled = true,
  onStatusUpdate,
  onMessage,
  onError,
}: UseMetaChatWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectDelay = 30000; // 30 seconds max backoff
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't connect if disabled or missing required params
    if (!enabled || !roadmapId || !sessionToken) {
      return;
    }

    function connect() {
      // Clean up any existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Determine WebSocket protocol (ws:// or wss://)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;

      // Build WebSocket URL with token as query param for auth
      const wsUrl = `${protocol}//${host}/api/roadmaps/${roadmapId}/meta-chat/stream?token=${encodeURIComponent(
        sessionToken ?? ""
      )}`;

      console.log(`[MetaChatWS] Connecting to ${roadmapId}...`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[MetaChatWS] Connected to ${roadmapId}`);
        setIsConnected(true);
        reconnectAttempts.current = 0; // Reset backoff on successful connection

        // Start ping interval (every 30s)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types
          switch (data.type) {
            case "meta-chat:status":
              if (onStatusUpdate) {
                onStatusUpdate(data.data as MetaChatStatus);
              }
              break;

            case "meta-chat:updated":
              if (onStatusUpdate) {
                onStatusUpdate(data.data as MetaChatStatus);
              }
              break;

            case "meta-chat:message":
              if (onMessage) {
                onMessage(data.data as MetaChatMessage);
              }
              break;

            case "pong":
              // Keep-alive acknowledgment, no action needed
              break;

            default:
              console.warn(`[MetaChatWS] Unknown message type: ${data.type}`);
          }
        } catch (err) {
          console.error("[MetaChatWS] Failed to parse message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error(`[MetaChatWS] Error on ${roadmapId}:`, event);
        setIsConnected(false);
        if (onError) {
          onError(event);
        }
      };

      ws.onclose = (event) => {
        console.log(
          `[MetaChatWS] Disconnected from ${roadmapId} (code: ${event.code}, reason: ${event.reason})`
        );
        setIsConnected(false);
        wsRef.current = null;

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Don't reconnect if closed with specific codes
        // 1000 = normal closure, 1008 = policy violation (unauthorized)
        if (event.code === 1000 || event.code === 1008) {
          console.log("[MetaChatWS] Not reconnecting due to close code");
          return;
        }

        // Schedule reconnection with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), maxReconnectDelay);
        reconnectAttempts.current++;

        console.log(
          `[MetaChatWS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})...`
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          if (enabled && roadmapId && sessionToken) {
            connect();
          }
        }, delay);
      };
    }

    // Initial connection
    connect();

    // Cleanup on unmount or dependency change
    return () => {
      console.log(`[MetaChatWS] Cleaning up connection for ${roadmapId}`);

      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      setIsConnected(false);
    };
  }, [roadmapId, sessionToken, enabled, onStatusUpdate, onMessage, onError]);

  return { isConnected };
}

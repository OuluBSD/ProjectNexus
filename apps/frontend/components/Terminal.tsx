"use client";

import { useEffect, useRef, useState } from "react";

// Dynamic imports to avoid SSR issues
let XTermClass: typeof import("@xterm/xterm").Terminal | null = null;
let FitAddonClass: typeof import("@xterm/addon-fit").FitAddon | null = null;

type TerminalProps = {
  sessionToken: string;
  projectId: string;
  onSessionCreated?: (sessionId: string) => void;
  onSessionClosed?: () => void;
};

export function Terminal({
  sessionToken,
  projectId,
  onSessionCreated,
  onSessionClosed,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<InstanceType<typeof import("@xterm/xterm").Terminal> | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import("@xterm/addon-fit").FitAddon> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAttached, setIsAttached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create terminal session
  const createSession = async () => {
    try {
      const res = await fetch(`/api/terminal/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: { message: "Unknown error" } }));
        throw new Error(errData.error?.message || "Failed to create terminal session");
      }

      const data = await res.json();
      setSessionId(data.sessionId);
      onSessionCreated?.(data.sessionId);
      return data.sessionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      return null;
    }
  };

  // Attach to terminal session via WebSocket
  const attachSession = (sid: string) => {
    if (!xtermRef.current || wsRef.current) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/terminal/sessions/${sid}/stream?token=${encodeURIComponent(sessionToken)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsAttached(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      if (xtermRef.current && typeof event.data === "string") {
        xtermRef.current.write(event.data);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection error");
      setIsAttached(false);
    };

    ws.onclose = () => {
      setIsAttached(false);
      wsRef.current = null;
      if (xtermRef.current) {
        xtermRef.current.write("\r\n[terminal session closed]\r\n");
      }
    };

    // Handle user input
    if (xtermRef.current) {
      xtermRef.current.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
    }
  };

  // Detach from terminal session
  const detachSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsAttached(false);
  };

  // Initialize xterm instance
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    let mounted = true;
    let resizeObserver: ResizeObserver | null = null;

    // Dynamically import xterm only on client side
    Promise.all([
      import("@xterm/xterm").then((mod) => {
        XTermClass = mod.Terminal;
      }),
      import("@xterm/addon-fit").then((mod) => {
        FitAddonClass = mod.FitAddon;
      }),
    ])
      .then(() => {
        if (!mounted || !terminalRef.current || !XTermClass || !FitAddonClass) return;

        const xterm = new XTermClass({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: '"Cascadia Code", Menlo, Monaco, "Courier New", monospace',
          theme: {
            background: "#0D1117",
            foreground: "#E5E7EB",
            cursor: "#0EA5E9",
            cursorAccent: "#111827",
            selectionBackground: "#1F2937",
            black: "#1F2937",
            red: "#F87171",
            green: "#6EE7B7",
            yellow: "#FCD34D",
            blue: "#60A5FA",
            magenta: "#C084FC",
            cyan: "#22D3EE",
            white: "#E5E7EB",
            brightBlack: "#374151",
            brightRed: "#FCA5A5",
            brightGreen: "#A7F3D0",
            brightYellow: "#FDE68A",
            brightBlue: "#93C5FD",
            brightMagenta: "#DDD6FE",
            brightCyan: "#A5F3FC",
            brightWhite: "#F9FAFB",
          },
          scrollback: 1000,
          allowProposedApi: true,
        });

        const fitAddon = new FitAddonClass();
        xterm.loadAddon(fitAddon);

        xterm.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = xterm;
        fitAddonRef.current = fitAddon;

        // Handle resize
        resizeObserver = new ResizeObserver(() => {
          if (fitAddonRef.current) {
            fitAddonRef.current.fit();
          }
        });
        resizeObserver.observe(terminalRef.current);
      })
      .catch((err) => {
        if (mounted) {
          setError(
            `Failed to load terminal: ${err instanceof Error ? err.message : "unknown error"}`
          );
        }
      });

    return () => {
      mounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
        fitAddonRef.current = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      onSessionClosed?.();
    };
  }, [onSessionClosed]);

  const handlePlay = async () => {
    if (!sessionId) {
      const sid = await createSession();
      if (sid) {
        attachSession(sid);
      }
    } else if (!isAttached) {
      attachSession(sessionId);
    }
  };

  const handleStop = () => {
    detachSession();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", height: "100%" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <button
          type="button"
          className="ghost"
          onClick={handlePlay}
          disabled={isAttached}
          style={{
            fontSize: "0.875rem",
            opacity: isAttached ? 0.5 : 1,
            cursor: isAttached ? "not-allowed" : "pointer",
          }}
        >
          ▶ {sessionId ? "Attach" : "Start"}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={handleStop}
          disabled={!isAttached}
          style={{
            fontSize: "0.875rem",
            opacity: !isAttached ? 0.5 : 1,
            cursor: !isAttached ? "not-allowed" : "pointer",
          }}
        >
          ◼ Detach
        </button>
        {sessionId && (
          <span className="item-subtle" style={{ fontSize: "0.75rem" }}>
            Session: {sessionId.slice(0, 8)}
          </span>
        )}
        {isAttached && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "#6EE7B7",
              fontWeight: 600,
            }}
          >
            ● Connected
          </span>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "0.5rem",
            background: "rgba(248, 113, 113, 0.12)",
            border: "1px solid rgba(248, 113, 113, 0.3)",
            borderRadius: "8px",
            color: "#FCA5A5",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      <div
        ref={terminalRef}
        style={{
          flex: 1,
          minHeight: "400px",
          background: "#0D1117",
          borderRadius: "8px",
          border: "1px solid #30363D",
          padding: "0.5rem",
          overflow: "hidden",
        }}
      />
    </div>
  );
}

export interface ObservabilityEvent {
  seq: number; // incrementing sequence number
  timestamp: string; // ISO8601
  source: "ai" | "process" | "websocket" | "poll" | "network";
  event: string; // "token", "log", "frame", "poll", "status", "error", "end", ...
  data?: any; // event payload
  message?: string; // optional human-readable message
}
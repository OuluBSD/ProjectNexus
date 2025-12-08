export interface ObservabilityEvent {
  seq: number; // incrementing sequence number
  timestamp: string; // ISO8601
  source: "ai" | "process" | "websocket" | "poll" | "network";
  event: string; // "token", "log", "frame", "poll", "status", "error", "end", ...
  data?: any; // event payload
  message?: string; // optional human-readable message
  correlationId?: string; // optional identifier to correlate related events
  sourceId?: string; // optional identifier for the specific resource being monitored (process ID, network element, etc.)
  metadata?: {
    streamKind?: string; // identifier for the type of stream ('process-logs', 'network-health', etc.)
    [key: string]: any;  // allow additional metadata properties
  };
}
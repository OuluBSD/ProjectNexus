// src/session/session-types.ts
// Session-related types

export interface SessionConfig {
  type: string;
  context?: any;
  transport?: string;
  capabilities?: any;
}

export interface Session {
  sessionId: string;
  type: string;
  createdAt: string;
  expiresAt?: string;
  context: any;
  transport: string;
  status: string;
  capabilities: any;
  metadata: any;
}

export interface StreamingEvent {
  event: string;
  timestamp: string;
  sessionId: string;
  payload: any;
}
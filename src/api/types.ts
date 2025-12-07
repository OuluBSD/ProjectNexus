// src/api/types.ts
// API-related types

export interface APIRequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: any;
}

export interface APIResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
}

// Project types
export interface ProjectSummary {
  id: string;
  name: string;
  category: string;
  status: string;
  description: string;
  info: string;
  theme: any;
  contentPath: string;
  gitUrl: string;
}

export interface ProjectDetails {
  id: string;
  name: string;
  category: string;
  status: string;
  description: string;
  info: string;
  theme: any;
  contentPath: string;
  gitUrl: string;
  roadmapLists?: {
    id: string;
    title: string;
    status: string;
    progress: number;
    tags: string[];
  }[];
}

// Response type definitions
export interface ListProjectsResponse {
  status: string;
  data: {
    projects: ProjectSummary[];
  };
  message: string;
  errors: any[];
}

export interface GetProjectResponse {
  status: string;
  data: {
    project: ProjectDetails;
  };
  message: string;
  errors: any[];
}

// Roadmap types
export interface RoadmapSummary {
  id: string;
  selected?: boolean;  // Indicates if this roadmap is currently selected
  title: string;
  status: string;
  progress: number;
  tags: string[];
  summary: string;
  metaStatus: string;
  metaProgress: number;
  metaSummary: string;
  projectRef?: string;  // Reference to the project it belongs to
  projectMetadata?: {
    id: string;
    name: string;
    category: string;
    status: string;
  };
}

export interface RoadmapDetails {
  id: string;
  title: string;
  status: string;
  progress: number;
  tags: string[];
  summary: string;
  metaStatus: string;
  metaProgress: number;
  metaSummary: string;
  projectRef?: string;  // Reference to the project it belongs to
}

export interface ListRoadmapsResponse {
  status: string;
  data: {
    roadmaps: RoadmapSummary[];
  };
  message: string;
  errors: any[];
}

export interface GetRoadmapResponse {
  status: string;
  data: {
    roadmap: RoadmapDetails;
  };
  message: string;
  errors: any[];
}

// Chat types
export interface ChatSummary {
  id: string;
  title: string;
  status: string;
  progress: number;
  note: string;
  meta: boolean;
}

export interface ChatDetails {
  id: string;
  title: string;
  status: string;
  progress: number;
  note: string;
  meta: boolean;
  messages?: {
    id: number;
    role: string;
    content: string;
    timestamp: number;
    metadata: any;
    displayRole: string;
  }[];
  roadmapRef?: string;  // Reference to the roadmap it belongs to
}

export interface ListChatsResponse {
  status: string;
  data: {
    chats: ChatSummary[];
  };
  message: string;
  errors: any[];
}

export interface GetChatResponse {
  status: string;
  data: {
    chat: ChatDetails;
  };
  message: string;
  errors: any[];
}

// AI Chat types
export interface AiTokenEvent {
  event: 'token' | 'done' | 'error';
  content?: string;
  messageId?: string;
  error?: string;
}

// Login response type
export interface LoginResponse {
  status: string;
  data: {
    token: string;
    user: {
      id: string;
      username: string;
    };
  };
  message: string;
  errors: any[];
}

// Network element types
export interface NetworkElementSummary {
  id: string;
  type: string;
  name: string;
  status: string;
  metadata?: any;
}

export interface NetworkElementDetails {
  id: string;
  type: string;
  name: string;
  status: string;
  metadata?: any;
  connections?: ConnectionInfo[];
}

export interface ConnectionInfo {
  id: string;
  targetId: string;
  type: string;
  status: string;
  metadata?: any;
}

export interface NetworkStatusSnapshot {
  overallStatus: string;
  elementsByStatus: Record<string, number>;
  timestamp: string;
  totalElements: number;
  onlineElements: number;
  offlineElements: number;
}

// Response types for network operations
export interface ListNetworkElementsResponse {
  status: string;
  data: {
    elements: NetworkElementSummary[];
  };
  message: string;
  errors: any[];
}

export interface GetNetworkElementResponse {
  status: string;
  data: {
    element: NetworkElementDetails | null;
  };
  message: string;
  errors: any[];
}

export interface GetNetworkStatusResponse {
  status: string;
  data: {
    status: NetworkStatusSnapshot;
  };
  message: string;
  errors: any[];
}

// Debug Process types
export interface ProcessSummary {
  id: string;
  type: string;
  name: string;
  pid: number;
  command: string;
  args: string[];
  cwd: string;
  startTime: string;
  endTime?: string;
  exitCode?: number;
  signal?: string;
  status: string;
}

export interface ProcessDetails {
  id: string;
  type: string;
  name: string;
  pid: number;
  command: string;
  args: string[];
  cwd: string;
  startTime: string;
  endTime?: string;
  exitCode?: number;
  signal?: string;
  status: string;
  resources?: {
    cpu: number;
    memory: number;
    fds: number;
  };
  environment?: Record<string, string>;
}

export interface ListProcessesResponse {
  status: string;
  data: {
    processes: ProcessSummary[];
  };
  message: string;
  errors: any[];
}

export interface GetProcessResponse {
  status: string;
  data: {
    process: ProcessDetails | null;
  };
  message: string;
  errors: any[];
}

// Debug WebSocket types
export interface WebSocketSummary {
  id: string;
  type: string;
  name: string;
  status: string;
  connectedAt: string;
  remoteAddress?: string;
  protocol?: string;
  connectionCount: number;
}

export interface WebSocketDetails {
  id: string;
  type: string;
  name: string;
  status: string;
  connectedAt: string;
  disconnectedAt?: string;
  remoteAddress?: string;
  protocol?: string;
  connectionCount: number;
  metadata?: any;
}

export interface ListWebSocketsResponse {
  status: string;
  data: {
    websockets: WebSocketSummary[];
  };
  message: string;
  errors: any[];
}

export interface GetWebSocketResponse {
  status: string;
  data: {
    websocket: WebSocketDetails | null;
  };
  message: string;
  errors: any[];
}

// Debug Polling Session types
export interface PollSessionSummary {
  id: string;
  type: string;
  name: string;
  status: string;
  startedAt: string;
  lastPollAt?: string;
  intervalMs: number;
  endpoint: string;
}

export interface PollSessionDetails {
  id: string;
  type: string;
  name: string;
  status: string;
  startedAt: string;
  lastPollAt?: string;
  intervalMs: number;
  endpoint: string;
  pollCount: number;
  metadata?: any;
}

export interface ListPollSessionsResponse {
  status: string;
  data: {
    pollSessions: PollSessionSummary[];
  };
  message: string;
  errors: any[];
}

export interface GetPollSessionResponse {
  status: string;
  data: {
    pollSession: PollSessionDetails | null;
  };
  message: string;
  errors: any[];
}
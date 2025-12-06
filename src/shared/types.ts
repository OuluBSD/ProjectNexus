// src/shared/types.ts
// Shared types across the application

export interface Project {
  id: string;
  name: string;
  category: string;
  status: string;
  description?: string;
  theme?: Record<string, unknown>;
  contentPath?: string;
  gitUrl?: string;
}

export interface Roadmap {
  id: string;
  title: string;
  status: string;
  progress: number;
  tags?: string[];
  summary?: string;
  metaStatus?: string;
  metaProgress?: number;
  metaSummary?: string;
}

export interface Chat {
  id: string;
  title: string;
  status: string;
  progress: number;
  note?: string;
  meta?: boolean;
}

export interface Message {
  id: number;
  role: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  displayRole?: string;
}
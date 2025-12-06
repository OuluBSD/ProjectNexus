// src/state/context-types.ts
// Context-related types

export interface ContextState {
  activeProjectId?: string;
  activeProjectName?: string;
  activeRoadmapId?: string;
  activeRoadmapTitle?: string;
  activeChatId?: string;
  activeChatTitle?: string;
  lastUpdate: string;
}

export interface ContextUpdates {
  activeProjectId?: string;
  activeProjectName?: string;
  activeRoadmapId?: string;
  activeRoadmapTitle?: string;
  activeChatId?: string;
  activeChatTitle?: string;
}
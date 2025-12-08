// src/state/context-storage.ts
// Context storage implementation

import { ContextState } from './context-types';
import * as fs from 'fs';
import * as path from 'path';

export class ContextStorage {
  private memoryContext: ContextState = {
    activeProjectId: undefined,
    activeProjectName: undefined,
    activeRoadmapId: undefined,
    activeRoadmapTitle: undefined,
    activeChatId: undefined,
    activeChatTitle: undefined,
    selectedAiSessionId: undefined,
    selectedNetworkElementId: undefined,
    lastUpdate: new Date().toISOString()
  };
  private readonly contextFilePath: string;

  constructor() {
    // Get home directory and create a .nexus directory for config
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const nexusDir = path.join(homeDir, '.nexus');

    // Ensure the directory exists
    if (!fs.existsSync(nexusDir)) {
      fs.mkdirSync(nexusDir, { recursive: true });
    }

    this.contextFilePath = path.join(nexusDir, 'context.json');

    // Try to load context from file if it exists
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.contextFilePath)) {
        const fileContent = fs.readFileSync(this.contextFilePath, 'utf8');
        const context = JSON.parse(fileContent);
        this.memoryContext = { ...this.memoryContext, ...context };
      }
    } catch (error) {
      console.error('Failed to load context from file:', error);
      // Continue with default context if file is corrupted
    }
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(this.contextFilePath, JSON.stringify(this.memoryContext, null, 2));
    } catch (error) {
      console.error('Failed to save context to file:', error);
    }
  }

  async read(): Promise<ContextState> {
    this.loadFromFile(); // Refresh from file to ensure latest
    return { ...this.memoryContext };
  }

  async write(context: ContextState): Promise<void> {
    this.memoryContext = { ...context, lastUpdate: new Date().toISOString() };
    this.saveToFile();
  }

  // Helper method to update only specific fields
  async update(updates: Partial<Omit<ContextState, 'lastUpdate'>>): Promise<void> {
    this.memoryContext = {
      ...this.memoryContext,
      ...updates,
      lastUpdate: new Date().toISOString()
    };
    this.saveToFile();
  }

  // Clear dependent selections when parent context changes
  async clearDependentContexts(contextType: 'project' | 'roadmap' | 'chat'): Promise<void> {
    const updates: Partial<Omit<ContextState, 'lastUpdate'>> = {};

    if (contextType === 'project') {
      // When project changes, clear roadmap and chat
      updates.activeRoadmapId = undefined;
      updates.activeRoadmapTitle = undefined;
      updates.activeChatId = undefined;
      updates.activeChatTitle = undefined;
    } else if (contextType === 'roadmap') {
      // When roadmap changes, clear chat
      updates.activeChatId = undefined;
      updates.activeChatTitle = undefined;
    }
    // For 'chat', there are no dependents to clear

    if (Object.keys(updates).length > 0) {
      await this.update(updates);
    }
  }
}
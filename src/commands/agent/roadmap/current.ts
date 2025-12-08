// src/commands/agent/roadmap/current.ts
// Roadmap current command handler

import { CommandHandler } from '../../../runtime/handler-registry';
import { ExecutionContext } from '../../../runtime/types';
import { ContextManager } from '../../../state/context-manager';

export class RoadmapCurrentHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<any> {
    try {
      // Get the context manager and retrieve the current context
      const contextManager = new ContextManager();
      const currentContext = await contextManager.load();

      if (!currentContext.activeRoadmapId) {
        throw new Error('No roadmap is currently selected');
      }

      return {
        roadmap: {
          id: currentContext.activeRoadmapId,
          title: currentContext.activeRoadmapTitle
        },
        context: {
          projectId: currentContext.activeProjectId,
          projectName: currentContext.activeProjectName,
          roadmapId: currentContext.activeRoadmapId,
          roadmapTitle: currentContext.activeRoadmapTitle,
          chatId: currentContext.activeChatId,
          chatTitle: currentContext.activeChatTitle
        }
      };
    } catch (error) {
      throw new Error(`Failed to retrieve current roadmap: ${(error as Error).message}`);
    }
  }
}
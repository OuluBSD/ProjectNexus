// src/commands/agent/chat/current.ts
// Chat current command handler

import { CommandHandler } from '../../../runtime/handler-registry';
import { ExecutionContext } from '../../../runtime/types';
import { ContextManager } from '../../../state/context-manager';

export class ChatCurrentHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<any> {
    try {
      // Get the context manager and retrieve the current context
      const contextManager = new ContextManager();
      const currentContext = await contextManager.load();

      if (!currentContext.activeChatId) {
        throw new Error('No chat is currently selected');
      }

      return {
        chat: {
          id: currentContext.activeChatId,
          title: currentContext.activeChatTitle
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
      throw new Error(`Failed to retrieve current chat: ${(error as Error).message}`);
    }
  }
}
// src/commands/agent/chat/create.ts
// Chat create command handler

import { CommandHandler } from '../../../runtime/handler-registry';
import { ExecutionContext } from '../../../runtime/types';
import { API_CLIENT } from '../../../api/client';

export class ChatCreateHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<any> {
    try {
      const { title, note, 'roadmap-id': roadmapIdFromFlag } = context.flags;
      const { activeRoadmapId } = context.contextState || {};

      // Use the roadmap ID from the flag if provided, otherwise use the active roadmap
      const roadmapId = roadmapIdFromFlag || activeRoadmapId;

      if (!roadmapId) {
        throw new Error('An active roadmap is required to create a chat');
      }

      // Call API to create chat
      const response = await API_CLIENT.createChat({
        name: title || 'New Chat',
        description: note || 'Created via CLI',
        roadmapId: roadmapId
      });

      if (response.status === 'error') {
        throw new Error(`Failed to create chat: ${response.message}`);
      } else if (response.status === 'auth_error') {
        // Handle authentication error specifically
        throw new Error(`Authentication error: ${response.message}`);
      }

      // Return success response
      return {
        status: 'ok',
        data: response.data,
        message: `Chat "${title}" created successfully with ID: ${response.data.chat?.id}`
      };
    } catch (error) {
      const errorMessage = `Failed to create chat: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const err = new Error(errorMessage);
      if (error instanceof Error) {
        err.stack = error.stack; // Preserve original stack trace
      }
      throw err;
    }
  }

  validate(args: any): any {
    if (!args.title) {
      throw new Error('Chat title is required');
    }

    return {
      isValid: true,
      args
    };
  }
}
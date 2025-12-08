// src/commands/agent/chat/send.ts
// Agent Chat send command handler

import { CommandHandler } from '../../../runtime/handler-registry';
import { ExecutionContext } from '../../../runtime/types';
import { API_CLIENT } from '../../../api/client';
import { ContextManager } from '../../../state/context-manager';

export class AgentChatSendHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<any> {
    try {
      const { message, role = 'user' } = context.flags;
      const { activeChatId } = context.contextState || {};
      
      if (!activeChatId) {
        throw new Error('An active chat is required to send a message');
      }

      // Get the current chat to update it with the new message
      const chatResponse = await API_CLIENT.getChatById(activeChatId);
      
      if (chatResponse.status === 'error') {
        throw new Error(`Failed to get chat: ${chatResponse.message}`);
      }
      
      if (chatResponse.status === 'auth_error') {
        throw new Error(`Authentication error: ${chatResponse.message}`);
      }

      const chat = chatResponse.data.chat;

      if (!chat) {
        throw new Error(`Chat with ID ${activeChatId} not found`);
      }

      // Add the new message to the chat
      if (!chat.messages) {
        chat.messages = [];
      }

      const newMessage = {
        id: chat.messages.length + 1,
        role,
        content: message,
        timestamp: Date.now(),
        metadata: {},
        displayRole: role.charAt(0).toUpperCase() + role.slice(1)
      };

      chat.messages.push(newMessage);

      // In a real implementation we would update the chat via the API
      // For the mock implementation, we'll just return the updated chat
      return {
        status: 'ok',
        data: { chat },
        message: `Message sent to chat "${chat.title}"`
      };
    } catch (error) {
      const errorMessage = `Failed to send message to chat: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const err = new Error(errorMessage);
      if (error instanceof Error) {
        err.stack = error.stack; // Preserve original stack trace
      }
      throw err;
    }
  }

  validate(args: any): any {
    if (!args.message) {
      throw new Error('Message content is required');
    }
    
    return {
      isValid: true,
      args
    };
  }
}
// src/commands/ai/message/send.ts
// AI Message send command handler

import { ExecutionContext, CommandResult, CommandError } from '../../../runtime/types';
import { ContextManager } from '../../../state/context-manager';
import { SessionManager } from '../../../session/session-manager';
import { API_CLIENT } from '../../../api/client';
import { AiTokenEvent } from '../../../api/types';

export class AIMessageSendHandler {
  async execute(context: ExecutionContext): Promise<CommandResult | AsyncGenerator<any>> {
    try {
      const { flags } = context;
      const text = flags.text;
      let sessionId = flags.sessionId;

      // Get the selected AI session if no specific session ID was provided
      if (!sessionId) {
        const contextManager = new ContextManager();
        const selectedSessionId = await contextManager.getAiSession();

        if (!selectedSessionId) {
          return {
            status: 'error',
            data: null,
            message: 'No active AI session selected. Use "nexus ai session select --id <sessionId>" first.',
            errors: [{
              type: 'MISSING_REQUIRED_CONTEXT',
              message: 'No active AI session selected',
              details: { requiredContext: 'activeAiSession' }
            } as CommandError]
          };
        }

        sessionId = selectedSessionId;
      }

      // Verify session exists
      const sessionManager = new SessionManager();
      const aiSession = sessionManager.getAiSessionById(sessionId);
      if (!aiSession) {
        return {
          status: 'error',
          data: null,
          message: `AI session with ID ${sessionId} does not exist`,
          errors: [{
            type: 'UNKNOWN_SESSION',
            message: `AI session with ID ${sessionId} does not exist`,
            details: { sessionId }
          } as CommandError]
        };
      }

      // Add user message to the session
      await sessionManager.appendMessage(sessionId, 'user', text);

      // Create a streaming generator to send the message and receive response
      const generator = API_CLIENT.sendAiChatMessage(sessionId, text);

      // Return the raw generator, allowing the runtime to handle UOL wrapping
      return generator;
    } catch (error: any) {
      return {
        status: 'error',
        data: null,
        message: `Failed to send AI message: ${error.message}`,
        errors: [{
          type: 'MESSAGE_SEND_ERROR',
          message: error.message
        } as CommandError]
      };
    }
  }

  validate(args: any): any {
    // No additional validation needed beyond what's in the validator
    return { valid: true, errors: [] };
  }
}
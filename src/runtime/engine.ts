// src/runtime/engine.ts
// Main runtime engine

import { ValidatedCommand } from '../parser/index';
import { ExecutionContext, ContextState, CommandResult, CommandError } from './types';
import { handlerRegistry } from './handler-registry';
import { ContextManager } from '../state/context-manager';
import { wrapAsyncGenerator } from '../observability/uol';
import { attachHintToError } from '../utils/hints';
import { formatStreamingEvent } from '../utils/formatters';

// Helper function to map context types to error types for hints
function getErrorTypeForContext(contextType: string): string {
  switch(contextType) {
    case 'activeProject':
      return 'MISSING_PROJECT_CONTEXT';
    case 'activeRoadmap':
      return 'MISSING_ROADMAP_CONTEXT';
    case 'activeChat':
      return 'MISSING_CHAT_CONTEXT';
    case 'activeAiSession':
      return 'MISSING_AI_SESSION_CONTEXT';
    default:
      return 'MISSING_REQUIRED_CONTEXT';
  }
}

export class RuntimeEngine {
  async executeCommand(validated: ValidatedCommand): Promise<CommandResult> {
    // Find the appropriate handler for this command
    const handler = handlerRegistry.findHandler(validated.commandId);

    if (!handler) {
      const errorMessage = `No handler found for command: ${validated.commandId}`;
      return {
        status: 'error',
        data: null,
        message: attachHintToError('HANDLER_NOT_FOUND', errorMessage),
        errors: [{
          type: 'HANDLER_NOT_FOUND',
          message: attachHintToError('HANDLER_NOT_FOUND', `Command handler not implemented: ${validated.commandId}`)
        } as CommandError]
      };
    }

    // Check if the command requires specific context and verify it's available
    if (validated.contextRequired && validated.contextRequired.length > 0) {
      const contextManager = new ContextManager();

      for (const requiredContext of validated.contextRequired) {
        let hasContext = false;

        switch (requiredContext) {
          case 'activeProject':
            hasContext = await contextManager.hasProjectContext();
            break;
          case 'activeRoadmap':
            hasContext = await contextManager.hasRoadmapContext();
            break;
          case 'activeChat':
            hasContext = await contextManager.hasChatContext();
            break;
          case 'activeAiSession':
            hasContext = await contextManager.hasAiSessionContext();
            break;
          case 'authenticated':
            // For now, we'll assume authentication is always available
            hasContext = true;
            break;
          default:
            // If we encounter an unknown context requirement, let it pass for now
            hasContext = true;
        }

        if (!hasContext) {
          const errorType = getErrorTypeForContext(requiredContext);
          const errorMessage = `Missing required context: ${requiredContext}. Please set the required context before running this command.`;

          return {
            status: 'error',
            data: null,
            message: attachHintToError(errorType, errorMessage),
            errors: [{
              type: 'MISSING_REQUIRED_CONTEXT',
              message: attachHintToError(errorType, `Command ${validated.commandId} requires ${requiredContext} context`),
              details: { requiredContext, commandId: validated.commandId }
            } as CommandError]
          };
        }
      }
    }

    // Create execution context
    const contextState = await (new ContextManager()).load();
    const context: ExecutionContext = {
      args: validated.args,
      flags: validated.flags,
      contextState,
      config: {} // Runtime config
    };

    try {
      // Set up signal handling for interruption
      let interrupted = false;
      const signalHandler = () => {
        interrupted = true;
      };

      process.on('SIGINT', signalHandler);
      process.on('SIGTERM', signalHandler);

      // Execute the command through the handler, but don't await yet
      const executionResult = (handler.execute(context) as any);

      // Check if the result is an AsyncGenerator (streaming)
      if (executionResult && typeof executionResult === 'object' && executionResult[Symbol.asyncIterator]) {
        // Determine the source based on the command ID
        let source: "ai" | "process" | "websocket" | "poll" | "network" = "ai"; // default

        if (validated.commandId.includes("debug:process")) {
          source = "process";
        } else if (validated.commandId.includes("debug:websocket")) {
          source = "websocket";
        } else if (validated.commandId.includes("debug:poll")) {
          source = "poll";
        } else if (validated.commandId.includes("ai:message")) {
          source = "ai";
        } else if (validated.commandId.includes("network")) {
          source = "network";
        }

        // Handle streaming generator - wrap in standardized observability events
        try {
          const generator = wrapAsyncGenerator(source, executionResult);
          for await (const event of generator) {
            // Check if we've received an interruption signal
            if (interrupted) {
              // Emit an interrupt event
              const interruptEvent = {
                seq: event.seq + 1, // Use next sequence number
                timestamp: new Date().toISOString(),
                source,
                event: 'interrupt',
                message: 'Stream interrupted by user'
              };
              console.log(formatStreamingEvent(source, interruptEvent.seq, interruptEvent));
              break;
            }
            // Print each event as a formatted line for streaming
            console.log(formatStreamingEvent(source, event.seq, event));
          }
        } finally {
          // Clean up signal handlers
          process.removeListener('SIGINT', signalHandler);
          process.removeListener('SIGTERM', signalHandler);
        }

        // Return a final success result after streaming completes
        return {
          status: 'ok',
          data: { stream: "completed" },
          message: `Command ${validated.commandId} executed successfully`,
          errors: []
        };
      } else {
        // Handle regular (non-streaming) result - it might be a promise
        const resolvedResult = await executionResult;
        // Clean up signal handlers
        process.removeListener('SIGINT', signalHandler);
        process.removeListener('SIGTERM', signalHandler);
        return {
          status: 'ok',
          data: resolvedResult,
          message: `Command ${validated.commandId} executed successfully`,
          errors: []
        };
      }
    } catch (error: any) {
      // Handle any execution errors
      const errorMessage = `Execution error for command ${validated.commandId}: ${error.message}`;
      return {
        status: 'error',
        data: null,
        message: attachHintToError('EXECUTION_ERROR', errorMessage),
        errors: [{
          type: 'EXECUTION_ERROR',
          message: attachHintToError('EXECUTION_ERROR', error.message)
        } as CommandError]
      };
    }
  }
}

export async function executeCommand(validated: ValidatedCommand): Promise<CommandResult> {
  const engine = new RuntimeEngine();
  return await engine.executeCommand(validated);
}
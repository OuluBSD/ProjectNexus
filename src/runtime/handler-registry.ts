// src/runtime/handler-registry.ts
// Command handler registry

import { ExecutionContext } from './types';

export interface CommandHandler {
  execute(context: ExecutionContext): Promise<any> | AsyncGenerator<any>;
}

// Define a map to store command handlers by commandId
interface HandlerMap {
  [commandId: string]: CommandHandler;
}

export class HandlerRegistry {
  private handlers: HandlerMap = {};

  register(commandId: string, handler: CommandHandler): void {
    this.handlers[commandId] = handler;
  }

  findHandler(commandId: string): CommandHandler | null {
    return this.handlers[commandId] || null;
  }
}

// Singleton instance
export const handlerRegistry = new HandlerRegistry();
// src/commands/debug/websocket/list.ts
// Debug WebSocket list command handler

import { API_CLIENT } from '../../../api/client';
import { ListWebSocketsResponse } from '../../../api/types';

export class DebugWebSocketListHandler {
  async execute(context: any): Promise<any> {
    try {
      const response: ListWebSocketsResponse = await API_CLIENT.getWebSockets();
      
      if (response.status === 'ok') {
        return {
          status: 'ok',
          data: {
            websockets: response.data.websockets
          },
          message: response.message,
          errors: []
        };
      } else {
        return {
          status: 'error',
          data: null,
          message: response.message,
          errors: response.errors
        };
      }
    } catch (error) {
      return {
        status: 'error',
        data: null,
        message: 'Failed to retrieve websockets',
        errors: [{ type: 'API_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }]
      };
    }
  }

  validate(args: any): any {
    // Validate flags
    const validFlags = ['filter-type', 'filter-status', 'limit'];
    const providedFlags = Object.keys(args.flags || {});
    
    for (const flag of providedFlags) {
      if (!validFlags.includes(flag)) {
        return {
          error: true,
          code: 'UNKNOWN_FLAG',
          message: `Unknown flag: --${flag}`,
          details: {
            command: 'debug.websocket.list',
            availableFlags: validFlags
          }
        };
      }
    }

    // Validate flag types if provided
    if (args.flags && args.flags.limit !== undefined) {
      const limit = Number(args.flags.limit);
      if (isNaN(limit)) {
        return {
          error: true,
          code: 'INVALID_FLAG_TYPE',
          message: 'Invalid type for flag --limit: expected number',
          details: {
            command: 'debug.websocket.list',
            flag: 'limit',
            expectedType: 'number',
            actualValue: args.flags.limit,
            actualType: typeof args.flags.limit
          }
        };
      }
    }

    return { error: false };
  }
}
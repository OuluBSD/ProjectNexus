// src/commands/debug/websocket/view.ts
// Debug WebSocket view command handler

import { API_CLIENT } from '../../../api/client';
import { GetWebSocketResponse } from '../../../api/types';

export class DebugWebSocketViewHandler {
  async execute(context: any): Promise<any> {
    const { id } = context.flags;

    // Check if required flag 'id' is provided
    if (!id) {
      return {
        status: 'error',
        data: null,
        message: 'Missing required flag: --id',
        errors: [{ type: 'MISSING_REQUIRED_FLAG', message: 'Missing required flag: --id' }]
      };
    }

    try {
      const response: GetWebSocketResponse = await API_CLIENT.getWebSocketById(id);

      if (response.status === 'ok' && response.data.websocket) {
        return {
          status: 'ok',
          data: {
            websocket: response.data.websocket
          },
          message: response.message,
          errors: []
        };
      } else if (response.status === 'error') {
        // Check if it's a "not found" error
        if (response.message && response.message.includes('not found')) {
          return {
            status: 'error',
            data: null,
            message: `WebSocket with id ${id} not found`,
            errors: [{ type: 'NOT_FOUND', message: `WebSocket with id ${id} not found`, details: { id } }]
          };
        } else {
          // Return other errors as they are
          return {
            status: 'error',
            data: null,
            message: response.message,
            errors: response.errors.map((err: any) => ({
              type: err.code || 'API_ERROR',
              message: err.message || err,
              details: err.details || {}
            }))
          };
        }
      }
    } catch (error) {
      return {
        status: 'error',
        data: null,
        message: `Failed to retrieve websocket with id ${id}`,
        errors: [{ type: 'API_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }]
      };
    }
  }

  validate(args: any): any {
    // Check if required flag 'id' is provided
    if (!args.flags || !args.flags.id) {
      return {
        error: true,
        type: 'MISSING_REQUIRED_FLAG',
        message: 'Missing required flag: --id',
        details: {
          command: 'debug.websocket.view'
        }
      };
    }

    // Validate flags
    const validFlags = ['id'];
    const providedFlags = Object.keys(args.flags || {});

    for (const flag of providedFlags) {
      if (!validFlags.includes(flag)) {
        return {
          error: true,
          type: 'UNKNOWN_FLAG',
          message: `Unknown flag: --${flag}`,
          details: {
            command: 'debug.websocket.view',
            availableFlags: validFlags
          }
        };
      }
    }

    return { error: false };
  }
}
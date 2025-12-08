// src/commands/debug/poll/view.ts
// Debug Poll Session view command handler

import { API_CLIENT } from '../../../api/client';
import { GetPollSessionResponse } from '../../../api/types';

export class DebugPollViewHandler {
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
      const response: GetPollSessionResponse = await API_CLIENT.getPollSessionById(id);

      if (response.status === 'ok' && response.data.pollSession) {
        return {
          status: 'ok',
          data: {
            pollSession: response.data.pollSession
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
            message: `Poll session with id ${id} not found`,
            errors: [{ type: 'NOT_FOUND', message: `Poll session with id ${id} not found`, details: { id } }]
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
        message: `Failed to retrieve poll session with id ${id}`,
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
          command: 'debug.poll.view'
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
            command: 'debug.poll.view',
            availableFlags: validFlags
          }
        };
      }
    }

    return { error: false };
  }
}
// src/commands/agent/project/create.ts
// Project create command handler

import { CommandHandler } from '../../../runtime/handler-registry';
import { ExecutionContext } from '../../../runtime/types';
import { API_CLIENT } from '../../../api/client';

export class ProjectCreateHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<any> {
    try {
      const { name, category, description } = context.flags;

      // Call API to create project
      const response = await API_CLIENT.createProject({
        name,
        category: category || 'General',
        description: description || 'Created via CLI',
        status: 'active'
      });

      if (response.status === 'error') {
        throw new Error(`Failed to create project: ${response.message}`);
      } else if (response.status === 'auth_error') {
        // Handle authentication error specifically
        throw new Error(`Authentication error: ${response.message}`);
      }

      // Return success response
      return {
        status: 'ok',
        data: response.data,
        message: `Project "${name}" created successfully with ID: ${response.data.project?.id}`
      };
    } catch (error) {
      const errorMessage = `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const err = new Error(errorMessage);
      if (error instanceof Error) {
        err.stack = error.stack; // Preserve original stack trace
      }
      throw err;
    }
  }

  validate(args: any): any {
    if (!args.name) {
      throw new Error('Project name is required');
    }

    return {
      isValid: true,
      args
    };
  }
}
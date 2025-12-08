// src/commands/agent/roadmap/create.ts
// Roadmap create command handler

import { CommandHandler } from '../../../runtime/handler-registry';
import { ExecutionContext } from '../../../runtime/types';
import { API_CLIENT } from '../../../api/client';

export class RoadmapCreateHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<any> {
    try {
      const { title, tags, 'project-id': projectIdFromFlag } = context.flags;
      const { activeProjectId } = context.contextState || {};

      // Use the project ID from the flag if provided, otherwise use the active project
      const projectId = projectIdFromFlag || activeProjectId;

      if (!projectId) {
        throw new Error('An active project is required to create a roadmap');
      }

      // Call API to create roadmap
      const response = await API_CLIENT.createRoadmap({
        name: title || 'New Roadmap',
        description: Array.isArray(tags) ? tags.join(',') : (tags || 'Created via CLI'),
        projectId: projectId
      });

      if (response.status === 'error') {
        throw new Error(`Failed to create roadmap: ${response.message}`);
      } else if (response.status === 'auth_error') {
        // Handle authentication error specifically
        throw new Error(`Authentication error: ${response.message}`);
      }

      // Return success response
      return {
        status: 'ok',
        data: response.data,
        message: `Roadmap "${title}" created successfully with ID: ${response.data.roadmap?.id}`
      };
    } catch (error) {
      const errorMessage = `Failed to create roadmap: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const err = new Error(errorMessage);
      if (error instanceof Error) {
        err.stack = error.stack; // Preserve original stack trace
      }
      throw err;
    }
  }

  validate(args: any): any {
    if (!args.title) {
      throw new Error('Roadmap title is required');
    }

    return {
      isValid: true,
      args
    };
  }
}
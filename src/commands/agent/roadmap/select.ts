// src/commands/agent/roadmap/select.ts
// Roadmap select command handler

import { CommandHandler } from '../../../runtime/handler-registry';
import { ExecutionContext } from '../../../runtime/types';
import { API_CLIENT } from '../../../api/client';
import { ContextManager } from '../../../state/context-manager';

export class RoadmapSelectHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<any> {
    try {
      // Extract id or name from context flags
      const { id, name } = context.flags;

      // Determine which identifier to use
      const roadmapId = id || name;

      if (!roadmapId) {
        throw new Error('Either --id or --name must be provided to select a roadmap');
      }

      // Verify the roadmap exists by fetching its details
      const response = await API_CLIENT.getRoadmapById(roadmapId);

      if (response.status === 'error') {
        throw new Error(`Failed to find roadmap: ${response.message}`);
      }

      if (!response.data.roadmap) {
        throw new Error(`Roadmap with id/name '${roadmapId}' not found`);
      }

      // Get the context manager and update the selected roadmap
      const contextManager = new ContextManager();
      const newContext = await contextManager.selectRoadmap(
        response.data.roadmap.id,
        response.data.roadmap.title
      );

      return {
        roadmap: {
          id: response.data.roadmap.id,
          title: response.data.roadmap.title,
          selected: true,  // Mark as selected since this is the selected roadmap
          status: response.data.roadmap.status,
          progress: response.data.roadmap.progress,
          projectRef: response.data.roadmap.projectRef,
          projectMetadata: {
            id: response.data.roadmap.projectRef,
            name: "",
            category: "",
            status: ""
          } // Simplified for consistency
        },
        context: {
          projectId: newContext.activeProjectId,
          projectName: newContext.activeProjectName,
          roadmapId: newContext.activeRoadmapId,
          roadmapTitle: newContext.activeRoadmapTitle,
          chatId: newContext.activeChatId,
          chatTitle: newContext.activeChatTitle
        }
      };
    } catch (error) {
      throw new Error(`Failed to select roadmap: ${(error as Error).message}`);
    }
  }
}
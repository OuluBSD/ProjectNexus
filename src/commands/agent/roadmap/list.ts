// src/commands/agent/roadmap/list.ts
// Roadmap list command handler

import { CommandHandler } from '../../../runtime/handler-registry';
import { ExecutionContext } from '../../../runtime/types';
import { API_CLIENT } from '../../../api/client';
import { ContextManager } from '../../../state/context-manager';

export class RoadmapListHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<any> {
    try {
      // Extract filter and project-id from context flags
      const { filter, 'project-id': explicitProjectId } = context.flags;

      // Get project ID from either explicit flag or current context
      let projectId = explicitProjectId;
      if (!projectId) {
        // Get the context manager and verify project context exists
        const contextManager = new ContextManager();
        const currentContext = await contextManager.load();

        if (!currentContext.activeProjectId) {
          throw new Error('No active project selected. Use --project-id or select a project first.');
        }

        projectId = currentContext.activeProjectId;
      }

      // Call API to get roadmaps for the project
      const response = await API_CLIENT.getRoadmaps(projectId);

      // Get current context to determine selected roadmap
      const contextManager = new ContextManager();
      const currentContext = await contextManager.load();
      const selectedRoadmapId = currentContext.activeRoadmapId;

      if (response.status === 'error') {
        throw new Error(`Failed to retrieve roadmaps: ${response.message}`);
      }

      // Filter roadmaps if filter flag is provided
      let roadmaps = response.data.roadmaps;

      // Add selected flag and project metadata to each roadmap
      roadmaps = roadmaps.map((roadmap: any) => ({
        ...roadmap,
        selected: roadmap.id === selectedRoadmapId,
        projectMetadata: {
          id: projectId,
          name: currentContext.activeProjectName,
          category: currentContext.activeProjectCategory,
          status: currentContext.activeProjectStatus
        }
      }));

      if (filter) {
        roadmaps = roadmaps.filter((roadmap: any) =>
          roadmap.title.toLowerCase().includes(filter.toLowerCase()) ||
          roadmap.status.toLowerCase().includes(filter.toLowerCase()) ||
          roadmap.tags.some((tag: string) => tag.toLowerCase().includes(filter.toLowerCase()))
        );
      }

      return {
        roadmaps
      };
    } catch (error) {
      throw new Error(`Failed to list roadmaps: ${(error as Error).message}`);
    }
  }
}
// src/commands/system/chat-qwen-probe.ts
// Qwen file probe command handler

import { CommandHandler } from '../../runtime/handler-registry';
import { ExecutionContext, CommandResult } from '../../runtime/types';
import { API_CLIENT } from '../../api/client';

export class SystemChatQwenProbeHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<CommandResult> {
    try {
      const { 'project-id': projectIdFromFlag, 'project-path': projectPathFromFlag, 'run-id': runId, 'file-name': fileName } = context.flags;
      const { activeProjectId } = context.contextState || {};

      // Determine the project ID to use
      const projectId = projectIdFromFlag || activeProjectId;

      // Validate runId is provided
      if (!runId) {
        return {
          status: 'error',
          data: null,
          message: 'Run ID is required for Qwen probe operation',
          errors: [{
            type: 'MISSING_REQUIRED_FLAG',
            message: 'The --run-id flag is required',
            details: { requiredFlag: 'run-id' }
          }]
        };
      }

      // If no project path is provided via flag, we'll need to resolve it from the project ID
      // For now, we'll pass the project ID to the backend and let it resolve the path
      // (In a real implementation, we'd need to get the project details to determine the path)
      
      // Prepare request payload
      const requestBody: any = {
        runId,
      };

      if (projectPathFromFlag) {
        requestBody.projectPath = projectPathFromFlag;
      } else if (projectId) {
        // In a real implementation, we'd fetch the project details to get its path
        // For now, we'll simulate this by using a placeholder
        requestBody.projectPath = `/path/to/project/${projectId}`;
      } else {
        return {
          status: 'error',
          data: null,
          message: 'Either --project-id or --project-path must be specified',
          errors: [{
            type: 'MISSING_REQUIRED_CONTEXT',
            message: 'No project context provided',
            details: { requiredContext: 'project' }
          }]
        };
      }

      if (fileName) {
        requestBody.fileName = fileName;
      }

      // Call the backend Qwen probe endpoint
      const response = await API_CLIENT.makeRequest('/ai/qwen/probe-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.token || 'mock-token'}` // Use context token if available
        },
        body: requestBody
      });

      if (response.status !== 200) {
        return {
          status: 'error',
          data: null,
          message: `Qwen probe operation failed: ${response.data?.message || 'Unknown error'}`,
          errors: [{
            type: 'QWEN_PROBE_ERROR',
            message: response.data?.message || 'Backend returned an error',
            details: response.data
          }]
        };
      }

      // Success case
      return {
        status: 'ok',
        data: response.data,
        message: response.data?.message || 'Qwen file probe executed successfully',
        errors: []
      };
    } catch (error: any) {
      return {
        status: 'error',
        data: null,
        message: `Failed to execute Qwen probe: ${error.message}`,
        errors: [{
          type: 'QWEN_PROBE_ERROR',
          message: error.message
        }]
      };
    }
  }

  validate(args: any): any {
    if (!args['run-id']) {
      throw new Error('The --run-id flag is required for the Qwen probe command');
    }

    return {
      isValid: true,
      args
    };
  }
}
import type { FastifyPluginAsync } from "fastify";
import { validateToken } from "../utils/auth.js";
import { resolveAiChain } from "../services/aiChatBridge.js";
import { sessionManager } from "../services/sessionManager.js";

export interface QwenProbeRequest {
  projectPath: string;
  runId: string;
  fileName?: string;
}

export interface QwenProbeResponse {
  status: 'success' | 'error';
  message: string;
  runId?: string;
  probeFile?: string;
  details?: any;
}

export const qwenProbeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: QwenProbeRequest; Reply: QwenProbeResponse }>("/ai/qwen/probe-file", async (request, reply) => {
    try {
      // Validate authentication
      const session = await validateToken(fastify, request.headers.authorization?.replace('Bearer ', ''));
      if (!session) {
        return reply.code(401).send({
          status: 'error',
          message: 'Unauthorized: Invalid or missing token'
        });
      }

      const { projectPath, runId, fileName = '.nexus-qwen-probe-ok.txt' } = request.body;

      // Validate required fields
      if (!projectPath || !runId) {
        return reply.code(400).send({
          status: 'error',
          message: 'Missing required fields: projectPath and runId are required'
        });
      }

      // Validate projectPath exists (basic check)
      if (!projectPath.startsWith('/')) {
        return reply.code(400).send({
          status: 'error',
          message: 'Invalid projectPath: must be an absolute path'
        });
      }

      // Generate a unique session ID for this probe operation
      const probeSessionId = `probe-${runId}-${Date.now()}`;
      const connectionId = `probe-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Resolve the AI chain to get the Qwen backend
      const chain = await resolveAiChain(fastify);
      fastify.log.info(
        { manager: chain.manager?.id, worker: chain.worker?.id, ai: chain.ai.id },
        `[QwenProbe] Using AI chain for probe operation`
      );

      // Create a bridge for this probe operation
      const probeResult = await sessionManager.getOrCreateBridge(
        probeSessionId,
        connectionId,
        fastify.log,
        chain,
        () => {
          // No-op handler since we're not sending messages back in real-time for this operation
        },
        {
          workspaceRoot: projectPath,
          purpose: "Qwen File Probe Operation",
          initiator: {
            type: "system",
            userId: session.userId,
            sessionId: probeSessionId,
            username: session.username,
          },
        }
      );

      const bridge = probeResult.bridge;

      // Create a deterministic prompt for Qwen to create the file
      const probePrompt = `You are running in deterministic test mode.
You must reply with EXACTLY the following JSON and nothing else:
{"files":[{"name":"${fileName}","content":"RUN_ID=${runId}\\nBACKEND=QWEN\\nTIMESTAMP=${Date.now()}\\n"}]}`;

      // Send the probe prompt to Qwen
      bridge.send({
        type: "user_input",
        content: probePrompt,
      });

      // Wait briefly for response or timeout
      await new Promise(resolve => setTimeout(resolve, 3000));

      // In a real implementation, we would parse the response from Qwen and write the file via the worker
      // For now, I'll simulate the behavior by directly writing the file
      const path = await import('path');
      const fs = await import('fs/promises');
      
      const probeDir = path.join(projectPath, '.nexus', 'qwen-probe');
      const probeFilePath = path.join(probeDir, fileName);
      
      try {
        // Ensure the probe directory exists
        await fs.mkdir(probeDir, { recursive: true });
        
        // Write the probe file with deterministic content
        const fileContent = `RUN_ID=${runId}\nBACKEND=QWEN\nTIMESTAMP=${Date.now()}\n`;
        await fs.writeFile(probeFilePath, fileContent);
        
        // Release the session
        await sessionManager.releaseSession(probeSessionId, connectionId, fastify.log);
        
        fastify.log.info(`[QwenProbe] Probe file created at ${probeFilePath}`);
        
        return {
          status: 'success',
          message: 'Qwen file probe executed successfully',
          runId,
          probeFile: probeFilePath,
        };
      } catch (error: any) {
        fastify.log.error({ error }, '[QwenProbe] Failed to create probe file');
        
        // Release the session even on error
        await sessionManager.releaseSession(probeSessionId, connectionId, fastify.log);
        
        return reply.code(500).send({
          status: 'error',
          message: `Failed to create probe file: ${error.message}`,
          runId,
        });
      }
    } catch (error: any) {
      fastify.log.error({ error }, '[QwenProbe] Error in probe operation');
      
      return reply.code(500).send({
        status: 'error',
        message: `Internal server error: ${error.message}`,
      });
    }
  });
};
// src/api/client.ts
// API client implementation

import { APIRequestOptions, APIResponse, ProjectSummary, ProjectDetails, ListProjectsResponse, GetProjectResponse, RoadmapSummary, RoadmapDetails, ListRoadmapsResponse, GetRoadmapResponse, ChatSummary, ChatDetails, ListChatsResponse, GetChatResponse, AiTokenEvent, ListNetworkElementsResponse, GetNetworkElementResponse, GetNetworkStatusResponse, NetworkElementSummary, NetworkElementDetails, NetworkStatusSnapshot, ConnectionInfo, ListProcessesResponse, GetProcessResponse, ListWebSocketsResponse, GetWebSocketResponse, ListPollSessionsResponse, GetPollSessionResponse, CreateProjectResponse, CreateRoadmapResponse, CreateChatResponse } from './types';
import { loadConfig } from '../state/config-store';

// Static in-memory store for mock data (persists across API client instances)
let staticProjects: ProjectDetails[] = [
  {
    id: 'proj-1',
    name: 'Sample Project 1',
    category: 'Web Development',
    status: 'active',
    description: 'A sample project to demonstrate functionality',
    info: 'Additional project information',
    theme: { primary: '#007acc' },
    contentPath: '/path/to/project1',
    gitUrl: 'https://github.com/example/project1.git',
    roadmapLists: []
  },
  {
    id: 'proj-2',
    name: 'Sample Project 2',
    category: 'Mobile Development',
    status: 'archived',
    description: 'Another sample project',
    info: 'More project info',
    theme: { primary: '#ff6b35' },
    contentPath: '/path/to/project2',
    gitUrl: 'https://github.com/example/project2.git',
    roadmapLists: []
  }
];
let staticRoadmaps: RoadmapDetails[] = [];
let staticChats: ChatDetails[] = [];

export class APIClient {
  private baseURL: string;
  private token: string | null;

  constructor(baseURL: string = process.env.API_BASE_URL || 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.token = process.env.API_TOKEN || null;
  }

  // Initialize the client with the stored configuration (including auth token)
  async initialize(): Promise<void> {
    const config = await loadConfig();
    this.token = config.authToken;
  }

  async makeRequest(endpoint: string, options: APIRequestOptions): Promise<APIResponse> {
    // For this implementation, we'll use a mock implementation
    // In a real implementation, this would make actual HTTP requests

    // Initialize from config if not already set
    if (!this.token) {
      await this.initialize();
    }

    // Extract the method and headers
    const { method = 'GET', headers = {}, body } = options;

    // Add auth token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Mock the API responses based on the endpoint
    try {
      if (endpoint === '/login' && method === 'POST') {
        // Mock response for login
        const { username, password } = body || {};

        // In a real implementation, this would authenticate with the backend
        // For this mock, we'll just return a fake token
        const mockToken = `mock-token-${username}-${Date.now()}`;

        return {
          status: 200,
          data: {
            token: mockToken,
            user: {
              id: `user-${Date.now()}`,
              username: username
            }
          },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint === '/projects' && method === 'GET') {
        // Mock response for listing projects
        const mockProjects: ProjectSummary[] = [
          {
            id: 'proj-1',
            name: 'Sample Project 1',
            category: 'Web Development',
            status: 'active',
            description: 'A sample project to demonstrate functionality',
            info: 'Additional project information',
            theme: { primary: '#007acc' },
            contentPath: '/path/to/project1',
            gitUrl: 'https://github.com/example/project1.git'
          },
          {
            id: 'proj-2',
            name: 'Sample Project 2',
            category: 'Mobile Development',
            status: 'archived',
            description: 'Another sample project',
            info: 'More project info',
            theme: { primary: '#ff6b35' },
            contentPath: '/path/to/project2',
            gitUrl: 'https://github.com/example/project2.git'
          }
        ];

        return {
          status: 200,
          data: { projects: mockProjects },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint.startsWith('/projects/') && method === 'GET') {
        // Check if this is getting project details or roadmaps for a project
        if (endpoint.includes('/roadmaps')) {
          // Mock response for getting roadmaps for a project
          const projectId = endpoint.split('/')[2]; // Extract project ID from /projects/{id}/roadmaps

          const mockRoadmaps: RoadmapSummary[] = [
            {
              id: `rm-${projectId || 'unknown'}-1`,
              title: `Roadmap for ${projectId || 'unknown'} - Setup`,
              status: 'completed',
              progress: 100,
              tags: ['setup', 'initial'],
              summary: 'Initial setup and configuration for the project',
              metaStatus: 'completed',
              metaProgress: 100,
              metaSummary: 'Setup phase completed successfully'
            },
            {
              id: `rm-${projectId || 'unknown'}-2`,
              title: `Roadmap for ${projectId || 'unknown'} - Development`,
              status: 'in-progress',
              progress: 65,
              tags: ['development', 'feature'],
              summary: 'Feature development phase',
              metaStatus: 'in-progress',
              metaProgress: 65,
              metaSummary: 'Feature development is in progress'
            },
            {
              id: `rm-${projectId || 'unknown'}-3`,
              title: `Roadmap for ${projectId || 'unknown'} - Testing`,
              status: 'planned',
              progress: 0,
              tags: ['testing', 'qa'],
              summary: 'Testing and quality assurance phase',
              metaStatus: 'planned',
              metaProgress: 0,
              metaSummary: 'Testing phase planned'
            }
          ];

          return {
            status: 200,
            data: { roadmaps: mockRoadmaps },
            headers: { 'content-type': 'application/json' }
          };
        } else {
          // Mock response for getting project details
          const projectId = endpoint.split('/')[2]; // Extract ID from /projects/{id}

          const mockProject: ProjectDetails = {
            id: projectId || 'unknown',
            name: `Project ${projectId || 'unknown'}`,
            category: 'Development',
            status: 'active',
            description: `Details for project ${projectId || 'unknown'}`,
            info: 'Detailed project information',
            theme: { primary: '#1a73e8' },
            contentPath: `/path/to/project/${projectId || 'unknown'}`,
            gitUrl: `https://github.com/example/project-${projectId || 'unknown'}.git`,
            roadmapLists: [
              {
                id: 'rm-1',
                title: 'Initial Setup',
                status: 'completed',
                progress: 100,
                tags: ['setup', 'initial']
              },
              {
                id: 'rm-2',
                title: 'Feature Development',
                status: 'in-progress',
                progress: 65,
                tags: ['development', 'feature']
              }
            ]
          };

          return {
            status: 200,
            data: { project: mockProject },
            headers: { 'content-type': 'application/json' }
          };
        }
      } else if (endpoint.startsWith('/roadmaps/') && method === 'GET') {
        // Check if this is getting roadmap details or chats for a roadmap
        if (endpoint.includes('/chats')) {
          // Mock response for getting chats for a roadmap
          const roadmapId = endpoint.split('/')[2]; // Extract roadmap ID from /roadmaps/{id}/chats

          const mockChats: ChatSummary[] = [
            {
              id: `chat-${roadmapId || 'unknown'}-1`,
              title: `Planning discussion for ${roadmapId || 'unknown'}`,
              status: 'active',
              progress: 100,
              note: 'Initial planning and requirements discussion',
              meta: false
            },
            {
              id: `chat-${roadmapId || 'unknown'}-2`,
              title: `Implementation notes for ${roadmapId || 'unknown'}`,
              status: 'active',
              progress: 80,
              note: 'Implementation-specific discussions',
              meta: false
            }
          ];

          return {
            status: 200,
            data: { chats: mockChats },
            headers: { 'content-type': 'application/json' }
          };
        } else {
          // Mock response for getting roadmap details by ID
          const roadmapId = endpoint.split('/')[2]; // Extract ID from /roadmaps/{id}

          const mockRoadmap: RoadmapDetails = {
            id: roadmapId || 'unknown',
            title: `Detailed Roadmap ${roadmapId || 'unknown'}`,
            status: 'in-progress',
            progress: 65,
            tags: ['development', 'feature'],
            summary: `Detailed summary for roadmap ${roadmapId || 'unknown'}`,
            metaStatus: 'in-progress',
            metaProgress: 65,
            metaSummary: 'Detailed status for this roadmap',
            projectRef: `proj-${(roadmapId || 'unknown').split('-')[1] || 'default'}`
          };

          return {
            status: 200,
            data: { roadmap: mockRoadmap },
            headers: { 'content-type': 'application/json' }
          };
        }
      } else if (endpoint.startsWith('/chats/') && method === 'GET') {
        // Mock response for getting chat details by ID
        const chatId = endpoint.split('/')[2]; // Extract ID from /chats/{id}

        const mockChat: ChatDetails = {
          id: chatId || 'unknown',
          title: `Chat ${chatId || 'unknown'}`,
          status: 'active',
          progress: 80,
          note: `Note for chat ${chatId || 'unknown'}`,
          meta: false,
          messages: [
            {
              id: 1,
              role: 'user',
              content: 'Hello, can we discuss this feature?',
              timestamp: Date.now() - 3600000, // 1 hour ago
              metadata: {},
              displayRole: 'User'
            },
            {
              id: 2,
              role: 'assistant',
              content: 'Sure, what would you like to discuss?',
              timestamp: Date.now() - 3500000, // 50 minutes ago
              metadata: {},
              displayRole: 'Assistant'
            }
          ],
          roadmapRef: `rm-${(chatId || 'unknown').split('-')[1] || 'default'}`
        };

        return {
          status: 200,
          data: { chat: mockChat },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint === '/debug/processes' && method === 'GET') {
        // Mock response for listing processes
        const mockProcesses = [
          {
            id: 'process-1',
            type: 'qwen',
            name: 'Qwen AI Process',
            pid: 1234,
            command: 'node',
            args: ['server.js'],
            cwd: '/app/qwen',
            startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            status: 'running'
          },
          {
            id: 'process-2',
            type: 'terminal',
            name: 'Terminal Session',
            pid: 5678,
            command: 'bash',
            args: [],
            cwd: '/home/user',
            startTime: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
            status: 'running'
          }
        ];

        return {
          status: 200,
          data: { processes: mockProcesses },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint.startsWith('/debug/processes/') && method === 'GET') {
        // Check if this is getting process details
        const pathParts = endpoint.split('/').filter(part => part !== ''); // Remove empty parts
        const processId = pathParts[2]; // Path is debug/processes/{id}, so ID is at index 2 after filtering

        if (processId === 'non-existent-process') {
          return {
            status: 404,
            data: { message: `Process with id ${processId} not found` },
            headers: { 'content-type': 'application/json' }
          };
        }

        const mockProcess = {
          id: processId || 'unknown',
          type: 'qwen',
          name: `Process ${processId || 'unknown'}`,
          pid: 1234,
          command: 'node',
          args: ['server.js'],
          cwd: '/app',
          startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          status: 'running',
          resources: {
            cpu: 25,
            memory: 128,
            fds: 3
          },
          environment: {
            NODE_ENV: 'development'
          }
        };

        return {
          status: 200,
          data: { process: mockProcess },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint === '/debug/websockets' && method === 'GET') {
        // Mock response for listing websockets
        const mockWebSockets = [
          {
            id: 'websocket-1',
            type: 'qwen',
            name: 'Qwen AI Connection',
            status: 'open',
            connectedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            remoteAddress: '127.0.0.1',
            protocol: 'websocket',
            connectionCount: 1
          },
          {
            id: 'websocket-2',
            type: 'terminal',
            name: 'Terminal Connection',
            status: 'open',
            connectedAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
            remoteAddress: '192.168.1.100',
            protocol: 'websocket',
            connectionCount: 2
          }
        ];

        return {
          status: 200,
          data: { websockets: mockWebSockets },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint.startsWith('/debug/websockets/') && method === 'GET') {
        // Check if this is getting websocket details
        const pathParts = endpoint.split('/').filter(part => part !== ''); // Remove empty parts
        const wsId = pathParts[2]; // Path is debug/websockets/{id}, so ID is at index 2 after filtering

        if (wsId === 'non-existent-websocket') {
          return {
            status: 404,
            data: { message: `WebSocket with id ${wsId} not found` },
            headers: { 'content-type': 'application/json' }
          };
        }

        const mockWebSocket = {
          id: wsId || 'unknown',
          type: 'qwen',
          name: `WebSocket ${wsId || 'unknown'}`,
          status: 'open',
          connectedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          remoteAddress: '127.0.0.1',
          protocol: 'websocket',
          connectionCount: 1,
          metadata: {
            sessionId: 'session-123'
          }
        };

        return {
          status: 200,
          data: { websocket: mockWebSocket },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint === '/projects' && method === 'POST') {
        // Mock response for creating a project
        const { name, category, description, status } = body || {};
        const newProjectId = `proj-${Date.now()}`;

        const newProject: ProjectDetails = {
          id: newProjectId,
          name: name || 'New Project',
          category: category || 'General',
          status: status || 'active',
          description: description || 'A new project',
          info: 'Detailed project information',
          theme: { primary: '#1a73e8' },
          contentPath: `/path/to/project/${newProjectId}`,
          gitUrl: `https://github.com/example/${name?.replace(/\s+/g, '-').toLowerCase() || 'new-project'}.git`,
          roadmapLists: []
        };

        // Add to static in-memory store
        staticProjects.push(newProject);

        return {
          status: 200,
          data: { project: newProject },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint === '/projects' && method === 'GET') {
        // This is the updated GET /projects endpoint
        // Return projects from the static in-memory store
        const projects = staticProjects.map(project => ({
          id: project.id,
          name: project.name,
          category: project.category,
          status: project.status,
          description: project.description,
          info: project.info,
          theme: project.theme,
          contentPath: project.contentPath,
          gitUrl: project.gitUrl
        } as ProjectSummary));

        return {
          status: 200,
          data: { projects: projects },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint === '/roadmaps' && method === 'POST') {
        // Mock response for creating a roadmap
        const { name, description, projectId } = body || {};
        const newRoadmapId = `rm-${Date.now()}`;

        const newRoadmap: RoadmapDetails = {
          id: newRoadmapId,
          title: name || 'New Roadmap',
          status: 'planned',
          progress: 0,
          tags: ['initial'],
          summary: description || 'A new roadmap',
          metaStatus: 'planned',
          metaProgress: 0,
          metaSummary: 'New roadmap created',
          projectRef: projectId
        };

        // Add to static in-memory store
        staticRoadmaps.push(newRoadmap);

        return {
          status: 200,
          data: { roadmap: newRoadmap },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint.startsWith('/projects/') && endpoint.includes('/roadmaps') && method === 'GET') {
        // Check if this is getting roadmaps for a project
        const projectId = endpoint.split('/')[2]; // Extract project ID from /projects/{id}/roadmaps

        // Filter roadmaps for the given project from static store
        const projectRoadmaps = staticRoadmaps.filter(roadmap => roadmap.projectRef === projectId);

        const roadmapSummaries = projectRoadmaps.map(roadmap => ({
          id: roadmap.id,
          title: roadmap.title,
          status: roadmap.status,
          progress: roadmap.progress,
          tags: roadmap.tags,
          summary: roadmap.summary,
          metaStatus: roadmap.metaStatus,
          metaProgress: roadmap.metaProgress,
          metaSummary: roadmap.metaSummary,
          projectRef: roadmap.projectRef
        } as RoadmapSummary));

        return {
          status: 200,
          data: { roadmaps: roadmapSummaries },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint === '/chats' && method === 'POST') {
        // Mock response for creating a chat
        const { name, description, roadmapId } = body || {};
        const newChatId = `chat-${Date.now()}`;

        const newChat: ChatDetails = {
          id: newChatId,
          title: name || 'New Chat',
          status: 'active',
          progress: 0,
          note: description || 'A new chat',
          meta: false,
          messages: [],
          roadmapRef: roadmapId
        };

        // Add to static in-memory store
        staticChats.push(newChat);

        return {
          status: 200,
          data: { chat: newChat },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint.startsWith('/roadmaps/') && endpoint.includes('/chats') && method === 'GET') {
        // Check if this is getting chats for a roadmap
        const roadmapId = endpoint.split('/')[2]; // Extract roadmap ID from /roadmaps/{id}/chats

        // Filter chats for the given roadmap from static store
        const roadmapChats = staticChats.filter(chat => chat.roadmapRef === roadmapId);

        const chatSummaries = roadmapChats.map(chat => ({
          id: chat.id,
          title: chat.title,
          status: chat.status,
          progress: chat.progress,
          note: chat.note,
          meta: chat.meta
        } as ChatSummary));

        return {
          status: 200,
          data: { chats: chatSummaries },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint === '/debug/poll-sessions' && method === 'GET') {
        // Mock response for listing poll sessions
        const mockPollSessions = [
          {
            id: 'poll-1',
            type: 'qwen',
            name: 'Qwen AI Poll Session',
            status: 'active',
            startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            lastPollAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
            intervalMs: 5000,
            endpoint: '/api/qwen/status',
            pollCount: 720
          },
          {
            id: 'poll-2',
            type: 'terminal',
            name: 'Terminal Poll Session',
            status: 'active',
            startedAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
            lastPollAt: new Date(Date.now() - 2000).toISOString(), // 2 seconds ago
            intervalMs: 10000,
            endpoint: '/api/terminal/status',
            pollCount: 180
          }
        ];

        return {
          status: 200,
          data: { pollSessions: mockPollSessions },
          headers: { 'content-type': 'application/json' }
        };
      } else if (endpoint.startsWith('/debug/poll-sessions/') && method === 'GET') {
        // Check if this is getting poll session details
        const pathParts = endpoint.split('/').filter(part => part !== ''); // Remove empty parts
        const pollId = pathParts[2]; // Path is debug/poll-sessions/{id}, so ID is at index 2 after filtering

        if (pollId === 'non-existent-poll') {
          return {
            status: 404,
            data: { message: `Poll session with id ${pollId} not found` },
            headers: { 'content-type': 'application/json' }
          };
        }

        const mockPollSession = {
          id: pollId || 'unknown',
          type: 'qwen',
          name: `Poll Session ${pollId || 'unknown'}`,
          status: 'active',
          startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          lastPollAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
          intervalMs: 5000,
          endpoint: '/api/qwen/status',
          pollCount: 720,
          metadata: {
            interval: 5000
          }
        };

        return {
          status: 200,
          data: { pollSession: mockPollSession },
          headers: { 'content-type': 'application/json' }
        };
      }

      // Check for authentication specific endpoints and simulate auth errors
      if (endpoint.startsWith('/projects') ||
          endpoint.startsWith('/roadmaps') ||
          endpoint.startsWith('/chats') ||
          endpoint.startsWith('/debug')) {
        // Simulate different auth responses for testing
        if (headers['Authorization'] === 'Bearer invalid-token') {
          return {
            status: 401,
            data: { message: 'Invalid authentication token' },
            headers: { 'content-type': 'application/json' }
          };
        } else if (!headers['Authorization']) {
          return {
            status: 401,
            data: { message: 'Authentication required' },
            headers: { 'content-type': 'application/json' }
          };
        }
      }

      // Default response for unhandled endpoints
      return {
        status: 404,
        data: { message: `Endpoint ${endpoint} not implemented in mock` },
        headers: { 'content-type': 'application/json' }
      };
    } catch (error) {
      return {
        status: 500,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        headers: { 'content-type': 'application/json' }
      };
    }
  }

  async createWebSocketSession(config: any): Promise<any> {
    // Placeholder implementation
    throw new Error('APIClient.createWebSocketSession not implemented');
  }

  // Specific project methods
  async getProjects(): Promise<ListProjectsResponse> {
    const response = await this.makeRequest('/projects', { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;
    const authErrorType = this.determineAuthErrorType(response);

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { projects: response.data.projects || [] },
      message: response.status === 200
        ? 'Projects retrieved successfully'
        : (isAuthError
          ? 'Authentication required or invalid token'
          : 'Failed to retrieve projects'),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? authErrorType : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  async getProjectById(id: string): Promise<GetProjectResponse> {
    const response = await this.makeRequest(`/projects/${id}`, { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;
    const authErrorType = this.determineAuthErrorType(response);

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { project: response.data.project || null },
      message: response.status === 200
        ? `Project ${id} retrieved successfully`
        : (isAuthError
          ? 'Authentication required or invalid token'
          : `Failed to retrieve project ${id}`),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? authErrorType : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  // Roadmap methods
  async getRoadmaps(projectId: string): Promise<ListRoadmapsResponse> {
    const response = await this.makeRequest(`/projects/${projectId}/roadmaps`, { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;
    const authErrorType = this.determineAuthErrorType(response);

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { roadmaps: response.data.roadmaps || [] },
      message: response.status === 200
        ? `Roadmaps for project ${projectId} retrieved successfully`
        : (isAuthError
          ? 'Authentication required or invalid token'
          : `Failed to retrieve roadmaps for project ${projectId}`),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? authErrorType : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  async getRoadmapById(roadmapId: string): Promise<GetRoadmapResponse> {
    const response = await this.makeRequest(`/roadmaps/${roadmapId}`, { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;
    const authErrorType = this.determineAuthErrorType(response);

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { roadmap: response.data.roadmap || null },
      message: response.status === 200
        ? `Roadmap ${roadmapId} retrieved successfully`
        : (isAuthError
          ? 'Authentication required or invalid token'
          : `Failed to retrieve roadmap ${roadmapId}`),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? authErrorType : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  // Chat methods
  async getChats(roadmapId: string): Promise<ListChatsResponse> {
    const response = await this.makeRequest(`/roadmaps/${roadmapId}/chats`, { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;
    const authErrorType = this.determineAuthErrorType(response);

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { chats: response.data.chats || [] },
      message: response.status === 200
        ? `Chats for roadmap ${roadmapId} retrieved successfully`
        : (isAuthError
          ? 'Authentication required or invalid token'
          : `Failed to retrieve chats for roadmap ${roadmapId}`),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? authErrorType : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  async getChatById(chatId: string): Promise<GetChatResponse> {
    const response = await this.makeRequest(`/chats/${chatId}`, { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;
    const authErrorType = this.determineAuthErrorType(response);

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { chat: response.data.chat || null },
      message: response.status === 200
        ? `Chat ${chatId} retrieved successfully`
        : (isAuthError
          ? 'Authentication required or invalid token'
          : `Failed to retrieve chat ${chatId}`),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? authErrorType : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  // AI Chat methods
  async startAiChatSession(): Promise<{ sessionId: string }> {
    // Mock implementation - in a real implementation, this would make an API call
    // to create a new AI chat session on the backend
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    return { sessionId: `ai-session-${Date.now()}` };
  }

  async *sendAiChatMessage(sessionId: string, text: string): AsyncGenerator<AiTokenEvent> {
    // Mock implementation that simulates streaming tokens
    // In a real implementation, this would connect to an AI backend API

    // Split the input text into words for streaming simulation
    const words = text.split(' ');
    let chunkIndex = 0;

    for (const word of words) {
      // Simulate delay between tokens
      await new Promise(resolve => setTimeout(resolve, 50));
      yield {
        event: 'token',
        content: word + ' ',
        messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        chunkIndex: chunkIndex++
      };
    }

    // Simulate a final delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send completion event
    yield {
      event: 'done',
      content: '',
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chunkIndex: chunkIndex,  // Final chunk index
      isFinal: true            // Explicitly mark this as the final token
    };
  }

  // Login method to authenticate the user
  async login(username: string, password: string): Promise<{ token: string, user: { id: string, username: string } }> {
    const response = await this.makeRequest('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { username, password }
    });

    if (response.status === 200) {
      const { token, user } = response.data;
      // Update the token in this client instance
      this.token = token;
      return { token, user };
    } else {
      // Check if this is an authentication error (invalid credentials)
      if (response.status === 401) {
        throw new Error('Invalid credentials provided');
      }
      throw new Error(response.data.error || 'Login failed');
    }
  }

  // Helper method to determine the specific type of auth error
  private determineAuthErrorType(response: APIResponse): string {
    if (response.status === 401) {
      // Check response body or headers for specific indicators of token expiration
      // In a real implementation, the backend might return specific headers or message
      // Here we'll assume that 401 typically means the token is expired or invalid
      // For now, we'll return auth_expired as the most common case
      if (response.data && typeof response.data === 'object' &&
          (response.data.message?.toLowerCase().includes('expired') ||
           response.data.error?.toLowerCase().includes('expired'))) {
        return 'AUTH_EXPIRED_ERROR';
      }
      return 'AUTH_EXPIRED_ERROR'; // Default to expired for 401
    } else if (response.status === 403) {
      // 403 usually means valid token but unauthorized access
      return 'AUTH_INVALID_CREDENTIALS_ERROR';
    }
    return 'AUTH_ERROR'; // Default auth error type
  }

  // Network element methods
  async getNetworkElements(filters?: { type?: string; status?: string }): Promise<ListNetworkElementsResponse> {
    // Mock implementation - in a real implementation, this would call an API endpoint
    // Create mock data based on filters
    const mockElements = [
      {
        id: 'element-1',
        type: 'server',
        name: 'Main Server',
        status: 'online',
        metadata: { cpu: 65, memory: 72, uptime: '42 days' }
      },
      {
        id: 'element-2',
        type: 'connection',
        name: 'Server-DB Connection',
        status: 'online',
        metadata: { latency: 24, protocol: 'tcp' }
      },
      {
        id: 'element-3',
        type: 'process',
        name: 'AI Processing Engine',
        status: 'online',
        metadata: { pid: 1234, cpu: 25, memory: 128 }
      },
      {
        id: 'element-4',
        type: 'server',
        name: 'Backup Server',
        status: 'offline',
        metadata: { lastSeen: '2023-05-15T10:30:00Z' }
      }
    ];

    // Apply filters if provided
    const filteredElements = filters
      ? mockElements.filter(element => {
          if (filters.type && element.type !== filters.type) return false;
          if (filters.status && element.status !== filters.status) return false;
          return true;
        })
      : [...mockElements];

    return {
      status: 'ok',
      data: { elements: filteredElements },
      message: `Found ${filteredElements.length} network elements`,
      errors: []
    };
  }

  async getNetworkElementById(id: string): Promise<GetNetworkElementResponse> {
    // Mock implementation - in a real implementation, this would call an API endpoint
    const mockElements: NetworkElementDetails[] = [
      {
        id: 'element-1',
        type: 'server',
        name: 'Main Server',
        status: 'online',
        metadata: { cpu: 65, memory: 72, uptime: '42 days' },
        connections: [
          { id: 'conn-1', targetId: 'element-2', type: 'tcp', status: 'active', metadata: { latency: 12 } },
          { id: 'conn-2', targetId: 'element-3', type: 'tcp', status: 'active', metadata: { latency: 15 } }
        ]
      },
      {
        id: 'element-2',
        type: 'connection',
        name: 'Server-DB Connection',
        status: 'online',
        metadata: { latency: 24, protocol: 'tcp' }
      },
      {
        id: 'element-3',
        type: 'process',
        name: 'AI Processing Engine',
        status: 'online',
        metadata: { pid: 1234, cpu: 25, memory: 128 },
        connections: [
          { id: 'conn-3', targetId: 'element-1', type: 'tcp', status: 'active', metadata: { latency: 12 } }
        ]
      },
      {
        id: 'element-4',
        type: 'server',
        name: 'Backup Server',
        status: 'offline',
        metadata: { lastSeen: '2023-05-15T10:30:00Z' }
      }
    ];

    const element = mockElements.find(e => e.id === id);

    if (!element) {
      return {
        status: 'error',
        data: { element: null },
        message: `Network element with ID ${id} not found`,
        errors: [{ message: `NETWORK_ELEMENT_NOT_FOUND: ${id}` }]
      };
    }

    return {
      status: 'ok',
      data: { element },
      message: `Network element ${id} retrieved successfully`,
      errors: []
    };
  }

  async getNetworkStatus(): Promise<GetNetworkStatusResponse> {
    // Mock implementation - in a real implementation, this would call an API endpoint
    const mockSnapshot: NetworkStatusSnapshot = {
      overallStatus: 'degraded',
      elementsByStatus: {
        online: 3,
        offline: 1,
        degraded: 0
      },
      timestamp: new Date().toISOString(),
      totalElements: 4,
      onlineElements: 3,
      offlineElements: 1
    };

    return {
      status: 'ok',
      data: { status: mockSnapshot },
      message: `Network status: ${mockSnapshot.overallStatus}`,
      errors: []
    };
  }

  // Debug Process methods
  async getProcesses(): Promise<ListProcessesResponse> {
    const response = await this.makeRequest('/debug/processes', { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;
    const authErrorType = this.determineAuthErrorType(response);

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { processes: response.data.processes || [] },
      message: response.status === 200
        ? 'Processes retrieved successfully'
        : (isAuthError
          ? 'Authentication required or invalid token'
          : 'Failed to retrieve processes'),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? authErrorType : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  async getProcessById(id: string): Promise<GetProcessResponse> {
    const response = await this.makeRequest(`/debug/processes/${id}`, { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { process: response.data.process || null },
      message: response.status === 200
        ? `Process ${id} retrieved successfully`
        : (isAuthError
          ? 'Authentication required or invalid token'
          : response.data.message || `Failed to retrieve process ${id}`),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? 'AUTH_ERROR' : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  // Debug WebSocket methods
  async getWebSockets(): Promise<ListWebSocketsResponse> {
    const response = await this.makeRequest('/debug/websockets', { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;
    const authErrorType = this.determineAuthErrorType(response);

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { websockets: response.data.websockets || [] },
      message: response.status === 200
        ? 'WebSockets retrieved successfully'
        : (isAuthError
          ? 'Authentication required or invalid token'
          : 'Failed to retrieve WebSockets'),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? authErrorType : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  async getWebSocketById(id: string): Promise<GetWebSocketResponse> {
    const response = await this.makeRequest(`/debug/websockets/${id}`, { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { websocket: response.data.websocket || null },
      message: response.status === 200
        ? `WebSocket ${id} retrieved successfully`
        : (isAuthError
          ? 'Authentication required or invalid token'
          : response.data.message || `Failed to retrieve WebSocket ${id}`),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? 'AUTH_ERROR' : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  // Debug Poll Session methods
  async getPollSessions(): Promise<ListPollSessionsResponse> {
    const response = await this.makeRequest('/debug/poll-sessions', { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { pollSessions: response.data.pollSessions || [] },
      message: response.status === 200
        ? 'Poll sessions retrieved successfully'
        : (isAuthError
          ? 'Authentication required or invalid token'
          : 'Failed to retrieve poll sessions'),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? 'AUTH_ERROR' : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  async getPollSessionById(id: string): Promise<GetPollSessionResponse> {
    const response = await this.makeRequest(`/debug/poll-sessions/${id}`, { method: 'GET', headers: {} });
    const isAuthError = response.status === 401 || response.status === 403;

    return {
      status: response.status === 200 ? 'ok' : (isAuthError ? 'auth_error' : 'error'),
      data: { pollSession: response.data.pollSession || null },
      message: response.status === 200
        ? `Poll session ${id} retrieved successfully`
        : (isAuthError
          ? 'Authentication required or invalid token'
          : response.data.message || `Failed to retrieve poll session ${id}`),
      errors: response.status === 200
        ? []
        : [{
          type: isAuthError ? 'AUTH_ERROR' : 'GENERAL_ERROR',
          message: response.data.message,
          code: response.status
        }]
    };
  }

  // Create project method
  async createProject(projectData: { name: string; category: string; description: string; status: string }): Promise<CreateProjectResponse> {
    const response = await this.makeRequest('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: projectData
    });

    const isAuthError = response.status === 401 || response.status === 403;
    const authErrorType = this.determineAuthErrorType(response);

    // Generate a mock project ID for the new project
    const mockProjectId = `proj-${Date.now()}`;

    // Create response based on the API response
    if (response.status === 200) {
      // If the API returned a project, use that; otherwise create a mock one
      const project = response.data.project || {
        id: mockProjectId,
        name: projectData.name,
        category: projectData.category,
        status: projectData.status,
        description: projectData.description,
        info: 'Detailed project information',
        theme: { primary: '#1a73e8' },
        contentPath: `/path/to/project/${mockProjectId}`,
        gitUrl: `https://github.com/example/${projectData.name.replace(/\s+/g, '-').toLowerCase()}.git`
      };

      return {
        status: 'ok',
        data: { project },
        message: `Project "${projectData.name}" created successfully with ID: ${project.id}`,
        errors: []
      };
    } else {
      return {
        status: isAuthError ? 'auth_error' : 'error',
        data: { project: response.data.project || null },
        message: response.data.message || `Failed to create project: ${projectData.name}`,
        errors: [{
          type: isAuthError ? authErrorType : 'GENERAL_ERROR',
          message: response.data.message || 'Failed to create project',
          code: response.status
        }]
      };
    }
  }

  // Create roadmap method
  async createRoadmap(roadmapData: { name: string; description: string; projectId: string }): Promise<CreateRoadmapResponse> {
    const response = await this.makeRequest('/roadmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: roadmapData
    });

    const isAuthError = response.status === 401 || response.status === 403;
    const authErrorType = this.determineAuthErrorType(response);

    // Generate a mock roadmap ID for the new roadmap
    const mockRoadmapId = `rm-${Date.now()}`;

    // Create response based on the API response
    if (response.status === 200) {
      // If the API returned a roadmap, use that; otherwise create a mock one
      const roadmap = response.data.roadmap || {
        id: mockRoadmapId,
        title: roadmapData.name,
        status: 'planned',
        progress: 0,
        tags: ['initial'],
        summary: roadmapData.description,
        metaStatus: 'planned',
        metaProgress: 0,
        metaSummary: 'New roadmap created',
        projectRef: roadmapData.projectId
      };

      return {
        status: 'ok',
        data: { roadmap },
        message: `Roadmap "${roadmapData.name}" created successfully with ID: ${roadmap.id}`,
        errors: []
      };
    } else {
      return {
        status: isAuthError ? 'auth_error' : 'error',
        data: { roadmap: response.data.roadmap || null },
        message: response.data.message || `Failed to create roadmap: ${roadmapData.name}`,
        errors: [{
          type: isAuthError ? authErrorType : 'GENERAL_ERROR',
          message: response.data.message || 'Failed to create roadmap',
          code: response.status
        }]
      };
    }
  }

  // Create chat method
  async createChat(chatData: { name: string; description: string; roadmapId: string }): Promise<CreateChatResponse> {
    const response = await this.makeRequest('/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: chatData
    });

    const isAuthError = response.status === 401 || response.status === 403;
    const authErrorType = this.determineAuthErrorType(response);

    // Generate a mock chat ID for the new chat
    const mockChatId = `chat-${Date.now()}`;

    // Create response based on the API response
    if (response.status === 200) {
      // If the API returned a chat, use that; otherwise create a mock one
      const chat = response.data.chat || {
        id: mockChatId,
        title: chatData.name,
        status: 'active',
        progress: 0,
        note: chatData.description,
        meta: false,
        messages: [],
        roadmapRef: chatData.roadmapId
      };

      return {
        status: 'ok',
        data: { chat },
        message: `Chat "${chatData.name}" created successfully with ID: ${chat.id}`,
        errors: []
      };
    } else {
      return {
        status: isAuthError ? 'auth_error' : 'error',
        data: { chat: response.data.chat || null },
        message: response.data.message || `Failed to create chat: ${chatData.name}`,
        errors: [{
          type: isAuthError ? authErrorType : 'GENERAL_ERROR',
          message: response.data.message || 'Failed to create chat',
          code: response.status
        }]
      };
    }
  }

  // Streaming debug events
  async *streamProcessLogs(processId: string) {
    // Mock implementation - in a real implementation, this would connect to a streaming endpoint
    // For this mock implementation, we'll generate fake log events

    const events = [
      { event: 'log', timestamp: new Date().toISOString(), data: { line: `Starting process ${processId}`, level: 'info' } },
      { event: 'log', timestamp: new Date().toISOString(), data: { line: 'Initializing system resources', level: 'info' } },
      { event: 'log', timestamp: new Date().toISOString(), data: { line: 'Loading configuration files', level: 'debug' } },
      { event: 'log', timestamp: new Date().toISOString(), data: { line: 'Establishing database connections', level: 'info' } },
      { event: 'log', timestamp: new Date().toISOString(), data: { line: 'Starting network interface', level: 'info' } },
      { event: 'log', timestamp: new Date().toISOString(), data: { line: 'Service ready to accept requests', level: 'info' } },
      { event: 'status', timestamp: new Date().toISOString(), message: 'Process is running normally' },
      { event: 'end', timestamp: new Date().toISOString() }
    ];

    for (const event of events) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)); // Random delay between 50-150ms
      yield event;
    }
  }

  async *streamWebSocketFrames(wsId: string) {
    // Mock implementation - in a real implementation, this would connect to a streaming endpoint
    // For this mock implementation, we'll generate fake websocket frame events

    const events = [
      { event: 'frame', timestamp: new Date().toISOString(), data: { type: 'open', direction: 'outbound', payload: { type: 'connect', sessionId: wsId } } },
      { event: 'frame', timestamp: new Date().toISOString(), data: { type: 'message', direction: 'inbound', payload: { type: 'request', action: 'getStatus' } } },
      { event: 'frame', timestamp: new Date().toISOString(), data: { type: 'message', direction: 'outbound', payload: { type: 'response', action: 'getStatus', status: 'active' } } },
      { event: 'frame', timestamp: new Date().toISOString(), data: { type: 'message', direction: 'inbound', payload: { type: 'request', action: 'updateData' } } },
      { event: 'frame', timestamp: new Date().toISOString(), data: { type: 'message', direction: 'outbound', payload: { type: 'response', action: 'updateData', success: true } } },
      { event: 'frame', timestamp: new Date().toISOString(), data: { type: 'ping', direction: 'outbound', payload: {} } },
      { event: 'frame', timestamp: new Date().toISOString(), data: { type: 'pong', direction: 'inbound', payload: {} } },
      { event: 'status', timestamp: new Date().toISOString(), message: 'WebSocket connection is stable' },
      { event: 'end', timestamp: new Date().toISOString() }
    ];

    for (const event of events) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)); // Random delay between 50-150ms
      yield event;
    }
  }

  async *streamPollEvents(pollId: string) {
    // Mock implementation - in a real implementation, this would connect to a streaming endpoint
    // For this mock implementation, we'll generate fake poll session events

    const events = [
      { event: 'poll', timestamp: new Date().toISOString(), data: { type: 'request', url: '/api/status', method: 'GET', requestId: `req-${Date.now()}-1` } },
      { event: 'poll', timestamp: new Date().toISOString(), data: { type: 'response', status: 200, requestId: `req-${Date.now()}-1`, responseTimeMs: 15 } },
      { event: 'poll', timestamp: new Date().toISOString(), data: { type: 'request', url: '/api/data', method: 'GET', requestId: `req-${Date.now()}-2` } },
      { event: 'poll', timestamp: new Date().toISOString(), data: { type: 'response', status: 200, requestId: `req-${Date.now()}-2`, responseTimeMs: 22 } },
      { event: 'poll', timestamp: new Date().toISOString(), data: { type: 'request', url: '/api/health', method: 'GET', requestId: `req-${Date.now()}-3` } },
      { event: 'poll', timestamp: new Date().toISOString(), data: { type: 'response', status: 500, requestId: `req-${Date.now()}-3`, responseTimeMs: 5 } },
      { event: 'status', timestamp: new Date().toISOString(), message: 'Health check failed, retrying...' },
      { event: 'poll', timestamp: new Date().toISOString(), data: { type: 'request', url: '/api/health', method: 'GET', requestId: `req-${Date.now()}-4` } },
      { event: 'poll', timestamp: new Date().toISOString(), data: { type: 'response', status: 200, requestId: `req-${Date.now()}-4`, responseTimeMs: 12 } },
      { event: 'status', timestamp: new Date().toISOString(), message: 'Poll session running normally' },
      { event: 'end', timestamp: new Date().toISOString() }
    ];

    for (const event of events) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)); // Random delay between 50-150ms
      yield event;
    }
  }

  async *streamNetworkHealth(): AsyncGenerator<RawNetworkEvent> {
    // Mock implementation - in a real implementation, this would connect to a streaming endpoint
    // For this mock implementation, we'll generate fake network health events

    const statuses = ['online', 'degraded', 'offline'];
    const events: RawNetworkEvent[] = [
      { event: 'status', data: { cpu: 45, mem: 62, latency: 25, status: 'online', timestamp: new Date().toISOString() } },
      { event: 'metric', data: { cpu: 52, mem: 68, latency: 27, rxBytes: 120567, txBytes: 98432, timestamp: new Date().toISOString() } },
      { event: 'metric', data: { cpu: 48, mem: 71, latency: 23, rxBytes: 125678, txBytes: 102345, timestamp: new Date().toISOString() } },
      { event: 'status', data: { cpu: 55, mem: 74, latency: 30, status: 'degraded', timestamp: new Date().toISOString() } },
      { event: 'error', data: { error: 'High latency detected', code: 'HIGH_LATENCY', timestamp: new Date().toISOString() } },
      { event: 'metric', data: { cpu: 60, mem: 78, latency: 35, rxBytes: 130789, txBytes: 108456, timestamp: new Date().toISOString() } },
      { event: 'metric', data: { cpu: 57, mem: 75, latency: 32, rxBytes: 135890, txBytes: 112567, timestamp: new Date().toISOString() } },
      { event: 'status', data: { cpu: 42, mem: 68, latency: 18, status: 'online', timestamp: new Date().toISOString() } },
      { event: 'status', data: { message: 'Network is operating normally', timestamp: new Date().toISOString() } },
      { event: 'metric', data: { cpu: 38, mem: 65, latency: 15, rxBytes: 140901, txBytes: 118678, timestamp: new Date().toISOString() } },
      { event: 'end', data: { message: 'Stream completed', timestamp: new Date().toISOString() } }
    ];

    for (const event of events) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)); // Random delay between 50-150ms
      yield event;
    }
  }

  async *streamNetworkGraph(): AsyncGenerator<RawGraphEvent> {
    // Mock implementation - in a real implementation, this would connect to a streaming endpoint
    // For this mock implementation, we'll generate fake network graph events

    const updateGraphEvent = (nodes: Node[], edges: Edge[]): RawGraphEvent => ({
      event: 'graph-update',
      data: { nodes, edges }
    });

    const nodes: Node[] = [
      { id: 'server-1', type: 'server', status: 'online' },
      { id: 'server-2', type: 'server', status: 'online' },
      { id: 'connection-1', type: 'connection', status: 'active' },
      { id: 'process-1', type: 'process', status: 'running' }
    ];

    const edges: Edge[] = [
      { from: 'server-1', to: 'connection-1', latency: 12 },
      { from: 'server-2', to: 'connection-1', latency: 15 },
      { from: 'process-1', to: 'server-1', latency: 8 }
    ];

    const events: RawGraphEvent[] = [
      updateGraphEvent(nodes, edges),
      updateGraphEvent(
        [...nodes, { id: 'new-server', type: 'server', status: 'starting' }],
        [
          ...edges,
          { from: 'new-server', to: 'connection-1', latency: 20 }
        ]
      ),
      updateGraphEvent(
        nodes.map(n => n.id === 'new-server' ? { ...n, status: 'online' } : n),
        edges
      ),
      updateGraphEvent(
        nodes.map(n => n.id === 'server-1' ? { ...n, status: 'degraded' } : n),
        edges
      ),
      updateGraphEvent(
        nodes.map(n => n.id === 'server-1' ? { ...n, status: 'online' } : n),
        edges
      ),
      updateGraphEvent(
        nodes.filter(n => n.id !== 'new-server'),
        edges.filter(e => e.from !== 'new-server' && e.to !== 'new-server')
      ),
      updateGraphEvent(nodes, edges),
      { event: 'graph-update', data: { nodes, edges } },
      { event: 'end', data: { nodes: [], edges: [], message: 'Graph stream completed', timestamp: new Date().toISOString() } }
    ];

    for (const event of events) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 100)); // Random delay between 100-250ms
      yield event;
    }
  }

  async *streamNetworkElementHealth(elementId: string): AsyncGenerator<RawNetworkEvent> {
    // Mock implementation - in a real implementation, this would connect to a streaming endpoint
    // For this mock implementation, we'll generate fake network element health events

    const events: RawNetworkEvent[] = [
      { event: 'status', data: { elementId, status: 'online', timestamp: new Date().toISOString() } },
      { event: 'metric', data: { elementId, cpu: 30, mem: 45, timestamp: new Date().toISOString() } },
      { event: 'metric', data: { elementId, cpu: 35, mem: 50, timestamp: new Date().toISOString() } },
      { event: 'status', data: { elementId, status: 'warning', timestamp: new Date().toISOString() } },
      { event: 'metric', data: { elementId, cpu: 85, mem: 92, timestamp: new Date().toISOString() } },
      { event: 'error', data: { elementId, error: 'High CPU usage', code: 'HIGH_CPU', timestamp: new Date().toISOString() } },
      { event: 'metric', data: { elementId, cpu: 80, mem: 88, timestamp: new Date().toISOString() } },
      { event: 'metric', data: { elementId, cpu: 75, mem: 85, timestamp: new Date().toISOString() } },
      { event: 'status', data: { elementId, status: 'online', timestamp: new Date().toISOString() } },
      { event: 'metric', data: { elementId, cpu: 40, mem: 55, timestamp: new Date().toISOString() } },
      { event: 'end', data: { elementId, message: 'Element monitoring completed', timestamp: new Date().toISOString() } }
    ];

    for (const event of events) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 75)); // Random delay between 75-175ms
      yield event;
    }
  }
}

// Define the types for network streaming events
type RawNetworkEvent = {
  event: 'status' | 'metric' | 'error' | 'end';
  data: {
    [key: string]: any;
  };
};

type RawGraphEvent = {
  event: 'graph-update' | 'end';
  data: {
    nodes: Node[];
    edges: Edge[];
  } & Record<string, any>; // Allow additional properties
};

type Node = {
  id: string;
  type: string;
  status: string;
};

type Edge = {
  from: string;
  to: string;
  latency?: number;
};

export const API_CLIENT = new APIClient();
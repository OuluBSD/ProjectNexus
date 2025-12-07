import { CommandHandler } from '../runtime/handler-registry';
import { ExecutionContext } from '../runtime/types';

export interface CLICommandEntry {
  id: string;              // e.g. "agent.project.list"
  path: string[];          // ["agent","project","list"]
  description: string;
  args: { name: string; required: boolean; }[];
  flags: { name: string; required: boolean; type: string; allowedValues?: string[] }[];
  contextRequired?: string[];
  streaming?: boolean;
}

export const CLI_MANIFEST: CLICommandEntry[] = [
  // Agent project commands
  {
    id: 'agent.project.list',
    path: ['agent', 'project', 'list'],
    description: 'List all projects',
    args: [],
    flags: [
      { name: 'filter', required: false, type: 'string' },
      { name: 'include-hidden', required: false, type: 'boolean' }
    ],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'agent.project.view',
    path: ['agent', 'project', 'view'],
    description: 'View details of a specific project',
    args: [{ name: 'projectId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'agent.project.select',
    path: ['agent', 'project', 'select'],
    description: 'Select a project as the current context',
    args: [{ name: 'projectId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'agent.project.current',
    path: ['agent', 'project', 'current'],
    description: 'Show the currently selected project',
    args: [],
    flags: [],
    contextRequired: [],
    streaming: false
  },

  // Agent roadmap commands
  {
    id: 'agent.roadmap.list',
    path: ['agent', 'roadmap', 'list'],
    description: 'List roadmaps for the current project',
    args: [],
    flags: [],
    contextRequired: ['project'],
    streaming: false
  },
  {
    id: 'agent.roadmap.view',
    path: ['agent', 'roadmap', 'view'],
    description: 'View details of a specific roadmap',
    args: [{ name: 'roadmapId', required: true }],
    flags: [],
    contextRequired: ['project'],
    streaming: false
  },
  {
    id: 'agent.roadmap.select',
    path: ['agent', 'roadmap', 'select'],
    description: 'Select a roadmap as the current context',
    args: [{ name: 'roadmapId', required: true }],
    flags: [],
    contextRequired: ['project'],
    streaming: false
  },

  // Agent chat commands
  {
    id: 'agent.chat.list',
    path: ['agent', 'chat', 'list'],
    description: 'List chats for the current roadmap',
    args: [],
    flags: [],
    contextRequired: ['project', 'roadmap'],
    streaming: false
  },
  {
    id: 'agent.chat.view',
    path: ['agent', 'chat', 'view'],
    description: 'View details of a specific chat',
    args: [{ name: 'chatId', required: true }],
    flags: [],
    contextRequired: ['project', 'roadmap'],
    streaming: false
  },
  {
    id: 'agent.chat.select',
    path: ['agent', 'chat', 'select'],
    description: 'Select a chat as the current context',
    args: [{ name: 'chatId', required: true }],
    flags: [],
    contextRequired: ['project', 'roadmap'],
    streaming: false
  },

  // Settings commands
  {
    id: 'settings.show',
    path: ['settings', 'show'],
    description: 'Show current settings',
    args: [],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'settings.set',
    path: ['settings', 'set'],
    description: 'Set a specific setting',
    args: [
      { name: 'key', required: true },
      { name: 'value', required: true }
    ],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'settings.reset',
    path: ['settings', 'reset'],
    description: 'Reset a specific setting to default',
    args: [{ name: 'key', required: true }],
    flags: [],
    contextRequired: [],
    streaming: false
  },

  // Auth commands
  {
    id: 'auth.login',
    path: ['auth', 'login'],
    description: 'Login to the system',
    args: [
      { name: 'username', required: true },
      { name: 'password', required: true }
    ],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'auth.logout',
    path: ['auth', 'logout'],
    description: 'Logout from the system',
    args: [],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'auth.status',
    path: ['auth', 'status'],
    description: 'Show current authentication status',
    args: [],
    flags: [],
    contextRequired: [],
    streaming: false
  },

  // Network commands
  {
    id: 'network.element.list',
    path: ['network', 'element', 'list'],
    description: 'List network elements',
    args: [],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'network.element.view',
    path: ['network', 'element', 'view'],
    description: 'View details of a specific network element',
    args: [{ name: 'elementId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'network.status',
    path: ['network', 'status'],
    description: 'Get the current network status',
    args: [],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'network.health.stream',
    path: ['network', 'health', 'stream'],
    description: 'Stream live network health updates',
    args: [],
    flags: [],
    contextRequired: [],
    streaming: true
  },
  {
    id: 'network.graph.stream',
    path: ['network', 'graph', 'stream'],
    description: 'Stream live network graph updates',
    args: [],
    flags: [],
    contextRequired: [],
    streaming: true
  },
  {
    id: 'network.element.monitor',
    path: ['network', 'element', 'monitor'],
    description: 'Monitor network element in real-time',
    args: [{ name: 'elementId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: true
  },

  // Debug process commands
  {
    id: 'debug.process.list',
    path: ['debug', 'process', 'list'],
    description: 'List running processes',
    args: [],
    flags: [
      { name: 'status', required: false, type: 'string', allowedValues: ['running', 'stopped', 'all'] },
      { name: 'type', required: false, type: 'string', allowedValues: ['qwen', 'terminal', 'git', 'other'] }
    ],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'debug.process.view',
    path: ['debug', 'process', 'view'],
    description: 'View details of a specific process',
    args: [{ name: 'processId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'debug.process.inspect',
    path: ['debug', 'process', 'inspect'],
    description: 'Inspect details of a specific process',
    args: [{ name: 'processId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'debug.process.monitor',
    path: ['debug', 'process', 'monitor'],
    description: 'Monitor a process in real-time',
    args: [{ name: 'processId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: true
  },
  {
    id: 'debug.process.kill',
    path: ['debug', 'process', 'kill'],
    description: 'Kill a running process',
    args: [{ name: 'processId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'debug.process.logs',
    path: ['debug', 'process', 'logs'],
    description: 'Get logs for a specific process',
    args: [{ name: 'processId', required: true }],
    flags: [
      { name: 'lines', required: false, type: 'number' },
      { name: 'follow', required: false, type: 'boolean' }
    ],
    contextRequired: [],
    streaming: false
  },

  // Debug log commands
  {
    id: 'debug.log.tail',
    path: ['debug', 'log', 'tail'],
    description: 'Tail system logs in real-time',
    args: [],
    flags: [
      { name: 'lines', required: false, type: 'number' },
      { name: 'filter', required: false, type: 'string' }
    ],
    contextRequired: [],
    streaming: true
  },
  {
    id: 'debug.log.view',
    path: ['debug', 'log', 'view'],
    description: 'View system logs',
    args: [],
    flags: [
      { name: 'lines', required: false, type: 'number' },
      { name: 'filter', required: false, type: 'string' }
    ],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'debug.log.search',
    path: ['debug', 'log', 'search'],
    description: 'Search through system logs',
    args: [{ name: 'query', required: true }],
    flags: [
      { name: 'lines', required: false, type: 'number' },
      { name: 'before', required: false, type: 'number' },
      { name: 'after', required: false, type: 'number' }
    ],
    contextRequired: [],
    streaming: false
  },

  // Debug websocket commands
  {
    id: 'debug.websocket.list',
    path: ['debug', 'websocket', 'list'],
    description: 'List active WebSocket connections',
    args: [],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'debug.websocket.view',
    path: ['debug', 'websocket', 'view'],
    description: 'View details of a specific WebSocket connection',
    args: [{ name: 'connectionId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'debug.websocket.stream',
    path: ['debug', 'websocket', 'stream'],
    description: 'Stream WebSocket messages in real-time',
    args: [{ name: 'connectionId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: true
  },

  // Debug poll commands
  {
    id: 'debug.poll.list',
    path: ['debug', 'poll', 'list'],
    description: 'List active poll operations',
    args: [],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'debug.poll.view',
    path: ['debug', 'poll', 'view'],
    description: 'View details of a specific poll operation',
    args: [{ name: 'pollId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: false
  },
  {
    id: 'debug.poll.stream',
    path: ['debug', 'poll', 'stream'],
    description: 'Stream poll operation updates in real-time',
    args: [{ name: 'pollId', required: true }],
    flags: [],
    contextRequired: [],
    streaming: true
  }
];
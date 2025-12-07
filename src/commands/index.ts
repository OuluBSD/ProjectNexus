// src/commands/index.ts
// Command handlers registration

import { handlerRegistry } from '../runtime/handler-registry';
import { ProjectListHandler } from './agent/project/list';
import { ProjectViewHandler } from './agent/project/view';
import { ProjectSelectHandler } from './agent/project/select';
import { ProjectCurrentHandler } from './agent/project/current';
import { RoadmapListHandler } from './agent/roadmap/list';
import { RoadmapViewHandler } from './agent/roadmap/view';
import { RoadmapSelectHandler } from './agent/roadmap/select';
import { ChatListHandler } from './agent/chat/list';
import { ChatViewHandler } from './agent/chat/view';
import { ChatSelectHandler } from './agent/chat/select';

// Settings commands
import { SettingsShowHandler } from './settings/show';
import { SettingsSetHandler } from './settings/set';
import { SettingsResetHandler } from './settings/reset';

// Auth commands
import { AuthLoginHandler } from './auth/login';
import { AuthLogoutHandler } from './auth/logout';
import { AuthStatusHandler } from './auth/status';

// Network commands
import { NetworkElementListHandler } from './network/element/list';
import { NetworkElementViewHandler } from './network/element/view';
import { NetworkStatusHandler } from './network/status';
import { NetworkHealthStreamHandler } from './network/streaming/health-stream';
import { NetworkGraphStreamHandler } from './network/streaming/graph-stream';
import { NetworkElementMonitorHandler } from './network/streaming/element-monitor';

// Debug commands
import { DebugProcessListHandler } from './debug/process/list';
import { DebugProcessViewHandler } from './debug/process/view';
import { DebugProcessInspectHandler } from './debug/process/inspect';
import { DebugProcessMonitorHandler } from './debug/process/monitor';
import { DebugProcessKillHandler } from './debug/process/kill';
import { DebugProcessLogsHandler } from './debug/process/logs';

import { DebugLogTailHandler } from './debug/log/tail';
import { DebugLogViewHandler } from './debug/log/view';
import { DebugLogSearchHandler } from './debug/log/search';

import { DebugWebSocketListHandler } from './debug/websocket/list';
import { DebugWebSocketViewHandler } from './debug/websocket/view';
import { DebugWebSocketStreamHandler } from './debug/websocket/stream';

import { DebugPollListHandler } from './debug/poll/list';
import { DebugPollViewHandler } from './debug/poll/view';
import { DebugPollStreamHandler } from './debug/poll/stream';

// System commands
import { SystemHelpHandler } from './system/help';
import { SystemVersionHandler } from './system/version';
import { SystemParityHandler } from './system/parity';
import { SystemCompletionHandler } from './system/completion';
import { SystemDoctorHandler } from './system/doctor';

// Register all command handlers
export function registerCommandHandlers(): void {
  // Agent project commands
  handlerRegistry.register('agent.project.list', new ProjectListHandler());
  handlerRegistry.register('agent.project.view', new ProjectViewHandler());
  handlerRegistry.register('agent.project.select', new ProjectSelectHandler());
  handlerRegistry.register('agent.project.current', new ProjectCurrentHandler());

  // Agent roadmap commands
  handlerRegistry.register('agent.roadmap.list', new RoadmapListHandler());
  handlerRegistry.register('agent.roadmap.view', new RoadmapViewHandler());
  handlerRegistry.register('agent.roadmap.select', new RoadmapSelectHandler());

  // Agent chat commands
  handlerRegistry.register('agent.chat.list', new ChatListHandler());
  handlerRegistry.register('agent.chat.view', new ChatViewHandler());
  handlerRegistry.register('agent.chat.select', new ChatSelectHandler());

  // Settings commands
  handlerRegistry.register('settings.show', new SettingsShowHandler());
  handlerRegistry.register('settings.set', new SettingsSetHandler());
  handlerRegistry.register('settings.reset', new SettingsResetHandler());

  // Auth commands
  handlerRegistry.register('auth.login', new AuthLoginHandler());
  handlerRegistry.register('auth.logout', new AuthLogoutHandler());
  handlerRegistry.register('auth.status', new AuthStatusHandler());

  // Network commands
  handlerRegistry.register('network.element.list', new NetworkElementListHandler());
  handlerRegistry.register('network.element.view', new NetworkElementViewHandler());
  handlerRegistry.register('network.status', new NetworkStatusHandler());
  handlerRegistry.register('network.health.stream', new NetworkHealthStreamHandler());
  handlerRegistry.register('network.graph.stream', new NetworkGraphStreamHandler());
  handlerRegistry.register('network.element.monitor', new NetworkElementMonitorHandler());

  // Debug process commands
  handlerRegistry.register('debug.process.list', new DebugProcessListHandler());
  handlerRegistry.register('debug.process.view', new DebugProcessViewHandler());
  handlerRegistry.register('debug.process.inspect', new DebugProcessInspectHandler());
  handlerRegistry.register('debug.process.monitor', new DebugProcessMonitorHandler());
  handlerRegistry.register('debug.process.kill', new DebugProcessKillHandler());
  handlerRegistry.register('debug.process.logs', new DebugProcessLogsHandler());

  // Debug log commands
  handlerRegistry.register('debug.log.tail', new DebugLogTailHandler());
  handlerRegistry.register('debug.log.view', new DebugLogViewHandler());
  handlerRegistry.register('debug.log.search', new DebugLogSearchHandler());

  // Debug websocket commands
  handlerRegistry.register('debug.websocket.list', new DebugWebSocketListHandler());
  handlerRegistry.register('debug.websocket.view', new DebugWebSocketViewHandler());
  handlerRegistry.register('debug.websocket.stream', new DebugWebSocketStreamHandler());

  // Debug poll commands
  handlerRegistry.register('debug.poll.list', new DebugPollListHandler());
  handlerRegistry.register('debug.poll.view', new DebugPollViewHandler());
  handlerRegistry.register('debug.poll.stream', new DebugPollStreamHandler());

  // System commands
  handlerRegistry.register('system.parity', new SystemParityHandler());
  handlerRegistry.register('system.help', new SystemHelpHandler());
  handlerRegistry.register('system.version', new SystemVersionHandler());
  handlerRegistry.register('system.completion', new SystemCompletionHandler());
  handlerRegistry.register('system.doctor', new SystemDoctorHandler());

  // Add more handlers as they are implemented
}

// Initialize command handlers on import
registerCommandHandlers();
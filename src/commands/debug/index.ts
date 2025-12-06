// src/commands/debug/index.ts
// Debug namespace module entry point

import { DebugProcessListHandler } from './process/list';
import { DebugProcessViewHandler } from './process/view';
import { DebugProcessInspectHandler } from './process/inspect';
import { DebugProcessMonitorHandler } from './process/monitor';
import { DebugProcessKillHandler } from './process/kill';

import { DebugLogTailHandler } from './log/tail';
import { DebugLogViewHandler } from './log/view';
import { DebugLogSearchHandler } from './log/search';

export const debugCommands = {
  process: {
    list: new DebugProcessListHandler(),
    view: new DebugProcessViewHandler(),
    inspect: new DebugProcessInspectHandler(),
    monitor: new DebugProcessMonitorHandler(),
    kill: new DebugProcessKillHandler(),
  },
  log: {
    tail: new DebugLogTailHandler(),
    view: new DebugLogViewHandler(),
    search: new DebugLogSearchHandler(),
  }
};
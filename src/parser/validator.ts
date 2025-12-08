// src/parser/validator.ts
// Parser validator component - validates parsed commands

import { CommandAST } from './grammar-parser';

// Define the available commands from the CLI specification
interface CommandSpec {
  commandId: string;
  namespace: string;
  segments: string[];
  args: Record<string, { type: string; required?: boolean; description?: string; alternatives?: string[] }>;
  flags: Record<string, { type: string; required?: boolean; description?: string; default?: any; alternatives?: string[] }>;
  contextRequired?: string[]; // Context selectors required by the command
  mutuallyExclusive?: string[][]; // Groups of flags that are mutually exclusive
}

// All command specifications from the CLI spec
const COMMAND_SPECS: CommandSpec[] = [
  // Agent namespace commands
  {
    commandId: "agent.project.list",
    namespace: "agent",
    segments: ["project", "list"],
    args: {},
    flags: {
      "filter": { type: "string", required: false, description: "Filter projects by name, category, or other attributes" },
      "include-hidden": { type: "boolean", required: false, description: "Include hidden projects in the list" }
    },
    contextRequired: []
  },
  {
    commandId: "agent.project.create",
    namespace: "agent",
    segments: ["project", "create"],
    args: {},
    flags: {
      "name": { type: "string", required: true, description: "Project name" },
      "category": { type: "string", required: false, description: "Project category" },
      "description": { type: "string", required: false, description: "Project description" },
      "content-path": { type: "string", required: false, description: "Absolute path to project content" },
      "git-url": { type: "string", required: false, description: "Git repository URL to clone" }
    },
    contextRequired: []
  },
  {
    commandId: "agent.project.view",
    namespace: "agent",
    segments: ["project", "view"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Project ID", alternatives: ["name"] },
      "name": { type: "string", required: true, description: "Project name (alternative to --id)", alternatives: ["id"] }
    },
    contextRequired: []
  },
  {
    commandId: "agent.project.update",
    namespace: "agent",
    segments: ["project", "update"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Project ID" },
      "name": { type: "string", required: false, description: "New project name" },
      "category": { type: "string", required: false, description: "New category" },
      "description": { type: "string", required: false, description: "New description" },
      "status": { type: "string", required: false, description: "New status" },
      "theme": { type: "string", required: false, description: "New theme setting (JSON)" },
      "content-path": { type: "string", required: false, description: "New content path" },
      "git-url": { type: "string", required: false, description: "New git URL" }
    },
    contextRequired: []
  },
  {
    commandId: "agent.project.delete",
    namespace: "agent",
    segments: ["project", "delete"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Project ID", alternatives: ["name"] },
      "name": { type: "string", required: true, description: "Project name (alternative to --id)", alternatives: ["id"] }
    },
    contextRequired: []
  },
  {
    commandId: "agent.project.select",
    namespace: "agent",
    segments: ["project", "select"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Project ID", alternatives: ["name"] },
      "name": { type: "string", required: true, description: "Project name (alternative to --id)", alternatives: ["id"] }
    },
    contextRequired: []
  },
  {
    commandId: "agent.project.current",
    namespace: "agent",
    segments: ["project", "current"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "agent.roadmap.list",
    namespace: "agent",
    segments: ["roadmap", "list"],
    args: {},
    flags: {
      "filter": { type: "string", required: false, description: "Filter roadmaps by title or status" },
      "project-id": { type: "string", required: false, description: "Override the active project selection" }
    },
    contextRequired: ["activeProject"]
  },
  {
    commandId: "agent.roadmap.view",
    namespace: "agent",
    segments: ["roadmap", "view"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Roadmap ID", alternatives: ["name"] },
      "name": { type: "string", required: true, description: "Roadmap title (alternative to --id)", alternatives: ["id"] }
    },
    contextRequired: []
  },
  {
    commandId: "agent.roadmap.select",
    namespace: "agent",
    segments: ["roadmap", "select"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Roadmap ID", alternatives: ["name"] },
      "name": { type: "string", required: true, description: "Roadmap title (alternative to --id)", alternatives: ["id"] }
    },
    contextRequired: []
  },
  {
    commandId: "agent.roadmap.create",
    namespace: "agent",
    segments: ["roadmap", "create"],
    args: {},
    flags: {
      "title": { type: "string", required: true, description: "Roadmap title" },
      "tags": { type: "string", required: false, description: "Comma-separated list of tags" },
      "project-id": { type: "string", required: false, description: "Override the active project selection" }
    },
    contextRequired: ["activeProject"]
  },
  {
    commandId: "agent.roadmap.view",
    namespace: "agent",
    segments: ["roadmap", "view"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Roadmap ID", alternatives: ["name"] },
      "name": { type: "string", required: true, description: "Roadmap title (alternative to --id)", alternatives: ["id"] }
    },
    contextRequired: []
  },
  {
    commandId: "agent.roadmap.update",
    namespace: "agent",
    segments: ["roadmap", "update"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Roadmap ID" },
      "title": { type: "string", required: false, description: "New roadmap title" },
      "tags": { type: "string", required: false, description: "New comma-separated list of tags" },
      "status": { type: "string", required: false, description: "New status" },
      "progress": { type: "number", required: false, description: "New progress percentage (0-100)" }
    },
    contextRequired: []
  },
  {
    commandId: "agent.roadmap.select",
    namespace: "agent",
    segments: ["roadmap", "select"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Roadmap ID", alternatives: ["name"] },
      "name": { type: "string", required: true, description: "Roadmap title (alternative to --id)", alternatives: ["id"] }
    },
    contextRequired: []
  },
  {
    commandId: "agent.roadmap.current",
    namespace: "agent",
    segments: ["roadmap", "current"],
    args: {},
    flags: {},
    contextRequired: ["activeProject"]
  },
  {
    commandId: "agent.chat.list",
    namespace: "agent",
    segments: ["chat", "list"],
    args: {},
    flags: {
      "roadmap-id": { type: "string", required: false, description: "Override the active roadmap selection" }
    },
    contextRequired: ["activeRoadmap"]
  },
  {
    commandId: "agent.chat.create",
    namespace: "agent",
    segments: ["chat", "create"],
    args: {},
    flags: {
      "title": { type: "string", required: true, description: "Chat title" },
      "note": { type: "string", required: false, description: "Optional chat note" },
      "roadmap-id": { type: "string", required: false, description: "Override the active roadmap selection" }
    },
    contextRequired: ["activeRoadmap"]
  },
  {
    commandId: "agent.chat.view",
    namespace: "agent",
    segments: ["chat", "view"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Chat ID", alternatives: ["title"] },
      "title": { type: "string", required: true, description: "Chat title (alternative to --id)", alternatives: ["id"] }
    },
    contextRequired: []
  },
  {
    commandId: "agent.chat.update",
    namespace: "agent",
    segments: ["chat", "update"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Chat ID" },
      "title": { type: "string", required: false, description: "New chat title" },
      "note": { type: "string", required: false, description: "New chat note" },
      "status": { type: "string", required: false, description: "New status" }
    },
    contextRequired: []
  },
  {
    commandId: "agent.chat.select",
    namespace: "agent",
    segments: ["chat", "select"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Chat ID", alternatives: ["title"] },
      "title": { type: "string", required: true, description: "Chat title (alternative to --id)", alternatives: ["id"] }
    },
    contextRequired: []
  },
  {
    commandId: "agent.chat.current",
    namespace: "agent",
    segments: ["chat", "current"],
    args: {},
    flags: {},
    contextRequired: ["activeProject", "activeRoadmap"]
  },
  {
    commandId: "agent.chat.send",
    namespace: "agent",
    segments: ["chat", "send"],
    args: {},
    flags: {
      "message": { type: "string", required: true, description: "Message content to send" },
      "chat-id": { type: "string", required: false, description: "Override the active chat selection" },
      "role": { type: "string", required: false, description: "Message role (user, assistant, system)", default: "user" }
    },
    contextRequired: ["activeChat"]
  },
  {
    commandId: "agent.file.browse",
    namespace: "agent",
    segments: ["file", "browse"],
    args: {},
    flags: {
      "path": { type: "string", required: false, description: "Directory to browse", default: "." },
      "show-hidden": { type: "boolean", required: false, description: "Show hidden files", default: false },
      "project-id": { type: "string", required: false, description: "Override the active project selection" }
    },
    contextRequired: ["activeProject"]
  },
  {
    commandId: "agent.file.read",
    namespace: "agent",
    segments: ["file", "read"],
    args: {},
    flags: {
      "path": { type: "string", required: true, description: "Path to the file to read" },
      "project-id": { type: "string", required: false, description: "Override the active project selection" }
    },
    contextRequired: ["activeProject"]
  },
  {
    commandId: "agent.file.write",
    namespace: "agent",
    segments: ["file", "write"],
    args: {},
    flags: {
      "path": { type: "string", required: true, description: "Path to the file to write" },
      "content": { type: "string", required: true, description: "Content to write to the file" },
      "project-id": { type: "string", required: false, description: "Override the active project selection" }
    },
    contextRequired: ["activeProject"]
  },
  {
    commandId: "agent.file.diff",
    namespace: "agent",
    segments: ["file", "diff"],
    args: {},
    flags: {
      "path": { type: "string", required: true, description: "Path to the file" },
      "base": { type: "string", required: false, description: "Base version/path to compare against" },
      "compare": { type: "string", required: false, description: "Compare version/path" },
      "project-id": { type: "string", required: false, description: "Override the active project selection" }
    },
    contextRequired: ["activeProject"]
  },
  {
    commandId: "agent.file.open",
    namespace: "agent",
    segments: ["file", "open"],
    args: {},
    flags: {
      "path": { type: "string", required: true, description: "Path to the file to open" },
      "editor": { type: "string", required: false, description: "Editor to use (default: system default)" },
      "project-id": { type: "string", required: false, description: "Override the active project selection" }
    },
    contextRequired: ["activeProject"]
  },
  {
    commandId: "agent.template.list",
    namespace: "agent",
    segments: ["template", "list"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "agent.template.create",
    namespace: "agent",
    segments: ["template", "create"],
    args: {},
    flags: {
      "name": { type: "string", required: true, description: "Template name" },
      "content": { type: "string", required: true, description: "Template content" },
      "description": { type: "string", required: false, description: "Template description" },
      "category": { type: "string", required: false, description: "Template category" }
    },
    contextRequired: []
  },
  {
    commandId: "agent.terminal.session",
    namespace: "agent",
    segments: ["terminal", "session"],
    args: {},
    flags: {
      "project-id": { type: "string", required: false, description: "Override the active project selection" },
      "cwd": { type: "string", required: false, description: "Working directory for the terminal", default: "." }
    },
    contextRequired: ["activeProject"]
  },
  {
    commandId: "agent.terminal.run",
    namespace: "agent",
    segments: ["terminal", "run"],
    args: {},
    flags: {
      "command": { type: "string", required: true, description: "Command to execute" },
      "project-id": { type: "string", required: false, description: "Override the active project selection" },
      "cwd": { type: "string", required: false, description: "Working directory for the command (default: project root)" }
    },
    contextRequired: ["activeProject"]
  },
  // AI namespace commands
  {
    commandId: "ai.session.list",
    namespace: "ai",
    segments: ["session", "list"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "ai.session.create",
    namespace: "ai",
    segments: ["session", "create"],
    args: {},
    flags: {
      "backend": { type: "string", required: false, description: "AI backend (qwen/claude/gemini/codex)", default: "qwen" },
      "name": { type: "string", required: false, description: "Session name" },
      "workspace-path": { type: "string", required: false, description: "Path to workspace for file system access" }
    },
    contextRequired: []
  },
  {
    commandId: "ai.session.delete",
    namespace: "ai",
    segments: ["session", "delete"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Session ID to delete" }
    },
    contextRequired: []
  },
  {
    commandId: "ai.session.select",
    namespace: "ai",
    segments: ["session", "select"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Session ID to select" }
    },
    contextRequired: []
  },
  {
    commandId: "ai.session.view",
    namespace: "ai",
    segments: ["session", "view"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Session ID" }
    },
    contextRequired: []
  },
  {
    commandId: "ai.session.current",
    namespace: "ai",
    segments: ["session", "current"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "ai.message.send",
    namespace: "ai",
    segments: ["message", "send"],
    args: {},
    flags: {
      "text": { type: "string", required: true, description: "Message content to send" },
      "session-id": { type: "string", required: false, description: "Override the active session selection" }
    },
    contextRequired: ["activeAiSession"]
  },
  {
    commandId: "ai.message.list",
    namespace: "ai",
    segments: ["message", "list"],
    args: {},
    flags: {
      "session-id": { type: "string", required: false, description: "Override the active session selection" },
      "limit": { type: "number", required: false, description: "Maximum number of messages to return", default: 50 },
      "offset": { type: "number", required: false, description: "Number of messages to skip", default: 0 }
    },
    contextRequired: ["activeAiSession"]
  },
  {
    commandId: "ai.message.stream",
    namespace: "ai",
    segments: ["message", "stream"],
    args: {},
    flags: {
      "session-id": { type: "string", required: false, description: "Override the active session selection" },
      "follow": { type: "boolean", required: false, description: "Continue listening for new messages", default: true }
    },
    contextRequired: ["activeAiSession"]
  },
  {
    commandId: "ai.message.clear",
    namespace: "ai",
    segments: ["message", "clear"],
    args: {},
    flags: {
      "session-id": { type: "string", required: false, description: "Override the active session selection" }
    },
    contextRequired: ["activeSession"]
  },
  {
    commandId: "ai.backend.list",
    namespace: "ai",
    segments: ["backend", "list"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "ai.backend.select",
    namespace: "ai",
    segments: ["backend", "select"],
    args: {},
    flags: {
      "backend": { type: "string", required: true, description: "Backend to select (qwen/claude/gemini/codex)" },
      "session-id": { type: "string", required: false, description: "Override the active session selection" }
    },
    contextRequired: []
  },
  {
    commandId: "ai.backend.status",
    namespace: "ai",
    segments: ["backend", "status"],
    args: {},
    flags: {
      "backend": { type: "string", required: true, description: "Backend to check (qwen/claude/gemini/codex)" }
    },
    contextRequired: []
  },
  {
    commandId: "ai.conversation.export",
    namespace: "ai",
    segments: ["conversation", "export"],
    args: {},
    flags: {
      "session-id": { type: "string", required: true, description: "Session to export" },
      "output": { type: "string", required: true, description: "Output file path" }
    },
    contextRequired: []
  },
  {
    commandId: "ai.conversation.import",
    namespace: "ai",
    segments: ["conversation", "import"],
    args: {},
    flags: {
      "input": { type: "string", required: true, description: "Input file path" }
    },
    contextRequired: []
  },
  // Network namespace commands
  {
    commandId: "network.server.list",
    namespace: "network",
    segments: ["server", "list"],
    args: {},
    flags: {
      "filter-type": { type: "string", required: false, description: "Filter by server type (worker/manager/ai)" },
      "filter-status": { type: "string", required: false, description: "Filter by server status (online/offline/degraded)" }
    },
    contextRequired: []
  },
  {
    commandId: "network.server.view",
    namespace: "network",
    segments: ["server", "view"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Server ID" }
    },
    contextRequired: []
  },
  {
    commandId: "network.server.status",
    namespace: "network",
    segments: ["server", "status"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Server ID" }
    },
    contextRequired: []
  },
  {
    commandId: "network.connection.list",
    namespace: "network",
    segments: ["connection", "list"],
    args: {},
    flags: {
      "filter-type": { type: "string", required: false, description: "Filter by connection type (qwen/terminal/git/other)" },
      "filter-status": { type: "string", required: false, description: "Filter by connection status (starting/running/exited/error)" }
    },
    contextRequired: []
  },
  {
    commandId: "network.connection.view",
    namespace: "network",
    segments: ["connection", "view"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Connection ID" }
    },
    contextRequired: []
  },
  {
    commandId: "network.topology.view",
    namespace: "network",
    segments: ["topology", "view"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "network.element.list",
    namespace: "network",
    segments: ["element", "list"],
    args: {},
    flags: {
      "filter-type": { type: "string", required: false, description: "Filter by element type" },
      "filter-status": { type: "string", required: false, description: "Filter by element status" }
    },
    contextRequired: []
  },
  {
    commandId: "network.health.stream",
    namespace: "network",
    segments: ["health", "stream"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "network.graph.stream",
    namespace: "network",
    segments: ["graph", "stream"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "network.element.monitor",
    namespace: "network",
    segments: ["element", "monitor"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Element ID to monitor" }
    },
    contextRequired: []
  },
  // Debug namespace commands
  {
    commandId: "debug.process.list",
    namespace: "debug",
    segments: ["process", "list"],
    args: {},
    flags: {
      "filter-type": { type: "string", required: false, description: "Filter by process type (qwen/terminal/git/other)" },
      "filter-status": { type: "string", required: false, description: "Filter by process status (starting/running/exited/error)" },
      "limit": { type: "number", required: false, description: "Limit the number of processes returned" }
    },
    contextRequired: []
  },
  {
    commandId: "debug.process.view",
    namespace: "debug",
    segments: ["process", "view"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Process ID", alternatives: ["pid"] },
      "pid": { type: "number", required: true, description: "Process PID (alternative to --id)", alternatives: ["id"] }
    },
    contextRequired: []
  },
  {
    commandId: "debug.process.inspect",
    namespace: "debug",
    segments: ["process", "inspect"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Process ID", alternatives: ["pid"] },
      "pid": { type: "number", required: true, description: "Process PID (alternative to --id)", alternatives: ["id"] }
    },
    contextRequired: []
  },
  {
    commandId: "debug.process.monitor",
    namespace: "debug",
    segments: ["process", "monitor"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Process ID", alternatives: ["pid"] },
      "pid": { type: "number", required: true, description: "Process PID (alternative to --id)", alternatives: ["id"] },
      "follow": { type: "boolean", required: false, description: "Continue monitoring", default: true }
    },
    contextRequired: []
  },
  {
    commandId: "debug.process.kill",
    namespace: "debug",
    segments: ["process", "kill"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Process ID", alternatives: ["pid"] },
      "pid": { type: "number", required: true, description: "Process PID (alternative to --id)", alternatives: ["id"] },
      "signal": { type: "string", required: false, description: "Signal to send to the process", default: "SIGTERM" }
    },
    contextRequired: []
  },
  {
    commandId: "debug.process.logs",
    namespace: "debug",
    segments: ["process", "logs"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Process ID" }
    },
    contextRequired: []
  },
  {
    commandId: "debug.log.tail",
    namespace: "debug",
    segments: ["log", "tail"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Process ID" },
      "pid": { type: "number", required: false, description: "Process PID (alternative to --id)" },
      "lines": { type: "number", required: false, description: "Number of lines to show", default: 50 },
      "follow": { type: "boolean", required: false, description: "Continue streaming new logs", default: true }
    },
    contextRequired: []
  },
  {
    commandId: "debug.log.view",
    namespace: "debug",
    segments: ["log", "view"],
    args: {},
    flags: {
      "id": { type: "string", required: false, description: "Process ID" },
      "pid": { type: "number", required: false, description: "Process PID" },
      "from": { type: "string", required: false, description: "Start time (ISO format)" },
      "to": { type: "string", required: false, description: "End time (ISO format)" },
      "level": { type: "string", required: false, description: "Log level filter (debug/info/warn/error)" },
      "limit": { type: "number", required: false, description: "Maximum number of log entries", default: 100 }
    },
    contextRequired: []
  },
  {
    commandId: "debug.log.search",
    namespace: "debug",
    segments: ["log", "search"],
    args: {},
    flags: {
      "query": { type: "string", required: true, description: "Search query" },
      "id": { type: "string", required: false, description: "Process ID" },
      "pid": { type: "number", required: false, description: "Process PID" },
      "from": { type: "string", required: false, description: "Start time (ISO format)" },
      "to": { type: "string", required: false, description: "End time (ISO format)" },
      "level": { type: "string", required: false, description: "Log level filter (debug/info/warn/error)" },
      "limit": { type: "number", required: false, description: "Maximum number of log entries", default: 100 }
    },
    contextRequired: []
  },
  {
    commandId: "debug.log.export",
    namespace: "debug",
    segments: ["log", "export"],
    args: {},
    flags: {
      "output": { type: "string", required: true, description: "Output file path" },
      "id": { type: "string", required: false, description: "Process ID" },
      "pid": { type: "number", required: false, description: "Process PID" },
      "from": { type: "string", required: false, description: "Start time (ISO format)" },
      "to": { type: "string", required: false, description: "End time (ISO format)" },
      "level": { type: "string", required: false, description: "Log level filter" }
    },
    contextRequired: []
  },
  // Debug websocket commands
  {
    commandId: "debug.websocket.list",
    namespace: "debug",
    segments: ["websocket", "list"],
    args: {},
    flags: {
      "filter-type": { type: "string", required: false, description: "Filter by websocket type (qwen/terminal/ai/other)" },
      "filter-status": { type: "string", required: false, description: "Filter by websocket status (open/closed/error/connecting)" },
      "limit": { type: "number", required: false, description: "Limit the number of websockets returned" }
    },
    contextRequired: []
  },
  {
    commandId: "debug.websocket.view",
    namespace: "debug",
    segments: ["websocket", "view"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "WebSocket ID" }
    },
    contextRequired: []
  },
  {
    commandId: "debug.websocket.stream",
    namespace: "debug",
    segments: ["websocket", "stream"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "WebSocket ID" }
    },
    contextRequired: []
  },
  // Debug polling session commands
  {
    commandId: "debug.poll.list",
    namespace: "debug",
    segments: ["poll", "list"],
    args: {},
    flags: {
      "filter-type": { type: "string", required: false, description: "Filter by polling session type (qwen/terminal/ai/other)" },
      "filter-status": { type: "string", required: false, description: "Filter by polling session status (active/inactive/error)" },
      "limit": { type: "number", required: false, description: "Limit the number of polling sessions returned" }
    },
    contextRequired: []
  },
  {
    commandId: "debug.poll.view",
    namespace: "debug",
    segments: ["poll", "view"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Polling Session ID" }
    },
    contextRequired: []
  },
  {
    commandId: "debug.poll.stream",
    namespace: "debug",
    segments: ["poll", "stream"],
    args: {},
    flags: {
      "id": { type: "string", required: true, description: "Polling Session ID" }
    },
    contextRequired: []
  },
  // Settings namespace commands
  {
    commandId: "settings.show",
    namespace: "settings",
    segments: ["show"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "settings.set",
    namespace: "settings",
    segments: ["set"],
    args: {},
    flags: {
      "key": { type: "string", required: true, description: "Configuration key to set" },
      "value": { type: "string", required: true, description: "New value for the configuration key" }
    },
    contextRequired: []
  },
  {
    commandId: "settings.reset",
    namespace: "settings",
    segments: ["reset"],
    args: {},
    flags: {
      "key": { type: "string", required: false, description: "Configuration key to reset to default" },
      "all": { type: "boolean", required: false, description: "Reset all configuration to defaults" }
    },
    contextRequired: [],
    mutuallyExclusive: [["key", "all"]]
  },
  {
    commandId: "settings.theme.get",
    namespace: "settings",
    segments: ["theme", "get"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "settings.theme.set",
    namespace: "settings",
    segments: ["theme", "set"],
    args: {},
    flags: {
      "mode": { type: "string", required: true, description: "Theme mode (auto/dark/light)" },
      "palette": { type: "string", required: false, description: "Custom palette JSON" }
    },
    contextRequired: []
  },
  {
    commandId: "settings.workspace.get",
    namespace: "settings",
    segments: ["workspace", "get"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "settings.workspace.set",
    namespace: "settings",
    segments: ["workspace", "set"],
    args: {},
    flags: {
      "auto-open-terminal": { type: "boolean", required: false, description: "Auto-open terminal on project selection" },
      "detail-mode": { type: "string", required: false, description: "Detail mode (minimal/expanded)" },
      "remember-last-path": { type: "boolean", required: false, description: "Remember last folder for each project" }
    },
    contextRequired: []
  },
  {
    commandId: "settings.category.list",
    namespace: "settings",
    segments: ["category", "list"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "settings.option.get",
    namespace: "settings",
    segments: ["option", "get"],
    args: {},
    flags: {
      "category": { type: "string", required: true, description: "Setting category" },
      "key": { type: "string", required: true, description: "Option key" }
    },
    contextRequired: []
  },
  {
    commandId: "settings.option.set",
    namespace: "settings",
    segments: ["option", "set"],
    args: {},
    flags: {
      "category": { type: "string", required: true, description: "Setting category" },
      "key": { type: "string", required: true, description: "Option key" },
      "value": { type: "string", required: true, description: "New option value" }
    },
    contextRequired: []
  },
  {
    commandId: "settings.auth.login",
    namespace: "settings",
    segments: ["auth", "login"],
    args: {},
    flags: {
      "username": { type: "string", required: true, description: "Username", alternatives: ["token"] },
      "password": { type: "string", required: true, description: "Password" },
      "token": { type: "string", required: true, description: "Authentication token (alternative to username/password)", alternatives: ["username", "password"] }
    },
    contextRequired: []
  },
  {
    commandId: "settings.auth.logout",
    namespace: "settings",
    segments: ["auth", "logout"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "settings.auth.status",
    namespace: "settings",
    segments: ["auth", "status"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "settings.auth.token",
    namespace: "settings",
    segments: ["auth", "token"],
    args: {},
    flags: {},
    contextRequired: ["authenticated"]
  },
  // Auth namespace commands
  {
    commandId: "auth.login",
    namespace: "auth",
    segments: ["login"],
    args: {},
    flags: {
      "username": { type: "string", required: true, description: "Username for login" },
      "password": { type: "string", required: true, description: "Password for login" }
    },
    contextRequired: []
  },
  {
    commandId: "auth.logout",
    namespace: "auth",
    segments: ["logout"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "auth.status",
    namespace: "auth",
    segments: ["status"],
    args: {},
    flags: {},
    contextRequired: []
  },
  // System namespace commands
  {
    commandId: "system.help",
    namespace: "system",
    segments: ["help"],
    args: {},
    flags: {
      "command": { type: "string", required: false, description: "Show help for specific command" }
    },
    contextRequired: []
  },
  {
    commandId: "system.version",
    namespace: "system",
    segments: ["version"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "system.parity",
    namespace: "system",
    segments: ["parity"],
    args: {},
    flags: {},
    contextRequired: []
  },
  {
    commandId: "system.completion",
    namespace: "system",
    segments: ["completion"],
    args: {
      "shell": { type: "string", required: true, description: "Shell type (bash, zsh, fish)" }
    },
    flags: {},
    contextRequired: []
  },
  {
    commandId: "system.doctor",
    namespace: "system",
    segments: ["doctor"],
    args: {},
    flags: {},
    contextRequired: []
  }
];

export interface ValidatedCommand {
  commandId: string;              // e.g. "agent.project.create"
  namespace: string;
  segments: string[];
  args: { [name: string]: any };  // named positional arguments, if applicable
  flags: { [name: string]: any };
  raw: string;
  contextRequired: string[];       // List of required contexts for this command
  isContextFree: boolean;          // Whether the command is context-free or requires a specific context
}

export interface ValidationError {
  error: true;
  code: string;
  message: string;
  details?: any;
}

export type ValidationResult = ValidatedCommand | ValidationError;

export class Validator {
  validate(ast: CommandAST): ValidationResult {
    // Check if the AST is valid
    if (!ast || ast.type !== 'Command' || !Array.isArray(ast.commandPath)) {
      return {
        error: true,
        code: "INVALID_AST",
        message: "Invalid AST structure"
      };
    }

    // Validate namespace exists
    if (ast.commandPath.length === 0) {
      return {
        error: true,
        code: "UNKNOWN_NAMESPACE",
        message: "Namespace is required"
      };
    }

    const namespace = ast.commandPath[0];

    // Find matching command specification
    const matchingCommands = COMMAND_SPECS.filter(spec =>
      spec.namespace === namespace &&
      areCommandPathsMatching(spec.segments, ast.commandPath.slice(1))
    );

    if (matchingCommands.length === 0) {
      return {
        error: true,
        code: "UNKNOWN_COMMAND",
        message: `Unknown command: ${ast.commandPath.join('.')}`
      };
    }

    // If multiple matches exist, find the most specific one
    let commandSpec: CommandSpec | undefined;
    if (matchingCommands.length === 1) {
      commandSpec = matchingCommands[0];
    } else {
      // More specific commands have more segments
      commandSpec = matchingCommands.reduce((best, current) =>
        current.segments.length > best.segments.length ? current : best
      );
    }

    if (!commandSpec) {
      return {
        error: true,
        code: "UNKNOWN_COMMAND",
        message: `Unknown command: ${ast.commandPath.join('.')}`
      };
    }

    // Extract flags from AST
    const astFlags = ast.arguments.named;

    // Check for unknown flags
    for (const flagName in astFlags) {
      if (!commandSpec.flags[flagName]) {
        return {
          error: true,
          code: "UNKNOWN_FLAG",
          message: `Unknown flag: --${flagName}`,
          details: {
            command: commandSpec.commandId,
            availableFlags: Object.keys(commandSpec.flags)
          }
        };
      }
    }

    // Check for required flags
    for (const flagName in commandSpec.flags) {
      const flagSpec = commandSpec.flags[flagName];
      if (flagSpec && flagSpec.required && astFlags[flagName] === undefined) {
        // Check if this is part of an alternative required group
        if (flagSpec.alternatives && flagSpec.alternatives.length > 0) {
          // If alternatives are defined, at least one of the required alternatives must be provided
          const hasAlternative = flagSpec.alternatives.some(altFlag => astFlags[altFlag] !== undefined);
          if (!hasAlternative) {
            return {
              error: true,
              code: "MISSING_REQUIRED_FLAG",
              message: `Missing required flag. Must provide one of these: --${flagName}${flagSpec.alternatives.map(alt => `, --${alt}`).join('')}`,
              details: {
                command: commandSpec.commandId,
                requiredAlternatives: [flagName, ...flagSpec.alternatives]
              }
            };
          }
        } else {
          return {
            error: true,
            code: "MISSING_REQUIRED_FLAG",
            message: `Missing required flag: --${flagName}`,
            details: {
              command: commandSpec.commandId
            }
          };
        }
      }
    }

    // Validate flag types
    for (const flagName in astFlags) {
      const flagSpec = commandSpec.flags[flagName]; // Get flag spec again to check type
      if (!flagSpec) continue; // Skip unknown flags (already handled)

      const value = astFlags[flagName];

      if (!this.validateFlagType(value, flagSpec.type)) {
        return {
          error: true,
          code: "INVALID_FLAG_TYPE",
          message: `Invalid type for flag --${flagName}: expected ${flagSpec.type}, got ${typeof value}`,
          details: {
            command: commandSpec.commandId,
            flag: flagName,
            expectedType: flagSpec.type,
            actualValue: value,
            actualType: typeof value
          }
        };
      }
    }

    // Check mutually exclusive flags (if any defined in spec)
    if (commandSpec.mutuallyExclusive) {
      for (const group of commandSpec.mutuallyExclusive) {
        const usedFlags = group.filter(flag => astFlags[flag] !== undefined);
        if (usedFlags.length > 1) {
          return {
            error: true,
            code: "MUTUALLY_EXCLUSIVE_FLAGS",
            message: `Mutually exclusive flags used together: ${usedFlags.map(f => `--${f}`).join(', ')}`,
            details: {
              command: commandSpec.commandId,
              conflictingGroup: group
            }
          };
        }
      }
    }

    // Build the validated command object
    const validatedCommand: ValidatedCommand = {
      commandId: commandSpec.commandId,
      namespace: commandSpec.namespace,
      segments: commandSpec.segments,
      args: {},
      flags: { ...astFlags }, // Copy all validated flags
      raw: ast.rawInput,
      contextRequired: commandSpec.contextRequired || [],
      isContextFree: !(commandSpec.contextRequired && commandSpec.contextRequired.length > 0)
    };

    // Set default values for flags that weren't provided
    for (const flagName in commandSpec.flags) {
      const flagSpec = commandSpec.flags[flagName];
      if (flagSpec && validatedCommand.flags[flagName] === undefined && flagSpec.default !== undefined) {
        validatedCommand.flags[flagName] = flagSpec.default;
      }
    }

    return validatedCommand;
  }

  private validateFlagType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        // Check if it's a valid number representation
        if (typeof value === 'number') return true;
        if (typeof value === 'string') {
          const num = Number(value);
          return !isNaN(num);
        }
        return false;
      case 'boolean':
        return typeof value === 'boolean' ||
               (typeof value === 'string' &&
                ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase()));
      case 'string[]':
        return Array.isArray(value) && value.every(item => typeof item === 'string');
      default:
        // For any other types, perform a basic type check
        return typeof value === expectedType;
    }
  }
}

// Helper function to check if command paths match
function areCommandPathsMatching(specSegments: string[], actualSegments: string[]): boolean {
  if (actualSegments.length < specSegments.length) {
    return false;
  }

  for (let i = 0; i < specSegments.length; i++) {
    if (specSegments[i] !== actualSegments[i]) {
      return false;
    }
  }

  return true;
}

export function validate(ast: CommandAST): ValidationResult {
  const validator = new Validator();
  return validator.validate(ast);
}
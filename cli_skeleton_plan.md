# Nexus CLI Skeleton Implementation Plan

## 1. Project Structure Layout

### Directory Tree

```
nexus-cli/
├── bin/
│   └── nexus (executable entrypoint)
├── src/
│   ├── main.ts (primary entrypoint)
│   ├── parser/
│   │   ├── tokenizer.ts
│   │   ├── grammar-parser.ts
│   │   ├── validator.ts
│   │   └── types.ts
│   ├── runtime/
│   │   ├── engine.ts
│   │   ├── dispatcher.ts
│   │   ├── context-manager.ts
│   │   ├── session-manager.ts
│   │   └── types.ts
│   ├── commands/
│   │   ├── agent/
│   │   │   ├── project/
│   │   │   │   ├── list.ts
│   │   │   │   ├── create.ts
│   │   │   │   ├── view.ts
│   │   │   │   ├── update.ts
│   │   │   │   ├── delete.ts
│   │   │   │   └── select.ts
│   │   │   ├── roadmap/
│   │   │   │   ├── list.ts
│   │   │   │   ├── create.ts
│   │   │   │   ├── view.ts
│   │   │   │   ├── update.ts
│   │   │   │   └── select.ts
│   │   │   ├── chat/
│   │   │   │   ├── list.ts
│   │   │   │   ├── create.ts
│   │   │   │   ├── view.ts
│   │   │   │   ├── update.ts
│   │   │   │   ├── send.ts
│   │   │   │   └── select.ts
│   │   │   ├── file/
│   │   │   │   ├── browse.ts
│   │   │   │   ├── read.ts
│   │   │   │   ├── write.ts
│   │   │   │   ├── diff.ts
│   │   │   │   └── open.ts
│   │   │   ├── template/
│   │   │   │   ├── list.ts
│   │   │   │   └── create.ts
│   │   │   └── terminal/
│   │   │       ├── session.ts
│   │   │       └── run.ts
│   │   ├── ai/
│   │   │   ├── session/
│   │   │   │   ├── list.ts
│   │   │   │   ├── create.ts
│   │   │   │   ├── delete.ts
│   │   │   │   ├── switch.ts
│   │   │   │   └── view.ts
│   │   │   ├── message/
│   │   │   │   ├── send.ts
│   │   │   │   ├── list.ts
│   │   │   │   ├── stream.ts
│   │   │   │   └── clear.ts
│   │   │   └── backend/
│   │   │       ├── list.ts
│   │   │       ├── select.ts
│   │   │       └── status.ts
│   │   ├── network/
│   │   │   ├── server/
│   │   │   │   ├── list.ts
│   │   │   │   ├── view.ts
│   │   │   │   └── status.ts
│   │   │   ├── connection/
│   │   │   │   ├── list.ts
│   │   │   │   └── view.ts
│   │   │   └── topology/
│   │   │       └── view.ts
│   │   ├── debug/
│   │   │   ├── process/
│   │   │   │   ├── list.ts
│   │   │   │   ├── view.ts
│   │   │   │   ├── inspect.ts
│   │   │   │   ├── monitor.ts
│   │   │   │   └── kill.ts
│   │   │   └── log/
│   │   │       ├── tail.ts
│   │   │       ├── view.ts
│   │   │       ├── search.ts
│   │   │       └── export.ts
│   │   └── settings/
│   │       ├── theme/
│   │       │   ├── get.ts
│   │       │   └── set.ts
│   │       ├── workspace/
│   │       │   ├── get.ts
│   │       │   └── set.ts
│   │       ├── auth/
│   │       │   ├── login.ts
│   │       │   ├── logout.ts
│   │       │   ├── status.ts
│   │       │   └── token.ts
│   │       └── option/
│   │           ├── get.ts
│   │           └── set.ts
│   ├── state/
│   │   ├── context-engine.ts
│   │   ├── context-storage.ts
│   │   └── types.ts
│   ├── session/
│   │   ├── session-abi.ts
│   │   ├── session-manager.ts
│   │   └── types.ts
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── endpoints/
│   │   │   ├── agents.ts
│   │   │   ├── ai.ts
│   │   │   ├── network.ts
│   │   │   ├── debug.ts
│   │   │   └── settings.ts
│   │   └── types.ts
│   ├── utils/
│   │   ├── output.ts
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── helpers.ts
│   └── shared/
│       ├── types.ts
│       └── constants.ts
├── tests/
│   ├── unit/
│   │   ├── parser/
│   │   ├── runtime/
│   │   ├── commands/
│   │   ├── state/
│   │   ├── session/
│   │   └── api/
│   ├── integration/
│   │   ├── parser-integration/
│   │   ├── runtime-integration/
│   │   └── end-to-end/
│   └── fixtures/
│       ├── mock-context.json
│       ├── mock-sessions.json
│       └── command-outputs/
├── docs/
│   └── development.md
├── package.json
├── tsconfig.json
├── eslint.config.js
└── README.md
```

## 2. Module Responsibilities

### Parser Module (`/src/parser`)
**Purpose**: Handles command line tokenization, parsing, and validation according to `cli_input_grammar.md`

**Interfaces**:
- `parseCommandLine(input: string): ParsedCommand`
- `validateCommand(parsed: ParsedCommand): ValidationResult`

**Dependencies**: 
- `utils/validation.ts` - for validation helpers
- `shared/types.ts` - for shared type definitions

**Global Rules**:
- All parsing errors must follow the standardized error format
- Parser must not execute commands, only parse
- Parser must be completely decoupled from backend API

### Runtime Engine (`/src/runtime`)
**Purpose**: Orchestrates command execution, manages context and sessions, enforces execution flow

**Interfaces**:
- `executeCommand(parsed: ParsedCommand): Promise<CommandResult>`
- `initializeRuntime(): Promise<void>`

**Dependencies**:
- `parser/` - for parsed command input
- `state/` - for context management
- `session/` - for session management
- `api/client.ts` - for backend communication
- `utils/output.ts` - for standardized output

**Global Rules**:
- All commands must return standardized JSON output format
- Runtime must handle all error propagation
- Runtime must enforce the Session ABI

### Commands Modules (`/src/commands/*`)
**Purpose**: Contain specific command implementations following the handler architecture

**Interfaces** (for each handler):
- `execute(context: ExecutionContext): Promise<CommandResult>`
- `validate(args: any): ValidationResult`

**Dependencies**:
- `runtime/types.ts` - for execution context types
- `api/` - for backend API calls
- `utils/output.ts` - for standardized output
- `shared/types.ts` - for shared types

**Global Rules**:
- All handlers must implement the standard interface
- Handlers must not manage context directly (runtime handles this)
- Handlers must return standardized output format

### State Module (`/src/state`)
**Purpose**: Manages persistent context state (active project, roadmap, chat, etc.)

**Interfaces**:
- `loadContext(): Promise<ContextState>`
- `saveContext(state: ContextState): Promise<void>`
- `updateContext(updates: ContextUpdates): Promise<ContextState>`

**Dependencies**:
- `utils/helpers.ts` - for file I/O utilities
- `shared/types.ts` - for context type definitions

**Global Rules**:
- State persistence must be secure and reliable
- Context updates should be atomic
- State must support concurrent access safely

### Session Module (`/src/session`)
**Purpose**: Implements the Session ABI for managing long-running operations

**Interfaces**:
- `createSession(config: SessionConfig): Promise<Session>`
- `getSession(id: string): Session | null`
- `getStreamingEvents(sessionId: string): AsyncIterable<StreamingEvent>`

**Dependencies**:
- `shared/types.ts` - for session type definitions
- `api/client.ts` - for WebSocket/HTTP connections

**Global Rules**:
- Must implement the complete Session ABI specification
- Sessions must handle all defined event types correctly
- Must support reconnection and recovery scenarios

### API Module (`/src/api`)
**Purpose**: Handles all communication with the backend API services

**Interfaces**:
- `makeAuthenticatedRequest(endpoint: string, options: RequestOptions): Promise<ApiResponse>`
- `createWebSocketSession(config: SessionConfig): WebSocket`

**Dependencies**:
- `utils/helpers.ts` - for HTTP utilities
- `shared/types.ts` - for API type definitions

**Global Rules**:
- All API communication must be authenticated when required
- Must handle connection retries appropriately
- Must follow the API contracts defined in ui_map.json

### Utilities Module (`/src/utils`)
**Purpose**: Shared utility functions for formatting, validation, and helper operations

**Interfaces**:
- Various utility functions (specific to their purpose)

**Dependencies**:
- `shared/types.ts` - for utility type definitions

**Global Rules**:
- Utilities must be pure functions where possible
- All utilities must include comprehensive tests
- Formatting utilities must support both JSON and human-readable output

## 3. Entrypoint Design

### Binary Entry Point (`bin/nexus`)
The `nexus` executable is a shell script that calls the primary Node.js entrypoint:

```bash
#!/bin/sh
# bin/nexus
exec node --loader ts-node/esm src/main.ts "$@"
```

### Main Entry Point (`src/main.ts`)
The main entry point orchestrates the complete command lifecycle:

```typescript
// src/main.ts
import { initializeRuntime } from './runtime/engine';
import { parseCommandLine } from './parser/grammar-parser';
import { executeCommand } from './runtime/engine';
import { formatOutput } from './utils/output';

async function main(): Promise<void> {
  try {
    // Step 1: Load runtime with context and session management
    const runtime = await initializeRuntime();
    
    // Step 2: Parse command line input
    const input = process.argv.slice(2).join(' ');
    const parsedCommand = parseCommandLine(input);
    
    // Step 3: Execute command through runtime
    const result = await executeCommand(parsedCommand);
    
    // Step 4: Format and output result
    const output = formatOutput(result);
    console.log(output);
    
    // Step 5: Exit with appropriate code
    process.exit(result.status === 'ok' ? 0 : 1);
  } catch (error) {
    // Handle parse/runtime errors with standardized format
    const errorOutput = formatOutput({
      status: 'error',
      data: null,
      message: error.message,
      errors: [{
        type: 'RUNTIME_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      }]
    });
    console.error(errorOutput);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

### Startup Lifecycle
1. **Initialization Phase**: Runtime loads context, validates authentication, sets up managers
2. **Parsing Phase**: Command line input is tokenized and structured 
3. **Validation Phase**: Command structure and arguments are validated
4. **Execution Phase**: Command is dispatched to appropriate handler
5. **Output Phase**: Result is formatted and written to stdout/stderr
6. **Termination Phase**: Resources are cleaned up and process exits

## 4. Parser Implementation Plan

### Three-Stage Parser Architecture

#### Stage 1: Tokenizer (`parser/tokenizer.ts`)
```typescript
interface Tokenizer {
  tokenize(input: string): Token[];
}

type Token = {
  type: 'WORD' | 'FLAG' | 'EQUALS' | 'STRING' | 'NUMBER' | 'BOOLEAN' | 'LIST';
  value: string;
  position: number; // Position in original input
};
```

#### Stage 2: Grammar Parser (`parser/grammar-parser.ts`)
```typescript
interface GrammarParser {
  parse(tokens: Token[]): ParsedCommand;
}

interface ParsedCommand {
  commandPath: string[]; // [namespace, resource, action]
  arguments: {
    positional: string[];
    named: Record<string, string | boolean | string[]>;
  };
  rawInput: string;
}
```

#### Stage 3: Validator (`parser/validator.ts`)
```typescript
interface Validator {
  validate(parsed: ParsedCommand): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: ParseError[];
  normalized?: ParsedCommand;
}

type ParseError = {
  code: string;
  message: string;
  position?: number;
  token?: string;
};
```

### Data Structures for Parsed Commands
The parser will create a normalized command structure that the runtime can process:

```typescript
interface CommandStructure {
  path: [string, string, string]; // [namespace, resource, action]
  args: Record<string, any>;
  flags: Record<string, any>;
  options: CommandOptions;        // From command spec
  context: CommandContext;        // Required context
  session?: SessionRequirement;   // Session requirements
}
```

## 5. Runtime Integration Plan

### Command Routing System
The runtime uses a registry-based system to discover and execute command handlers:

```typescript
// runtime/dispatcher.ts
interface CommandRegistry {
  register(namespace: string, resource: string, action: string, handler: CommandHandler): void;
  findHandler(commandPath: [string, string, string]): CommandHandler | null;
}

class CommandDispatcher {
  private registry: CommandRegistry;
  
  async execute(parsed: ParsedCommand): Promise<CommandResult> {
    const handler = this.registry.findHandler(parsed.commandPath as [string, string, string]);
    if (!handler) {
      throw new Error(`Unknown command: ${parsed.commandPath.join(' ')}`);
    }
    
    // Prepare execution context with context and session
    const context = await this.prepareExecutionContext(parsed);
    
    // Execute handler
    return await handler.execute(context);
  }
}
```

### Error Propagation Path
1. **Parser Errors**: Caught during parsing, formatted to standard error structure, returned immediately
2. **Validation Errors**: Caught during argument validation, formatted to standard error structure
3. **Runtime Errors**: Caught during execution, formatted to standard error structure
4. **API Errors**: Caught during API communication, wrapped in standard error structure
5. **Session Errors**: Caught during streaming, formatted per Session ABI error specifications

## 6. Command Module Plan

### Handler Registration Strategy
Each command module follows a consistent pattern:

```typescript
// commands/agent/project/list.ts
import { CommandHandler } from '../../../runtime/types';
import { API_CLIENT } from '../../../api/client';

export class ProjectListHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<CommandResult> {
    // Validation
    this.validate(context.args);
    
    // API call
    const projects = await API_CLIENT.getProjects(context.args.filter);
    
    // Format output
    return {
      status: 'ok',
      data: { projects },
      message: 'Projects retrieved successfully',
      errors: []
    };
  }
  
  validate(args: any): ValidationResult {
    // Validation logic
  }
}

// Register handler in namespace module
export const handlers = {
  list: new ProjectListHandler(),
  create: new ProjectCreateHandler(),
  // etc.
};
```

### Namespace Module Structure
Each namespace module exports its handlers:

```typescript
// commands/agent/index.ts
import * as projectCommands from './project';
import * as roadmapCommands from './roadmap';
// ... other resource modules

export const agentCommands = {
  project: projectCommands,
  roadmap: roadmapCommands,
  chat: chatCommands,
  file: fileCommands,
  terminal: terminalCommands
};
```

### Shared Utilities
Common utilities used across all command modules:

```typescript
// utils/formatters.ts
export function formatProject(project: Project): object { ... }
export function formatList(items: any[], formatType: FormatType): object { ... }

// utils/validators.ts
export function validateProjectId(id: string): boolean { ... }
export function validatePathParam(path: string): boolean { ... }
```

## 7. State & Context Engine Integration

### Context Loading and Management
The context engine manages the selection state (active project/roadmap/chat):

```typescript
// state/context-engine.ts
export interface ContextState {
  activeProjectId?: string;
  activeProjectName?: string;
  activeRoadmapId?: string;
  activeRoadmapTitle?: string;
  activeChatId?: string;
  activeChatTitle?: string;
  lastUpdate: string;
}

export class ContextEngine {
  private storage: ContextStorage;
  
  async load(): Promise<ContextState> {
    return await this.storage.read();
  }
  
  async save(updates: Partial<ContextState>): Promise<ContextState> {
    const current = await this.load();
    const newContext = { ...current, ...updates, lastUpdate: new Date().toISOString() };
    await this.storage.write(newContext);
    return newContext;
  }
}
```

### Persistence Location
Context is stored in a local file:

```typescript
// state/context-storage.ts
const CONTEXT_FILE = path.join(os.homedir(), '.config', 'nexus', 'context.json');

class ContextStorage {
  async read(): Promise<ContextState> {
    if (!fs.existsSync(CONTEXT_FILE)) {
      return this.getDefaultContext();
    }
    const data = await fs.promises.readFile(CONTEXT_FILE, 'utf-8');
    return JSON.parse(data);
  }
  
  async write(context: ContextState): Promise<void> {
    const dir = path.dirname(CONTEXT_FILE);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(CONTEXT_FILE, JSON.stringify(context, null, 2));
  }
}
```

### Isolation Rules for Automation
- Context is isolated per user (stored in user's home directory)
- Multiple instances can run concurrently without conflict
- Context updates are atomic to prevent corruption
- Scripts can override context temporarily using `--context` flags

This skeleton implementation plan provides a comprehensive blueprint for developing the Nexus CLI, with clear module responsibilities, integration patterns, and implementation strategies for all major components.
# Nexus CLI Runtime & Execution Engine

## 1. Runtime Responsibilities

The Nexus CLI Runtime & Execution Engine serves as the central orchestrator responsible for processing all commands and managing the complete execution lifecycle. Its core responsibilities include:

### Command Parsing and Resolution
- Interpreting user-provided command-line arguments into structured command objects
- Resolving command paths through the defined namespace hierarchy
- Validating argument completeness and type correctness

### Context Management
- Loading current context state before command execution
- Validating preconditions and dependencies (e.g., active project for roadmap operations)
- Updating context state when appropriate based on command outcomes

### Session Orchestration
- Managing session lifecycle (creation, retrieval, validation, termination)
- Attaching commands to appropriate sessions when required
- Routing streaming operations through the Session ABI

### API Dispatch and Communication
- Mapping command arguments to backend API calls
- Handling authentication tokens and request headers
- Managing connection retries and fallback mechanisms

### Streaming Operations Management
- Managing long-running operations that produce continuous output
- Ensuring proper event ordering and throttling for streaming operations
- Handling interrupt and termination signals for streaming processes

### Output Standardization
- Ensuring all command outputs follow the standardized JSON format
- Managing both streaming and single-response outputs
- Formatting errors consistently across all command handlers

## 2. Command Dispatch Mechanism

### Command Path Resolution
The runtime resolves commands using a deterministic hierarchical matching algorithm:

1. **Namespace Resolution**: Match the first argument against registered namespaces (agent, ai, network, debug, settings)
2. **Resource Resolution**: Match the second argument against resource types within the namespace
3. **Action Resolution**: Match the third argument against available actions for that resource
4. **Argument Parsing**: Parse remaining arguments as flags and values

### Resolution Example
```
nexus agent project list --filter web
```
Resolves to: `handler_agent_project_list` with argument `{filter: "web"}`

### Ambiguity Resolution
- If multiple commands match a prefix, the runtime returns an error listing all possible matches
- Short forms of arguments are resolved using registered aliases (e.g., `-f` for `--filter`)
- In case of ambiguous partial matches, the runtime requires full command specification

### Deterministic Resolution Rules
1. Commands must follow the exact namespace.resource.action pattern
2. Commands with insufficient arguments return help text for the partial command
3. Unknown commands return a structured error with available commands in that namespace
4. Argument validation occurs before command execution

## 3. Handler Architecture

### Handler Interface Definition
Each command handler implements the following interface:

```typescript
interface CommandHandler {
  execute(context: ExecutionContext): Promise<CommandResult>;
  validate(args: any): ValidationResult;
  getRequiredContext(): ContextRequirement[];
}
```

### Execution Context Structure
```typescript
interface ExecutionContext {
  args: { [key: string]: any };
  flags: { [key: string]: any };
  contextState: ContextState;    // Current context (project/roadmap/chat selections)
  session?: Session;             // Active session (if required by command)
  token?: string;                // Authentication token
  config: RuntimeConfig;         // Runtime configuration
}
```

### Mandatory Validation Steps
1. **Context Validation**: Verify required selections are present (e.g., project for roadmap operations)
2. **Argument Validation**: Validate required arguments are present and correctly typed
3. **Permission Validation**: Verify authentication token is valid and has required permissions
4. **Session Validation**: If command requires a session, verify session is active and appropriate type

### API Invocation Pattern
Handlers follow a consistent pattern for API interactions:

```typescript
async execute(context: ExecutionContext): Promise<CommandResult> {
  // 1. Validate inputs
  const validation = this.validate(context.args);
  if (!validation.valid) {
    return this.formatError(validation.errors);
  }

  // 2. Prepare API call
  const apiPayload = this.preparePayload(context);
  
  // 3. Execute API call
  try {
    const response = await this.apiClient.call(apiPayload);
    
    // 4. Format output
    return this.formatSuccess(response);
  } catch (error) {
    return this.formatError(error);
  }
}
```

### Output Formatting
- **Success Output**: Follows the standardized `{status, data, message, errors}` format
- **Error Output**: Maintains the same structure with `status: "error"` and populated `errors` array
- **Streaming Output**: Uses the event format defined in the Session ABI

### Error Propagation Model
- Application-level errors are wrapped in the standardized error format
- Validation errors are transformed to the appropriate error structure
- API communication errors are handled consistently across all handlers
- Session-related errors follow the Session ABI error format

## 4. Integration With the State & Context Engine

### Context Loading Process
1. **Pre-execution**: Runtime loads current context state from storage
2. **Validation**: Ensures context meets command requirements
3. **Injection**: Provides context to the command handler
4. **Post-execution**: Updates context if the command modifies state

### Context Validation
Before executing any command, the runtime validates:
- Active project selection for agent commands requiring projects
- Active roadmap selection for agent commands requiring roadmaps
- Active chat selection for chat-specific operations
- Authentication status for protected operations

### Read-Only vs. Write Operations
- **Read Operations**: Access context state but do not modify it
- **Write Operations**: May modify context selections (e.g., `project select`, `roadmap select`)
- **Context-Modifying Commands**: Explicitly update the context state with new selections

### Context Update Process
When a command modifies context:
1. The handler returns a context update instruction
2. The runtime applies the update to the active context
3. The updated context is persisted to storage
4. The command result includes both the primary response and context changes

## 5. Integration With the Session ABI

### Session-Aware Command Attachment
For commands requiring a session:
1. **Session Resolution**: Runtime finds the appropriate session based on `--session-id` or active selection
2. **Session Validation**: Verify session is active and appropriate type for the command
3. **Session Attachment**: Attach session to execution context for the handler
4. **Session Management**: Handle session lifecycle during command execution

### Streaming Event Routing
For streaming operations:
1. **Session Creation**: Runtime initiates streaming session if not provided
2. **Event Loop**: Runtime manages the streaming event loop
3. **Event Transformation**: Events from the ABI are transformed to standardized JSON format
4. **Output Routing**: Events are written to stdout in the streaming format

### Session Lifecycle Management
- **Creation**: Runtime creates sessions via Session ABI for streaming commands
- **Maintenance**: Runtime monitors session health during operation
- **Cleanup**: Runtime ensures sessions are properly closed when commands complete
- **Recovery**: Runtime handles session failures according to Session ABI recovery rules

## 6. Execution Flow for Streaming Commands

### General Streaming Lifecycle
```
Command Input → Runtime Validation → Session Creation/Attachment → Event Loop → Event Output → Termination
```

### Terminal Streaming Execution
1. **Initialization**: Create or attach to terminal session (requires active project)
2. **Command Execution**: Send command to terminal session
3. **Event Loop**: Continuously receive output events from session
4. **Event Transformation**: Convert terminal output to streaming event format
5. **Output**: Write events to stdout as they arrive
6. **Termination**: Close session or stop streaming when command completes

### AI Chat Token Streaming Execution
1. **Initialization**: Create or attach to AI chat session
2. **Message Transmission**: Send user message to AI backend
3. **Event Loop**: Continuously receive token/stream events from AI session
4. **Event Transformation**: Convert AI tokens to streaming event format
5. **Output**: Write events to stdout as tokens arrive
6. **Termination**: Finalize session when response completes or is interrupted

### Debug/Process Log Streaming Execution
1. **Initialization**: Create or attach to debug session for specified process
2. **Monitoring Start**: Begin monitoring the process
3. **Event Loop**: Continuously receive log events from process
4. **Event Transformation**: Convert log entries to streaming event format
5. **Output**: Write events to stdout as logs arrive
6. **Termination**: Stop monitoring when user terminates or process ends

### Network Update Streaming Execution
1. **Initialization**: Create or attach to network session for monitoring
2. **Monitoring Start**: Begin monitoring network events
3. **Event Loop**: Continuously receive network events
4. **Event Transformation**: Convert network events to streaming event format
5. **Output**: Write events to stdout as they occur
6. **Termination**: Stop monitoring when user terminates

### Event Loop Model
- **Polling Mode**: For polling-based sessions, use configured polling interval
- **WebSocket Mode**: For WebSocket sessions, listen for incoming messages
- **Local Mode**: For local operations, monitor local state changes
- **Throttling**: Events are throttled to prevent overwhelming output

### Ordering Guarantees
- Within a single session, events are guaranteed to be in chronological order
- Between sessions, event ordering is not guaranteed
- The runtime maintains sequence numbers for ordered delivery when required

### Interrupt Handling
- **Signal Detection**: Runtime detects interrupt signals (Ctrl+C) during streaming
- **Session Notification**: Runtime sends interrupt to active session through Session ABI
- **Graceful Termination**: Streaming stops and session is closed appropriately
- **State Preservation**: Any partial session state is preserved when possible

## 7. Standard Output & Error Model

### Success Output Format
```json
{
  "status": "ok",
  "data": { ... },
  "message": "string (optional human-readable message)",
  "requestId": "string (unique identifier for the request)",
  "timestamp": "string (ISO 8601 timestamp)",
  "errors": []
}
```

### Error Output Format
```json
{
  "status": "error",
  "data": null,
  "message": "string (human-readable error message)",
  "requestId": "string (unique identifier for the request)",
  "timestamp": "string (ISO 8601 timestamp)",
  "errors": [
    {
      "type": "string (error type identifier)",
      "message": "string (technical error message)",
      "code": "string (optional error code)",
      "details": "object (optional additional error details)"
    }
  ]
}
```

### Streaming Event Format
```json
{
  "event": "data|status|error|interrupt|close|metadata",
  "timestamp": "string (ISO 8601 timestamp)",
  "sessionId": "string (session identifier)",
  "payload": { ... }
}
```

### Runtime Enforcement Mechanisms
- **Template-Based Formatting**: All handlers use standardized output templates
- **Validation Layer**: Runtime validates all outputs before returning to user
- **Error Wrapping**: Runtime ensures all errors follow the standard error format
- **Consistency Checks**: Runtime validates that required fields are present

## 8. Pluggability & Extensibility

### Handler Registration Mechanism
Handlers are registered through a central registry at runtime initialization:

```typescript
interface HandlerRegistry {
  register(namespace: string, resource: string, action: string, handler: CommandHandler): void;
  getHandler(commandPath: string[]): CommandHandler | null;
  listHandlers(namespace?: string): CommandInfo[];
}
```

### Plugin Interface Definition
Plugins can add new capabilities by implementing the plugin interface:

```typescript
interface NexusPlugin {
  name: string;
  version: string;
  initialize(registry: HandlerRegistry, runtime: Runtime): void;
  getNamespaces(): NamespaceDefinition[];
}
```

### New Namespace Addition Process
To add a new namespace without breaking existing functionality:
1. **Define Namespace Structure**: Specify resource types and actions
2. **Implement Handlers**: Create handlers following the standard interface
3. **Register Handlers**: Register handlers with the runtime registry
4. **Validate Compatibility**: Ensure new commands don't conflict with existing ones

### Backward Compatibility Guarantees
- **Command Interface Stability**: Existing commands maintain the same arguments and output format
- **Session ABI Compatibility**: New session types must implement the Session ABI interface
- **Context API Stability**: Context requirements for existing commands remain unchanged
- **Error Format Consistency**: All error formats remain compatible with existing automation

### Extension Points
- **Authentication Extensions**: Support for additional authentication methods
- **API Endpoint Extensions**: Support for additional backend services
- **Output Format Extensions**: Support for additional output formats while maintaining JSON core
- **Transport Extensions**: Support for additional session transport mechanisms

### Automation and AI Usage Compatibility
- **Deterministic Command Paths**: New commands follow the same hierarchical pattern
- **Standard Argument Parsing**: New commands use the same argument validation
- **Consistent Output Formats**: All extensions maintain the same output structure
- **Predictable Behavior**: Extension commands follow the same lifecycle and error handling

This Runtime & Execution Engine specification provides a complete architectural blueprint for implementing the Nexus CLI, ensuring consistent behavior across all commands while maintaining extensibility for future development.
# Nexus CLI Architecture Specification

## 1. CLI Design Principles

### Mirroring Rule
Every feature available in the Nexus web frontend must have a corresponding command-line equivalent. The CLI must provide feature parity with the web UI, ensuring that any operation possible through the web interface can also be performed via command-line commands.

### Deterministic Behavior for AI Agents
- All commands must produce consistent, predictable outputs
- Commands must not rely on interactive state unless explicitly session-based
- Output must be structured and machine-readable by default
- Command execution must not have side effects on unrelated resources without explicit specification

### State Management
- Stateless commands for read operations and simple actions
- Stateful sessions only for continuous operations (e.g., AI chats, terminal sessions)
- Session state managed through explicit session IDs and context commands

## 2. Top-Level CLI Mode Structure

The Nexus CLI will mirror the web UI's top-level sections as "domains" or "contexts":

### agent-manager domain
**Scope of commands**: Project, roadmap, and chat management with integrated tools
- Project operations: create, list, update, delete, select
- Roadmap operations: create, list, update, select, status tracking
- Chat operations: create, list, update, send message, select
- Integrated tools: file operations (browse, read, write, diff), terminal commands

**Typical operations**:
- `nexus project list` - List all projects
- `nexus project create --name "MyApp" --category "web"` - Create a new project
- `nexus roadmap create --project-id 123 --title "Phase 1"` - Create a roadmap for a project
- `nexus chat send --chat-id 456 --message "Hello"` - Send a message to a chat

**Required inputs**: Project IDs, roadmap IDs, chat IDs for operations that require context

### ai-chat domain
**Scope of commands**: AI chat session management and messaging
- Session operations: create, list, switch, delete
- Message operations: send, receive, clear
- Backend management: select backend (qwen/claude/gemini/codex)

**Typical operations**:
- `nexus ai-chat create --backend qwen --name "dev-assistant"` - Create a new AI chat session
- `nexus ai-chat send --session-id abc123 --message "Write a Python function"` - Send a message to an AI session
- `nexus ai-chat list` - List all active sessions
- `nexus ai-chat stream --session-id abc123` - Stream real-time responses

**Required inputs**: Session IDs, backend type, message content

### network domain
**Scope of commands**: Network topology and connection monitoring
- Server operations: list, status, details
- Connection monitoring: list active connections, status
- Network graph operations: visualize, inspect

**Typical operations**:
- `nexus network servers list` - List all network servers
- `nexus network connections list` - List active connections
- `nexus network server status --server-id xyz789` - Get server status

**Required inputs**: Server IDs, connection IDs for specific resource operations

### debug domain
**Scope of commands**: Process monitoring and debugging utilities
- Process operations: list, inspect, monitor
- Log operations: view, filter, export
- Connection diagnostics: WebSocket, polling connections

**Typical operations**:
- `nexus debug processes list` - List all active processes
- `nexus debug process inspect --pid 12345` - Get detailed process information
- `nexus debug logs tail --process-id abc123` - Stream process logs

**Required inputs**: Process IDs, log sources for targeted operations

### settings domain
**Scope of commands**: Configuration and preference management
- Theme settings: appearance, palette
- Workspace settings: defaults, behavior preferences
- Authentication: credentials, token management

**Typical operations**:
- `nexus settings theme set --mode dark` - Set the theme mode
- `nexus settings workspace get` - Get current workspace settings
- `nexus settings auth login --username user --password pass` - Authenticate

**Required inputs**: Setting keys, values for configuration operations

## 3. Session Model

### Session Creation and Management
Sessions are created through specific commands that return session IDs:

- **AI Chat Sessions**: Created with `nexus ai-chat create`, returns a unique session ID
- **Terminal Sessions**: Created implicitly when accessing terminal features in agent-manager
- **Network Monitoring Sessions**: Created when starting connection monitoring

### Session State
- Session IDs are returned by creation commands and stored for subsequent use
- Commands requiring a session accept the `--session-id` parameter
- Default session selection possible for each domain (e.g., current project, chat session)

### WebSocket-like Interactions in CLI
- **Streaming Commands**: Use `--stream` flag to maintain persistent connection
  Example: `nexus ai-chat stream --session-id abc123 --stream`
- **Polling Commands**: Use `--poll` flag to periodically check for updates
  Example: `nexus debug processes monitor --poll --interval 5s`
- **Event Subscription**: Use `--follow` flag for real-time updates
  Example: `nexus network connections follow --follow`

## 4. Output Format Specification

### Default Machine-Readable Output
All commands output JSON by default with standardized fields:

```json
{
  "status": "success|error",
  "data": {...},
  "message": "Optional human-readable message",
  "timestamp": "ISO 8601 timestamp",
  "request_id": "Unique identifier for the request"
}
```

### Data Field Structure
The `data` field contains command-specific response data as defined by the operation:

- **List Operations**: Array of objects matching the entity type
- **Individual Operations**: Single object with the requested resource
- **Action Operations**: Result of the operation (e.g., created resource, status update)

### Optional Human-Readable Output
Add `--output=human` flag to get formatted, human-readable output for direct user consumption.

### Verbose Output
Add `--verbose` flag to include additional metadata and request response details.

## 5. Command Invocation Model

### Standard Command Structure
```
nexus [domain] [subdomain] [operation] [arguments...] [options...]
```

### Examples:
- `nexus project list --filter category=web`
- `nexus chat send --chat-id abc123 --message "Hello, AI"`
- `nexus ai-chat create --backend claude --name "research"`

### Argument Convention
- Use kebab-case for argument names: `--project-id`, `--session-id`
- Use standard positional arguments only for required inputs
- Use `--help` for command-specific help text

### Options Convention
- Short flags for common operations: `-s` for `--session-id`
- Long flags for complex options: `--session-id=abc123` 
- Boolean flags: `--stream`, `--verbose`, `--follow`

## 6. Error Handling Strategy

### Standard Error Object Structure
When `status` is "error", include additional fields:

```json
{
  "status": "error",
  "error": {
    "type": "ErrorCode",
    "message": "Human-readable error message",
    "details": {
      "code": 400,
      "request_id": "request-id",
      "timestamp": "ISO 8601 timestamp"
    }
  },
  "data": null
}
```

### Common Error Types
- `AUTHENTICATION_ERROR`: Missing or invalid authentication token
- `VALIDATION_ERROR`: Invalid inputs or missing required arguments
- `RESOURCE_NOT_FOUND`: Requested resource (project, chat, etc.) does not exist
- `CONNECTION_ERROR`: Unable to reach backend services
- `PERMISSION_ERROR`: Insufficient permissions for the requested action

### Exit Codes
- `0` - Success
- `1` - Generic error
- `2` - Validation error
- `3` - Authentication error
- `4` - Resource not found
- `5` - Connection error

## 7. Future Expansion Notes

### Automatic Command Generation from UI Features
The CLI will use `ui_map.json` as the canonical source for available features:
- Each `action` in ui_map.json corresponds to one or more CLI commands
- Each `entity` in ui_map.json defines data operations (CRUD) that map to CLI commands
- New UI features added to the web interface will automatically imply new CLI commands

### API Mapping
- Direct mapping from web UI API calls to CLI command implementations
- Each endpoint in `ui_map.json` APIs section maps to one or more CLI commands
- Authentication and session management follows the same patterns as the web UI

### Extension Principles
- New domains can be added by following the same architectural patterns
- New entity types can be incorporated with consistent CRUD operation patterns
- The session model can be extended to support new interactive features
- Output format remains consistent across all new commands

### Backward Compatibility
- New commands should not break existing command behavior
- Optional flags can be added to preserve default behavior
- Major changes should follow semantic versioning principles

## 8. Implementation Considerations

### Tooling and Dependencies
- Built using a modern CLI framework (e.g., Cobra for Go, Click for Python)
- Support for configuration files and environment variables
- Comprehensive test coverage for all commands
- Integration tests using the same backend APIs as the web UI

### Authentication and Security
- Token-based authentication following the same patterns as the web UI
- Secure storage of credentials and tokens
- Support for different environments (dev, staging, production)
- Certificate management for secure connections

### Performance and Efficiency
- Efficient API batching where appropriate
- Local caching of frequently accessed data
- Connection pooling for repeated requests
- Asynchronous operations where beneficial for user experience

This architecture provides a solid foundation for implementing the Nexus CLI to match the capabilities of the web UI while maintaining the command-line interface's distinctive advantages for automation and AI agent usage.
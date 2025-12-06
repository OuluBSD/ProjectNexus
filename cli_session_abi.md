# Nexus CLI Session ABI (Application Binary Interface)

## 1. Session Object Specification

### Standard Session Object Structure
Each session object follows this standardized JSON format:

```json
{
  "sessionId": "string (unique identifier)",
  "type": "string (terminal|ai-chat|meta-chat|debug-stream|network-stream)",
  "createdAt": "string (ISO 8601 timestamp)",
  "expiresAt": "string (ISO 8601 timestamp, optional)",
  "context": {
    "projectId": "string (optional)",
    "roadmapId": "string (optional)",
    "chatId": "string (optional)",
    "processId": "string (optional)",
    "serverId": "string (optional)"
  },
  "transport": "string (websocket|polling|hybrid|local)",
  "status": "string (active|paused|closed|error)",
  "capabilities": {
    "send": "boolean",
    "receive": "boolean",
    "interrupt": "boolean",
    "resize": "boolean (terminal only)",
    "close": "boolean",
    "restart": "boolean",
    "stream": "boolean"
  },
  "metadata": {
    "backend": "string (for AI sessions)",
    "workspacePath": "string (for AI/terminal sessions)",
    "connectionInfo": "object (for network sessions)"
  }
}
```

### Session Type Definitions

#### Terminal Session
```json
{
  "type": "terminal",
  "context": {
    "projectId": "string (required for terminal sessions)"
  },
  "transport": "websocket",
  "capabilities": {
    "send": true,
    "receive": true,
    "interrupt": true,
    "resize": true,
    "close": true,
    "stream": true
  },
  "metadata": {
    "cwd": "string (working directory)",
    "shell": "string (shell type)"
  }
}
```

#### AI Chat Session
```json
{
  "type": "ai-chat",
  "context": {
    "chatId": "string (optional - links to UI chat)"
  },
  "transport": "websocket|polling",
  "capabilities": {
    "send": true,
    "receive": true,
    "interrupt": true,
    "close": true,
    "stream": true
  },
  "metadata": {
    "backend": "string (qwen|claude|gemini|codex)",
    "workspacePath": "string (optional)",
    "allowChallenge": "boolean",
    "streamingMode": "boolean"
  }
}
```

#### Meta-Chat Session
```json
{
  "type": "meta-chat",
  "context": {
    "roadmapId": "string (required for meta-chat sessions)"
  },
  "transport": "websocket",
  "capabilities": {
    "receive": true,
    "close": true,
    "stream": true
  },
  "metadata": {
    "roadmapId": "string"
  }
}
```

#### Debug Stream Session
```json
{
  "type": "debug-stream",
  "context": {
    "processId": "string (optional)",
    "serverId": "string (optional)"
  },
  "transport": "websocket|polling",
  "capabilities": {
    "receive": true,
    "close": true,
    "stream": true
  }
}
```

#### Network Stream Session
```json
{
  "type": "network-stream",
  "context": {
    "serverId": "string (optional)"
  },
  "transport": "websocket",
  "capabilities": {
    "receive": true,
    "close": true,
    "stream": true
  }
}
```

## 2. Session Lifecycle Rules

### Session Creation
- All session-creating commands return a complete session object
- Session IDs are unique within the current user context
- Sessions are created in "active" status
- Session creation may include context validation (e.g., project must exist for terminal)

### Session Reuse
- Commands accept `--session-id <id>` parameter to use existing sessions
- Commands may infer active sessions based on current CLI context
- Session reuse does not modify the original session object
- Commands check session validity before use

### Session Closing
- Sessions close explicitly via `nexus session close --id <sessionId>` or similar command
- Sessions close automatically when the parent command exits
- Sessions may close automatically due to timeout or inactivity
- Closing a session returns the session object with updated status

### Session Invalidity
- When a session becomes invalid (expired, closed, network error), commands using that session will receive an error
- Session invalidity is detected on first use attempt after becoming invalid
- Invalid sessions are removed from the active session registry

## 3. Session Interaction Model

### Commands Accepting Session IDs
Commands that accept `--session-id <id>`:
- `nexus ai message stream --session-id <id>`
- `nexus agent terminal run --session-id <id>`
- `nexus debug log tail --session-id <id>`
- `nexus network connection monitor --session-id <id>`

### Commands Requiring Active Sessions
Commands that require a session and may use the active one:
- `nexus ai message send` (uses active AI session)
- `nexus ai message interrupt` (uses active AI session)
- `nexus agent terminal run --command "ls"` (uses active terminal session)

### Session Context Commands
Commands that manage session context:
- `nexus session list` - List all active sessions
- `nexus session get --id <id>` - Get session details
- `nexus session close --id <id>` - Close a session
- `nexus session interrupt --id <id>` - Interrupt a session (if supported)

## 4. Streaming and Event Model

### Standard Event Format
All streaming operations return JSON events in this format:

```json
{
  "event": "string (data|status|error|interrupt|close|metadata)",
  "timestamp": "string (ISO 8601 timestamp)",
  "sessionId": "string",
  "payload": "object (event-specific data)"
}
```

### Event Types

#### Data Events
For terminal output:
```json
{
  "event": "data",
  "timestamp": "2023-10-01T12:00:00Z",
  "sessionId": "abc123",
  "payload": {
    "type": "terminal-output",
    "content": "string (output data)",
    "contentType": "string (raw|ansi|text)"
  }
}
```

For AI chat tokens:
```json
{
  "event": "data",
  "timestamp": "2023-10-01T12:00:00Z",
  "sessionId": "def456",
  "payload": {
    "type": "ai-token",
    "content": "string (token or message chunk)",
    "messageId": "string (optional)",
    "isFinal": "boolean"
  }
}
```

#### Status Events
```json
{
  "event": "status",
  "timestamp": "2023-10-01T12:00:00Z",
  "sessionId": "abc123",
  "payload": {
    "type": "status",
    "status": "connecting|connected|responding|idle|closed",
    "message": "string (status description)"
  }
}
```

#### Error Events
```json
{
  "event": "error",
  "timestamp": "2023-10-01T12:00:00Z",
  "sessionId": "abc123",
  "payload": {
    "type": "error",
    "error": {
      "code": "string",
      "message": "string",
      "details": "object (optional)"
    }
  }
}
```

#### Interrupt Events
```json
{
  "event": "interrupt",
  "timestamp": "2023-10-01T12:00:00Z",
  "sessionId": "def456",
  "payload": {
    "type": "interrupt",
    "reason": "user-requested|timeout|error"
  }
}
```

#### Metadata Events
```json
{
  "event": "metadata",
  "timestamp": "2023-10-01T12:00:00Z",
  "sessionId": "def456",
  "payload": {
    "type": "metadata",
    "metadata": {
      "tokenCount": "number",
      "contextWindow": "number",
      "remainingTokens": "number"
    }
  }
}
```

### Streaming Parameters
- `--follow`: Continues streaming until manually stopped or session closed
- `--limit`: Maximum number of events to return
- `--format`: Output format (json-raw for raw events, json-compact for compact events)

### Event Ordering and Guarantees
- Events are guaranteed to be delivered in chronological order
- For WebSocket transports, events are delivered as soon as available
- For polling transports, events are batched and delivered at polling intervals
- Duplicate events are prevented by the CLI

## 5. Interrupt and Control Commands

### Standard Control Commands
```bash
# Interrupt a session (if supported)
nexus session interrupt --id <sessionId>

# Close a session
nexus session close --id <sessionId>

# Resize a terminal session (terminal only)
nexus session resize --id <sessionId> --width 80 --height 24

# Restart a session (if supported)
nexus session restart --id <sessionId>
```

### Interrupt Commands by Session Type
- **AI Chat**: Interrupt current response generation
- **Terminal**: Send interrupt signal (Ctrl+C) to running process
- **Meta-Chat**: Stop receiving updates (session remains open for queries)
- **Debug Stream**: Stop receiving logs (session remains available)
- **Network Stream**: Stop receiving updates (session remains available)

### Control Command Responses
Control commands return a standardized response:

```json
{
  "status": "ok|error",
  "data": {
    "sessionId": "string",
    "command": "string (interrupt|close|resize|restart)",
    "result": "object (command-specific)"
  },
  "message": "string (optional)",
  "errors": "array (if status is error)"
}
```

## 6. Error States and Recovery

### Common Session Error States
- `SESSION_EXPIRED`: Session has exceeded its validity period
- `SESSION_CLOSED`: Session was explicitly closed
- `CONNECTION_LOST`: Network connection to the backend was lost
- `AUTHENTICATION_INVALID`: Authentication token is no longer valid
- `RESOURCE_UNAVAILABLE`: Backend resource is temporarily unavailable

### Error Response Format
```json
{
  "status": "error",
  "data": null,
  "message": "Human-readable error message",
  "errors": [
    {
      "type": "SESSION_EXPIRED|CONNECTION_LOST|etc.",
      "message": "Technical error message",
      "timestamp": "ISO 8601 timestamp",
      "sessionId": "string",
      "retriable": "boolean"
    }
  ]
}
```

### Recovery Rules
- When a session expires, CLI commands attempt to recreate the session if possible
- For WebSocket sessions: Attempt automatic reconnection with exponential backoff
- For polling sessions: Continue polling with current parameters
- For local operations: Sessions are not recoverable once closed

### Session Validation
- Before using a session, the CLI validates its status and validity
- If a session is invalid, commands return appropriate errors
- Automatic session recreation is attempted only for specific commands

## 7. Compatibility Guarantees

### ABI Stability Commitment
The Nexus CLI Session ABI guarantees backward compatibility for:

#### Stable Fields in Session Object
- `sessionId`: Always a string identifier, never changes format
- `type`: Enum values are stable, new values may be added
- `createdAt`: Always ISO 8601 format
- `context`: Existing context fields are stable
- `capabilities`: Boolean flags are stable
- `status`: Enum values are stable, new values may be added

#### Stable Event Format
- `event`, `timestamp`, `sessionId` fields in events are stable
- `payload` structure is stable within event types
- New event types may be added without breaking existing code

#### Stable Control Commands
- `nexus session interrupt`, `close`, `restart` commands maintain same interface
- Session ID format remains consistent

### Versioning Approach
- Minor version changes maintain ABI compatibility
- Major version changes may introduce breaking changes with migration paths
- Deprecated fields are marked but maintained for at least 2 minor versions

### Deterministic Behavior for AI Agents
- Session operations are deterministic when given the same inputs
- Session states are consistent across CLI invocations
- Error conditions are consistently reported
- Event ordering is guaranteed within a single session

This ABI provides a stable, predictable interface for managing long-lived interactions in the Nexus CLI, ensuring that AI agents and scripts can maintain state across commands reliably.
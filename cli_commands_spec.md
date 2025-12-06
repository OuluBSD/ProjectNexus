# Nexus CLI Commands Specification

## 1. Agent Namespace Commands

### nexus agent project list

**Description**: List all projects with filtering capabilities

**Arguments**:
- `--filter` (string): Filter projects by name, category, or other attributes
- `--include-hidden` (boolean): Include hidden projects in the list

**Preconditions**: User authentication required

**API Interaction**: GET /api/projects

**Output**:
```json
{
  "status": "ok",
  "data": {
    "projects": [
      {
        "id": "string",
        "name": "string",
        "category": "string",
        "status": "string",
        "description": "string",
        "info": "string",
        "theme": "object",
        "contentPath": "string",
        "gitUrl": "string"
      }
    ]
  },
  "message": "Successfully retrieved projects",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- Network connection error

---

### nexus agent project create

**Description**: Create a new project

**Arguments**:
- `--name` (string, required): Project name
- `--category` (string): Project category
- `--description` (string): Project description
- `--content-path` (string): Absolute path to project content
- `--git-url` (string): Git repository URL to clone

**Preconditions**: User authentication required

**API Interaction**: POST /api/projects

**Output**:
```json
{
  "status": "ok",
  "data": {
    "project": {
      "id": "string",
      "name": "string",
      "category": "string",
      "status": "string",
      "description": "string",
      "info": "string",
      "theme": "object",
      "contentPath": "string",
      "gitUrl": "string"
    }
  },
  "message": "Project created successfully",
  "errors": []
}
```

**Error Conditions**:
- Missing required arguments
- Authentication failure
- Duplicate project name
- Invalid content path or git URL

---

### nexus agent project view

**Description**: Display detailed information about a specific project

**Arguments**:
- `--id` (string, required): Project ID
- `--name` (string): Project name (alternative to --id)

**Preconditions**: User authentication required, project must exist

**API Interaction**: GET /api/projects/{projectId}/details

**Output**:
```json
{
  "status": "ok",
  "data": {
    "project": {
      "id": "string",
      "name": "string",
      "category": "string",
      "status": "string",
      "description": "string",
      "info": "string",
      "theme": "object",
      "contentPath": "string",
      "gitUrl": "string"
    },
    "roadmapLists": [
      {
        "id": "string",
        "title": "string",
        "status": "string",
        "progress": "number",
        "tags": ["string"]
      }
    ]
  },
  "message": "Project details retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Project not found
- Authentication failure

---

### nexus agent project update

**Description**: Update an existing project's information

**Arguments**:
- `--id` (string, required): Project ID
- `--name` (string): New project name
- `--category` (string): New category
- `--description` (string): New description
- `--status` (string): New status
- `--theme` (string): New theme setting (JSON)
- `--content-path` (string): New content path
- `--git-url` (string): New git URL

**Preconditions**: User authentication required, project must exist

**API Interaction**: PUT /api/projects/{projectId}

**Output**:
```json
{
  "status": "ok",
  "data": {
    "project": {
      "id": "string",
      "name": "string",
      "category": "string",
      "status": "string",
      "description": "string",
      "info": "string",
      "theme": "object",
      "contentPath": "string",
      "gitUrl": "string"
    }
  },
  "message": "Project updated successfully",
  "errors": []
}
```

**Error Conditions**:
- Project not found
- Invalid input values
- Authentication failure

---

### nexus agent project delete

**Description**: Delete an existing project

**Arguments**:
- `--id` (string, required): Project ID
- `--name` (string): Project name (alternative to --id)

**Preconditions**: User authentication required, project must exist

**API Interaction**: DELETE /api/projects/{projectId}

**Output**:
```json
{
  "status": "ok",
  "data": {
    "id": "string"
  },
  "message": "Project deleted successfully",
  "errors": []
}
```

**Error Conditions**:
- Project not found
- Authentication failure

---

### nexus agent project select

**Description**: Set the currently active project for subsequent commands

**Arguments**:
- `--id` (string, required): Project ID
- `--name` (string): Project name (alternative to --id)

**Preconditions**: Project must exist

**API Interaction**: None (client-side operation)

**Output**:
```json
{
  "status": "ok",
  "data": {
    "selectedProjectId": "string",
    "selectedProjectName": "string"
  },
  "message": "Project selected successfully",
  "errors": []
}
```

**Error Conditions**:
- Project not found

---

### nexus agent roadmap list

**Description**: List all roadmaps for the currently selected project

**Arguments**:
- `--filter` (string): Filter roadmaps by title or status
- `--project-id` (string): Override the active project selection

**Preconditions**: User authentication required, active project selection required

**API Interaction**: GET /api/projects/{projectId}/roadmaps

**Output**:
```json
{
  "status": "ok",
  "data": {
    "roadmaps": [
      {
        "id": "string",
        "title": "string",
        "status": "string",
        "progress": "number",
        "tags": ["string"],
        "summary": "string",
        "metaStatus": "string",
        "metaProgress": "number",
        "metaSummary": "string"
      }
    ]
  },
  "message": "Roadmaps retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- No active project selected
- Project not found
- Authentication failure

---

### nexus agent roadmap create

**Description**: Create a new roadmap for the currently selected project

**Arguments**:
- `--title` (string, required): Roadmap title
- `--tags` (string array): Comma-separated list of tags
- `--project-id` (string): Override the active project selection

**Preconditions**: User authentication required, active project selection required

**API Interaction**: POST /api/projects/{projectId}/roadmaps

**Output**:
```json
{
  "status": "ok",
  "data": {
    "roadmap": {
      "id": "string",
      "title": "string",
      "status": "string",
      "progress": "number",
      "tags": ["string"],
      "summary": "string",
      "metaStatus": "string",
      "metaProgress": "number",
      "metaSummary": "string"
    }
  },
  "message": "Roadmap created successfully",
  "errors": []
}
```

**Error Conditions**:
- No active project selected
- Missing required arguments
- Authentication failure

---

### nexus agent roadmap view

**Description**: Display detailed information about a specific roadmap

**Arguments**:
- `--id` (string, required): Roadmap ID
- `--name` (string): Roadmap title (alternative to --id)

**Preconditions**: User authentication required, roadmap must exist

**API Interaction**: GET /api/roadmaps/{roadmapId}/status

**Output**:
```json
{
  "status": "ok",
  "data": {
    "roadmap": {
      "id": "string",
      "title": "string",
      "status": "string",
      "progress": "number",
      "tags": ["string"],
      "summary": "string",
      "metaStatus": "string",
      "metaProgress": "number",
      "metaSummary": "string"
    }
  },
  "message": "Roadmap details retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Roadmap not found
- Authentication failure

---

### nexus agent roadmap update

**Description**: Update an existing roadmap's information

**Arguments**:
- `--id` (string, required): Roadmap ID
- `--title` (string): New roadmap title
- `--tags` (string array): New comma-separated list of tags
- `--status` (string): New status
- `--progress` (number): New progress percentage (0-100)

**Preconditions**: User authentication required, roadmap must exist

**API Interaction**: PUT /api/roadmaps/{roadmapId}

**Output**:
```json
{
  "status": "ok",
  "data": {
    "roadmap": {
      "id": "string",
      "title": "string",
      "status": "string",
      "progress": "number",
      "tags": ["string"],
      "summary": "string",
      "metaStatus": "string",
      "metaProgress": "number",
      "metaSummary": "string"
    }
  },
  "message": "Roadmap updated successfully",
  "errors": []
}
```

**Error Conditions**:
- Roadmap not found
- Invalid progress value
- Authentication failure

---

### nexus agent roadmap select

**Description**: Set the currently active roadmap for subsequent commands

**Arguments**:
- `--id` (string, required): Roadmap ID
- `--name` (string): Roadmap title (alternative to --id)

**Preconditions**: Roadmap must exist

**API Interaction**: None (client-side operation)

**Output**:
```json
{
  "status": "ok",
  "data": {
    "selectedRoadmapId": "string",
    "selectedRoadmapTitle": "string"
  },
  "message": "Roadmap selected successfully",
  "errors": []
}
```

**Error Conditions**:
- Roadmap not found

---

### nexus agent chat list

**Description**: List all chats for the currently selected roadmap

**Arguments**:
- `--roadmap-id` (string): Override the active roadmap selection

**Preconditions**: User authentication required, active roadmap selection required

**API Interaction**: GET /api/roadmaps/{roadmapId}/chats

**Output**:
```json
{
  "status": "ok",
  "data": {
    "chats": [
      {
        "id": "string",
        "title": "string",
        "status": "string",
        "progress": "number",
        "note": "string",
        "meta": "boolean"
      }
    ]
  },
  "message": "Chats retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- No active roadmap selected
- Roadmap not found
- Authentication failure

---

### nexus agent chat create

**Description**: Create a new chat for the currently selected roadmap

**Arguments**:
- `--title` (string, required): Chat title
- `--note` (string): Optional chat note
- `--roadmap-id` (string): Override the active roadmap selection

**Preconditions**: User authentication required, active roadmap selection required

**API Interaction**: POST /api/roadmaps/{roadmapId}/chats

**Output**:
```json
{
  "status": "ok",
  "data": {
    "chat": {
      "id": "string",
      "title": "string",
      "status": "string",
      "progress": "number",
      "note": "string",
      "meta": "boolean"
    }
  },
  "message": "Chat created successfully",
  "errors": []
}
```

**Error Conditions**:
- No active roadmap selected
- Missing required arguments
- Authentication failure

---

### nexus agent chat view

**Description**: Display detailed information about a specific chat

**Arguments**:
- `--id` (string, required): Chat ID
- `--title` (string): Chat title (alternative to --id)

**Preconditions**: User authentication required, chat must exist

**API Interaction**: GET /api/chats/{chatId}/messages

**Output**:
```json
{
  "status": "ok",
  "data": {
    "chat": {
      "id": "string",
      "title": "string",
      "status": "string",
      "progress": "number",
      "note": "string",
      "meta": "boolean"
    },
    "messages": [
      {
        "id": "number",
        "role": "string",
        "content": "string",
        "timestamp": "number",
        "metadata": "object",
        "displayRole": "string"
      }
    ]
  },
  "message": "Chat details retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Chat not found
- Authentication failure

---

### nexus agent chat update

**Description**: Update an existing chat's information

**Arguments**:
- `--id` (string, required): Chat ID
- `--title` (string): New chat title
- `--note` (string): New chat note
- `--status` (string): New status

**Preconditions**: User authentication required, chat must exist

**API Interaction**: PUT /api/chats/{chatId}

**Output**:
```json
{
  "status": "ok",
  "data": {
    "chat": {
      "id": "string",
      "title": "string",
      "status": "string",
      "progress": "number",
      "note": "string",
      "meta": "boolean"
    }
  },
  "message": "Chat updated successfully",
  "errors": []
}
```

**Error Conditions**:
- Chat not found
- Authentication failure

---

### nexus agent chat select

**Description**: Set the currently active chat for subsequent commands

**Arguments**:
- `--id` (string, required): Chat ID
- `--title` (string): Chat title (alternative to --id)

**Preconditions**: Chat must exist

**API Interaction**: None (client-side operation)

**Output**:
```json
{
  "status": "ok",
  "data": {
    "selectedChatId": "string",
    "selectedChatTitle": "string"
  },
  "message": "Chat selected successfully",
  "errors": []
}
```

**Error Conditions**:
- Chat not found

---

### nexus agent chat send

**Description**: Send a message to the currently selected chat

**Arguments**:
- `--message` (string, required): Message content to send
- `--chat-id` (string): Override the active chat selection
- `--role` (string, default="user"): Message role (user, assistant, system)

**Preconditions**: User authentication required, active chat selection required

**API Interaction**: POST /api/chats/{chatId}/messages

**Output**:
```json
{
  "status": "ok",
  "data": {
    "message": {
      "id": "number",
      "role": "string",
      "content": "string",
      "timestamp": "number",
      "metadata": "object",
      "displayRole": "string"
    }
  },
  "message": "Message sent successfully",
  "errors": []
}
```

**Error Conditions**:
- No active chat selected
- Missing message content
- Authentication failure

---

### nexus agent file browse

**Description**: Browse the file system of the currently selected project

**Arguments**:
- `--path` (string, default="."): Directory to browse
- `--show-hidden` (boolean, default=false): Show hidden files
- `--project-id` (string): Override the active project selection

**Preconditions**: User authentication required, active project selection required

**API Interaction**: GET /api/files/tree

**Output**:
```json
{
  "status": "ok",
  "data": {
    "path": "string",
    "entries": [
      {
        "id": "string",
        "name": "string",
        "type": "file|directory",
        "size": "number",
        "modified": "string",
        "path": "string"
      }
    ]
  },
  "message": "File tree retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- No active project selected
- Path not accessible
- Authentication failure

---

### nexus agent file read

**Description**: Read the content of a file in the currently selected project

**Arguments**:
- `--path` (string, required): Path to the file to read
- `--project-id` (string): Override the active project selection

**Preconditions**: User authentication required, active project selection required

**API Interaction**: GET /api/files/content

**Output**:
```json
{
  "status": "ok",
  "data": {
    "file": {
      "path": "string",
      "content": "string",
      "size": "number"
    }
  },
  "message": "File content retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- No active project selected
- File not found
- Authentication failure

---

### nexus agent file write

**Description**: Write content to a file in the currently selected project

**Arguments**:
- `--path` (string, required): Path to the file to write
- `--content` (string, required): Content to write to the file
- `--project-id` (string): Override the active project selection

**Preconditions**: User authentication required, active project selection required

**API Interaction**: POST /api/files/content

**Output**:
```json
{
  "status": "ok",
  "data": {
    "file": {
      "path": "string",
      "content": "string",
      "size": "number"
    }
  },
  "message": "File written successfully",
  "errors": []
}
```

**Error Conditions**:
- No active project selected
- Missing path or content
- Authentication failure

---

### nexus agent file diff

**Description**: Get differences between files or file versions in the currently selected project

**Arguments**:
- `--path` (string, required): Path to the file
- `--base` (string): Base version/path to compare against
- `--compare` (string): Compare version/path
- `--project-id` (string): Override the active project selection

**Preconditions**: User authentication required, active project selection required

**API Interaction**: GET /api/files/diff

**Output**:
```json
{
  "status": "ok",
  "data": {
    "diff": {
      "path": "string",
      "baseContent": "string",
      "compareContent": "string",
      "changes": [
        {
          "type": "add|remove|modify",
          "line": "number",
          "content": "string"
        }
      ]
    }
  },
  "message": "File diff retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- No active project selected
- Files not found or not comparable
- Authentication failure

---

### nexus agent file open

**Description**: Open a file in the code editor of the currently selected project

**Arguments**:
- `--path` (string, required): Path to the file to open
- `--editor` (string): Editor to use (default: system default)
- `--project-id` (string): Override the active project selection

**Preconditions**: User authentication required, active project selection required

**API Interaction**: GET /api/files/content

**Output**:
```json
{
  "status": "ok",
  "data": {
    "file": {
      "path": "string",
      "content": "string",
      "editor": "string"
    }
  },
  "message": "File opened successfully",
  "errors": []
}
```

**Error Conditions**:
- No active project selected
- File not found
- Authentication failure

---

### nexus agent template list

**Description**: List all available templates

**Arguments**: None

**Preconditions**: User authentication required

**API Interaction**: GET /api/templates

**Output**:
```json
{
  "status": "ok",
  "data": {
    "templates": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "category": "string"
      }
    ]
  },
  "message": "Templates retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure

---

### nexus agent template create

**Description**: Create a new template

**Arguments**:
- `--name` (string, required): Template name
- `--content` (string, required): Template content
- `--description` (string): Template description
- `--category` (string): Template category

**Preconditions**: User authentication required

**API Interaction**: POST /api/templates

**Output**:
```json
{
  "status": "ok",
  "data": {
    "template": {
      "id": "string",
      "name": "string",
      "content": "string",
      "description": "string",
      "category": "string"
    }
  },
  "message": "Template created successfully",
  "errors": []
}
```

**Error Conditions**:
- Missing required arguments
- Authentication failure

---

### nexus agent terminal session

**Description**: Create a terminal session for the currently selected project

**Arguments**:
- `--project-id` (string): Override the active project selection
- `--cwd` (string, default="."): Working directory for the terminal

**Preconditions**: User authentication required, active project selection required

**API Interaction**: POST /api/terminal/sessions

**Output**:
```json
{
  "status": "ok",
  "data": {
    "sessionId": "string",
    "wsCandidates": ["string"]
  },
  "message": "Terminal session created successfully",
  "errors": []
}
```

**Error Conditions**:
- No active project selected
- Authentication failure

---

### nexus agent terminal run

**Description**: Execute a command in the terminal of the currently selected project

**Arguments**:
- `--command` (string, required): Command to execute
- `--project-id` (string): Override the active project selection
- `--cwd` (string): Working directory for the command (default: project root)

**Preconditions**: User authentication required, active project selection required

**API Interaction**: POST /api/terminal/sessions + WebSocket communication

**Output**:
```json
{
  "status": "ok",
  "data": {
    "command": "string",
    "output": "string",
    "exitCode": "number"
  },
  "message": "Command executed successfully",
  "errors": []
}
```

**Error Conditions**:
- No active project selected
- Command execution error
- Authentication failure

---

## 2. AI Namespace Commands

### nexus ai session list

**Description**: List all AI chat sessions

**Arguments**: None

**Preconditions**: User authentication required

**API Interaction**: Client-side session management

**Output**:
```json
{
  "status": "ok",
  "data": {
    "sessions": [
      {
        "id": "string",
        "name": "string",
        "backend": "string",
        "timestamp": "string"
      }
    ]
  },
  "message": "Sessions retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure

---

### nexus ai session create

**Description**: Create a new AI chat session

**Arguments**:
- `--backend` (string, default="qwen"): AI backend (qwen/claude/gemini/codex)
- `--name` (string): Session name
- `--workspace-path` (string): Path to workspace for file system access

**Preconditions**: User authentication required

**API Interaction**: WebSocket connection to initiate session

**Output**:
```json
{
  "status": "ok",
  "data": {
    "session": {
      "id": "string",
      "name": "string",
      "backend": "string",
      "timestamp": "string"
    }
  },
  "message": "Session created successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- Invalid backend type

---

### nexus ai session delete

**Description**: Delete an existing AI session

**Arguments**:
- `--id` (string, required): Session ID to delete

**Preconditions**: User authentication required

**API Interaction**: Client-side session management

**Output**:
```json
{
  "status": "ok",
  "data": {
    "id": "string"
  },
  "message": "Session deleted successfully",
  "errors": []
}
```

**Error Conditions**:
- Session not found
- Authentication failure

---

### nexus ai session switch

**Description**: Switch to an existing AI session

**Arguments**:
- `--id` (string, required): Session ID to switch to

**Preconditions**: User authentication required, session must exist

**API Interaction**: Client-side session management

**Output**:
```json
{
  "status": "ok",
  "data": {
    "session": {
      "id": "string",
      "name": "string",
      "backend": "string"
    }
  },
  "message": "Session switched successfully",
  "errors": []
}
```

**Error Conditions**:
- Session not found
- Authentication failure

---

### nexus ai session view

**Description**: View details of a specific AI session

**Arguments**:
- `--id` (string, required): Session ID

**Preconditions**: User authentication required, session must exist

**API Interaction**: Client-side session management

**Output**:
```json
{
  "status": "ok",
  "data": {
    "session": {
      "id": "string",
      "name": "string",
      "backend": "string",
      "timestamp": "string"
    },
    "messageCount": "number"
  },
  "message": "Session details retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Session not found
- Authentication failure

---

### nexus ai message send

**Description**: Send a message to the currently active AI session

**Arguments**:
- `--message` (string, required): Message content to send
- `--session-id` (string): Override the active session selection

**Preconditions**: User authentication required, active session required

**API Interaction**: WebSocket send to AI endpoint

**Output**:
```json
{
  "status": "ok",
  "data": {
    "message": {
      "id": "number",
      "role": "user",
      "content": "string",
      "timestamp": "number"
    }
  },
  "message": "Message sent successfully",
  "errors": []
}
```

**Error Conditions**:
- No active session
- Missing message content
- Authentication failure

---

### nexus ai message list

**Description**: List messages from the currently active AI session

**Arguments**:
- `--session-id` (string): Override the active session selection
- `--limit` (number, default=50): Maximum number of messages to return
- `--offset` (number, default=0): Number of messages to skip

**Preconditions**: User authentication required, active session required

**API Interaction**: Client-side session message history

**Output**:
```json
{
  "status": "ok",
  "data": {
    "messages": [
      {
        "id": "number",
        "role": "string",
        "content": "string",
        "timestamp": "number"
      }
    ]
  },
  "message": "Messages retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- No active session
- Authentication failure

---

### nexus ai message stream

**Description**: Stream real-time responses from the currently active AI session

**Arguments**:
- `--session-id` (string): Override the active session selection
- `--follow` (boolean, default=true): Continue listening for new messages

**Preconditions**: User authentication required, active session required

**API Interaction**: WebSocket connection to AI endpoint with streaming

**Output**:
```json
{
  "status": "ok",
  "data": {
    "stream": [
      {
        "type": "message|status|tool|info",
        "content": "string",
        "role": "string",
        "timestamp": "number"
      }
    ]
  },
  "message": "Streaming started successfully",
  "errors": []
}
```

**Error Conditions**:
- No active session
- Authentication failure
- WebSocket connection failure

---

### nexus ai message clear

**Description**: Clear messages in the currently active AI session

**Arguments**:
- `--session-id` (string): Override the active session selection

**Preconditions**: User authentication required, active session required

**API Interaction**: Client-side session management

**Output**:
```json
{
  "status": "ok",
  "data": {
    "clearedSessionId": "string"
  },
  "message": "Messages cleared successfully",
  "errors": []
}
```

**Error Conditions**:
- No active session
- Authentication failure

---

### nexus ai backend list

**Description**: List all available AI backends

**Arguments**: None

**Preconditions**: None

**API Interaction**: None (static list from client)

**Output**:
```json
{
  "status": "ok",
  "data": {
    "backends": [
      {"name": "qwen", "description": "Qwen AI Model"},
      {"name": "claude", "description": "Claude AI Model"},
      {"name": "gemini", "description": "Gemini AI Model"},
      {"name": "codex", "description": "Codex AI Model"}
    ]
  },
  "message": "Backends retrieved successfully",
  "errors": []
}
```

**Error Conditions**: None

---

### nexus ai backend select

**Description**: Select the AI backend for a session

**Arguments**:
- `--backend` (string, required): Backend to select (qwen/claude/gemini/codex)
- `--session-id` (string): Override the active session selection

**Preconditions**: Session must exist

**API Interaction**: WebSocket reconnection with new backend

**Output**:
```json
{
  "status": "ok",
  "data": {
    "session": {
      "id": "string",
      "backend": "string"
    }
  },
  "message": "Backend selected successfully",
  "errors": []
}
```

**Error Conditions**:
- Invalid backend name
- Session not found

---

### nexus ai backend status

**Description**: Check the status of an AI backend

**Arguments**:
- `--backend` (string, required): Backend to check (qwen/claude/gemini/codex)

**Preconditions**: User authentication required

**API Interaction**: Test connection to backend

**Output**:
```json
{
  "status": "ok",
  "data": {
    "backend": {
      "name": "string",
      "status": "string",
      "lastChecked": "string"
    }
  },
  "message": "Backend status retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- Backend not available

---

### nexus ai conversation export

**Description**: Export a conversation to a file

**Arguments**:
- `--session-id` (string, required): Session to export
- `--output` (string, required): Output file path

**Preconditions**: User authentication required, session must exist

**API Interaction**: Client-side session message history export

**Output**:
```json
{
  "status": "ok",
  "data": {
    "session": {
      "id": "string",
      "file": "string"
    }
  },
  "message": "Conversation exported successfully",
  "errors": []
}
```

**Error Conditions**:
- Session not found
- Authentication failure
- File write error

---

### nexus ai conversation import

**Description**: Import a conversation from a file

**Arguments**:
- `--input` (string, required): Input file path

**Preconditions**: User authentication required

**API Interaction**: Client-side session creation and import

**Output**:
```json
{
  "status": "ok",
  "data": {
    "session": {
      "id": "string",
      "messagesImported": "number"
    }
  },
  "message": "Conversation imported successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- File read error
- Invalid format

---

## 3. Network Namespace Commands

### nexus network server list

**Description**: List all servers in the network

**Arguments**:
- `--filter-type` (string): Filter by server type (worker/manager/ai)
- `--filter-status` (string): Filter by server status (online/offline/degraded)

**Preconditions**: User authentication required

**API Interaction**: GET /api/network/servers

**Output**:
```json
{
  "status": "ok",
  "data": {
    "servers": [
      {
        "id": "string",
        "name": "string",
        "type": "string",
        "host": "string",
        "port": "number",
        "status": "string",
        "metadata": "object",
        "lastHealthCheck": "string",
        "createdAt": "string",
        "updatedAt": "string"
      }
    ]
  },
  "message": "Servers retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- Network connection error

---

### nexus network server view

**Description**: View detailed information about a specific server

**Arguments**:
- `--id` (string, required): Server ID

**Preconditions**: User authentication required, server must exist

**API Interaction**: GET /api/network/servers/{serverId}

**Output**:
```json
{
  "status": "ok",
  "data": {
    "server": {
      "id": "string",
      "name": "string",
      "type": "string",
      "host": "string",
      "port": "number",
      "status": "string",
      "metadata": "object",
      "lastHealthCheck": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  },
  "message": "Server details retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Server not found
- Authentication failure

---

### nexus network server status

**Description**: Get the status of a specific server

**Arguments**:
- `--id` (string, required): Server ID

**Preconditions**: User authentication required, server must exist

**API Interaction**: GET /api/network/servers/{serverId}/status

**Output**:
```json
{
  "status": "ok",
  "data": {
    "status": "string",
    "health": {
      "cpu": "number",
      "memory": "number",
      "disk": "number"
    },
    "lastCheck": "string"
  },
  "message": "Server status retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Server not found
- Authentication failure

---

### nexus network connection list

**Description**: List all active connections

**Arguments**:
- `--filter-type` (string): Filter by connection type (qwen/terminal/git/other)
- `--filter-status` (string): Filter by connection status (starting/running/exited/error)

**Preconditions**: User authentication required

**API Interaction**: GET /api/network/connections

**Output**:
```json
{
  "status": "ok",
  "data": {
    "connections": [
      {
        "id": "string",
        "type": "string",
        "name": "string",
        "pid": "number",
        "command": "string",
        "args": ["string"],
        "cwd": "string",
        "startTime": "string",
        "endTime": "string",
        "status": "string",
        "attachments": "object"
      }
    ]
  },
  "message": "Connections retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- Network connection error

---

### nexus network connection view

**Description**: View detailed information about a specific connection

**Arguments**:
- `--id` (string, required): Connection ID

**Preconditions**: User authentication required, connection must exist

**API Interaction**: GET /api/network/connections/{connectionId}

**Output**:
```json
{
  "status": "ok",
  "data": {
    "connection": {
      "id": "string",
      "type": "string",
      "name": "string",
      "pid": "number",
      "command": "string",
      "args": ["string"],
      "cwd": "string",
      "startTime": "string",
      "endTime": "string",
      "status": "string",
      "attachments": "object"
    }
  },
  "message": "Connection details retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Connection not found
- Authentication failure

---

### nexus network topology view

**Description**: View the network topology/graph

**Arguments**: None

**Preconditions**: User authentication required

**API Interaction**: GET /api/network/topology

**Output**:
```json
{
  "status": "ok",
  "data": {
    "nodes": [
      {
        "id": "string",
        "label": "string",
        "type": "string",
        "status": "string"
      }
    ],
    "edges": [
      {
        "source": "string",
        "target": "string",
        "status": "string"
      }
    ]
  },
  "message": "Network topology retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- Network connection error

---

### nexus network element list

**Description**: List all network elements (servers, connections, processes)

**Arguments**:
- `--filter-type` (string): Filter by element type
- `--filter-status` (string): Filter by element status

**Preconditions**: User authentication required

**API Interaction**: GET /api/network/elements

**Output**:
```json
{
  "status": "ok",
  "data": {
    "elements": [
      {
        "id": "string",
        "name": "string",
        "type": "string",
        "status": "string"
      }
    ]
  },
  "message": "Network elements retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- Network connection error

---

## 4. Debug Namespace Commands

### nexus debug process list

**Description**: List all processes in the system

**Arguments**:
- `--filter-type` (string): Filter by process type (qwen/terminal/git/other)
- `--filter-status` (string): Filter by process status (starting/running/exited/error)
- `--limit` (number): Limit the number of processes returned

**Preconditions**: User authentication required

**API Interaction**: GET /api/debug/processes

**Output**:
```json
{
  "status": "ok",
  "data": {
    "processes": [
      {
        "id": "string",
        "type": "string",
        "name": "string",
        "pid": "number",
        "command": "string",
        "args": ["string"],
        "cwd": "string",
        "startTime": "string",
        "endTime": "string",
        "exitCode": "number",
        "signal": "string",
        "status": "string"
      }
    ]
  },
  "message": "Processes retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- Network connection error

---

### nexus debug process view

**Description**: View detailed information about a specific process

**Arguments**:
- `--id` (string, required): Process ID
- `--pid` (number): Process PID (alternative to --id)

**Preconditions**: User authentication required, process must exist

**API Interaction**: GET /api/debug/processes/{processId}

**Output**:
```json
{
  "status": "ok",
  "data": {
    "process": {
      "id": "string",
      "type": "string",
      "name": "string",
      "pid": "number",
      "command": "string",
      "args": ["string"],
      "cwd": "string",
      "startTime": "string",
      "endTime": "string",
      "exitCode": "number",
      "signal": "string",
      "status": "string"
    }
  },
  "message": "Process details retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Process not found
- Authentication failure

---

### nexus debug process inspect

**Description**: Inspect detailed information about a specific process

**Arguments**:
- `--id` (string, required): Process ID
- `--pid` (number): Process PID (alternative to --id)

**Preconditions**: User authentication required, process must exist

**API Interaction**: GET /api/debug/processes/{processId}/inspect

**Output**:
```json
{
  "status": "ok",
  "data": {
    "process": {
      "id": "string",
      "type": "string",
      "name": "string",
      "pid": "number",
      "command": "string",
      "args": ["string"],
      "cwd": "string",
      "startTime": "string",
      "endTime": "string",
      "exitCode": "number",
      "signal": "string",
      "status": "string",
      "resources": {
        "cpu": "number",
        "memory": "number",
        "fds": "number"
      },
      "environment": "object"
    }
  },
  "message": "Process inspected successfully",
  "errors": []
}
```

**Error Conditions**:
- Process not found
- Authentication failure

---

### nexus debug process monitor

**Description**: Monitor a specific process continuously

**Arguments**:
- `--id` (string, required): Process ID
- `--pid` (number): Process PID (alternative to --id)
- `--follow` (boolean, default=true): Continue monitoring

**Preconditions**: User authentication required, process must exist

**API Interaction**: Streaming connection to process status endpoint

**Output**:
```json
{
  "status": "ok",
  "data": {
    "process": {
      "id": "string",
      "pid": "number",
      "status": "string",
      "resources": {
        "cpu": "number",
        "memory": "number"
      }
    }
  },
  "message": "Process monitoring started successfully",
  "errors": []
}
```

**Error Conditions**:
- Process not found
- Authentication failure
- Monitoring failure

---

### nexus debug process kill

**Description**: Terminate a specific process

**Arguments**:
- `--id` (string, required): Process ID
- `--pid` (number): Process PID (alternative to --id)
- `--signal` (string, default="SIGTERM"): Signal to send to the process

**Preconditions**: User authentication required, process must exist

**API Interaction**: DELETE /api/debug/processes/{processId}

**Output**:
```json
{
  "status": "ok",
  "data": {
    "killed": {
      "id": "string",
      "pid": "number",
      "signal": "string"
    }
  },
  "message": "Process terminated successfully",
  "errors": []
}
```

**Error Conditions**:
- Process not found
- Authentication failure
- Insufficient permissions

---

### nexus debug log tail

**Description**: Stream the latest logs from a specific process

**Arguments**:
- `--id` (string, required): Process ID
- `--pid` (number): Process PID (alternative to --id)
- `--lines` (number, default=50): Number of lines to show
- `--follow` (boolean, default=true): Continue streaming new logs

**Preconditions**: User authentication required, process must exist

**API Interaction**: Streaming connection to log endpoint

**Output**:
```json
{
  "status": "ok",
  "data": {
    "logs": [
      {
        "timestamp": "string",
        "level": "string",
        "message": "string",
        "processId": "string"
      }
    ]
  },
  "message": "Log streaming started successfully",
  "errors": []
}
```

**Error Conditions**:
- Process not found
- Authentication failure
- Log access failure

---

### nexus debug log view

**Description**: View logs from one or more processes

**Arguments**:
- `--id` (string): Process ID
- `--pid` (number): Process PID
- `--from` (string): Start time (ISO format)
- `--to` (string): End time (ISO format)
- `--level` (string): Log level filter (debug/info/warn/error)
- `--limit` (number, default=100): Maximum number of log entries

**Preconditions**: User authentication required

**API Interaction**: GET /api/debug/logs with filters

**Output**:
```json
{
  "status": "ok",
  "data": {
    "logs": [
      {
        "timestamp": "string",
        "level": "string",
        "message": "string",
        "processId": "string"
      }
    ]
  },
  "message": "Logs retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- Invalid time format
- Log access failure

---

### nexus debug log search

**Description**: Search logs with advanced filtering

**Arguments**:
- `--query` (string, required): Search query
- `--id` (string): Process ID
- `--pid` (number): Process PID
- `--from` (string): Start time (ISO format)
- `--to` (string): End time (ISO format)
- `--level` (string): Log level filter (debug/info/warn/error)
- `--limit` (number, default=100): Maximum number of log entries

**Preconditions**: User authentication required

**API Interaction**: GET /api/debug/logs with search filters

**Output**:
```json
{
  "status": "ok",
  "data": {
    "logs": [
      {
        "timestamp": "string",
        "level": "string",
        "message": "string",
        "processId": "string"
      }
    ],
    "totalResults": "number"
  },
  "message": "Log search completed successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- Invalid time format
- Log access failure

---

### nexus debug log export

**Description**: Export logs to a file

**Arguments**:
- `--output` (string, required): Output file path
- `--id` (string): Process ID
- `--pid` (number): Process PID
- `--from` (string): Start time (ISO format)
- `--to` (string): End time (ISO format)
- `--level` (string): Log level filter

**Preconditions**: User authentication required

**API Interaction**: GET /api/debug/logs with export format

**Output**:
```json
{
  "status": "ok",
  "data": {
    "exported": {
      "file": "string",
      "entries": "number"
    }
  },
  "message": "Logs exported successfully",
  "errors": []
}
```

**Error Conditions**:
- Authentication failure
- Invalid time format
- File write error

---

## 5. Settings Namespace Commands

### nexus settings theme get

**Description**: Get the current theme settings

**Arguments**: None

**Preconditions**: None

**API Interaction**: Client-side settings lookup

**Output**:
```json
{
  "status": "ok",
  "data": {
    "theme": {
      "mode": "auto|dark|light",
      "palette": "object"
    }
  },
  "message": "Theme settings retrieved successfully",
  "errors": []
}
```

**Error Conditions**: None

---

### nexus settings theme set

**Description**: Set the theme mode

**Arguments**:
- `--mode` (string, required): Theme mode (auto/dark/light)
- `--palette` (string): Custom palette JSON

**Preconditions**: None

**API Interaction**: Client-side settings update

**Output**:
```json
{
  "status": "ok",
  "data": {
    "theme": {
      "mode": "string",
      "palette": "object"
    }
  },
  "message": "Theme settings updated successfully",
  "errors": []
}
```

**Error Conditions**:
- Invalid theme mode

---

### nexus settings workspace get

**Description**: Get the current workspace settings

**Arguments**: None

**Preconditions**: None

**API Interaction**: Client-side settings lookup

**Output**:
```json
{
  "status": "ok",
  "data": {
    "workspace": {
      "autoOpenTerminal": "boolean",
      "detailMode": "minimal|expanded",
      "rememberLastPath": "boolean"
    }
  },
  "message": "Workspace settings retrieved successfully",
  "errors": []
}
```

**Error Conditions**: None

---

### nexus settings workspace set

**Description**: Set workspace preferences

**Arguments**:
- `--auto-open-terminal` (boolean): Auto-open terminal on project selection
- `--detail-mode` (string): Detail mode (minimal/expanded)
- `--remember-last-path` (boolean): Remember last folder for each project

**Preconditions**: None

**API Interaction**: Client-side settings update

**Output**:
```json
{
  "status": "ok",
  "data": {
    "workspace": {
      "autoOpenTerminal": "boolean",
      "detailMode": "string",
      "rememberLastPath": "boolean"
    }
  },
  "message": "Workspace settings updated successfully",
  "errors": []
}
```

**Error Conditions**:
- Invalid detail mode value

---

### nexus settings category list

**Description**: List all available setting categories

**Arguments**: None

**Preconditions**: None

**API Interaction**: Client-side settings structure lookup

**Output**:
```json
{
  "status": "ok",
  "data": [
    {
      "key": "string",
      "label": "string",
      "detail": "string"
    }
  ],
  "message": "Settings categories retrieved successfully",
  "errors": []
}
```

**Error Conditions**: None

---

### nexus settings option get

**Description**: Get a specific setting option

**Arguments**:
- `--category` (string, required): Setting category
- `--key` (string, required): Option key

**Preconditions**: None

**API Interaction**: Client-side settings lookup

**Output**:
```json
{
  "status": "ok",
  "data": {
    "value": "any",
    "option": {
      "category": "string",
      "key": "string",
      "description": "string"
    }
  },
  "message": "Option retrieved successfully",
  "errors": []
}
```

**Error Conditions**:
- Invalid category or key

---

### nexus settings option set

**Description**: Set a specific setting option

**Arguments**:
- `--category` (string, required): Setting category
- `--key` (string, required): Option key
- `--value` (string, required): New option value

**Preconditions**: None

**API Interaction**: Client-side settings update

**Output**:
```json
{
  "status": "ok",
  "data": {
    "option": {
      "category": "string",
      "key": "string",
      "value": "any"
    }
  },
  "message": "Option updated successfully",
  "errors": []
}
```

**Error Conditions**:
- Invalid category, key, or value

---

### nexus settings auth login

**Description**: Authenticate with the Nexus backend

**Arguments**:
- `--username` (string, required): Username
- `--password` (string, required): Password
- `--token` (string): Authentication token (alternative to username/password)

**Preconditions**: Valid credentials required

**API Interaction**: POST /api/auth/login

**Output**:
```json
{
  "status": "ok",
  "data": {
    "token": "string",
    "user": {
      "id": "string",
      "username": "string"
    }
  },
  "message": "Login successful",
  "errors": []
}
```

**Error Conditions**:
- Invalid credentials
- Network connection error

---

### nexus settings auth logout

**Description**: End the current authentication session

**Arguments**: None

**Preconditions**: Active authentication session required

**API Interaction**: Client-side token removal

**Output**:
```json
{
  "status": "ok",
  "data": {},
  "message": "Logout successful",
  "errors": []
}
```

**Error Conditions**: None

---

### nexus settings auth status

**Description**: Check the current authentication status

**Arguments**: None

**Preconditions**: None

**API Interaction**: Client-side token validation

**Output**:
```json
{
  "status": "ok",
  "data": {
    "authenticated": "boolean",
    "user": {
      "id": "string",
      "username": "string"
    },
    "expiresAt": "string"
  },
  "message": "Authentication status retrieved successfully",
  "errors": []
}
```

**Error Conditions**: None

---

### nexus settings auth token

**Description**: Get the current authentication token

**Arguments**: None

**Preconditions**: Active authentication session required

**API Interaction**: Client-side token retrieval

**Output**:
```json
{
  "status": "ok",
  "data": {
    "token": "string"
  },
  "message": "Token retrieved successfully",
  "errors": []
}
```

**Error Conditions**: Not authenticated
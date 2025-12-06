# Nexus CLI Command Hierarchy and Namespaces

## 1. Top-Level Command Design

### Root Command: `nexus`
The `nexus` command serves as the primary entry point for all CLI operations. It provides access to all major feature domains of the Nexus platform and orchestrates the interaction with backend services.

### Global Behaviors
- **Authentication**: Commands automatically use stored session tokens or prompt for authentication when needed
- **Configuration**: Commands respect global configuration settings loaded from config files or environment variables
- **Output Control**: All commands support consistent output formatting (JSON by default, human-readable optionally)

### Global Flags
- `--session-id`: Override the default session for this command execution
- `--output`: Select output format (`json` or `human`)
- `--verbose`: Include additional metadata and debug information
- `--config`: Path to configuration file to use
- `--server`: Override the backend server URL
- `--help`: Show help information for any command level
- `--version`: Display the CLI version

## 2. Command Namespaces (Mirroring UI Domains)

### `agent` namespace
**Purpose**: Manages projects, roadmaps, and chats with integrated development tools
**Operations**: Project creation and management, roadmap planning, chat conversations, file system operations, and terminal interactions

### `ai` namespace
**Purpose**: Manages AI chat sessions and related operations
**Operations**: Session creation and management, message sending/receiving, AI backend selection, conversation history management

### `network` namespace
**Purpose**: Monitors and manages network topology and connections
**Operations**: Server status monitoring, connection tracking, network graph visualization, network element management

### `debug` namespace
**Purpose**: Provides debugging and process monitoring capabilities
**Operations**: Process monitoring, log inspection, connection diagnostics, debugging information access

### `settings` namespace
**Purpose**: Manages user preferences and account settings
**Operations**: Theme configuration, workspace settings, account management, authentication settings

## 3. Subcommand Families

### agent namespace
```
agent
├── project
│   ├── list
│   ├── create
│   ├── update
│   ├── delete
│   ├── view
│   └── select
├── roadmap
│   ├── list
│   ├── create
│   ├── update
│   ├── view
│   └── select
├── chat
│   ├── list
│   ├── create
│   ├── update
│   ├── send
│   ├── view
│   └── select
├── file
│   ├── browse
│   ├── read
│   ├── write
│   ├── diff
│   └── open
├── template
│   ├── list
│   ├── create
│   └── favorite
└── terminal
    ├── session
    ├── run
    ├── open
    └── close
```

### ai namespace
```
ai
├── session
│   ├── list
│   ├── create
│   ├── delete
│   ├── switch
│   └── view
├── message
│   ├── send
│   ├── list
│   ├── stream
│   ├── clear
│   └── view
├── backend
│   ├── list
│   ├── select
│   └── status
└── conversation
    ├── export
    └── import
```

### network namespace
```
network
├── server
│   ├── list
│   ├── view
│   ├── status
│   └── refresh
├── connection
│   ├── list
│   ├── view
│   └── monitor
├── topology
│   ├── view
│   ├── refresh
│   └── export
└── element
    ├── list
    ├── filter
    └── search
```

### debug namespace
```
debug
├── process
│   ├── list
│   ├── view
│   ├── inspect
│   ├── monitor
│   └── kill
├── log
│   ├── tail
│   ├── view
│   ├── search
│   └── export
├── connection
│   ├── list
│   ├── view
│   ├── monitor
│   └── status
└── session
    ├── list
    ├── view
    └── refresh
```

### settings namespace
```
settings
├── theme
│   ├── get
│   ├── set
│   └── list
├── workspace
│   ├── get
│   ├── set
│   └── reset
├── category
│   ├── list
│   └── view
├── auth
│   ├── login
│   ├── logout
│   ├── status
│   └── token
└── option
    ├── get
    ├── set
    └── list
```

## 4. Command Naming Conventions

### Consistent Verb Set
- **list**: Display multiple items of a specific type
- **view**: Display detailed information about a single item
- **create**: Create a new instance of an entity
- **update**: Modify an existing entity
- **delete**: Remove an existing entity
- **send**: Transmit data (messages, commands, etc.)
- **select**: Set the current context for subsequent operations
- **status**: Get the current state of a resource or system
- **monitor**: Continuously observe a resource with updates
- **refresh**: Force update/reload of cached information

### Semantic Command Structure
Commands should read naturally as:
```
nexus [namespace] [resource] [operation] [qualifiers...]
```

Examples:
- `nexus agent project list` - List projects in agent management
- `nexus ai session create --backend=qwen` - Create an AI session with Qwen backend
- `nexus debug process view --pid=12345` - View details for a specific process

### Consistency Rules
- Use singular nouns for resource types (project, roadmap, chat)
- Use consistent terminology from the UI for entity types
- Maintain consistency in command hierarchy depth

## 5. Context vs. Non-context Commands

### Non-context Commands
**Global Operations**: Commands that work without any active selection
- `nexus agent project list` - Lists all projects regardless of selection
- `nexus ai session list` - Lists all AI sessions
- `nexus settings theme get` - Gets current theme setting
- `nexus debug process list` - Lists all processes

### Context-dependent Commands
**Require Active Selection**: Commands that operate relative to a selected entity
- `nexus agent roadmap list` - Requires an active project selection
- `nexus agent chat list` - Requires an active roadmap selection
- `nexus agent file browse` - Requires an active project selection
- `nexus agent terminal open` - Requires an active project selection

### Context Management Commands
- `nexus agent project select --id=123` - Sets the active project context
- `nexus agent roadmap select --id=456` - Sets the active roadmap context
- `nexus agent chat select --id=789` - Sets the active chat context

### Default Behavior for Missing Context
If a command requires context but none is selected, the CLI should:
1. Display an error message indicating the missing selection
2. Suggest the appropriate command to set the required context
3. Exit with a non-zero status code
4. Provide a list of relevant context commands for convenience

Example error message:
```
Error: No active project selected. Use 'nexus agent project select' to set the active project.
Available projects:
  1. MyApp (web) [active]
  2. DataProcessor (backend)
  3. Dashboard (frontend)
```

## 6. Reserved Future Namespaces

### Potential Expansion Areas
- `plugin` - Commands for managing third-party extensions
- `automation` - Workflow automation and scripting commands
- `report` - Reporting and analytics commands
- `export` - Data export and migration commands
- `backup` - Backup and recovery commands

### Reserved Command Patterns
- `nexus [domain] bulk` - For batch operations on multiple items
- `nexus [domain] template` - For operations using predefined templates
- `nexus [domain] rule` - For defining and managing business rules
- `nexus [domain] schedule` - For scheduling operations

This command hierarchy is designed to be extensible, maintaining consistency while accommodating new features that align with the evolving Nexus platform.
# Nexus Meta-Orchestration Architecture

## Introduction

Meta-orchestration in Nexus refers to the pattern of coordinating multiple AI-driven sessions where one "meta" session orchestrates work across multiple "child" sessions. This architecture solves the problem of safely coordinating multiple AI agents working together on a shared project without allowing direct access to the filesystem or processes. The key idea is that LLMs (Language Learning Models) only communicate with the system through `nexus-agent-tool`, which acts as a hypervisor that manages access to projects and sessions.

The architecture creates a trust boundary: LLMs are given specific instructions to use `nexus-agent-tool` for all environmental interactions, while the tool provides a controlled interface for writing files, running commands, and logging state. This enables predictable, auditable, and safe multi-agent workflows.

## Layered Architecture Overview

The architecture consists of four conceptual layers that establish clear boundaries between AI agents and the system they operate on:

```
┌─────────────────────────────────┐
│    1. LLM Agents              │  ← Qwen (now), other backends (future)
├─────────────────────────────────┤
│    2. nexus-agent-tool         │  ← AI Hypervisor (session state, file operations)
├─────────────────────────────────┤
│    3. Nexus CLI & Backend      │  ← Projects, roadmaps, chats, network
├─────────────────────────────────┤
│    4. Filesystem & Processes   │  ← Project directories, OS-level processes
└─────────────────────────────────┘
```

1. **LLM Agents**
   * Currently Qwen, with future support for other backends
   * Do not interact with the filesystem or processes directly
   * Receive instructions to use `nexus-agent-tool` for all actions

2. **`nexus-agent-tool` (AI Hypervisor)**
   * Manages sessions, session state, and change tracking
   * Provides a JSON-only CLI interface
   * Performs file operations, command execution, and logging on behalf of sessions

3. **Nexus CLI & Backend**
   * Handles projects, roadmaps, chats, debugging, networking, and Qwen integration
   * May be called by `nexus-agent-tool` for higher-level operations
   * Serves as the "system of record" for organizational concepts

4. **Filesystem & Processes**
   * Real project directories and OS-level processes
   * Only accessed via `nexus-agent-tool` and Nexus CLI/backend when necessary

## Session Model & State Contract

The `SessionState` represents an active AI session with comprehensive tracking of all actions taken:

```typescript
interface SessionState {
  sessionId: string;
  projectPath: string;
  parentSessionId: string | null;  // For linking meta and child sessions
  backend: string;                 // e.g. "qwen", "claude"  
  status: "active" | "completed" | "error";
  notes: string[];
  changes: SessionChange[];
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
}

type SessionChange = 
  | FileWriteChange
  | CommandRunChange  
  | NoteChange;

interface FileWriteChange {
  type: "file-write";
  relPath: string;                 // Relative to projectPath
  timestamp: string;               // ISO timestamp
}

interface CommandRunChange {
  type: "command-run";
  cmd: string;                     // The executed command
  exitCode: number;
  timestamp: string;               // ISO timestamp
}

interface NoteChange {
  type: "note";
  message: string;
  timestamp: string;               // ISO timestamp
}
```

Session state files are stored in `~/.nexus/agent-sessions/<sessionId>.json`. This state serves as the ground truth for "what an AI actually did" during a session, providing an auditable trail of all file operations, command executions, and notes.

## Meta vs Child Sessions

The architecture distinguishes between two types of sessions with different responsibilities:

### Meta Session (Orchestrator)
- Acts as the planning and coordination layer for multi-session workflows
- Has `parentSessionId: null` (serves as the root session)
- Responsibilities:
  - Decomposes high-level goals into sub-tasks
  - Creates plan artifacts (e.g., `meta-plan.json`) that define work for child sessions
  - Logs high-level intent and coordination notes

### Child Session (Worker)  
- Executes specific sub-tasks defined by the meta session
- Has `parentSessionId` set to the meta session ID
- Responsibilities:
  - Implements their assigned portion of the plan
  - Performs concrete file operations and command executions
  - Updates their own session state with specific actions taken

This hierarchical organization allows for coordinated work where the meta session maintains the high-level plan while child sessions execute specific tasks within that plan.

## Example Flow: Meta + 3 Child Sessions

The flow implemented by `test-meta-agent-multi-session.sh` demonstrates the complete cycle:

1. **Setup Phase**
   - Create temporary project directory
   - Create 1 meta session + 3 child sessions using `nexus-agent-tool start`
   - Each session is associated with the same project path

2. **Meta Planning Phase**
   - Run Qwen in meta session mode to:
     - Log coordination notes using `nexus-agent-tool log`
     - Create `meta-plan.json` via `nexus-agent-tool write-file` containing references to the three child sessions and their target files

3. **Child Execution Phase**  
   - Run Qwen in each child session to:
     - Create `child-a.txt`, `child-b.txt`, `child-c.txt` via `write-file`
     - Include `SESSION_ID=...` in each file contents as verification

4. **Verification Phase**
   - At completion, artifacts exist:
     - `meta-plan.json` with all child session IDs and target filenames
     - 3 child files with session-specific content
     - 4 session state JSON files with at least one `file-write` change each

```
Meta LLM ──┐
            ├── nexus-agent-tool ── Project Directory
Child A LLM ─┤                    (meta-plan.json, child files)
Child B LLM ─┤                    
Child C LLM ─┘                    
```

## Safety & Trust Model

The architecture implements a clear trust model to ensure safe AI operations:

**Trust Boundary**: The `nexus-agent-tool` acts as a hypervisor between LLMs and the system:
- All file writes and commands must go through the tool
- All actions are logged into session state for auditability
- Direct filesystem or process access is prevented

**Soft Trust Principle**: While LLMs are instructed to use the tool exclusively, the system relies on:
- Clear documentation and prompt design emphasizing tool usage
- Verification through session state artifacts
- Testing that expects tools to be used properly

**Future Hardening**: The security model can be strengthened through:
- Session state scanning and validation
- Command whitelisting and restrictions  
- Policy enforcement layers
- Human-in-the-loop approvals for sensitive operations

## Relationship to Nexus CLI & Future Directions

The meta-orchestration layer complements the existing Nexus architecture:

### Current Integration
- Works alongside CLI commands for projects, roadmaps, and chats
- Integrates with Qwen probe and chat-stack tests
- Uses the same session storage infrastructure
- Follows existing configuration and project management patterns

### Future Enhancements
- **Backend Support**: Plug additional LLM backends (Claude, Gemini, Codex) into the same `nexus-agent-tool` pattern
- **Richer Orchestration**: Implement multi-level task trees, policy enforcement, and approval workflows
- **UI Integration**: Surface meta/child session state in the web UI as first-class "AI Work Sessions" objects
- **Advanced Safety**: Add real-time policy enforcement, resource quotas, and sandboxing

### Closing Notes

This pattern is chosen to provide a single hypervisor (`nexus-agent-tool`) that can manage multiple AI backends with predictable behavior. By forcing all AI interactions through a controlled interface, it transforms the potentially chaotic nature of AI operations into a tractable, loggable, and debuggable system. The architecture provides a foundation for safe, scalable multi-agent workflows while maintaining clear audit trails and controllable access patterns.
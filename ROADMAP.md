# Project Nexus – Roadmap

A strategic outline for guiding development, architectural evolution, and long‑term vision.

This roadmap is intentionally high-level and heuristic. It emphasizes direction rather than deadlines, because the system is expected to evolve as new use‑cases, models, and interaction patterns emerge.

---

## 1. Early Foundations (MVP Phase)

These items define the minimum viable implementation capable of handling multi‑project and multi‑chat workflows.

### 1.1 Core Data Structures

- Implement database schema for:
  - Projects
  - ChatThreads
  - Messages
  - ChatTemplates
  - ProjectSnapshots
- Establish migrations and initial seed templates.

### 1.2 UI Skeleton & Navigation

- Three-column layout:
  - **Projects list** (left)
  - **Chats list** (middle)
  - **Main interaction pane** (right)
- Routing structure:
  - `/projects/:projectId`
  - `/projects/:projectId/chats/:chatId`
- Create baseline components for lists, headers, and content containers.

### 1.3 Basic Chat Pipeline

- User-to-LLM messaging with streaming responses.
- Project + chat metadata injection into system prompt.
- Handling of message roles (`user`, `assistant`, `system`, `status`).
- Sanitization, rate limiting, and retry heuristics.

### 1.4 Terminal Integration

- Integrate a backend pseudo-terminal (PTY) process.
- Expose it via WebSocket.
- Add xterm.js frontend component in split view.

### 1.5 Audit Visibility

- Expand audit log filtering (userId, eventType, path, ipAddress) to support security reviews.
- Surface filtered results in UI for admins and project owners.

---

## 2. Early Growth (Core Features)

After MVP-level functionality is stable.

### 2.1 Chat Templates

- UI for selecting templates when generating new chats.
- Dynamic template fields (e.g., tags, difficulty).
- Allow inline editing of templates (admin mode).

### 2.2 Automated Status Generation

- Auto-summaries triggered by user action or thresholds.
- Status messages triggered on:
  - chat status change
  - project status request
  - long inactivity periods
- Snapshot generation with project-wide summaries.
- Provide a roadmap-specific context/settings panel that ties to the roadmap list context menu, surfaces meta/status details, and clears stale edit drafts when selections change.

### 2.3 Workspace File API

- FS read/write/list endpoints.
- Optional diff generation.
- Safe execution sandboxing.

### 2.4 Code Viewer (Optional IDE-lite)

- Monaco-based read-only viewer.
- On-demand file viewer modal.
- Git-aware diff viewer (if repository exists).

---

## 3. Advanced Capabilities (Expansion Phase)

These represent functionality that transforms Nexus into a more autonomous project navigator.

### 3.1 Cross-Chat Awareness

- Chats can request summaries of other chats.
- Project-level memory models.
- Graph of chat dependencies and goals.

### 3.2 Automated Project Direction

- Per-project planner that produces:
  - prioritized task lists
  - suggestions for new chats
  - recommended sequences of actions

### 3.3 Multi-Agent Coordination

- Multiple AI agents within a single chat.
- Roles such as "architect", "reviewer", "implementer".
- Automated internal debates or proposals.

### 3.4 Live Workspace Execution Intelligence

- Agent can run code in terminal and interpret output.
- Error pattern detection and automatic corrective suggestions.

### 3.5 Embedded Analytics Layer

- Progress graphs based on:
  - open vs. completed chats
  - message/token volume
  - AI vs. human contribution ratios
- Heatmap of active areas in the project.

---

## 4. Long-Term Vision (Speculative & Opportunistic)

Areas to explore when the base system is solid and usage reveals new possibilities.

### 4.1 Plugin Ecosystem

- Allow plugins for:
  - code generation strategies
  - model integrations
  - terminal tooling
  - UI extensions

### 4.2 Knowledge Graph Persistence

- Long-term memory layer across projects.
- Semantic search across chats and templates.

### 4.3 Rich Collaborative Mode

- Multi-user sessions.
- Real-time chat view synchronization.
- Terminal session sharing.

### 4.4 AI-Generated Refactor Maps

- Per-project architecture visualizations.
- Automated detection of tech debt clusters.

### 4.5 On-Prem & Offline Variants

- Local-only model inference.
- Enterprise-ready self-hosting stack.

---

## 5. Guiding Principles

### 5.1 Modularity

Features must remain loosely coupled; each subsystem should be replaceable.

### 5.2 Transparency

AI actions and transformations must be traceable and reviewable.

### 5.3 Human-in-the-Loop

The user remains the decision-maker, with AI as a strategic collaborator.

### 5.4 Stability First

New features should never compromise baseline reliability.

### 5.5 Evolution, Not Perfection

The system should grow organically, adapting to insights gathered from actual use.

---

## 6. New Requirements

### 6.1 Assistant Challenge Option

- Implement a configuration option (on by default) that allows the assistant to challenge the user instead of always agreeing. This will enhance critical thinking and prevent the assistant from blindly accepting incorrect statements.

### 6.2 Tasklist Scheduler

- Implement a scheduler that can assign different types of tasks to different days:
  - Weekdays for "create new code"
  - Weekdays for "fix build issues"
  - Weekdays for "fix testing issues"
  - Weekdays for "fix user experience (requires user)"
- Implement "requires operator presence" flag for tasks that need human intervention
- Ensure operator tasks are distributed across different days rather than clustered together

### 6.3 New UI Tabs

- Implement "Calendar" tab in top menu bar
- Implement "Operators" tab in top menu bar
- Implement "Management" tab (admin only) in top menu bar

### 6.4 Calendar Tab Features

- Display scheduled tasks from all projects/tasklists/tasks
- Highlight tasks that require operator presence
- Show operator list and operator availability calendar
- Provide scheduling overview to ensure operator scheduling is reasonable

### 6.5 Operator Tab Features

- Create operator management interface
- Allow creating and deleting operators
- Handle association of user accounts to operators
- Implement operator role management (operator != user_account)
- Support multiple accounts per operator

### 6.6 Management Tab Features

- Create user account management interface
- Implement admin-only visibility for management tab
- Allow user account creation, modification, and deletion

### 6.7 View Adjustability

- Implement different views for admin vs. regular users
- Ensure calendar and operator views have extended functionality for admins
- Provide appropriate access controls based on user roles

---

## 7. Roadmap Status

This roadmap is a living document. Items will shift, merge, or disappear as Project Nexus matures and real-world feedback shapes the system's trajectory.

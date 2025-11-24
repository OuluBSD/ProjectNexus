# Project Nexus – Expanded Task Breakdown
A comprehensive work plan aligned with the finalized UX, agent architecture, and multi‑column navigation model.

This replaces the earlier minimal TASKS.md. The tasks here are grouped into development phases and subsystems, and they are intended to cover everything needed to build the MVP → Alpha → Beta versions of Project Nexus.

---

## Near-Term Focus
- [x] Document audit `ipAddress` filter in API contracts
- [x] Add Code tab toast for file-save errors (mirror success case)
- [x] Quiet Code tab hook dependency lint warnings
- [x] Run full backend/frontend test suites after recent changes
- [x] Add Code tab toasts for file load/diff failures
- [ ] Remove Code tab hook dependency lint suppressions via stable callbacks

---

## 1. Repository & Core Setup
- [ ] Initialize monorepo structure (`apps/frontend`, `apps/backend`, `packages/shared`)
- [ ] Install Next.js (frontend)
- [ ] Install Node/TypeScript backend (Express/Nest/Fastify)
- [ ] Configure database layer (Prisma or Drizzle)
- [ ] Create `.env` templates for model providers
- [ ] Establish Git repo with base project structure
- [ ] Add Prettier, ESLint, lint-staged, Husky

---

## 2. Core Data Model
Implement DB models + TypeScript interfaces:
- [ ] **Project** (name, category, theme, status, activity flags)
- [ ] **RoadmapList** (title, tags, progress, JS logic ref)
- [ ] **ChatThread** (title, goal, templateId, status, progress)
- [ ] **MetaChat** (one per roadmap list)
- [ ] **Message** (role, content, meta flags)
- [ ] **Template** (systemPrompt, JS logic, metadata)
- [ ] **Snapshot** (git-linked)
- [ ] **User / Session** (auth)

---

## 3. Backend – API Endpoints
### 3.1 Project Endpoints
- [ ] GET /projects
- [ ] POST /projects
- [ ] PATCH /projects/:id
- [ ] GET /projects/:id/details

### 3.2 Roadmap List Endpoints
- [ ] GET /projects/:id/roadmaps
- [ ] POST /projects/:id/roadmaps
- [ ] PATCH /roadmaps/:id
- [ ] GET /roadmaps/:id/meta-chat

### 3.3 Chat Endpoints
- [ ] GET /roadmaps/:id/chats
- [ ] POST /roadmaps/:id/chats (empty)
- [ ] POST /roadmaps/:id/chats/from-template
- [ ] PATCH /chats/:id
- [ ] GET /chats/:id/messages
- [ ] POST /chats/:id/messages

### 3.4 Templates
- [ ] GET /templates
- [ ] POST /templates
- [ ] PATCH /templates/:id

### 3.5 Workspace File API
- [ ] GET /fs/tree
- [ ] GET /fs/file
- [ ] POST /fs/write
- [ ] GET /fs/diff

### 3.6 Terminal API
- [ ] POST /terminal/sessions
- [ ] WS /terminal/sessions/:id/stream
- [ ] POST /terminal/sessions/:id/input

### 3.7 Authentication & Security
- [ ] POST /auth/login
- [ ] POST /auth/logout
- [ ] Session validation middleware
- [ ] Keyfile / password support

---

## 4. Frontend – Global Infrastructure
- [ ] Three-column layout (Projects | Roadmap Lists | Chats)
- [ ] Main panel with tabs (Chat / Terminal / Code)
- [ ] Routing structure:
  - `/projects/:projectId`
  - `/projects/:projectId/roadmaps/:roadmapId`
  - `/projects/:projectId/roadmaps/:roadmapId/chats/:chatId`
- [ ] Theme system (global + per-project overrides)
- [ ] Large screen vs. small screen layout rules

---

## 5. Column 1 – Projects List
- [ ] List UI (~20 items)
- [ ] Color-coded activity status
- [ ] Icons + categories + subtle info line
- [ ] Quick filter (text)
- [ ] Grouping by category
- [ ] Right-click menu (edit, settings, favorite templates)
- [ ] Project selection triggers theme & context update

---

## 6. Column 2 – Roadmap Lists
- [ ] List UI with tags, progress, status color
- [ ] Subtle summary info
- [ ] Right-click menu (edit, add chat, open meta-chat)
- [ ] Visual separation for special entries
- [ ] API integration for real-time progress updates

---

## 7. Column 3 – Chats List
- [ ] Chat items with title, subtle heuristic line, percent
- [ ] Status colors
- [ ] Click opens chat view in main panel
- [ ] **Meta-chat appears at top**, visually separated
- [ ] Right-click context menu (rename, open folder, merge)

---

## 8. Main Panel – Chat Tab
### 8.1 Chat Header
- [ ] Title
- [ ] AI-generated status line from JSON logic
- [ ] List of relevant roadmap tasks
- [ ] Link to template
- [ ] Buttons: Mark Done, Request Status, Open Meta-Chat, Open Folder

### 8.2 Message Stream
- [ ] User/assistant/system/status/meta styling
- [ ] Theming per message type
- [ ] Filters: all/user/AI/status/meta
- [ ] Previous/next user message navigation
- [ ] Scroll anchoring & smooth streaming

### 8.3 Composer
- [ ] Multiline input (Enter send, Shift+Enter newline)
- [ ] Slash commands + autocomplete
- [ ] Future attach-from-server file dialog (scaffold only)

---

## 9. Main Panel – Terminal Tab
- [ ] Persistent server-side PTY session
- [ ] Attach/Detach (Play/Stop)
- [ ] Auto-open setting
- [ ] Start in project root or task folder
- [ ] xterm.js integration
- [ ] Transport via WebSocket

---

## 10. Main Panel – Code Tab
- [ ] File tree
- [ ] Monaco editor (read-only for MVP)
- [ ] Diff viewer (side-by-side + inline)
- [ ] Syntax highlighting
- [ ] Tab state remembered per chat

---

## 11. Template Engine
- [ ] Template creation UI
- [ ] Template fields (title, goal, systemPrompt, starterMessages)
- [ ] JS prompt + JS logic storage
- [ ] Metadata editor
- [ ] Validation of JSON status compliance

---

## 12. Meta-Chat System
- [ ] One meta-chat per roadmap list
- [ ] Special layout style in chat list
- [ ] Ability to run pure JS logic
- [ ] Ability to request AI clarifications
- [ ] Aggregates child chat JSON statuses
- [ ] Publishes progress & summary to roadmap list

---

## 13. JSON Status Pipeline
- [ ] Enforce JSON-before-stop protocol for applicable templates
- [ ] Detect malformed JSON → request reformatted output
- [ ] Run template’s JS logic to interpret JSON
- [ ] Update chat status + percent
- [ ] Update roadmap-level percent + flags

---

## 14. Git-Backed Storage
- [ ] Directory structure under /projects
- [ ] Writable workspace folder
- [ ] Commit creation on snapshot
- [ ] Bridge DB updates ↔ git commits
- [ ] Store messages as JSONL
- [ ] Track template/JS logic versions

---

## 15. Theming & Preferences
- [ ] Global theme (auto-detect OS/browser)
- [ ] Per-project theme override
- [ ] Per-message-type color rules
- [ ] Minimal vs. expanded detail modes
- [ ] Sidebar animation toggles

---

## 16. Authentication & Security
- [ ] Login screen UI
- [ ] Password or keyfile auth
- [ ] Session management
- [ ] OS user mapping + virtual user registry
- [ ] Permissions scaffold
- [ ] Audit logs for agent activity

---

## 17. QA, Testing & Stability
- [ ] Unit tests for backend logic
- [ ] Frontend smoke tests
- [ ] Load tests for LLM pipeline
- [ ] Terminal stability checks under heavy load
- [ ] JSON-status conformance tests

---

## 18. Deployment
- [ ] Dockerfiles for backend & frontend
- [ ] Compose stack for local dev
- [ ] Deployment templates (Fly.io / Railway / Render)
- [ ] Environment profiles (dev/staging/prod)
- [ ] Documentation for ops

---

## 19. Future Expansion (Post-MVP)
- [ ] Multi-agent coordination (architect/reviewer modes)
- [ ] Real-time collaboration
- [ ] Semantic search across projects
- [ ] Visualization of roadmap graphs
- [ ] Plugin systems for templates and logic
- [ ] Local model inference modes

---

# End of Expanded TASKS
This document is expected to grow and evolve as Project Nexus matures.

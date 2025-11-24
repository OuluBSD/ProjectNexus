# Project Nexus – Expanded Task Breakdown

A comprehensive work plan aligned with the finalized UX, agent architecture, and multi‑column navigation model.

This replaces the earlier minimal TASKS.md. The tasks here are grouped into development phases and subsystems, and they are intended to cover everything needed to build the MVP → Alpha → Beta versions of Project Nexus.

---

## Near-Term Focus

- [x] Document audit `ipAddress` filter in API contracts
- [x] Add Code tab toast for file-save errors (mirror success case)
- [x] Quiet Code tab hook dependency lint warnings
- [x] Add Code tab toasts for file load/diff failures
- [x] Remove Code tab hook dependency lint suppressions via stable callbacks
- [x] Run full backend/frontend test suites after recent changes (backend tests + frontend lint/build passing)
- [x] Implement initial DB models for Project/RoadmapList/ChatThread/Message
- [x] Scaffold Projects API (list/create/update) to unblock UI wiring
- [x] Cover Projects/Roadmaps/Chats endpoints with DB-backed tests
- [x] Wire Projects/Roadmaps/Chats UI to live APIs (replace mocks, handle empty DB)
- [x] Add a small seed or creation flow so fresh installs show demo data
- [x] Add UI flows to create projects, roadmaps, and chats from the main page
- [ ] Add path-based routes that mirror selection state (`/projects/:projectId/roadmaps/:roadmapId/chats/:chatId`)

---

## 1. Repository & Core Setup

- [x] Initialize monorepo structure (`apps/frontend`, `apps/backend`, `packages/shared`)
- [x] Install Next.js (frontend)
- [x] Install Node/TypeScript backend (Express/Nest/Fastify)
- [x] Configure database layer (Prisma or Drizzle)
- [x] Create `.env` templates for model providers
- [x] Establish Git repo with base project structure
- [x] Add Prettier, ESLint, lint-staged, Husky

---

## 2. Core Data Model

Implement DB models + TypeScript interfaces:

- [x] **Project** (name, category, theme, status, activity flags)
- [x] **RoadmapList** (title, tags, progress, JS logic ref)
- [x] **ChatThread** (title, goal, templateId, status, progress)
- [x] **MetaChat** (one per roadmap list)
- [x] **Message** (role, content, meta flags)
- [x] **Template** (systemPrompt, JS logic, metadata)
- [x] **Snapshot** (git-linked)
- [x] **User / Session** (auth)

---

## 3. Backend – API Endpoints

### 3.1 Project Endpoints

- [x] GET /projects
- [x] POST /projects
- [x] PATCH /projects/:id
- [x] GET /projects/:id/details

### 3.2 Roadmap List Endpoints

- [x] GET /projects/:id/roadmaps
- [x] POST /projects/:id/roadmaps
- [x] PATCH /roadmaps/:id
- [x] GET /roadmaps/:id/meta-chat

### 3.3 Chat Endpoints

- [x] GET /roadmaps/:id/chats
- [x] POST /roadmaps/:id/chats (empty)
- [x] POST /roadmaps/:id/chats/from-template
- [x] PATCH /chats/:id
- [x] GET /chats/:id/messages
- [x] POST /chats/:id/messages

### 3.4 Templates

- [x] GET /templates
- [x] POST /templates
- [x] PATCH /templates/:id

### 3.5 Workspace File API

- [x] GET /fs/tree
- [x] GET /fs/file
- [x] POST /fs/write
- [x] GET /fs/diff

### 3.6 Terminal API

- [x] POST /terminal/sessions
- [x] WS /terminal/sessions/:id/stream
- [x] POST /terminal/sessions/:id/input

### 3.7 Authentication & Security

- [ ] POST /auth/login
- [ ] POST /auth/logout
- [ ] Session validation middleware
- [ ] Keyfile / password support

---

## 4. Frontend – Global Infrastructure

- [x] Three-column layout (Projects | Roadmap Lists | Chats)
- [x] Main panel with tabs (Chat / Terminal / Code)
- [ ] Routing structure:
  - `/projects/:projectId`
  - `/projects/:projectId/roadmaps/:roadmapId`
  - `/projects/:projectId/roadmaps/:roadmapId/chats/:chatId`
  - [x] URL query deep links for project/roadmap/chat selection (shareable state)
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

- [x] Chat items with title, subtle heuristic line, percent
- [x] Status colors
- [x] Click opens chat view in main panel
- [x] **Meta-chat appears at top**, visually separated
- [ ] Right-click context menu (rename, open folder, merge)

---

## 8. Main Panel – Chat Tab

### 8.1 Chat Header

- [x] Title
- [x] AI-generated status line from JSON logic
- [x] List of relevant roadmap tasks
- [x] Link to template
- [x] Buttons: Mark Done / Request Status / Open Meta-Chat
- [x] Button: Open Folder

### 8.2 Message Stream

- [x] User/assistant/system/status/meta styling
- [x] Theming per message type
- [x] Filters: all/user/AI/status/meta
- [ ] Previous/next user message navigation
- [ ] Scroll anchoring & smooth streaming

### 8.3 Composer

- [x] Multiline input (Enter send, Shift+Enter newline)
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

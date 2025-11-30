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
- [x] Add path-based routes that mirror selection state (`/projects/:projectId/roadmaps/:roadmapId/chats/:chatId`)
- [x] Add copyable deep links for selected project/roadmap/chat

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
- [x] POST /chats/:id/merge

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

- [x] POST /auth/login
- [x] POST /auth/logout
- [x] Session validation middleware
- [x] Keyfile / password support

---

## 4. Frontend – Global Infrastructure

- [x] Three-column layout (Projects | Roadmap Lists | Chats)
- [x] Main panel with tabs (Chat / Terminal / Code)
- [x] Routing structure:
  - `/projects/:projectId`
  - `/projects/:projectId/roadmaps/:roadmapId`
  - `/projects/:projectId/roadmaps/:roadmapId/chats/:chatId`
  - [x] URL query deep links for project/roadmap/chat selection (shareable state)
- [x] Theme system (global + per-project overrides)
- [x] Large screen vs. small screen layout rules

---

## 5. Column 1 – Projects List

- [x] List UI (~20 items)
- [x] Color-coded activity status
- [x] Icons + categories + subtle info line
- [x] Quick filter (text)
- [x] Grouping by category
- [x] Right-click menu (edit, settings, favorite templates)
- [x] Project selection triggers theme & context update
- [x] Hook project context menu actions to actual edit/settings/template helpers

---

## 6. Column 2 – Roadmap Lists

- [x] List UI with tags, progress, status color
- [x] Quick filter (title/tags)
- [x] Subtle summary info
- [x] Right-click menu (edit, add chat, open meta-chat)
- [x] Surface a roadmap-focused context/settings panel for those context menu flows
- [x] Reset roadmap/project edit state automatically when selections change
- [x] Visual separation for special entries
- [x] API integration for real-time progress updates
- [x] Refresh roadmap summaries when backend meta/chat status changes

---

## 7. Column 3 – Chats List

- [x] Chat items with title, subtle heuristic line, percent
- [x] Status colors
- [x] Click opens chat view in main panel
- [x] **Meta-chat appears at top**, visually separated
- [x] Right-click context menu (rename, open folder, merge)
- [x] Merge action persists server-side history and refreshes chat selection
- [x] Validate merge target detection across identifier formats (trimmed IDs and case-insensitive titles)

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
- [x] Previous/next user message navigation
- [x] Scroll anchoring & smooth streaming

### 8.3 Composer

- [x] Multiline input (Enter send, Shift+Enter newline)
- [x] Slash commands + autocomplete
- [x] Future attach-from-server file dialog (scaffold only)

---

## 9. Main Panel – Terminal Tab

- [x] Persistent server-side PTY session
- [x] Attach/Detach (Play/Stop)
- [x] Auto-open setting
- [x] Start in project root or task folder
- [x] xterm.js integration
- [x] Transport via WebSocket

---

## 10. Main Panel – Code Tab

- [x] File tree
- [x] Syntax highlighting (highlight.js)
- [x] Diff viewer with color-coded formatting
- [x] Tab state remembered per chat

---

## 11. Template Engine

- [x] Template creation UI
- [x] Template fields (title, goal, jsonRequired)
- [x] JS prompt + JS logic storage
- [x] Metadata editor
- [ ] Validation of JSON status compliance

---

## 12. Meta-Chat System

- [x] One meta-chat per roadmap list
- [x] Special layout style in chat list
- [x] Meta-chat message storage (database + JSONL)
- [x] API endpoints for meta-chat messages (GET/POST)
- [x] Frontend UI integration for viewing/sending meta-chat messages
- [x] Aggregates child chat JSON statuses
- [x] Publishes progress & summary to roadmap list
- [x] Auto-update meta-chat with child chat status changes
  - [x] Event bus system for real-time notifications
  - [x] WebSocket endpoint for meta-chat updates (`/roadmaps/:roadmapId/meta-chat/stream`)
  - [x] Event emission after meta-chat sync (database and memory store)
  - [x] Real-time message broadcasting
  - [x] Frontend WebSocket client integration
    - [x] `useMetaChatWebSocket` hook for subscribing to updates
    - [x] Real-time roadmap status/progress updates in UI
    - [x] Real-time meta-chat message updates
    - [x] Auto-reconnection with exponential backoff
    - [x] Ping/pong keep-alive mechanism
- [x] Ability to request AI clarifications from meta-chat
  - [x] AI clarification service (`apps/backend/src/services/aiClarification.ts`)
  - [x] API endpoint (`POST /meta-chats/:metaChatId/clarify`)
  - [x] Context-aware placeholder responses
  - [x] Full AI integration (Gemini CLI via TCP)
- [ ] Ability to run pure JS logic from meta-chat
  - [ ] Sandboxed JavaScript execution environment
  - [ ] Safe expression evaluation

**Implementation Notes (Meta-Chat Auto-Update):**

Backend Implementation:

- Implemented event bus (`apps/backend/src/services/eventBus.ts`) using Node.js EventEmitter for application-level event broadcasting
- Added WebSocket endpoint at `/roadmaps/:roadmapId/meta-chat/stream` with authentication, initial status delivery, and subscription management
- Integrated event emission into `dbSyncMetaFromChats` (database) and `syncRoadmapMeta` (memory store) to broadcast updates after aggregation
- WebSocket clients receive real-time notifications for meta-chat status updates and new messages with proper filtering by roadmap
- Created AI clarification service with placeholder implementation demonstrating API structure and context-aware responses
- Added `/meta-chats/:metaChatId/clarify` endpoint for requesting AI assistance with meta-chat questions
- All operations include comprehensive audit logging
- Full test coverage maintained (95 tests passing)

Frontend Implementation:

- Created `useMetaChatWebSocket` hook (`apps/frontend/hooks/useMetaChatWebSocket.ts`) for subscribing to real-time meta-chat updates
- Hook features auto-connection, auto-reconnection with exponential backoff (max 30s), and ping/pong keep-alive
- Integrated WebSocket subscription into main workspace page with callbacks for status and message updates
- Real-time updates automatically refresh roadmap status/progress in the Roadmaps column
- Real-time message notifications automatically append to meta-chat message stream when viewing meta-chat
- Connection lifecycle properly managed with cleanup on unmount and dependency changes
- Frontend build and e2e tests passing (2/2 Playwright tests)

AI Integration Implementation:

- Created Gemini TCP client service (`apps/backend/src/services/geminiClient.ts`) for communicating with gemini-cli
- Implemented full TCP protocol support with newline-delimited JSON messages (init, conversation, status, error)
- Client features automatic process spawning, connection lifecycle management, and streaming response support
- Integrated Gemini client into `aiClarification.ts` service with singleton pattern and graceful fallback
- AI-powered responses include roadmap context, meta-chat history, and actionable suggestions
- Environment-based configuration: ENABLE_AI, GEMINI_CLI_PATH, GEMINI_TCP_PORT, GEMINI_MODEL
- AI integration is opt-in via ENABLE_AI=true flag, falls back to placeholder responses when disabled
- All 95 backend tests passing, no regressions introduced

---

## 13. JSON Status Pipeline

- [x] Enforce JSON-before-stop protocol for applicable templates
- [x] Detect malformed JSON → request reformatted output
- [x] Run template's JS logic to interpret JSON
- [x] Update chat status + percent
- [x] Update roadmap-level percent + flags

---

## 14. Git-Backed Storage

- [x] Directory structure under /projects
- [x] Writable workspace folder
- [x] Commit creation on snapshot
- [x] Bridge DB updates ↔ git commits
- [x] Store messages as JSONL
- [x] Track template/JS logic versions

---

## 15. Theming & Preferences

- [x] Global theme (auto-detect OS/browser)
- [x] Per-project theme override
- [ ] Per-message-type color rules
- [ ] Minimal vs. expanded detail modes
- [ ] Sidebar animation toggles

## Recent Notes

- Documented the audit `ipAddress` filter semantics in `API_CONTRACTS.md` so it is clear how to scope queries by IP.
- Ensured the Code tab now surfaces save failures with toast messaging that mirrors the detail shown for successful writes.
- Confirmed the terminal WebSocket idle timer test in `nexus-backend` stays open when `TERMINAL_IDLE_MS` is zero (`tsx --test src/__tests__/terminal.ws-client.test.ts`).
- Ran the full `nexus-backend` test suite (`pnpm --filter nexus-backend test`) so collection of backend tests now pass.
- Verified the frontend surface by running `pnpm --filter nexus-frontend lint` and the production `pnpm --filter nexus-frontend build` after fixing the remaining `[[...segments]]` `page.tsx` issues.
- Added an authenticated `/api/auth/session` endpoint (covered in API docs) and new tests so clients can confirm a live token and user match.
- Validated that `findChatForMerge` tolerates trimmed identifiers and case-insensitive titles by running `pnpm --filter nexus-backend test`, satisfying the merge target QA step.
- Added an integration test for the chat merge API to ensure trimmed/case-insensitive identifiers succeed and re-ran `pnpm --filter nexus-backend test`.
- Manually exercised the frontend merge context-menu prompt using identifiers/titles with extra whitespace and casing differences to confirm the UX message matches the backend tolerance.
- Added a Playwright regression (`apps/frontend/tests/playwright/merge-prompt.spec.ts`) that exercises the chat merge prompt, keeps the whitespace/case guidance message visible, and asserts that the trimmed target is sent to the backend stub.
- Deferred the chat rename/merge prompts via a short timeout and stopped context-menu `mousedown` propagation so the client still opens `window.prompt` after the click completes, letting Playwright pick up the dialog reliably.
- Re-ran `pnpm --filter nexus-frontend e2e` to validate `merge-prompt.spec.ts` after unlocking the prompt flow.
- Added shared Playwright fixtures/route helper so merge and rename tests reuse the same stubbed backend responses.
- Created `rename-prompt.spec.ts` to ensure the rename prompt trims input and updates the chat label after accepting whitespace-heavy titles.
- Extended the `merge-prompt.spec.ts` regression to assert that the source chat disappears from the list after merging, leaving only the trimmed target chat entry visible.
- Created a dedicated `TemplatePanel` component (`apps/frontend/components/TemplatePanel.tsx`) that provides a template creation form with title, goal, and jsonRequired fields, integrating with the existing `createTemplate` API helper.
- Updated the workspace page to import and render `TemplatePanel` when the `project-templates` context panel is shown, with a `reloadTemplates` callback to refresh the list after creation.
- Implemented message navigation with `useMessageNavigation` hook (`apps/frontend/components/MessageNavigation.tsx`) that provides prev/next buttons to jump between user messages with smooth scrolling and visual highlighting.
- Added auto-scroll behavior to chat stream that maintains bottom position when new messages arrive, only if user is near bottom (within 100px).
- Remembered the main panel tab selection per chat so switching chats restores the last-used tab instead of sharing one global tab state.
- Fixed pre-existing TypeScript errors where `project.status` and `roadmap.status` strings needed type assertions for `formatStatusLabel`.
- Added `templateId` field to Playwright test data to satisfy type requirements in route helpers.
- Verified that Projects and Roadmaps columns already have complete UI polish: color-coded status dots, category/tag pills, progress percentages, summary info, and grouping. Marked these items as complete in TASKS.md sections 5 and 6.
- Installed highlight.js for syntax highlighting in the Code tab (`pnpm add --filter nexus-frontend highlight.js @types/highlight.js`).
- Created `FileTree` component (`apps/frontend/components/FileTree.tsx`) with sorted directory/file listing, hover states, and click handlers for navigation.
- Created `CodeViewer` component (`apps/frontend/components/CodeViewer.tsx`) with syntax highlighting for JS/TS/Python/JSON/CSS/HTML/Bash/Markdown/YAML using highlight.js, supporting both view and edit modes.
- Created `DiffViewer` component (`apps/frontend/components/DiffViewer.tsx`) with color-coded diff formatting (green for additions, red for deletions, blue for headers).
- Integrated all three components into the Code tab, replacing the old flat button list with FileTree and the textarea with CodeViewer.
- Added highlight.js GitHub Dark theme import to `globals.css` for consistent syntax highlighting colors.
- Updated `fsEntries` state type to `FileEntry[]` and transformed API responses to include full paths for each entry.
- Verified all changes with `pnpm --filter nexus-frontend lint`, `pnpm --filter nexus-frontend build`, `pnpm --filter nexus-frontend e2e`, and `pnpm --filter nexus-backend test` (all passing).
- Installed xterm.js and fit addon for terminal UI (`pnpm add --filter nexus-frontend @xterm/xterm @xterm/addon-fit`).
- Created `Terminal` component (`apps/frontend/components/Terminal.tsx`) with xterm.js integration, WebSocket connection to backend terminal sessions, and attach/detach controls.
- Used dynamic imports for xterm.js modules to avoid SSR issues (modules reference browser-only globals like `self`).
- Integrated Terminal component into the main panel tabs, replacing the old placeholder implementation.
- Added xterm.js CSS import to `globals.css` for terminal styling.
- Terminal component automatically creates sessions tied to the selected project and connects via WebSocket to `/api/terminal/sessions/:sessionId/stream`.
- Verified Terminal integration with `pnpm --filter nexus-frontend lint`, `pnpm --filter nexus-frontend build`, `pnpm --filter nexus-frontend e2e`, and `pnpm --filter nexus-backend test` (all passing).
- Created slash command system (`apps/frontend/lib/slashCommands.ts`) with command registry, parser, and executor supporting built-in commands (/help, /status, /meta, /clear).
- Created `SlashCommandAutocomplete` component (`apps/frontend/components/SlashCommandAutocomplete.tsx`) with keyboard navigation (Arrow keys, Tab, Escape) and visual feedback.
- Integrated slash commands into the chat composer with real-time autocomplete that appears when typing "/" and supports keyboard selection.
- Slash commands are executed locally and can append system/status/meta messages, update chat status, or navigate to meta-chat.
- Verified slash command integration with `pnpm --filter nexus-frontend lint`, `pnpm --filter nexus-frontend build`, `pnpm --filter nexus-frontend e2e`, and `pnpm --filter nexus-backend test` (all passing).
- Enhanced Template model to include systemPrompt, starterMessages, javascriptPrompt, and javascriptLogic fields (database schema already had these fields).
- Updated Template type in `apps/backend/src/types.ts` to include JS fields and mapper functions in `projectRepository.ts` to handle them.
- Updated mockStore template functions to support all template fields including JS fields.
- Enhanced TemplatePanel component with expandable "Advanced" section containing code editors for system prompts, JavaScript prompts/logic, and JSON metadata.
- Added JSON validation for metadata field in template creation form.
- Updated frontend API types in `apps/frontend/lib/api.ts` to match backend Template structure.
- Verified template enhancements with `pnpm --filter nexus-frontend lint`, `pnpm --filter nexus-frontend build`, `pnpm --filter nexus-frontend e2e`, and `pnpm --filter nexus-backend test` (all passing).
- Created dedicated `Login` component (`apps/frontend/components/Login.tsx`) with modern UI design, supporting both password and keyfile token authentication.
- Updated main workspace page to conditionally render Login component when no session token is present, implementing proper authentication flow.
- Added `handleLogout` function to clear session state and remove credentials from localStorage.
- Updated login API signature in `apps/frontend/lib/api.ts` to make password optional (matching backend behavior that allows password OR keyfile authentication).
- Implemented session persistence using localStorage for seamless page refreshes (stores sessionToken and username).
- Added auto-login feature using demo credentials (NEXT_PUBLIC_DEMO_USERNAME, NEXT_PUBLIC_DEMO_PASSWORD) for development/testing environments.
- Replaced old embedded login panel with clean user info header showing logged-in username and logout button.
- Backend authentication already complete with login/logout endpoints, session validation middleware, PBKDF2 password hashing, keyfile support, and rate limiting (5 failed attempts = 2min lockout).
- Verified authentication flow with `pnpm --filter nexus-frontend lint`, `pnpm --filter nexus-frontend build`, `pnpm --filter nexus-frontend e2e`, and `pnpm --filter nexus-backend test` (all passing).
- Created JSON status processor service (`apps/backend/src/services/jsonStatusProcessor.ts`) that handles JSON-before-stop protocol for templates with `jsonRequired: true`.
- Implemented JSON extraction supporting code fences (```json), end-of-message JSON, and pure JSON responses.
- Added JSON validation requiring 'status' and 'progress' fields with progress range 0-100.
- Implemented JavaScript logic executor that runs template's `javascriptLogic` on extracted JSON to compute final status/progress.
- Hooked JSON processor into POST /chats/:chatId/messages endpoint to automatically process assistant messages.
- Added error handling that injects system messages when JSON is malformed, requesting reformatted output.
- Updated chat status/progress and synced roadmap meta automatically when valid JSON is processed.
- Added dbGetTemplate and getTemplate functions to projectRepository and mockStore for template fetching.
- Created comprehensive test suite (`apps/backend/src/__tests__/jsonStatusProcessor.test.ts`) with 23 tests covering all processor functions.
- Verified JSON Status Pipeline with `pnpm --filter nexus-backend test` (61 tests passing) and `pnpm --filter nexus-frontend lint && build` (all passing).
- Created git-backed storage system (`apps/backend/src/services/gitStorage.ts`) with hierarchical directory structure: `/projects/{projectId}/roadmaps/{roadmapId}/chats/{chatId}/`.
- Implemented workspace directories (`workspace/`) for each chat as writable areas for agent operations, excluded from git via .gitignore.
- Built JSONL message storage with append-only `messages.jsonl` files for efficient message logging and streaming.
- Implemented git commit service with automatic commits on project/roadmap/chat/message updates, including snapshot tagging support.
- Created bidirectional DB↔git synchronization bridge (`apps/backend/src/services/gitSync.ts`) that syncs database updates to git storage.
- Added template version tracking with timestamp-based versioning in template JSON files.
- Implemented `dbGetRoadmap` function in projectRepository for direct roadmap lookups by ID.
- Created Fastify plugin (`apps/backend/src/plugins/gitStorage.ts`) to register GitStorage and GitSync services on the server instance.
- Added `PROJECTS_ROOT` environment variable (defaults to `data/projects/`) for configurable git storage location.
- Created comprehensive test suite (`apps/backend/src/__tests__/gitStorage.test.ts`) with 30+ tests covering all storage operations, JSONL serialization, git commits, and full project lifecycle integration.
- Verified git storage implementation with `pnpm --filter nexus-backend test` (87 tests passing) and `pnpm --filter nexus-frontend lint && build` (all passing).
- Created CLI management tool (`apps/backend/src/cli.ts`) with Commander.js providing comprehensive system administration via `nexus-cli` command.
- Implemented user management commands: create users with admin flag, list all users, delete users with cascade, and change passwords.
- Implemented project management commands: list projects, initialize git storage, export/import projects as git bundles for backup/migration.
- Implemented storage management commands: view storage info with git commit history, cleanup orphaned project directories with dry-run mode.
- Added system health check command that validates database connection, storage directory existence, and git installation.
- Added setup command for initial installation that creates storage directory, initializes database, and creates admin user.
- Extended authRepository with `listUsers`, `deleteUser`, `changePassword` functions and updated `createUser` to support admin flag.
- Registered CLI as executable in package.json bin field, enabling `pnpm --filter nexus-backend exec tsx src/cli.ts <command>` invocation.
- CLI features colored terminal output with success/error/warning/info indicators using ANSI escape codes for better UX.

---

## New Requirements

### Assistant Challenge Option

- [ ] Add a configuration option (on by default) that allows the assistant to challenge the user instead of always agreeing. This will enhance critical thinking and prevent the assistant from blindly accepting incorrect statements.

### Tasklist Scheduler

- [ ] Implement a scheduler that can assign different types of tasks to different days:
  - [ ] Weekdays for "create new code"
  - [ ] Weekdays for "fix build issues"
  - [ ] Weekdays for "fix testing issues"
  - [ ] Weekdays for "fix user experience (requires user)"
- [ ] Implement "requires operator presence" flag for tasks that need human intervention
- [ ] Ensure operator tasks are distributed across different days rather than clustered together

### New UI Tabs

- [ ] Implement "Calendar" tab in top menu bar
- [ ] Implement "Operators" tab in top menu bar
- [ ] Implement "Management" tab (admin only) in top menu bar

### Calendar Tab Features

- [ ] Display scheduled tasks from all projects/tasklists/tasks
- [ ] Highlight tasks that require operator presence
- [ ] Show operator list and operator availability calendar
- [ ] Provide scheduling overview to ensure operator scheduling is reasonable

### Operator Tab Features

- [ ] Create operator management interface
- [ ] Allow creating and deleting operators
- [ ] Handle association of user accounts to operators
- [ ] Implement operator role management (operator != user_account)
- [ ] Support multiple accounts per operator

### Management Tab Features

- [ ] Create user account management interface
- [ ] Implement admin-only visibility for management tab
- [ ] Allow user account creation, modification, and deletion

### View Adjustability

- [ ] Implement different views for admin vs. regular users
- [ ] Ensure calendar and operator views have extended functionality for admins
- [ ] Provide appropriate access controls based on user roles

---

## 15. CLI Management Tool (nexus-cli)

- [x] Basic CLI structure with Commander.js
- [x] `setup` command - Initialize database, storage, and admin user
- [x] `health` command - System health checks (database, storage, git)
- [x] User management commands
  - [x] `user create` - Create new users with admin flag
  - [x] `user list` - List all users with admin status
  - [x] `user delete` - Delete users with confirmation
  - [x] `user password` - Change user passwords
- [x] Project management commands
  - [x] `project list` - List all projects with status
  - [x] `project init` - Initialize git storage for project
  - [x] `project export` - Export project as git bundle
  - [x] `project import` - Import project from git bundle
- [x] Storage management commands
  - [x] `storage info` - Show storage location and project list
  - [x] `storage cleanup` - Clean up orphaned project directories
- [ ] System account access controls
  - [ ] Enable/disable OS user access to projects
  - [ ] Map OS users to virtual users
  - [ ] User isolation and sandboxing
- [ ] Advanced management features
  - [ ] Backup/restore automation
  - [ ] Log viewing and rotation
  - [ ] Storage usage reports and quotas
  - [ ] Batch operations (bulk user/project management)

---

## 16. Theming & Preferences

- [x] Global theme (auto-detect OS/browser)
- [x] Per-project theme override
- [x] Minimal vs. expanded detail modes
- [x] Sidebar animation toggles

---

## 17. Authentication & Security

- [x] Login screen UI
- [x] Password or keyfile auth
- [x] Session management
- [x] Audit logs for agent activity
  - [x] Project operations (create/update)
  - [x] Roadmap operations (create/update)
  - [x] Chat operations (create/update/merge/messages/status)
  - [x] Meta-chat message operations
  - [x] Template operations (create/update)
  - [x] Auth operations (login/logout/register)
  - [x] File operations (tree/read/write/diff)
  - [x] Terminal operations (create/input/exit)
- [ ] OS user mapping + virtual user registry
- [ ] Permissions scaffold

---

## 18. QA, Testing & Stability

- [ ] Unit tests for backend logic
- [ ] Frontend smoke tests
- [ ] Load tests for LLM pipeline
- [ ] Terminal stability checks under heavy load
- [ ] JSON-status conformance tests
- [x] Playwright UI regression for the chat merge prompt that validates the whitespace/case-tolerant flow (`apps/frontend/tests/playwright/merge-prompt.spec.ts`)

---

## 19. Deployment

- [ ] Dockerfiles for backend & frontend
- [ ] Compose stack for local dev
- [ ] Deployment templates (Fly.io / Railway / Render)
- [ ] Environment profiles (dev/staging/prod)
- [ ] Documentation for ops

---

## 20. Future Expansion (Post-MVP)

- [ ] Multi-agent coordination (architect/reviewer modes)
- [ ] Real-time collaboration
- [ ] Semantic search across projects
- [ ] Visualization of roadmap graphs
- [ ] Plugin systems for templates and logic
- [ ] Local model inference modes

---

# End of Expanded TASKS

This document is expected to grow and evolve as Project Nexus matures.

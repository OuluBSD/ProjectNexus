# Project Nexus – Implementation Plan
A concise, actionable guide to bootstrap the repository and implement the MVP. This complements `ARCHITECTURE.md`, `TASKS.md`, and `UX.md`.

## 1) Repository Bootstrap (Day 0)
- Initialize monorepo layout: `apps/frontend`, `apps/backend`, `packages/shared`, `infra`.
- Tooling: TypeScript, ESLint, Prettier, lint-staged, Husky.
- Envs: add `.env.example` with model keys, database, and feature flags.
- Package manager: pnpm (preferred) or npm. Configure workspaces.
- Git: base commit with skeleton folders and README links.

## 2) Shared Types & Constants
- `packages/shared`: define enums for roles (`user`, `assistant`, `system`, `status`, `meta`), status values (`in_progress`, `waiting`, `done`, `blocked`), and template metadata.
- Export request/response DTOs for API clients.

## 3) Backend MVP
- Framework: Fastify or Express with TypeScript.
- Layers: HTTP server → routers → handlers → services → data access (Prisma/Drizzle) → DB.
- Persistence: Postgres (Drizzle recommended).
- WebSocket: ws adapter for terminal streaming.
- File API: restrict to per-project root; guard path traversal.
- Logging: pino or Winston; request IDs.
- Auth: session token stub with middleware; real auth later.
- Testing: Vitest/Jest for services; supertest/undici for HTTP.

### 3.1 REST Routes (stub-level)
- Projects, Roadmaps, Chats, Templates, Messages, FS, Terminal, Auth (see `API_CONTRACTS.md`).

### 3.2 PTY Manager
- Node-pty based service; lifecycle tied to roadmap/chat; reconnection support.

### 3.3 Git Bridge
- Folder layout under `/projects/<id>`; snapshot → git commit; message logs as JSONL.

## 4) Frontend MVP
- Next.js (App Router), TypeScript, React Query, Tailwind or CSS Modules.
- Layout: four columns with tabbed main panel (Chat/Terminal/Code) using mock data.
- State: URL params as source of truth; React Query for server data.
- Terminal: xterm.js component wired to WS URL placeholder.
- Code view: Monaco read-only, diff renderer placeholder.
- Theming: CSS variables + per-message type styles.

## 5) Template & Agent Flow
- Store templates with systemPrompt, starterMessages, JS logic text.
- Enforce JSON-before-stop schema in backend validation.
- Meta-chat execution: run template JS in sandbox (vm2 or similar) and aggregate progress.

## 6) Delivery Milestones
- **Milestone 1**: Monorepo scaffold, linting, `.env.example`, shared types stub, API contract docs.
- **Milestone 2**: Backend routing stubs + DB schema + migrations; PTY service stub.
- **Milestone 3**: Frontend layout with mock data; hooks for REST/WS endpoints.
- **Milestone 4**: Template ingestion + JSON status validation; roadmap/meta aggregation.
- **Milestone 5**: Git snapshotting + basic deployment (Docker Compose).

## 7) Validation
- Unit tests for template validation and status interpretation.
- Endpoint smoke tests for CRUD routes.
- UI smoke: render all columns and tabs with mock data; snapshot tests allowed.

## 8) Next Actions (practical)
1. Commit the new docs and scaffolds.
2. Generate DB schema + migration.
3. Implement API route stubs and wire to shared DTOs.
4. Build frontend shell with mock data.
5. Add template examples and JSON validation tests.

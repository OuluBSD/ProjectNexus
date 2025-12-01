# Project Nexus

A multi-project, multi-agent development cockpit designed for structured human–AI collaboration.  
Nexus organizes work into Projects → Roadmap Lists → Chats and provides an integrated Chat, Terminal, and Code workspace.

This README is intentionally concise. For technical details, see **ARCHITECTURE.md**.

---

# ✨ What is Project Nexus?

Project Nexus is a browser-based orchestration layer for AI-assisted software development.  
It does **not** attempt to replace a full IDE.  
Instead, it becomes the **command center** where:

- multiple projects are managed simultaneously
- each project has several roadmap lists (task clusters)
- each roadmap list contains multiple chats
- each chat has a clear goal, template, and JSON-driven status
- a dedicated meta-chat per roadmap list computes progress

The user interacts with three primary tools:

1. **Chat** – where AI and user collaborate
2. **Terminal** – a persistent server-side shell
3. **Code** – read-only/diff viewer for workspace files

Everything is stored in a Git-backed project structure with metadata tracked via a database.

---

# 🧱 Core Concepts

## Projects

The highest-level container. Projects define:

- theme override
- categories/tags
- activity indicators
- roadmap lists

## Roadmap Lists

A Project contains one or more roadmap lists.  
Each roadmap list:

- groups related tasks and chats
- has its own status, progress %, and tags
- contains a **meta-chat**, which:
  - interprets JSON statuses from child chats
  - executes template JS logic
  - produces the roadmap’s aggregated progress

## Chats

Each chat thread:

- has a specific goal
- may be created from a template
- communicates with the Codex agent
- produces JSON status (if required)
- contributes progress back to its roadmap list

## Templates

Templates define structured workflows:

- title, goal
- systemPrompt
- starterMessages
- javascriptPrompt (optional)
- javascript logic for interpreting JSON
- metadata

---

# 🧠 Agents

Two primary agents:

- **Codex Agent**: writes code, explains changes, generates diffs, updates JSON status
- **Meta-Agent**: interprets status from all chats in a roadmap list

Agents communicate strictly through:

- model adapters
- template-defined prompts
- JSON protocols

For full agent behavior specification, see `AGENTS.md`.

---

# 🖥️ User Interface

The UI uses a four-column layout:

```
[ Projects ] | [ Roadmap Lists ] | [ Chats ] | [ Main Panel ]
```

The Main Panel contains tabbed views:

- **Chat** – full messaging UI with filters and slash-commands
- **Terminal** – persistent PTY session via WebSocket
- **Code** – file tree, read-only Monaco viewer, diff renderer

For details, see `UX.md`.

---

# 📁 Git-Backed Storage

Every project is stored on disk under a Git repository:

```
/projects/PROJECT_ID/
  meta.json
  roadmapLists/
    ROADMAP_ID/
      meta.json
      chats/
        CHAT_ID/messages.jsonl
  workspace/
```

Snapshots correspond to Git commits.  
DB synchronizes with Git to provide the unified view.

---

# 🔌 Backend API

Backend exposes:

- REST for metadata (projects, roadmaps, chats, templates)
- WebSocket for terminal
- File system API for safe read/write/list/diff
- Authentication endpoints

For endpoint-level details, see `ARCHITECTURE.md`.

---

# 🚀 Getting Started (Development)

## Requirements

- Node.js 20+ (we develop on 22/24) and `pnpm` 9 (repo sets `packageManager` to `pnpm@9.12.0`)
- Git and a writable workspace for project data
- Postgres for metadata (see `ARCHITECTURE.md`/`USAGE.md` for schema setup)
- Optional: managed Gemini CLI / Qwen auth configured via `.env` when using live AI

## Installing node_modules

All workspace packages are installed from the repo root:

```bash
pnpm install
```

This populates the monorepo `node_modules` (and each package’s nested `node_modules`) according to the lockfile. Do **not** hand-install packages directly into `node_modules`; always update dependencies through `pnpm` (or `npm install` at the root if you must, but `pnpm` is the supported path). After dependency changes, commit only the lockfile updates—never commit `node_modules`.

## Quick "Hello World"

```bash
# 0. Clone with submodules (includes bundled qwen-code)
git clone --recurse-submodules https://github.com/<your-org>/AgentManager.git
cd AgentManager

# 1. Install dependencies
pnpm install

# 2. Initialize system (creates admin user, storage)
./nexus-cli setup --admin-password admin123

# 3. Start backend
pnpm --filter nexus-backend dev &

# 4. Start frontend
pnpm --filter nexus-frontend dev

# 5. Open http://localhost:3000
# Login: admin / admin123

# 6. Create your first project via UI
# Click "+ New Project" → Name: "Hello World" → Create

# 7. Create a roadmap → Create a chat → Start chatting!
```

For detailed usage instructions, see **[USAGE.md](./USAGE.md)**.

## Development Commands

```bash
pnpm install
pnpm dev:backend   # http://localhost:3001
pnpm dev:frontend
# or use the helper (adds pnpm from ~/.local/node_modules/.bin to PATH):
./run.sh           # starts backend + frontend
./run.sh backend   # backend only
./run.sh frontend  # frontend only
```

> Heads-up: `pnpm` is installed locally at `~/.local/node_modules/.bin/pnpm`. If your shell cannot find it, run  
> `export PATH="$HOME/.local/node_modules/.bin:$PATH"`.

You will need:

- an LLM key (OpenAI/Anthropic/Qwen)
- configured project directories
- database setup (Drizzle/Postgres)

AI Integration (Optional):

For AI-powered meta-chat clarifications, install the **managed-gemini-cli** fork:

```bash
# Clone the OuluBSD fork (includes TCP server mode)
git clone git@github.com:OuluBSD/managed-gemini-cli.git ~/managed-gemini-cli
cd ~/managed-gemini-cli
npm install
npm run bundle
npm install -g .

# Authenticate with Google
gemini
```

Then enable in `.env`:

```bash
ENABLE_AI=true
GEMINI_CLI_PATH=gemini
```

**Note:** The standard `@google/gemini-cli` from npm does NOT work. You must use the OuluBSD fork.
See [docs/AI_INTEGRATION.md](docs/AI_INTEGRATION.md) for full details.

Tests:

```bash
pnpm --filter @nexus/shared test
```

TypeScript/TS server:

- Project-local compiler: `pnpm --filter nexus-backend exec tsc -p tsconfig.json`
- Generic one-shot: `pnpm --package=typescript dlx tsc -p apps/backend/tsconfig.json`
- Calling `tsc` directly will fail unless you add it to PATH; rely on the commands above.
- Successful runs are intentionally silent (exit code 0, no stdout).

Database:

- Set `DATABASE_URL` in `.env` to a Postgres instance.
- Backend will auto-connect if `DATABASE_URL` is present; otherwise it falls back to the in-memory mock store.
- Generate migrations from the shared schema: `pnpm exec drizzle-kit generate` (writes to `packages/shared/db/migrations`).
- Apply migrations with your preferred tool (e.g., `drizzle-kit push` or `psql`).

Terminal idle timeout:

- WebSocket terminal streams close after 10 minutes idle by default. Set `TERMINAL_IDLE_MS` (ms) in your shell or `.env` to change it; `0` disables the idle shutdown. `run.sh` echoes the value it will use.

Auth:

- When the database is enabled, `/auth/login` will create a user on first login; the first provided password becomes the stored hash.
- If a user already has a password set, a password is required for login; otherwise the route rejects with 401.
- Sessions persist in the database; without `DATABASE_URL` the backend falls back to in-memory sessions (cleared on restart).
- Passwords are hashed with salted PBKDF2 (legacy SHA256 hashes still verify); optional `keyfileToken` login is also hashed and stored.
- Sessions expire after 7 days and expired DB tokens are cleaned up automatically during validation.

Frontend ↔ Backend:

- The mock UI will attempt to `POST /api/auth/login` then `GET /api/projects` using `NEXT_PUBLIC_BACKEND_HTTP_BASE` (defaults to `http://localhost:3001`). If unreachable, it falls back to mock data and shows a notice.

---

# 🗺️ Additional Documentation

- **[USAGE.md](./USAGE.md)** – comprehensive usage guide with examples
- **[CLI.md](./CLI.md)** – CLI tool reference and administration
- **ARCHITECTURE.md** – deep technical specification
- **UX.md** – user interface and interaction patterns
- **AGENTS.md** – agent behavior and JSON protocols
- **ROADMAP.md** – strategic goals and future direction
- **TASKS.md** – actionable task breakdown
- **IMPLEMENTATION.md** – concrete setup and delivery plan

---

# 📄 License

MIT License

---

# 📬 Contact

For issues, ideas, or contributions, open a ticket or start a discussion.

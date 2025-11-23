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
```bash
npm install
npm run dev
```

You will need:
- an LLM key (OpenAI/Anthropic/Qwen)
- configured project directories
- database setup (Prisma/Drizzle)

---

# 🗺️ Additional Documentation
- **ARCHITECTURE.md** – deep technical specification
- **UX.md** – user interface and interaction patterns
- **AGENTS.md** – agent behavior and JSON protocols
- **ROADMAP.md** – strategic goals and future direction
- **TASKS.md** – actionable task breakdown
- **IMPLEMENTATION.md** – concrete setup and delivery plan

---

# 📄 License
TBD

---

# 📬 Contact
For issues, ideas, or contributions, open a ticket or start a discussion.

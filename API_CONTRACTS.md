# Project Nexus – API Contracts (Draft)

High-level REST + WebSocket contracts for the MVP. Paths are prefixed with `/api`.

## Auth

- `POST /auth/login` – { username, password | keyfileToken } → { token }
- `POST /auth/logout` – header `Authorization: Bearer <token>` → 204
- `GET /auth/session` – header `Authorization: Bearer <token>` → { token, user: { id, username } } (401 on missing/invalid)

## Projects

- `GET /projects` → [{ id, name, category, status, activity }]
- `POST /projects` → { id }
- `GET /projects/:projectId/details` → project + roadmap lists
- `PATCH /projects/:projectId` → partial update

## Roadmap Lists

- `GET /projects/:projectId/roadmaps` → [{ id, title, progress, tags, status }]
- `POST /projects/:projectId/roadmaps` → { id }
- `GET /roadmaps/:roadmapId/meta-chat` → meta-chat thread summary
- `PATCH /roadmaps/:roadmapId` → partial update (title/tags/status/progress)

## Chats

- `GET /roadmaps/:roadmapId/chats` → [{ id, title, status, progress }]
- `POST /roadmaps/:roadmapId/chats` – create empty chat → { id }
- `POST /roadmaps/:roadmapId/chats/from-template` – { templateId, title?, goal?, metadata? } → { id }
- `PATCH /chats/:chatId` – update title/goal/status/progress/templateId
- `GET /chats/:chatId/messages` → stream or paginated messages
- `POST /chats/:chatId/messages` – { role, content, metadata? } → { id }

## Templates

- `GET /templates` → list templates with metadata
- `POST /templates` – create template with prompts, starter messages, JS logic
- `PATCH /templates/:templateId` – update template fields; enforce validation

## Workspace FS

- `GET /fs/tree?projectId&path=` → tree listing
- `GET /fs/file?projectId&path=` → file contents
- `POST /fs/write` – { projectId, path, content, baseSha? } → { success, diff? }
- `GET /fs/diff?projectId&path&baseSha&targetSha` → diff payload

## Terminal

- `POST /terminal/sessions` – { projectId, cwd? } → { sessionId }
- `WS /terminal/sessions/:sessionId/stream` – bidirectional (input/output)
- `POST /terminal/sessions/:sessionId/input` – { data }

## Audit Events

- `GET /audit/events` – filters: projectId, eventType, userId, pathContains, ipAddress, before|cursor, limit (≤200), sort (asc|desc) → { events, paging: { hasMore, nextCursor } }
  - `ipAddress` matches the stored audit IP exactly (IPv4 or IPv6 string); combine with other filters for narrower queries.
  - Provide `ipAddress=<value>` when you need to isolate events issued from a single address; the backend trims and validates the value before comparing to the stored IP.

## Snapshots

- `POST /projects/:projectId/snapshots` – create git snapshot → { gitSha }
- `GET /projects/:projectId/snapshots` – list snapshots

## Status & Meta

- `POST /chats/:chatId/status` – JSON-before-stop payload from agent
- `GET /roadmaps/:roadmapId/status` – aggregated status (meta-chat output)

---

### Shared Response Notes

- Auth: Bearer tokens; 401 on missing/invalid; 403 on forbidden.
- Errors: `{ error: { code, message, details? } }`
- Pagination: `?cursor` or `?offset/limit` for message history.
- Rate limits: return `429` with `Retry-After`.

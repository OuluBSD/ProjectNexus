# AI Chat Feature - Implementation Summary

## Overview

A generic AI chat interface integrated into the Project Nexus web UI, supporting multiple AI backends (qwen/claude/gemini/codex) with desktop-like navigation.

## Architecture

### Backend Abstraction Layer

**Location:** `packages/shared/chat/`

#### Core Components:

1. **AIBackend.ts** - Generic interface and utilities
   - `AIBackendType`: Type union for all supported backends
   - `AIBackendConfig`: Configuration interface with tool/filesystem controls
   - `AIBackend`: Interface that all backends must implement
   - Helper functions: `getDefaultBackendPath()`, `buildBackendArgs()`, `normalizeBackendMessage()`

2. **GenericAIBackend.ts** - Stdin-based backend client
   - Implements `AIBackend` interface
   - Spawns AI backend processes with configurable args
   - Handles line-delimited JSON protocol
   - Supports interrupt signals
   - Configuration options:
     - `disableTools`: Adds `--no-tools` flag
     - `disableFilesystem`: Adds `--no-filesystem` flag

3. **Exports** - Available via `@nexus/shared/chat`
   - All types and implementations from AIBackend and GenericAIBackend
   - Existing QwenChatSession for backwards compatibility

### Frontend Components

**Location:** `apps/frontend/components/`

#### 1. TopMenuBar.tsx

- Desktop-like application menu bar
- Sticky top navigation
- Switches between "Agent Manager" and "AI Chat" sections
- Styled with gradient background and active state indicators

#### 2. AIChat.tsx

- Main chat interface component
- **Features:**
  - Multi-session support (tabs with close buttons)
  - Backend selector (qwen/claude/gemini/codex)
  - Message history with role-based styling
  - Shift+Enter for newlines, Enter to send
  - Stop button (visible during AI response)
  - Status indicator with connection state
  - Empty state with helpful hints
  - Auto-scrolling to latest message
  - Auto-resizing textarea

#### 3. useAIChatBackend Hook

**Location:** `apps/frontend/hooks/useAIChatBackend.ts`

- Manages WebSocket connection to backend
- Handles streaming responses
- Message state management
- Interrupt/stop functionality
- Connection lifecycle (connect/disconnect)
- Status tracking (idle/connecting/responding/error)

### UI Styling

**Location:** `apps/frontend/app/globals.css`

New CSS classes added:

- `.top-menu-bar` - Desktop-like menu bar with gradient
- `.menu-bar-*` - Menu bar components (brand, items, etc.)
- `.ai-chat-*` - Complete chat UI styling
  - Container, header, sessions, controls
  - Messages with role-based colors
  - Input area with status bar
  - Streaming animation with blinking cursor
  - Empty state
  - Buttons (send/stop)

### Integration

**Location:** `apps/frontend/app/[[...segments]]/page.tsx`

Changes made:

1. Added imports for `TopMenuBar` and `AIChat`
2. Added `currentSection` state (type: `AppSection`)
3. Wrapped entire app with `TopMenuBar`
4. Conditional rendering based on `currentSection`:
   - `"agent-manager"`: Original agent management UI
   - `"ai-chat"`: New AI chat interface

## Current Status

### ✅ Completed

- [x] Backend abstraction layer for multi-AI support
- [x] Generic backend client with tool/filesystem controls
- [x] Top menu bar with desktop-like navigation
- [x] AI Chat UI with session management
- [x] Shift+Enter for newlines, Enter to send
- [x] Stop button (UI only, backend integration pending)
- [x] Status indicators and connection states
- [x] Frontend hook for backend communication
- [x] Integration into main page
- [x] Build verification (successful)

### ⏳ Pending

- [ ] Backend API route for AI chat WebSocket (`/api/ai-chat/:sessionId`)
- [ ] Real backend integration with streaming responses
- [ ] Interrupt signal propagation to AI backend
- [ ] Persistent session storage
- [ ] Message history persistence
- [ ] Backend process lifecycle management
- [ ] Error handling and reconnection logic

## Usage

### Starting the UI

```bash
cd apps/frontend
pnpm dev
```

Navigate to `http://localhost:3000` and click "AI Chat" in the top menu bar.

### Backend Configuration Example

```typescript
import { GenericAIBackend, type AIBackendConfig } from "@nexus/shared/chat";

const config: AIBackendConfig = {
  type: "qwen",
  backendPath: "./deps/qwen-code/script/qwen-code",
  workspaceRoot: "/workspace/path",
  disableTools: true, // Disable tool usage
  disableFilesystem: true, // Disable filesystem access
  serverMode: "stdin",
};

const backend = new GenericAIBackend(config, {
  onInit: (info) => console.log("Connected:", info),
  onStreamingChunk: (content) => console.log("Chunk:", content),
  onStreamingEnd: () => console.log("Done"),
  onError: (error) => console.error("Error:", error),
});

await backend.start();
backend.sendMessage("Hello!");
backend.interrupt(); // Stop ongoing response
await backend.stop();
```

## Next Steps

1. **Create backend WebSocket route** (`apps/backend/src/routes/ai-chat.ts`)
   - Handle WebSocket connections
   - Proxy messages to/from AI backend
   - Manage backend process lifecycle
   - Support interrupt signals

2. **Implement session persistence**
   - Store chat history in database
   - Load previous conversations
   - Export/import chat logs

3. **Add advanced features**
   - Code syntax highlighting in messages
   - File attachments (later, when vision support added)
   - Search within conversations
   - Conversation templates/prompts

4. **Testing**
   - Test all four backends (qwen/claude/gemini/codex)
   - Verify tool/filesystem restrictions work
   - Test interrupt/stop functionality
   - Load testing with concurrent sessions

## Design Decisions

1. **Desktop-like UI**: Top menu bar gives app-like feel, familiar to users
2. **Separate from Agent Manager**: AI Chat is a distinct feature, not mixed with project management
3. **Multi-session tabs**: Users can have multiple conversations simultaneously
4. **Backend abstraction**: Easy to add new AI backends by implementing AIBackend interface
5. **Tool/filesystem controls**: Security-first approach, disabled by default for chat mode
6. **Streaming responses**: Real-time feedback improves UX
7. **Shift+Enter convention**: Standard pattern from Slack, Discord, ChatGPT

## File Manifest

### New Files

- `packages/shared/chat/AIBackend.ts` - Backend interface and types
- `packages/shared/chat/GenericAIBackend.ts` - Generic backend client
- `apps/frontend/components/TopMenuBar.tsx` - Top navigation menu
- `apps/frontend/components/AIChat.tsx` - Main chat interface
- `apps/frontend/hooks/useAIChatBackend.ts` - Backend connection hook
- `docs/AI_CHAT_FEATURE.md` - This file

### Modified Files

- `packages/shared/chat/index.ts` - Added new exports
- `apps/frontend/app/globals.css` - Added chat UI styles
- `apps/frontend/app/[[...segments]]/page.tsx` - Integrated menu bar and routing

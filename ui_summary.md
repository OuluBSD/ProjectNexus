# Nexus Web Frontend UI Specification

## Global Structure

### Top Navigation Bar
The application uses a desktop-like menu bar at the top with the following components:

1. **Brand Area**: 
   - Icon: ⚡
   - Title: "Project Nexus"

2. **Main Navigation Items** (4 main pages):
   - **Agent Manager** - `AppSection: "agent-manager"` (default)
   - **AI Chat** - `AppSection: "ai-chat"`
   - **Network** - `AppSection: "network"`
   - **Debug** - `AppSection: "debug"`

3. **Account Area**:
   - Account button with label "Account"
   - User display name showing the logged-in user (or "Guest" if not logged in)
   - Clicking the account button opens a context menu with:
     - Settings
     - Recent activity
     - Logout

### Shared Layout Elements
- Responsive design with sidebar overlays for smaller screens
- Status banners for notifications
- Keyboard shortcuts support (Escape to close menus/modals)
- Global theme support (auto/dark/light modes)
- Overlay modals for settings, forms, and account menu

## Pages/Views

### 1. Agent Manager (`agent-manager`)
This is the default page when no specific section is selected.

**Layout:**
- **Left/Side Navigation Pane**: Collapsible sidebar with three hierarchical lists:
  - Projects column: Shows project groups with categories, status dots, and details
  - Roadmaps column: Shows roadmaps related to the selected project
  - Chats column: Shows chats related to the selected roadmap

- **Main Content Area** with responsive splitter:
  - **Chat Section**: Always visible with message history and input area
  - **Tools Section**: Tabbed interface with:
    - Terminal tab: Interactive terminal connected to the selected project
    - Code tab: File explorer and code editor with diff viewer

**Main Entities:**
- Projects: Organized by categories with status tracking
- Roadmaps: Progress tracking with status and summary
- Chats: Conversation threads linked to roadmaps

**User Actions:**
- Project operations: Add, edit, remove projects
- Roadmap operations: Add, edit roadmaps
- Chat operations: Add chats to roadmaps
- File operations: Open, edit, save files in code panel
- Terminal operations: Execute commands

**State and Selection:**
- Global project selection state
- Active roadmap selection
- Active chat selection
- Current file selection in code panel
- Filter states for each list (project, roadmap, chat filters)

### 2. AI Chat (`ai-chat`)
**Layout:**
- Full-page chat interface
- Session management with multiple chat sessions
- Backend selection (supports qwen/claude/gemini/codex)

**Main Entities:**
- Chat sessions with names and backend types
- Chat messages (user/assistant/system/tool roles)

**User Actions:**
- Create new chat sessions
- Switch between sessions
- Send messages to AI backend
- Change AI backend type
- Clear chat messages

**State and Selection:**
- Active session ID
- Selected backend type
- Session-specific message history

### 3. Network (`network`)
**Layout:**
- Left list of network elements (servers, connections)
- Main detail view showing selected item
- Network graph visualization

**Main Entities:**
- Servers (worker/manager/AI types)
- Network connections
- Process information

**User Actions:**
- View server details
- Monitor connections
- Interact with network graph

**State and Selection:**
- Selected network entity
- Filter states for different entity types

### 4. Debug (`debug`)
**Layout:**
- Left list of processes and connections
- Main detail view for selected items
- Various debugging information panels

**Main Entities:**
- Process logs
- WebSocket connections
- Polling sessions

**User Actions:**
- View process details
- Monitor I/O logs
- Check connection status
- Toggle debugging options

**State and Selection:**
- Selected process/connection
- Debug settings (auto-refresh, content visibility, etc.)

### 5. Account Settings
Accessed through the account menu, this provides:
- Settings with categories (appearance/workspace)
- Recent activity logs

## Data and Backend Integration

### REST API Endpoints (HTTP/HTTPS):
- `POST /api/auth/login` - User authentication
- `GET /api/projects` - Fetch all projects
- `POST /api/projects` - Create a project
- `PUT /api/projects/{projectId}` - Update a project
- `DELETE /api/projects/{projectId}` - Delete a project
- `GET /api/projects/{projectId}/details` - Get project details
- `GET /api/projects/{projectId}/roadmaps` - Get project roadmaps
- `POST /api/projects/{projectId}/roadmaps` - Create a roadmap
- `PUT /api/roadmaps/{roadmapId}` - Update a roadmap
- `GET /api/roadmaps/{roadmapId}/status` - Get roadmap status
- `GET /api/roadmaps/{roadmapId}/meta-chat/stream` - Meta chat WebSocket endpoint
- `GET /api/roadmaps/{roadmapId}/meta-chat` - Meta chat details
- `GET /api/chats/{chatId}/messages` - Get chat messages
- `POST /api/chats/{chatId}/messages` - Send chat message
- `PUT /api/chats/{chatId}/status` - Update chat status
- `PUT /api/chats/{chatId}` - Update chat details
- `GET /api/files/tree` - Fetch file tree
- `GET /api/files/content` - Fetch file content
- `GET /api/files/diff` - Get file diff
- `POST /api/files/content` - Write file content
- `POST /api/terminal/sessions` - Create terminal session
- `GET /api/audit/events` - Fetch audit events
- `GET /api/templates` - Get templates
- `POST /api/templates` - Create template

### WebSocket Endpoints:
- `/api/roadmaps/{roadmapId}/meta-chat/stream?token={token}` - Real-time meta-chat updates
- `/api/ai-chat/{sessionId}?backend={backend}&token={token}` - AI chat communication
- `/api/ai-chat/{sessionId}/init` - AI chat session initialization (HTTP for polling)
- `/api/ai-chat/{sessionId}/poll` - AI chat polling endpoint (HTTP fallback)
- `/api/ai-chat/{sessionId}/send` - Send messages to AI chat (HTTP fallback)

### HTTP Polling (Fallback):
- Used when WebSockets are disabled or unavailable
- Mimics WebSocket interface using HTTP requests
- Includes init, poll, and send endpoints

### Input/Output Payload Structures:
- **Project**: `{id, name, category, status, description, theme, contentPath, gitUrl}`
- **Roadmap**: `{id, title, status, progress, tags, summary, metaStatus, metaProgress, metaSummary}`
- **Chat**: `{id, title, status, progress, note, meta}`
- **Message**: `{id, role, content, timestamp, metadata, displayRole}`
- **File**: `{path, content, draft}`

### Central Meta API Layer:
The application uses a consistent `api.ts` library for all backend communication, providing a unified interface across the UI. This library handles:
- Authentication token management
- Error handling
- Request/response formatting
- Base URL resolution based on environment variables

## Persistence and Sessions

### User Sessions:
- Handled via JWT tokens
- Stored in localStorage as "sessionToken"
- Token passed in Authorization header as Bearer token
- Auto-login with demo credentials if enabled

### Persistent Conversations:
- AI Chat sessions stored in localStorage with keys:
  - `ai-chat-sessions`: List of saved chat sessions
  - `ai-chat-active-session`: Currently active session ID
- Chat messages stored in component state but can be retrieved via API

### Client-Side Storage:
- `localStorage` used for:
  - Session tokens
  - User settings (theme preferences, workspace defaults)
  - Selected project/roadmap/chat IDs
  - Code panel settings
  - Debug panel settings
  - AI chat session state

## Deviations and Missing Pieces

### Deviations from Expected Structure:
1. **Routing**: Uses dynamic segments routing (`[[...segments]]`) instead of traditional named routes for project/roadmap/chat selection
2. **API Connection**: Provides both WebSocket and HTTP polling options for AI chat, with polling as default in some configurations
3. **Layout**: Uses a collapsible sidebar approach rather than a traditional fixed sidebar

### Missing/Incomplete Features:
1. **Auto-Demo Mode**: Contains experimental auto-demo functionality that may not be fully implemented
2. **Terminal WebSocket**: Terminal functionality with WebSocket-based connections to backend
3. **Template Panel**: UI element referenced but not fully described in the main layout

### Partially Implemented UI Elements:
1. **Code Explorer**: Enhanced editor features with Monaco editor support that can be toggled
2. **File Diff View**: Diff viewer component for comparing file changes
3. **Template Management**: Template panel for managing favorite templates

The UI closely matches the expected structure with the four main pages and hierarchical navigation, with additional attention to real-time communication capabilities and comprehensive project management features.
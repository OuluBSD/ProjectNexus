import { type Page } from "@playwright/test";
import {
  PROJECT_ID,
  ROADMAP_ID,
  SOURCE_CHAT_ID,
  TARGET_CHAT_ID,
  loginPayload,
  projectPayload,
  roadmapPayload,
  metaChatPayload,
  roadmapStatusPayload,
  chatPayload,
  chatMessagesPayload,
} from "./test-data";

type MergeResponse = {
  target: {
    id: string;
    title: string;
    status: string;
    progress: number;
    goal?: string;
    metadata?: Record<string, unknown> | null;
    templateId?: string;
  };
  removedChatId: string;
};

type ChatUpdateResponse = {
  id: string;
  title: string;
  status: string;
  progress: number;
  goal?: string;
  metadata?: Record<string, unknown> | null;
  templateId?: string;
};

type PlaywrightRouteOverrides = {
  onMerge?: (targetIdentifier: string | null) => void;
  mergeResponse?: MergeResponse;
  onChatPatch?: (chatId: string, payload: Record<string, unknown>) => void;
  chatPatchResponseMapper?: (
    chatId: string,
    payload: Record<string, unknown>
  ) => ChatUpdateResponse;
};

const defaultMergeResponse: MergeResponse = {
  target: {
    id: TARGET_CHAT_ID,
    title: "Target Chat",
    status: "active",
    progress: 0.4,
    goal: "Target flow",
    metadata: { focus: "Target focus" },
  },
  removedChatId: SOURCE_CHAT_ID,
};

const defaultChatUpdateResponseMapper = (
  chatId: string,
  payload: Record<string, unknown>
): ChatUpdateResponse => {
  const base = chatPayload.find((chat) => chat.id === chatId);
  return {
    id: chatId,
    title: typeof payload.title === "string" ? payload.title : (base?.title ?? "Chat"),
    status: base?.status ?? "active",
    progress: base?.progress ?? 0,
    goal: base?.goal,
    metadata: base?.metadata ?? null,
    templateId: base?.templateId,
  };
};

export async function setupPlaywrightRoutes(page: Page, overrides: PlaywrightRouteOverrides = {}) {
  await page.route("http://localhost:3001/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/auth/login" && method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(loginPayload),
      });
      return;
    }

    if (path === "/api/templates" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }

    if (path === "/api/projects" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(projectPayload),
      });
      return;
    }

    if (path === `/api/projects/${PROJECT_ID}/roadmaps` && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(roadmapPayload),
      });
      return;
    }

    if (path === `/api/roadmaps/${ROADMAP_ID}/meta-chat` && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(metaChatPayload),
      });
      return;
    }

    if (path === `/api/roadmaps/${ROADMAP_ID}/status` && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(roadmapStatusPayload),
      });
      return;
    }

    if (path === `/api/roadmaps/${ROADMAP_ID}/chats` && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(chatPayload),
      });
      return;
    }

    if (path === `/api/chats/${SOURCE_CHAT_ID}/messages` && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(chatMessagesPayload),
      });
      return;
    }

    if (path === `/api/chats/${TARGET_CHAT_ID}/messages` && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }

    if (path === `/api/chats/${SOURCE_CHAT_ID}/merge` && method === "POST") {
      const payload = JSON.parse(request.postData() ?? "{}");
      overrides.onMerge?.(
        typeof payload.targetIdentifier === "string" ? payload.targetIdentifier : null
      );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(overrides.mergeResponse ?? defaultMergeResponse),
      });
      return;
    }

    if (path === `/api/chats/${SOURCE_CHAT_ID}` && method === "PATCH") {
      const payload = JSON.parse(request.postData() ?? "{}");
      overrides.onChatPatch?.(SOURCE_CHAT_ID, payload);
      const responseBody = overrides.chatPatchResponseMapper
        ? overrides.chatPatchResponseMapper(SOURCE_CHAT_ID, payload)
        : defaultChatUpdateResponseMapper(SOURCE_CHAT_ID, payload);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseBody),
      });
      return;
    }

    if (path === "/api/audit/events" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ events: [], paging: { hasMore: false } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

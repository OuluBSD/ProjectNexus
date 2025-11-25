import { expect, test } from "@playwright/test";

const PROJECT_ID = "playground-project";
const ROADMAP_ID = "merge-roadmap";
const SOURCE_CHAT_ID = "source-chat";
const TARGET_CHAT_ID = "target-chat";

const loginPayload = {
  token: "playwright-token",
  user: { id: "demo", username: "demo" },
};

const projectPayload = [
  {
    id: PROJECT_ID,
    name: "Playwright Project",
    category: "qa",
    status: "active",
    description: "Stub project for merge prompt test",
  },
];

const roadmapPayload = [
  {
    id: ROADMAP_ID,
    title: "Merge QA",
    status: "in_progress",
    progress: 0.52,
    tags: ["merge", "chat"],
    metaChatId: "meta-" + ROADMAP_ID,
  },
];

const chatPayload = [
  {
    id: SOURCE_CHAT_ID,
    title: "Source Chat",
    status: "active",
    progress: 0.2,
    goal: "Source flow",
    metadata: { focus: "Needs merging" },
  },
  {
    id: TARGET_CHAT_ID,
    title: "Target Chat",
    status: "active",
    progress: 0.4,
    goal: "Target flow",
    metadata: { focus: "Target focus" },
  },
];

const metaChatPayload = {
  id: `meta-${ROADMAP_ID}`,
  roadmapListId: ROADMAP_ID,
  status: "in_progress",
  progress: 0.52,
  summary: "Meta progress stub",
};

const roadmapStatusPayload = {
  roadmapId: ROADMAP_ID,
  status: "in_progress",
  progress: 0.52,
  summary: "Meta progress stub",
};

const chatMessagesPayload = [
  {
    id: "msg-1",
    chatId: SOURCE_CHAT_ID,
    role: "user",
    content: "Hello demo",
    createdAt: new Date().toISOString(),
  },
];

test("merge prompt honors trimmed/case-tolerant target submissions", async ({ page }) => {
  let capturedMergeTarget: string | null = null;

  await page.route("http://localhost:3001/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/auth/login" && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(loginPayload),
      });
    }

    if (path === "/api/templates" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (path === "/api/projects" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(projectPayload),
      });
    }

    if (path === `/api/projects/${PROJECT_ID}/roadmaps` && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(roadmapPayload),
      });
    }

    if (path === `/api/roadmaps/${ROADMAP_ID}/meta-chat` && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(metaChatPayload),
      });
    }

    if (path === `/api/roadmaps/${ROADMAP_ID}/status` && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(roadmapStatusPayload),
      });
    }

    if (path === `/api/roadmaps/${ROADMAP_ID}/chats` && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(chatPayload),
      });
    }

    if (path === `/api/chats/${SOURCE_CHAT_ID}/messages` && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(chatMessagesPayload),
      });
    }

    if (path === `/api/chats/${TARGET_CHAT_ID}/messages` && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (path === `/api/chats/${SOURCE_CHAT_ID}/merge` && method === "POST") {
      const payload = JSON.parse(route.request().postData() ?? "{}");
      capturedMergeTarget = payload.targetIdentifier ?? null;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          target: {
            id: TARGET_CHAT_ID,
            title: "Target Chat",
            status: "active",
            progress: 0.4,
          },
          removedChatId: SOURCE_CHAT_ID,
        }),
      });
    }

    if (path === "/api/audit/events" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ events: [], paging: { hasMore: false } }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  const sourceChatItem = page.locator(".chats-column .list .item:not(.meta)").first();
  await sourceChatItem.waitFor();
  await sourceChatItem.click({ button: "right" });
  await page.locator(".context-menu").waitFor();

  const dialogPromise = page.waitForEvent("dialog");
  await page.getByRole("button", { name: "Merge chat" }).click();
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain("whitespace/case variations are ignored");
  await dialog.accept("  TaRgEt ChAt  ");

  await expect.poll(() => capturedMergeTarget ?? null).toBe("TaRgEt ChAt");
});

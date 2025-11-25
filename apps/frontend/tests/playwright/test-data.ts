export const PROJECT_ID = "playground-project";
export const ROADMAP_ID = "merge-roadmap";
export const SOURCE_CHAT_ID = "source-chat";
export const TARGET_CHAT_ID = "target-chat";

export const loginPayload = {
  token: "playwright-token",
  user: { id: "demo", username: "demo" },
};

export const projectPayload = [
  {
    id: PROJECT_ID,
    name: "Playwright Project",
    category: "qa",
    status: "active",
    description: "Stub project for merge prompt test",
  },
];

export const roadmapPayload = [
  {
    id: ROADMAP_ID,
    title: "Merge QA",
    status: "in_progress",
    progress: 0.52,
    tags: ["merge", "chat"],
    metaChatId: "meta-" + ROADMAP_ID,
  },
];

export const metaChatPayload = {
  id: `meta-${ROADMAP_ID}`,
  roadmapListId: ROADMAP_ID,
  status: "in_progress",
  progress: 0.52,
  summary: "Meta progress stub",
};

export const roadmapStatusPayload = {
  roadmapId: ROADMAP_ID,
  status: "in_progress",
  progress: 0.52,
  summary: "Meta progress stub",
};

export const chatPayload = [
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

export const chatMessagesPayload = [
  {
    id: "msg-1",
    chatId: SOURCE_CHAT_ID,
    role: "user",
    content: "Hello demo",
    createdAt: new Date().toISOString(),
  },
];

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { createChat, findChatForMerge, store } from "../services/mockStore";

test("findChatForMerge handles trimmed identifiers and case-insensitive titles", () => {
  const roadmapId = crypto.randomUUID();
  store.roadmapLists.set(roadmapId, {
    id: roadmapId,
    projectId: crypto.randomUUID(),
    title: "Mock Finder Roadmap",
    tags: ["merge"],
    progress: 0,
    status: "in_progress",
  });

  const sourceChat = createChat(roadmapId, { title: "Source Chat" });
  const targetChat = createChat(roadmapId, { title: "Title Mixer" });

  const foundById = findChatForMerge(roadmapId, `  ${targetChat.id}  `, sourceChat.id);
  assert.equal(foundById?.id, targetChat.id);

  const foundByTitle = findChatForMerge(roadmapId, "  TITLE MIXER  ", sourceChat.id);
  assert.equal(foundByTitle?.id, targetChat.id);

  const skipSelfMatch = findChatForMerge(roadmapId, sourceChat.id, sourceChat.id);
  assert.equal(skipSelfMatch, null);

  store.chats.delete(sourceChat.id);
  store.chats.delete(targetChat.id);
  store.messages.delete(sourceChat.id);
  store.messages.delete(targetChat.id);
  store.roadmapLists.delete(roadmapId);
});

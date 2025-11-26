import { describe, test, before, after } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { GitStorage } from "../services/gitStorage";
import type { Project, RoadmapList, Chat, Message, Template, MetaChat } from "../types";

// Test configuration
const TEST_PROJECTS_ROOT = path.join(process.cwd(), "test-data", "git-storage-test");

describe("GitStorage", () => {
  let gitStorage: GitStorage;
  let testProject: Project;
  let testRoadmap: RoadmapList;
  let testMetaChat: MetaChat;
  let testChat: Chat;
  let testTemplate: Template;

  before(async () => {
    // Clean up test directory before tests
    try {
      await fs.rm(TEST_PROJECTS_ROOT, { recursive: true, force: true });
    } catch {}

    gitStorage = new GitStorage({ projectsRoot: TEST_PROJECTS_ROOT });

    // Create test data
    testProject = {
      id: "test-project-1",
      name: "Test Project",
      category: "Testing",
      status: "active",
      description: "A test project for git storage",
    };

    testRoadmap = {
      id: "test-roadmap-1",
      projectId: testProject.id,
      title: "Test Roadmap",
      tags: ["backend", "testing"],
      progress: 50,
      status: "in_progress",
      metaChatId: "test-meta-chat-1",
    };

    testMetaChat = {
      id: "test-meta-chat-1",
      roadmapListId: testRoadmap.id,
      status: "in_progress",
      progress: 50,
      summary: "Test meta-chat summary",
    };

    testChat = {
      id: "test-chat-1",
      roadmapListId: testRoadmap.id,
      title: "Test Chat",
      goal: "Test chat operations",
      status: "in_progress",
      progress: 25,
    };

    testTemplate = {
      id: "test-template-1",
      title: "Test Template",
      goal: "Testing template storage",
      systemPrompt: "You are a test assistant",
      javascriptLogic: "context.result.status = 'done';",
      jsonRequired: true,
      metadata: { version: "1.0" },
    };
  });

  after(async () => {
    // Clean up test directory after tests
    try {
      await fs.rm(TEST_PROJECTS_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe("Project Operations", () => {
    test("initProject creates directory structure and git repo", async () => {
      await gitStorage.initProject(testProject);

      const projectRoot = path.join(TEST_PROJECTS_ROOT, testProject.id);
      const gitDir = path.join(projectRoot, ".git");
      const projectFile = path.join(projectRoot, "project.json");
      const roadmapsDir = path.join(projectRoot, "roadmaps");
      const templatesDir = path.join(projectRoot, "templates");
      const gitignore = path.join(projectRoot, ".gitignore");

      // Check directory structure
      await fs.access(gitDir);
      await fs.access(projectFile);
      await fs.access(roadmapsDir);
      await fs.access(templatesDir);
      await fs.access(gitignore);

      // Verify gitignore content
      const gitignoreContent = await fs.readFile(gitignore, "utf-8");
      assert.ok(gitignoreContent.includes("**/workspace/"));
    });

    test("writeProject updates project metadata", async () => {
      const updatedProject = { ...testProject, name: "Updated Project Name" };
      await gitStorage.writeProject(updatedProject);

      const project = await gitStorage.readProject(testProject.id);
      assert.strictEqual(project?.name, "Updated Project Name");
    });

    test("readProject returns null for non-existent project", async () => {
      const project = await gitStorage.readProject("non-existent-project");
      assert.strictEqual(project, null);
    });

    test("projectExists returns true for existing project", async () => {
      const exists = await gitStorage.projectExists(testProject.id);
      assert.strictEqual(exists, true);
    });

    test("projectExists returns false for non-existent project", async () => {
      const exists = await gitStorage.projectExists("non-existent-project");
      assert.strictEqual(exists, false);
    });
  });

  describe("Roadmap Operations", () => {
    test("initRoadmap creates roadmap directory and files", async () => {
      await gitStorage.initRoadmap(testProject.id, testRoadmap, testMetaChat);

      const roadmapDir = path.join(TEST_PROJECTS_ROOT, testProject.id, "roadmaps", testRoadmap.id);
      const roadmapFile = path.join(roadmapDir, "roadmap.json");
      const metaChatFile = path.join(roadmapDir, "meta-chat.json");
      const chatsDir = path.join(roadmapDir, "chats");

      await fs.access(roadmapFile);
      await fs.access(metaChatFile);
      await fs.access(chatsDir);
    });

    test("writeRoadmap updates roadmap metadata", async () => {
      const updatedRoadmap = { ...testRoadmap, progress: 75 };
      await gitStorage.writeRoadmap(testProject.id, updatedRoadmap);

      const roadmap = await gitStorage.readRoadmap(testProject.id, testRoadmap.id);
      assert.strictEqual(roadmap?.progress, 75);
    });

    test("readRoadmap returns correct roadmap data", async () => {
      const roadmap = await gitStorage.readRoadmap(testProject.id, testRoadmap.id);
      assert.ok(roadmap);
      assert.strictEqual(roadmap.id, testRoadmap.id);
      assert.strictEqual(roadmap.title, testRoadmap.title);
      assert.deepStrictEqual(roadmap.tags, testRoadmap.tags);
    });

    test("writeMetaChat updates meta-chat metadata", async () => {
      const updatedMetaChat = { ...testMetaChat, progress: 60, summary: "Updated summary" };
      await gitStorage.writeMetaChat(testProject.id, testRoadmap.id, updatedMetaChat);

      const metaChat = await gitStorage.readMetaChat(testProject.id, testRoadmap.id);
      assert.strictEqual(metaChat?.progress, 60);
      assert.strictEqual(metaChat?.summary, "Updated summary");
    });
  });

  describe("Chat Operations", () => {
    test("initChat creates chat directory and files", async () => {
      await gitStorage.initChat(testProject.id, testRoadmap.id, testChat);

      const chatDir = path.join(
        TEST_PROJECTS_ROOT,
        testProject.id,
        "roadmaps",
        testRoadmap.id,
        "chats",
        testChat.id
      );
      const chatFile = path.join(chatDir, "chat.json");
      const messagesFile = path.join(chatDir, "messages.jsonl");
      const workspaceDir = path.join(chatDir, "workspace");

      await fs.access(chatFile);
      await fs.access(messagesFile);
      await fs.access(workspaceDir);
    });

    test("writeChat updates chat metadata", async () => {
      const updatedChat = { ...testChat, progress: 50, status: "done" };
      await gitStorage.writeChat(testProject.id, testRoadmap.id, updatedChat);

      const chat = await gitStorage.readChat(testProject.id, testRoadmap.id, testChat.id);
      assert.strictEqual(chat?.progress, 50);
      assert.strictEqual(chat?.status, "done");
    });

    test("readChat returns correct chat data", async () => {
      const chat = await gitStorage.readChat(testProject.id, testRoadmap.id, testChat.id);
      assert.ok(chat);
      assert.strictEqual(chat.id, testChat.id);
      assert.strictEqual(chat.title, testChat.title);
      assert.strictEqual(chat.goal, testChat.goal);
    });

    test("getChatWorkspace returns correct workspace path", () => {
      const workspacePath = gitStorage.getChatWorkspace(
        testProject.id,
        testRoadmap.id,
        testChat.id
      );
      const expectedPath = path.join(
        TEST_PROJECTS_ROOT,
        testProject.id,
        "roadmaps",
        testRoadmap.id,
        "chats",
        testChat.id,
        "workspace"
      );
      assert.strictEqual(workspacePath, expectedPath);
    });
  });

  describe("Message Operations (JSONL)", () => {
    test("appendMessage adds message to JSONL file", async () => {
      const message: Message = {
        id: "msg-1",
        chatId: testChat.id,
        role: "user",
        content: "Hello, this is a test message",
        createdAt: new Date().toISOString(),
      };

      await gitStorage.appendMessage(testProject.id, testRoadmap.id, testChat.id, message);

      const messages = await gitStorage.readMessages(testProject.id, testRoadmap.id, testChat.id);
      assert.strictEqual(messages.length, 1);
      assert.strictEqual(messages[0].id, "msg-1");
      assert.strictEqual(messages[0].content, "Hello, this is a test message");
    });

    test("appendMessage supports multiple messages", async () => {
      const message2: Message = {
        id: "msg-2",
        chatId: testChat.id,
        role: "assistant",
        content: "This is a response",
        createdAt: new Date().toISOString(),
      };

      const message3: Message = {
        id: "msg-3",
        chatId: testChat.id,
        role: "system",
        content: "System message",
        metadata: { type: "status" },
        createdAt: new Date().toISOString(),
      };

      await gitStorage.appendMessage(testProject.id, testRoadmap.id, testChat.id, message2);
      await gitStorage.appendMessage(testProject.id, testRoadmap.id, testChat.id, message3);

      const messages = await gitStorage.readMessages(testProject.id, testRoadmap.id, testChat.id);
      assert.strictEqual(messages.length, 3); // msg-1 from previous test + 2 new
      assert.strictEqual(messages[1].role, "assistant");
      assert.strictEqual(messages[2].role, "system");
      assert.deepStrictEqual(messages[2].metadata, { type: "status" });
    });

    test("readMessages returns empty array for chat with no messages", async () => {
      const emptyChat: Chat = {
        id: "empty-chat",
        roadmapListId: testRoadmap.id,
        title: "Empty Chat",
        status: "idle",
        progress: 0,
      };

      await gitStorage.initChat(testProject.id, testRoadmap.id, emptyChat);

      const messages = await gitStorage.readMessages(testProject.id, testRoadmap.id, emptyChat.id);
      assert.strictEqual(messages.length, 0);
    });
  });

  describe("Template Operations", () => {
    test("writeTemplate stores template with version", async () => {
      await gitStorage.writeTemplate(testProject.id, testTemplate);

      const templateFile = path.join(
        TEST_PROJECTS_ROOT,
        testProject.id,
        "templates",
        `${testTemplate.id}.json`
      );
      await fs.access(templateFile);

      const content = await fs.readFile(templateFile, "utf-8");
      const data = JSON.parse(content);
      assert.ok(data.version); // Should have a version timestamp
      assert.strictEqual(data.title, testTemplate.title);
    });

    test("readTemplate returns correct template data", async () => {
      const template = await gitStorage.readTemplate(testProject.id, testTemplate.id);
      assert.ok(template);
      assert.strictEqual(template.id, testTemplate.id);
      assert.strictEqual(template.title, testTemplate.title);
      assert.strictEqual(template.javascriptLogic, testTemplate.javascriptLogic);
      assert.strictEqual(template.jsonRequired, testTemplate.jsonRequired);
    });

    test("writeTemplate updates existing template", async () => {
      const updatedTemplate = {
        ...testTemplate,
        title: "Updated Template Title",
        javascriptLogic: "context.result.progress = 100;",
      };

      await gitStorage.writeTemplate(testProject.id, updatedTemplate);

      const template = await gitStorage.readTemplate(testProject.id, testTemplate.id);
      assert.strictEqual(template?.title, "Updated Template Title");
      assert.strictEqual(template?.javascriptLogic, "context.result.progress = 100;");
    });
  });

  describe("Git Operations", () => {
    test("commitChanges creates a git commit", async () => {
      const sha = await gitStorage.commitChanges(testProject.id, "Test commit message");
      assert.ok(sha);
      assert.strictEqual(sha.length, 40); // Git SHA-1 length
    });

    test("getCurrentCommitSha returns commit hash", async () => {
      const sha = await gitStorage.getCurrentCommitSha(testProject.id);
      assert.ok(sha);
      assert.strictEqual(sha.length, 40);
    });

    test("commitChanges handles no changes gracefully", async () => {
      const sha1 = await gitStorage.getCurrentCommitSha(testProject.id);
      const sha2 = await gitStorage.commitChanges(testProject.id, "No changes");
      assert.strictEqual(sha1, sha2); // Should return same SHA when no changes
    });

    test("createSnapshot creates git tag", async () => {
      const snapshotId = "snapshot-test-1";
      const commitSha = await gitStorage.createSnapshot(
        testProject.id,
        snapshotId,
        "Test snapshot"
      );
      assert.ok(commitSha);
      assert.strictEqual(commitSha.length, 40);
    });

    test("getCommitHistory returns commit log", async () => {
      const history = await gitStorage.getCommitHistory(testProject.id, 10);
      assert.ok(history.length > 0);
      assert.ok(history[0].sha);
      assert.ok(history[0].message);
      assert.ok(history[0].timestamp);
      assert.ok(history[0].author);
    });

    test("getCommitDiff returns diff for commit", async () => {
      const history = await gitStorage.getCommitHistory(testProject.id, 1);
      const diff = await gitStorage.getCommitDiff(testProject.id, history[0].sha);
      assert.ok(diff);
      assert.ok(typeof diff === "string");
    });
  });

  describe("Integration: Full Project Lifecycle", () => {
    test("complete project workflow", async () => {
      const newProject: Project = {
        id: "integration-test-project",
        name: "Integration Test",
        status: "active",
      };

      // 1. Initialize project
      await gitStorage.initProject(newProject);
      assert.strictEqual(await gitStorage.projectExists(newProject.id), true);

      // 2. Create roadmap
      const roadmap: RoadmapList = {
        id: "integration-roadmap",
        projectId: newProject.id,
        title: "Integration Roadmap",
        tags: ["test"],
        progress: 0,
        status: "in_progress",
        metaChatId: "integration-meta",
      };

      const metaChat: MetaChat = {
        id: "integration-meta",
        roadmapListId: roadmap.id,
        status: "in_progress",
        progress: 0,
      };

      await gitStorage.initRoadmap(newProject.id, roadmap, metaChat);

      // 3. Create chat
      const chat: Chat = {
        id: "integration-chat",
        roadmapListId: roadmap.id,
        title: "Integration Chat",
        status: "in_progress",
        progress: 0,
      };

      await gitStorage.initChat(newProject.id, roadmap.id, chat);

      // 4. Add messages
      const messages: Message[] = [
        {
          id: "int-msg-1",
          chatId: chat.id,
          role: "user",
          content: "Start task",
          createdAt: new Date().toISOString(),
        },
        {
          id: "int-msg-2",
          chatId: chat.id,
          role: "assistant",
          content: "Task started",
          createdAt: new Date().toISOString(),
        },
      ];

      for (const message of messages) {
        await gitStorage.appendMessage(newProject.id, roadmap.id, chat.id, message);
      }

      // 5. Update chat status
      chat.progress = 100;
      chat.status = "done";
      await gitStorage.writeChat(newProject.id, roadmap.id, chat);

      // 6. Create final snapshot
      const snapshotSha = await gitStorage.createSnapshot(
        newProject.id,
        "final-snapshot",
        "Integration test complete"
      );

      // Verify everything
      const readChat = await gitStorage.readChat(newProject.id, roadmap.id, chat.id);
      assert.strictEqual(readChat?.progress, 100);
      assert.strictEqual(readChat?.status, "done");

      const readMessages = await gitStorage.readMessages(newProject.id, roadmap.id, chat.id);
      assert.strictEqual(readMessages.length, 2);

      const history = await gitStorage.getCommitHistory(newProject.id, 20);
      assert.ok(history.length > 0);

      assert.ok(snapshotSha);
    });
  });
});

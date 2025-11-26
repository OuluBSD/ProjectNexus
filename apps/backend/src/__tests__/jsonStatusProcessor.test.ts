import { describe, test } from "node:test";
import assert from "node:assert";
import {
  extractJSON,
  validateJSON,
  executeTemplateLogic,
  processMessageForJSON,
} from "../services/jsonStatusProcessor";
import type { Chat, Template } from "../types";

describe("JSON Status Processor", () => {
  describe("extractJSON", () => {
    test("extracts JSON from code fence", () => {
      const content = `Here is the status:\n\`\`\`json\n{"status": "in_progress", "progress": 50}\n\`\`\``;
      const result = extractJSON(content);
      assert.deepStrictEqual(result, { status: "in_progress", progress: 50 });
    });

    test("extracts JSON from code fence without language tag", () => {
      const content = `Status update:\n\`\`\`\n{"status": "done", "progress": 100}\n\`\`\``;
      const result = extractJSON(content);
      assert.deepStrictEqual(result, { status: "done", progress: 100 });
    });

    test("extracts JSON from end of message", () => {
      const content = `Task completed successfully.\n{"status": "done", "progress": 100}`;
      const result = extractJSON(content);
      assert.deepStrictEqual(result, { status: "done", progress: 100 });
    });

    test("extracts pure JSON message", () => {
      const content = `{"status": "waiting", "progress": 25}`;
      const result = extractJSON(content);
      assert.deepStrictEqual(result, { status: "waiting", progress: 25 });
    });

    test("returns null for no JSON", () => {
      const content = "Just a regular message with no JSON";
      const result = extractJSON(content);
      assert.strictEqual(result, null);
    });

    test("handles malformed JSON gracefully", () => {
      const content = `\`\`\`json\n{status: broken}\n\`\`\``;
      const result = extractJSON(content);
      assert.strictEqual(result, null);
    });
  });

  describe("validateJSON", () => {
    test("validates correct JSON with status and progress", () => {
      const json = { status: "in_progress", progress: 50 };
      const result = validateJSON(json);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error, undefined);
    });

    test("rejects JSON without status field", () => {
      const json = { progress: 50 };
      const result = validateJSON(json);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, "JSON must include 'status' field");
    });

    test("rejects JSON without progress field", () => {
      const json = { status: "done" };
      const result = validateJSON(json);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, "JSON must include 'progress' field");
    });

    test("rejects progress < 0", () => {
      const json = { status: "error", progress: -10 };
      const result = validateJSON(json);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("0 and 100"));
    });

    test("rejects progress > 100", () => {
      const json = { status: "done", progress: 150 };
      const result = validateJSON(json);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("0 and 100"));
    });

    test("accepts progress at boundaries (0 and 100)", () => {
      assert.strictEqual(validateJSON({ status: "idle", progress: 0 }).valid, true);
      assert.strictEqual(validateJSON({ status: "done", progress: 100 }).valid, true);
    });
  });

  describe("executeTemplateLogic", () => {
    const chat: Chat = {
      id: "chat-1",
      roadmapListId: "roadmap-1",
      title: "Test Chat",
      status: "in_progress",
      progress: 10,
    };

    test("uses JSON values directly when no logic defined", async () => {
      const template: Template = {
        id: "template-1",
        title: "No Logic Template",
        jsonRequired: true,
      };
      const json = { status: "done", progress: 100 };
      const result = await executeTemplateLogic(json, template, chat);
      assert.strictEqual(result.status, "done");
      assert.strictEqual(result.progress, 100);
    });

    test("executes template logic to transform status", async () => {
      const template: Template = {
        id: "template-2",
        title: "Logic Template",
        jsonRequired: true,
        javascriptLogic: `
          if (context.json.progress === 100) {
            context.result.status = 'done';
            context.result.progress = 100;
          } else {
            context.result.status = 'in_progress';
            context.result.progress = context.json.progress;
          }
        `,
      };
      const json = { status: "working", progress: 75 };
      const result = await executeTemplateLogic(json, template, chat);
      assert.strictEqual(result.status, "in_progress");
      assert.strictEqual(result.progress, 75);
    });

    test("returns error for invalid JavaScript logic", async () => {
      const template: Template = {
        id: "template-3",
        title: "Broken Logic",
        jsonRequired: true,
        javascriptLogic: "throw new Error('Intentional error');",
      };
      const json = { status: "done", progress: 100 };
      const result = await executeTemplateLogic(json, template, chat);
      assert.ok(result.error?.includes("Failed to execute"));
    });

    test("handles complex logic with calculations", async () => {
      const template: Template = {
        id: "template-4",
        title: "Complex Logic",
        jsonRequired: true,
        javascriptLogic: `
          const tasksComplete = context.json.tasksComplete || 0;
          const tasksTotal = context.json.tasksTotal || 1;
          context.result.progress = Math.floor((tasksComplete / tasksTotal) * 100);
          context.result.status = context.result.progress === 100 ? 'done' : 'in_progress';
        `,
      };
      const json = { status: "working", progress: 0, tasksComplete: 7, tasksTotal: 10 };
      const result = await executeTemplateLogic(json, template, chat);
      assert.strictEqual(result.progress, 70);
      assert.strictEqual(result.status, "in_progress");
    });
  });

  describe("processMessageForJSON", () => {
    const chat: Chat = {
      id: "chat-1",
      roadmapListId: "roadmap-1",
      title: "Test Chat",
      status: "in_progress",
      progress: 25,
    };

    test("skips processing when template doesn't require JSON", async () => {
      const template: Template = {
        id: "template-1",
        title: "No JSON Required",
        jsonRequired: false,
      };
      const result = await processMessageForJSON("Any message", chat, template);
      assert.strictEqual(result.valid, true);
    });

    test("skips processing when no template provided", async () => {
      const result = await processMessageForJSON("Any message", chat, undefined);
      assert.strictEqual(result.valid, true);
    });

    test("detects missing JSON and requests reformat", async () => {
      const template: Template = {
        id: "template-2",
        title: "JSON Required",
        jsonRequired: true,
      };
      const result = await processMessageForJSON("No JSON here!", chat, template);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.needsReformat, true);
      assert.ok(result.error?.includes("No valid JSON"));
    });

    test("detects malformed JSON and requests reformat", async () => {
      const template: Template = {
        id: "template-3",
        title: "JSON Required",
        jsonRequired: true,
      };
      const message = `Status update:\n{"progress": 50}`;
      const result = await processMessageForJSON(message, chat, template);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.needsReformat, true);
      assert.ok(result.error?.includes("status"));
    });

    test("processes valid JSON and returns status/progress", async () => {
      const template: Template = {
        id: "template-4",
        title: "JSON Required",
        jsonRequired: true,
      };
      const message = `Task progressing well.\n\`\`\`json\n{"status": "in_progress", "progress": 75}\n\`\`\``;
      const result = await processMessageForJSON(message, chat, template);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.status, "in_progress");
      assert.strictEqual(result.progress, 75);
      assert.deepStrictEqual(result.json, { status: "in_progress", progress: 75 });
    });

    test("executes template logic on valid JSON", async () => {
      const template: Template = {
        id: "template-5",
        title: "JSON with Logic",
        jsonRequired: true,
        javascriptLogic: `
          // Double the progress for testing
          context.result.progress = Math.min(100, context.json.progress * 2);
          context.result.status = context.result.progress === 100 ? 'done' : 'in_progress';
        `,
      };
      const message = `{"status": "working", "progress": 40}`;
      const result = await processMessageForJSON(message, chat, template);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.progress, 80);
      assert.strictEqual(result.status, "in_progress");
    });

    test("handles execution errors gracefully", async () => {
      const template: Template = {
        id: "template-6",
        title: "Broken Logic",
        jsonRequired: true,
        javascriptLogic: "context.nonexistent.property = 'error';",
      };
      const message = `{"status": "done", "progress": 100}`;
      const result = await processMessageForJSON(message, chat, template);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("Failed to execute"));
    });
  });
});

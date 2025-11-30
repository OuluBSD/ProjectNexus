import type { Chat, Template } from "../types";

/**
 * JSON Status Processor
 *
 * Handles the JSON-before-stop protocol for templates with jsonRequired: true.
 * Extracts JSON from assistant messages, validates it, runs template JS logic,
 * and updates chat status/progress.
 */

export type JSONStatusResult = {
  valid: boolean;
  json?: Record<string, unknown>;
  status?: string;
  progress?: number;
  error?: string;
  needsReformat?: boolean;
};

const ALLOWED_STATUSES = ["idle", "in_progress", "waiting", "blocked", "done", "error"];

function normalizeStatus(status: unknown): string | null {
  if (typeof status !== "string") return null;
  const normalized = status
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return ALLOWED_STATUSES.includes(normalized) ? normalized : null;
}

/**
 * Extract JSON from assistant message content.
 * Looks for JSON blocks in code fences or at the end of the message.
 */
export function extractJSON(content: string): Record<string, unknown> | null {
  // Try to find JSON in code fences first
  const codeFenceMatch = content.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeFenceMatch) {
    try {
      return JSON.parse(codeFenceMatch[1].trim());
    } catch {
      // Fall through to other methods
    }
  }

  // Try to find JSON at the end of the message (after last newline)
  const lines = content.trim().split("\n");
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    const candidate = lines.slice(i).join("\n").trim();
    if (candidate.startsWith("{") || candidate.startsWith("[")) {
      try {
        return JSON.parse(candidate);
      } catch {
        // Not valid JSON, continue
      }
    }
  }

  // Try to parse the entire content as JSON (for pure JSON responses)
  try {
    return JSON.parse(content.trim());
  } catch {
    return null;
  }
}

/**
 * Validate that JSON contains required fields based on template.
 * Basic validation - templates can define specific schema requirements.
 */
export function validateJSON(
  json: Record<string, unknown>,
  template?: Template
): { valid: boolean; error?: string; normalizedStatus?: string } {
  if (!json || typeof json !== "object") {
    return { valid: false, error: "JSON must be an object" };
  }

  // Basic validation - ensure status and progress exist
  if (!("status" in json)) {
    return { valid: false, error: "JSON must include 'status' field" };
  }

  if (!("progress" in json)) {
    return { valid: false, error: "JSON must include 'progress' field" };
  }

  const normalizedStatus = normalizeStatus((json as Record<string, unknown>).status);
  if (!normalizedStatus) {
    return {
      valid: false,
      error: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
    };
  }

  if (typeof json.progress !== "number" || json.progress < 0 || json.progress > 100) {
    return { valid: false, error: "Progress must be a number between 0 and 100" };
  }

  return { valid: true, normalizedStatus };
}

/**
 * Execute template's JavaScript logic on the extracted JSON.
 * Returns updated status/progress or error.
 */
export async function executeTemplateLogic(
  json: Record<string, unknown>,
  template: Template,
  chat: Chat
): Promise<{ status?: string; progress?: number; error?: string }> {
  if (!template.javascriptLogic) {
    // No logic defined, use JSON values directly
    return {
      status: typeof json.status === "string" ? json.status : chat.status,
      progress: typeof json.progress === "number" ? json.progress : chat.progress,
    };
  }

  try {
    // Create a sandboxed execution context
    // Note: In production, consider using vm2 or isolated-vm for better security
    const context = {
      json,
      chat,
      template,
      result: { status: chat.status, progress: chat.progress },
    };

    // Execute the logic
    // The logic should update context.result with new status/progress
    const fn = new Function("context", template.javascriptLogic + "\nreturn context.result;");
    const result = fn(context);

    return {
      status: typeof result.status === "string" ? result.status : chat.status,
      progress: typeof result.progress === "number" ? result.progress : chat.progress,
    };
  } catch (err) {
    return {
      error: `Failed to execute template logic: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Process an assistant message for JSON status updates.
 * Main entry point for the JSON status pipeline.
 */
export async function processMessageForJSON(
  messageContent: string,
  chat: Chat,
  template?: Template
): Promise<JSONStatusResult> {
  // Skip processing if template doesn't require JSON
  if (!template?.jsonRequired) {
    return { valid: true };
  }

  // Extract JSON from message
  const json = extractJSON(messageContent);
  if (!json) {
    return {
      valid: false,
      needsReformat: true,
      error: "No valid JSON found in assistant message. Please include status JSON.",
    };
  }

  // Validate JSON structure
  const validation = validateJSON(json, template);
  if (!validation.valid) {
    return {
      valid: false,
      needsReformat: true,
      error: validation.error || "JSON validation failed",
      json,
    };
  }

  // Execute template logic
  const normalizedJSON = validation.normalizedStatus
    ? { ...json, status: validation.normalizedStatus }
    : json;
  const result = await executeTemplateLogic(normalizedJSON, template, chat);
  if (result.error) {
    return {
      valid: false,
      error: result.error,
      json,
    };
  }

  return {
    valid: true,
    json,
    status: result.status,
    progress: result.progress,
  };
}

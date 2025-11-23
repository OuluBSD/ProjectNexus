import { describe, expect, it } from "vitest";
import { parseStatusPayload } from "./validation";

describe("parseStatusPayload", () => {
  it("parses a valid status payload", () => {
    const payload = parseStatusPayload({ status: "waiting", progress: 0.3, focus: "scaffold backend" });
    expect(payload.status).toBe("waiting");
    expect(payload.progress).toBe(0.3);
    expect(payload.focus).toBe("scaffold backend");
  });

  it("defaults status when missing", () => {
    const payload = parseStatusPayload({ progress: 0.8 });
    expect(payload.status).toBe("in_progress");
  });

  it("requires progress when json-before-stop is enforced", () => {
    expect(() => parseStatusPayload({ status: "waiting" }, { requireProgress: true })).toThrow(
      /progress is required/i
    );
  });

  it("rejects out-of-range progress", () => {
    expect(() => parseStatusPayload({ status: "waiting", progress: 4 })).toThrow();
  });
});

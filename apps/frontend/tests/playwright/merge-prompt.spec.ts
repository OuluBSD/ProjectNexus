import { expect, test } from "@playwright/test";
import { setupPlaywrightRoutes } from "./route-helpers";

test("merge prompt honors trimmed/case-tolerant target submissions", async ({ page }) => {
  let capturedMergeTarget: string | null = null;

  await setupPlaywrightRoutes(page, {
    onMerge: (targetIdentifier) => {
      capturedMergeTarget = targetIdentifier;
    },
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
  const chatItems = page.locator(".chats-column .list .item:not(.meta)");
  await expect(chatItems).toHaveCount(1);
  await expect(chatItems.first().locator(".item-title")).toHaveText("Target Chat");
});

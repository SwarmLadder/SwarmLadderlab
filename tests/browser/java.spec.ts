import { test, expect } from "@playwright/test";

test("Java practical course offers native-verified exercises, not browser grading", async ({ page }) => {
  await page.goto("/learn/java");
  await expect(page.getByRole("heading", { name: "Java", exact: true })).toBeVisible();
  await page.goto("/lesson/java/basics/drills/move-zeros");
  await expect(page.getByRole("heading", { name: /Move zeros/ })).toBeVisible();
  await expect(page.getByText(/Move all zeros to the end in place/)).toBeVisible();
  await expect(page.getByText("make check TASK=move-zeros").first()).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Java 17 code draft" });
  await expect(editor).toContainText("TODO");
  await expect(page.getByRole("button", { name: "Try in Playground" })).toHaveCount(0);
  const verify = page.getByRole("button", { name: "Mark verified locally" });
  await expect(verify).toBeDisabled();
  await editor.fill("public final class Tasks { /* student draft */ }");
  await page.goto("/lesson/java/basics/drills/two-sum");
  await expect(page.getByRole("textbox", { name: "Java 17 code draft" }))
    .toContainText("student draft");
  await expect(page.getByRole("button", { name: "Mark verified locally" })).toBeDisabled();
});

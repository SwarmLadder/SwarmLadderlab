import { test, expect } from "@playwright/test";

test("DSA is a real navigable course with original algorithm lessons and challenges", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /Data Structures & Algorithms, Open now/ })).toBeVisible();
  await page.goto("/learn/dsa");
  await expect(page.getByRole("heading", { name: "Data Structures & Algorithms", exact: true })).toBeVisible();
  await expect(page.getByText(/48 checks/).first()).toBeVisible();
  await page.goto("/lesson/dsa/basics/lessons/01_hashing_and_frequency");
  await expect(page.getByRole("heading", { name: /Hashing/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark activity complete" })).toBeVisible();
  await page.getByRole("button", { name: "Mark activity complete" }).click();
  await expect(page.getByText("✓ Completed")).toBeVisible();
  await page.goto("/progress");
  await expect(page.getByText("DSA · Basics")).toBeVisible();
});

test("DSA problem B01 preserves source, editable Python and public-case contract", async ({ page }) => {
  await page.goto("/lesson/dsa/basics/problems/B01");
  await expect(page.getByRole("heading", { name: /B01.*matching transaction amounts/i })).toBeVisible();
  await expect(page.getByText(/6 public cases/).first()).toBeVisible();
  await expect(page.getByText(/No hidden judging/)).toBeVisible();
  const editor = page.getByRole("textbox", { name: "DSA Python solution" });
  await expect(editor).toContainText("NotImplementedError");
  await expect(page.getByRole("button", { name: "Run 6 public tests" })).toBeVisible();
  await editor.fill("def solve(nums, target):\n    return [0, 1]\n");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "DSA Python solution" }))
    .toContainText("return [0, 1]");
  await expect(page.getByText("Run every public case to earn completion")).toBeVisible();
});

test("DSA Python grader passes correct code and records course progress", async ({ page }) => {
  test.setTimeout(125_000);
  await page.goto("/lesson/dsa/basics/problems/B01");
  const editor = page.getByRole("textbox", { name: "DSA Python solution" });
  await editor.fill([
    "def solve(nums, target):",
    "    seen = {}",
    "    for j, value in enumerate(nums):",
    "        need = target - value",
    "        if need in seen:",
    "            return [seen[need], j]",
    "        seen[value] = j",
    "    raise ValueError('No pair')",
  ].join("\n"));
  await page.getByRole("button", { name: "Run 6 public tests" }).click();
  await expect(page.getByText(/Passed all 6 published cases/)).toBeVisible({ timeout: 100_000 });
  await expect(page.getByText("6 / 6 published cases passed")).toBeVisible();
  await page.reload();
  await expect(page.getByText("✓ Completed")).toBeVisible();
  await page.goto("/progress");
  await expect(page.getByText("DSA · Basics")).toBeVisible();
});

test("C17 local lab requires explicit learner confirmation, never browser execution", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /C, Open now/ })).toBeVisible();
  await page.goto("/learn/c");
  await expect(page.getByRole("heading", { name: "C", exact: true })).toBeVisible();
  await expect(page.getByText(/12 checks/).first()).toBeVisible();
  await page.goto("/lesson/c/basics/labs/01-checked_add");
  await expect(page.getByRole("heading", { name: /Checked signed addition/i })).toBeVisible();
  await expect(page.getByText("make mastery-check TASK=checked_add").first()).toBeVisible();
  await expect(page.getByText(/does not compile or execute C/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Try in Playground/ })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "C17 code draft" })).toContainText("TODO");
  const verified = page.getByRole("button", { name: "Mark verified locally" });
  await expect(verified).toBeDisabled();
  await page.getByRole("checkbox", { name: /I ran the verification command locally/ }).check();
  await verified.click();
  await expect(page.getByText("✓ Completed")).toBeVisible();
  await page.goto("/progress");
  await expect(page.getByText("C17 · Basics")).toBeVisible();
});

test("C deep dives and detailed interviews are readable independently", async ({ page }) => {
  await page.goto("/lesson/c/basics/lessons/01_compilation_linkage_and_make");
  await expect(page.getByRole("heading", { name: /compiler.*linker/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark activity complete" })).toBeVisible();
  await page.goto("/lesson/c/basics/interview/01");
  await expect(page.getByRole("heading", { name: /difference between declaration and definition/i })).toBeVisible();
  const answer = page.locator("details").filter({ hasText: "Reveal explained answer" });
  await expect(answer).toBeVisible();
  await answer.locator("summary").click();
  await expect(answer).toContainText(/translation|definition/i);
});

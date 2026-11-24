import { test, expect } from "@playwright/test";

test("DSA is a real navigable course with original algorithm lessons and challenges", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /Data Structures & Algorithms, Open now/ })).toBeVisible();
  await page.goto("/learn/dsa");
  await expect(page.getByRole("heading", { name: "Data Structures & Algorithms", exact: true })).toBeVisible();
  await expect(page.getByText(/336 checks/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /B01/i }).first()).toBeVisible();
  // Lessons are graded notebooks now: no "mark complete" shortcut.
  await page.goto("/lesson/dsa/basics/lessons/01_hashing_and_frequency");
  await expect(page.getByRole("heading", { level: 1, name: /Hash maps/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark activity complete" })).toHaveCount(0);
  await expect(page.locator('[data-cell-id="drill-DB01-check"]')).toBeVisible();
  // A reading page (the capstone brief) is still finished by reading it.
  await page.goto("/lesson/dsa/basics/projects/01_log_signal_analyzer");
  await page.getByRole("button", { name: "Mark activity complete" }).click();
  await expect(page.getByText("✓ Completed")).toBeVisible();
  await page.goto("/progress");
  await expect(page.getByRole("list", { name: "DSA Basics" })).toBeVisible();
});

test("DSA problem B01 preserves source, editable Python and public-case contract", async ({ page }) => {
  await page.goto("/lesson/dsa/basics/problems/B01");
  await expect(page.getByRole("heading", { name: /B01.*matching transaction amounts/i })).toBeVisible();
  await expect(page.getByText(/6 public cases/).first()).toBeVisible();
  await expect(page.getByText(/No hidden judging/)).toBeVisible();
  const editor = page.getByRole("textbox", { name: "DSA Python solution" });
  await expect(editor).toContainText("NotImplementedError");
  await expect(page.getByRole("button", { name: "Run code · check 6 cases" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try 2 examples" })).toBeVisible();
  const explanation = page.getByText("Need help? Open the detailed walkthrough and solution");
  await expect(explanation).toBeVisible();
  await expect(explanation.locator("xpath=..")).not.toHaveAttribute("open");
  await editor.fill("def solve(nums, target):\n    return [0, 1]\n");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "DSA Python solution" }))
    .toContainText("return [0, 1]");
  await expect(page.getByText("Run every public case to earn completion")).toBeVisible();
});

test("DSA Python grader passes correct code and records course progress", async ({ page }) => {
  test.setTimeout(300_000);
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
  await page.getByRole("button", { name: "Run code · check 6 cases" }).click();
  await expect(page.getByText(/Passed all 6 published cases/)).toBeVisible({ timeout: 100_000 });
  await expect(page.getByText("6 / 6 published cases passed")).toBeVisible();
  await expect(page.getByRole("region", { name: "Published case results" }).getByText("Output:", { exact: true })).toHaveCount(6);
  await expect(page.getByLabel("Short algorithm explanation")).toContainText("Approach:");
  await expect(page.getByLabel("Short algorithm explanation")).toContainText("Complexity:");
  await page.reload();
  await expect(page.getByText("✓ Passing with your current code")).toBeVisible();
  // Editing the solution withdraws credit until the cases run again, across reloads too.
  await editor.fill("def solve(nums, target):\n    return [0, 1]\n");
  await expect(page.getByText("Needs re-check: code changed since the last pass")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Your last pass was for different code. Run all cases again.")).toBeVisible();
  await page.getByRole("button", { name: "Run code · check 6 cases" }).click();
  await expect(page.getByText(/Passed \d of 6 published cases/)).toBeVisible({ timeout: 100_000 });
  await expect(page.getByText("Run every public case to earn completion")).toBeVisible();
  await editor.fill([
    "def solve(nums, target):",
    "    seen = {}",
    "    for j, value in enumerate(nums):",
    "        if target - value in seen:",
    "            return [seen[target - value], j]",
    "        seen[value] = j",
  ].join("\n"));
  await page.getByRole("button", { name: "Run code · check 6 cases" }).click();
  await expect(page.getByText("✓ Your current code passes every published case")).toBeVisible({ timeout: 100_000 });
  await page.goto("/progress");
  await expect(page.getByRole("list", { name: "DSA Basics" }).locator("li.done")).toHaveCount(1);
});

test("C17 local lab requires explicit learner confirmation, never browser execution", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /C, Open now/ })).toBeVisible();
  await page.goto("/learn/c");
  await expect(page.getByRole("heading", { name: "C", exact: true })).toBeVisible();
  await expect(page.getByText(/93 checks/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Code whole_minutes/i })).toBeVisible();
  await page.goto("/lesson/c/basics/labs/01-checked_add");
  await expect(page.getByRole("heading", { level: 1, name: /Checked signed addition/i })).toBeVisible();
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
  await expect(page.getByRole("list", { name: "C Basics" })).toBeVisible();
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


test("C workshop drill opens an editable real starter and public test before explanations", async ({ page }) => {
  await page.goto("/lesson/c/basics/drills/whole_minutes");
  await expect(page.getByRole("heading", { name: /Code whole_minutes/i })).toBeVisible();
  await expect(page.getByText(/Return complete minutes/).first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: "C17 code draft" })).toContainText("Implement whole_minutes");
  await expect(page.getByText("make check TASK=whole_minutes").first()).toBeVisible();
  const publicTests = page.getByText("View the actual published C test for this function");
  await publicTests.click();
  await expect(page.getByText(/whole_minutes\(59\)/)).toBeVisible();
  const text = page.getByText("Need help? Open the theory, worked examples and explanations");
  await expect(text).toBeVisible();
  await expect(text.locator("xpath=..")).not.toHaveAttribute("open");

  const editor = page.getByRole("textbox", { name: "C17 code draft" });
  await editor.fill('#include "course.h"\nunsigned whole_minutes(unsigned s) { return s / 60; }\n');
  await page.goto("/lesson/c/basics/drills/clock_seconds");
  await expect(page.getByRole("textbox", { name: "C17 code draft" })).toContainText("return s / 60");
  await expect(page.getByText("make check TASK=clock_seconds").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark verified locally" })).toBeDisabled();
});

test("DSA sample practice gives feedback without prematurely awarding completion", async ({ page }) => {
  test.setTimeout(125_000);
  await page.goto("/lesson/dsa/basics/problems/B01");
  const editor = page.getByRole("textbox", { name: "DSA Python solution" });
  await editor.fill([
    "def solve(nums, target):",
    "    seen = {}",
    "    for j, val in enumerate(nums):",
    "        if target - val in seen: return [seen[target - val], j]",
    "        seen[val] = j",
  ].join("\n"));
  await page.getByRole("button", { name: "Try 2 examples" }).click();
  await expect(page.getByText("2 / 2 sample cases passed")).toBeVisible({ timeout: 100_000 });
  await expect(page.getByLabel("Published case results").getByText("Output:", { exact: true })).toHaveCount(2);
  await expect(page.getByText(/Both sample cases passed/)).toBeVisible();
  await expect(page.getByText("Run every public case to earn completion")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run code · check 6 cases" })).toBeVisible();
});

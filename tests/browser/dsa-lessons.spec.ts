import { test, expect, type Page } from "@playwright/test";

const lesson = "/lesson/dsa/basics/lessons/03_stacks_and_state";
const drill = (page: Page, id: string) => page.locator(`[data-cell-id="drill-${id}"] .code-cell`);
const checkCell = (page: Page, id: string) => page.locator(`[data-cell-id="drill-${id}-check"]`);
async function setCode(page: Page, id: string, code: string) {
  const editor = drill(page, id).locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await editor.fill(code);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("view-set")) {
      localStorage.setItem("swarmladderlab.view", "all");
      sessionStorage.setItem("view-set", "1");
    }
  });
});

test("a DSA lesson is a notebook: runnable examples, graded drills with hints, current credit", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(lesson);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Stacks");
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.getByRole("link", { name: "Data Structures & Algorithms" })).toHaveAttribute("href", "/learn/dsa");
  await expect(crumbs.getByRole("link", { name: "Roadmap" })).toHaveAttribute("href", "/learn/dsa/roadmap");
  await expect(page.locator(".runtime")).toContainText("Python ready", { timeout: 180_000 });

  // A worked example runs for real; the page shows no pre-baked output.
  await page.locator('[data-cell-id="demo-2"] .nb-play').click();
  await expect(page.locator('[data-cell-id="demo-2"] .output')).toContainText("'([)]' False", { timeout: 60_000 });
  await expect(page.locator('[data-cell-id="demo-2"] .output')).toContainText("[4, 2, 4, -1, -1]");

  // An untouched guided drill is "not attempted", never a failure.
  await checkCell(page, "DB09").getByRole("button", { name: "Check", exact: true }).click();
  await expect(checkCell(page, "DB09").locator(".output")).toContainText("Not attempted", { timeout: 60_000 });

  // Wrong code fails on a named published case and unlocks the first hint.
  await setCode(page, "DB09", "def solve(s):\n    return True\n");
  await checkCell(page, "DB09").getByRole("button", { name: "Check", exact: true }).click();
  const out = checkCell(page, "DB09").locator(".output");
  await expect(out).toContainText("❌ DB09:", { timeout: 60_000 });
  await expect(out).toContainText("expected");
  await expect(out).toContainText("hint 1/");
  await expect(checkCell(page, "DB09")).toHaveAttribute("data-validation", "failed");

  // A correct solution passes all six published cases and counts toward the lesson.
  await setCode(page, "DB09", [
    "def solve(s):",
    "    depth = 0",
    "    for ch in s:",
    "        if ch == '(':",
    "            depth += 1",
    "        elif ch == ')':",
    "            if depth == 0:",
    "                return False",
    "            depth -= 1",
    "    return depth == 0",
  ].join("\n"));
  await checkCell(page, "DB09").getByRole("button", { name: "Check", exact: true }).click();
  await expect(out).toContainText("✅ DB09: all 6 checks passed", { timeout: 60_000 });
  await expect(checkCell(page, "DB09")).toHaveAttribute("data-validation", "passed");
  await expect(page.locator(".nb-score")).toContainText("1/8");

  // Credit follows the current code: an edit withdraws it, also after a reload.
  await setCode(page, "DB09", "def solve(s):\n    return False\n");
  await page.reload();
  await expect(page.locator(".nb-score")).toContainText("0/8");
  await expect(checkCell(page, "DB09")).toHaveAttribute("data-validation", "stale");
});

test("the DSA quiz is checked against the course's answer hashes and explains the answer", async ({ page }) => {
  await page.goto(lesson);
  const q1 = page.locator(".quiz-q").first();
  await expect(q1).toContainText("Which input breaks a checker");
  // Find the right answer by trying options, as a learner would.
  for (const letter of ["a", "b", "c"]) {
    await q1.locator(".quiz-option", { hasText: new RegExp("^" + letter) }).click();
    if (await q1.evaluate((el) => el.classList.contains("right"))) break;
    await expect(q1.locator(".quiz-feedback")).toContainText("Re-read");
  }
  await expect(q1).toHaveClass(/right/);
  await expect(q1.locator(".quiz-feedback")).toContainText("Correct.");
  await page.reload();
  await expect(page.locator(".quiz-q").first()).toHaveClass(/right/);
  await expect(page.locator(".nb-score")).toContainText("1/8");
});

test("every DSA lesson opens as a notebook with four drills and a quiz", async ({ page, request }) => {
  const catalog = await (await request.get("/data/dsa/catalog.json")).json();
  const lessons = catalog.levels.flatMap((l: { sections: { id: string; items: { id: string; graded: number }[] }[] }) =>
    l.sections.filter((s) => s.id === "notebooks").flatMap((s) => s.items));
  expect(lessons).toHaveLength(36);
  for (const item of [lessons[0], lessons[17], lessons[35]]) {
    expect(item.graded).toBe(8);
    await page.goto("/lesson/" + item.id);
    await expect(page.locator('[data-cell-id$="-check"]')).toHaveCount(4);
    await expect(page.locator(".quiz-q")).toHaveCount(4);
    await expect(page.getByRole("button", { name: "Mark activity complete" })).toHaveCount(0);
  }
});

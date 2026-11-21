import { test, expect, type Page } from "@playwright/test";
const intro = "basics/notebooks/00_python_introduction";

// Lessons open step by step; most tests want every cell on the page at once.
async function wholeLesson(page: Page) {
  await page.addInitScript(() => localStorage.setItem("swarmladderlab.view", "all"));
}
// Code cells use CodeMirror; read each editor's text line by line.
async function cell(page: Page, needle: string) {
  const edit = page.locator(".code-cell .cm-content");
  await edit.first().waitFor();
  const i = await edit.evaluateAll(
    (nodes, text) => nodes.findIndex((node) => [...node.querySelectorAll(".cm-line")].map((l) => l.textContent).join("\n").includes(text)),
    needle,
  );
  expect(i).toBeGreaterThanOrEqual(0);
  return page.locator(".code-cell").nth(i);
}
const runtime = (page: Page) => page.locator(".runtime");

test("home, course route, mobile theme, data migration and achievement gating", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Begin with Python/ }).first()).toBeVisible();
  await page.getByRole("button", { name: /Switch to/ }).click();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme!);
  expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBeTruthy();

  // New visitors go straight to the first lesson; the route lives at /learn/python.
  await expect(page.getByRole("link", { name: /Begin with Python/ }).first()).toHaveAttribute("href", /\/lesson\//);
  await page.goto("/learn/python");
  // Progressive discovery: later chapters stay closed until opened.
  await expect(page.getByRole("button", { name: "Peek inside" }).first()).toBeVisible();
  await page.getByLabel("Find a lesson").fill("00_python_introduction");
  await expect(page.getByRole("status")).toContainText("1 matching");
  await page.getByLabel("Find a lesson").fill("");

  await page.goto("/progress");
  await page.getByText("Backup and reset").click();
  const data = {
    format: "swarmladderlab.v1",
    done: { [intro + "#ex1"]: 123 },
    code: { [intro]: { "saved-cell": "print(123)" } },
    last: intro,
  };
  await page.getByLabel("Import progress").setInputFiles({
    name: "old.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(page.getByRole("status")).toHaveText("Progress imported.");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress" }).click();
  const stream = await (await downloaded).createReadStream();
  const parts = [];
  for await (const part of stream!) parts.push(part);
  expect(JSON.parse(Buffer.concat(parts).toString())).toMatchObject(data);

  await page.goto("/");
  await expect(page.locator(".continue-card")).toHaveAttribute("href", new RegExp(intro));
  await page.goto("/achievements");
  await expect(page.locator(".seal-next").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Create your claim file" })).toHaveCount(0);
  await page.goto("/progress");
  await page.getByText("Backup and reset").click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset progress" }).click();
  await expect(page.getByRole("status")).toHaveText("Progress reset.");
});

test("lessons are notebooks with a practice view and a practice strip", async ({ page }) => {
  await page.goto("/lesson/" + intro);
  // Lessons open as a notebook: explanations and exercises together, with an outline.
  await expect(page.getByRole("button", { name: "Notebook", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".nb-toc")).toBeVisible();
  await expect(page.locator(".nb-text").first()).toBeVisible();
  // The outline lists each section with its questions; the toolbar jumps to the next one.
  await expect(page.locator(".nb-toc .toc-group").first()).toBeVisible();
  await expect(page.locator(".nb-next")).toContainText("Next:");
  // Practice view hides the explanations behind one "Review the idea" bar.
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await expect(page.locator(".review-bar")).toBeVisible();
  await expect(page.locator(".nb-step:not(.is-practice)")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Practice", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.locator(".review-bar").click();
  expect(await page.locator(".nb-step:not(.is-practice)").count()).toBeGreaterThan(0);
});

test("real Python exercise, saved edits, stop and restart", async ({ page }) => {
  await wholeLesson(page);
  await page.goto("/lesson/" + intro);
  await expect(runtime(page)).toContainText("Python ready", { timeout: 120000 });
  const ex = await cell(page, "check(2,");
  const editor = ex.getByRole("textbox");
  await editor.fill("check(2, 10080)");
  await editor.press("Shift+Enter");
  await expect(ex.locator(".output")).toContainText("✅ Exercise 2: correct");
  await page.reload();
  await expect((await cell(page, "check(2, 10080)")).getByRole("textbox")).toHaveText("check(2, 10080)");
  await editor.fill("while True:\n    pass");
  await editor.press("Shift+Enter");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(ex.locator(".output")).toContainText("Stopped");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await editor.fill("print(6*7)");
  await editor.press("Shift+Enter");
  await expect(ex.locator(".output")).toContainText("42", { timeout: 120000 });
});

test("workbook validates with pytest in the browser", async ({ page }) => {
  await wholeLesson(page);
  await page.goto("/lesson/basics/exercises/02_control_flow_exercises");
  await expect(runtime(page)).toContainText("Python ready", { timeout: 180000 });
  const fn = await cell(page, "def classify_temperature");
  await fn
    .getByRole("textbox")
    .fill(
      'def classify_temperature(celsius):\n    return "freezing" if celsius <= 0 else "cold" if celsius < 15 else "comfortable" if celsius < 25 else "hot"',
    );
  await fn.getByRole("textbox").press("Shift+Enter");
  const check = page.locator(".code-cell.kind-check", { hasText: "classify_temperature" }).first();
  await check.getByRole("button", { name: "Check", exact: true }).click();
  await expect(check.locator(".output")).toContainText("✅ classify_temperature", { timeout: 90000 });
});

test("Python syntax colors follow edits and theme while preserving literal code", async ({ page }) => {
  await wholeLesson(page);
  await page.goto("/lesson/" + intro);
  const editor = page.getByRole("textbox", { name: "Python code" }).first();
  const code = 'def greet():\n    # example\n    return "<tag>" * 2';
  await editor.fill(code);
  const layer = editor;
  await expect(layer.locator(".tok-definition")).toHaveText("greet");
  await expect(layer.locator(".tok-string")).toHaveText('"<tag>"');
  await expect(layer.locator(".tok-comment")).toHaveText("# example");
  await expect(layer.locator(".tok-number")).toHaveText("2");
  const colors = () =>
    layer
      .locator(".tok-keyword, .tok-string, .tok-number, .tok-comment")
      .evaluateAll((nodes) => [...new Set(nodes.map((n) => getComputedStyle(n).color))]);
  const before = await colors();
  expect(before).toHaveLength(4);
  await page.getByRole("button", { name: /Switch to/ }).click();
  await expect.poll(colors).not.toEqual(before);
  expect(await colors()).toHaveLength(4);
  expect(await editor.evaluate((n) => [...n.querySelectorAll(".cm-line")].map((l) => l.textContent).join("\n"))).toBe(code);
  await expect(layer.locator("tag")).toHaveCount(0);
});

test("playground marks a runtime error on its line and suggests completions", async ({ page }) => {
  await page.goto("/playground");
  await expect(page.locator(".runtime")).toContainText("Python ready", { timeout: 120000 });
  const editor = page.getByRole("textbox", { name: "Python code" });
  await editor.fill("values = []\nprint(sum(values) / len(values))");
  await editor.press("Shift+Enter");
  await expect(page.locator(".console-pane .stderr")).toContainText("ZeroDivisionError");
  await expect(page.locator(".run-meta")).toContainText("Error");
  await expect(page.locator(".cm-lintRange-error")).toHaveCount(1);
  await editor.press("Control+End");
  await page.keyboard.type('\nword = "ladder"\nword.up');
  await expect(page.locator(".cm-tooltip-autocomplete")).toContainText("upper");
});

test("playground runs independent scratch code and restores edits", async ({ page }) => {
  await page.goto("/learn/python");
  await page.getByRole("button", { name: "Peek inside" }).first().click();
  await expect(page.getByRole("heading", { name: "Intermediate", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Playground", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Python code" });
  await editor.fill("print(21 * 2)");
  await editor.press("Shift+Enter");
  await expect(page.locator(".console-pane .output")).toHaveText("42", { timeout: 120000 });
  await page.reload();
  await expect(editor).toHaveText("print(21 * 2)");
  await page.setViewportSize({ width: 390, height: 820 });
  await expect(page.getByRole("heading", { name: "Console" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

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
  return edit.nth(i).locator("xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' code-cell ')][1]");
}
const runtime = (page: Page) => page.locator(".runtime");
// Teach-then-test Basics keeps challenges in the lessons ("pack:" entries); the
// older course keeps them in workbook notebooks. Tests follow whichever is built.
async function lessonChallenges(page: Page) {
  const catalog = await (await page.request.get("/data/catalog.json")).json();
  return Object.keys(catalog.workbooks).some((k) => k.startsWith("pack:"));
}

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

test("lessons are one notebook: teach and test, with an outline and a next button", async ({ page }) => {
  await page.goto("/lesson/" + intro);
  await expect(page.locator(".nb-toc .toc-group").first()).toBeVisible();
  await expect(page.locator(".nb-text").first()).toBeVisible();
  await expect(page.locator(".nb-cell.is-task").first()).toBeVisible();
  await expect(page.locator(".nb-next")).toContainText("Next:");
  await expect(page.getByRole("button", { name: "Practice", exact: true })).toHaveCount(0);
});

test("real Python exercise, saved edits, stop and restart", async ({ page }) => {
  await wholeLesson(page);
  await page.goto("/lesson/" + intro);
  await expect(runtime(page)).toContainText("Python ready", { timeout: 120000 });
  const answer = (await lessonChallenges(page)) ? "product = 12 * 7\ncheck(2, product)" : "check(2, 10080)";
  const ex = await cell(page, "check(2,");
  const editor = ex.getByRole("textbox");
  await editor.fill(answer);
  await editor.press("Shift+Enter");
  await expect(ex.locator(".output")).toContainText("✅ Exercise 2: correct");
  await page.reload();
  await expect((await cell(page, answer.split("\n")[0])).getByRole("textbox")).toContainText(answer.split("\n")[0]);
  await editor.fill("while True:\n    pass");
  await editor.press("Shift+Enter");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(ex.locator(".output")).toContainText("Stopped");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await editor.fill("print(6*7)");
  await editor.press("Shift+Enter");
  await expect(ex.locator(".output")).toContainText("42", { timeout: 120000 });
});

test("a lesson challenge is graded by the practice tests in the browser", async ({ page }) => {
  await page.goto("/");
  const inLessons = await lessonChallenges(page);
  await page.goto(inLessons ? "/lesson/basics/notebooks/05_conditional_statements" : "/lesson/basics/exercises/02_control_flow_exercises");
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
  await expect(check.locator(".output")).toContainText("✅ classify_temperature", { timeout: 120000 });
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

test("upper-level lessons run async exercises and grade their challenges in the browser", async ({ page }) => {
  const catalog = await (await page.request.get("/data/catalog.json")).json();
  test.skip(!catalog.workbooks["pack:advanced_02_concurrency_resilience"], "this course checkout still uses workbooks");
  await wholeLesson(page);
  await page.goto("/lesson/advanced/notebooks/05_asyncio_event_loop");
  await expect(runtime(page)).toContainText("Python ready", { timeout: 180000 });
  const ex = await cell(page, "async def double");
  const editor = ex.getByRole("textbox");
  await editor.fill(
    "import asyncio\n\nasync def double(x):\n    await asyncio.sleep(0)\n    return x * 2\n\nasync def main():\n    return await double(21)\n\ncheck(2, run(main()))",
  );
  await editor.press("Shift+Enter");
  await expect(ex.locator(".output")).toContainText("✅ Exercise 2: correct", { timeout: 120000 });

  await page.goto("/lesson/intermediate/notebooks/09_functional_tools_and_itertools");
  await expect(runtime(page)).toContainText("Python ready", { timeout: 180000 });
  const fn = await cell(page, "def power");
  await fn.getByRole("textbox").fill("def power(base, exponent):\n    return base ** exponent");
  await fn.getByRole("textbox").press("Shift+Enter");
  // power has no tests of its own: it is graded through make_square.
  const square = await cell(page, "def make_square");
  await square.getByRole("textbox").fill("def make_square():\n    from functools import partial\n    return partial(power, exponent=2)");
  await square.getByRole("textbox").press("Shift+Enter");
  const check = page.locator(".code-cell.kind-check", { hasText: "make_square" }).first();
  await check.getByRole("button", { name: "Check", exact: true }).click();
  await expect(check.locator(".output")).toContainText("✅ make_square", { timeout: 120000 });
});

const specimen = (page: Page, id: string) => page.locator('[data-cell-id="' + id + '"]');
async function runCell(page: Page, id: string, status: string, source?: string) {
  const item = specimen(page, id);
  if (source !== undefined) await item.getByRole("textbox").fill(source);
  await item.locator(".nb-play").click();
  await expect(item).toHaveAttribute("data-validation", status, {timeout:120000});
}
async function starter(page: Page, id: string) {
  return specimen(page, id).locator(".cm-content").evaluate(el =>
    Array.from(el.querySelectorAll(".cm-line"), line => line.textContent).join("\n"));
}

test("Running Totals tracks only current checked code after reload", async ({page}) => {
  await page.goto("/lesson/basics/notebooks/16_basic_problem_solving");
  await runCell(page, "ex-2","not_attempted");
  const original = await starter(page,"ex-2");
  const correct = original.replace("___","running.append(total)") + "\nprint(running)";
  await runCell(page,"ex-2","passed",correct);
  await expect(specimen(page,"ex-2").locator(".output")).toContainText("[1, 3, 6, 10]");
  const wrong = correct.replace("append(total)","append(v)");
  await specimen(page,"ex-2").getByRole("textbox").fill(wrong);
  await expect(specimen(page,"ex-2")).toHaveAttribute("data-validation","stale");
  await runCell(page,"ex-2","failed");
  await page.reload();
  await expect(specimen(page,"ex-2")).toHaveAttribute("data-validation","failed");
  expect(await starter(page,"ex-2")).toEqual(wrong);
  await runCell(page,"ex-2","not_attempted",'print("✅ Exercise 2: correct")');
  await runCell(page,"ex-2","execution_error",'message = "___ is a placeholder"\n# ___\nraise ValueError("real error")');
  await expect(specimen(page,"ex-2").locator(".stderr")).toContainText("ValueError: real error");
  await runCell(page,"ex-2","passed",correct);
  await page.reload();
  await expect(specimen(page,"ex-2")).toHaveAttribute("data-validation","passed");
});

test("SQLite setup, two valid implementations, and errors in an edited prerequisite", async ({page}) => {
  await page.goto("/lesson/intermediate/notebooks/15_sqlite_and_transactions");
  await runCell(page,"ch-1","ran");
  const original = await starter(page,"ex-6");
  for (const code of [
    'return [title for title, in conn.execute("SELECT title FROM tasks ORDER BY id")]',
    'return list(map(lambda row: row[0], conn.execute("SELECT title FROM tasks ORDER BY id")))',
  ]) await runCell(page,"ex-6","passed",original.replace("raise NotImplementedError",code));
  await runCell(page,"ex-6","failed",original.replace("raise NotImplementedError","return []"));
  await specimen(page,"ch-1").getByRole("textbox").fill('raise ValueError("schema setup failed")');
  await runCell(page,"ch-1-check","execution_error");
  await expect(specimen(page,"ch-1-check").locator(".stderr")).toContainText("Setup failed in ch-1");
});

test("async batch starts every worker before waiting", async ({page}) => {
  await page.goto("/lesson/advanced/notebooks/05_asyncio_event_loop");
  const original = await starter(page,"ex-5");
  await runCell(page,"ex-5","passed",original.replace("raise NotImplementedError","return await asyncio.gather(*(worker(x) for x in values))"));
  await runCell(page,"ex-5","failed",original.replace("raise NotImplementedError","return [await worker(x) for x in values]"));
});

test("Advanced settings and durable idempotency are independently checked", async ({page}) => {
  await page.goto("/lesson/advanced/notebooks/18_production_quality_ci_deployment");
  const original = await starter(page,"ex-6");
  await runCell(page,"ex-6","passed",original.replace("raise NotImplementedError", 'count = int(settings.get("APP_WORKERS", 4))\n    if count <= 0:\n        raise ValueError(count)\n    return count'));
  const definition = `class IdempotencyStore:
    def __init__(self, conn: sqlite3.Connection):
        self.db = conn
        self.db.execute("CREATE TABLE IF NOT EXISTS receipts(k TEXT PRIMARY KEY, value TEXT)")
    def execute(self, key: str, action: Callable[[], object]):
        found = self.db.execute("SELECT value FROM receipts WHERE k=?", (key,)).fetchone()
        if found:
            return json.loads(found[0])
        value = action()
        with self.db:
            self.db.execute("INSERT INTO receipts VALUES(?,?)", (key,json.dumps(value)))
        return value`;
  await specimen(page,"ch-1").getByRole("textbox").fill(definition);
  await runCell(page,"ch-1-check","passed");
  await specimen(page,"ch-1").getByRole("textbox").fill("# missing definition");
  await expect(specimen(page,"ch-1-check")).toHaveAttribute("data-validation","stale");
  await runCell(page,"ch-1-check","failed");
  await specimen(page,"build-work").getByRole("textbox").fill("# no migration submitted");
  await runCell(page,"build-check","failed");
});

for (const [lesson, names] of [
  ["basics/notebooks/13_file_handling", "Path, csv, tempfile"],
  ["intermediate/notebooks/06_generators_and_lazy_pipelines","Iterable, Iterator"],
]) test("fresh-session setup in " + lesson, async ({page}) => {
  await page.goto("/lesson/" + lesson);
  const original = await starter(page,"ch-1");
  await runCell(page,"ch-1","ran",original + "\nprint(tuple(x.__name__ for x in (" + names + ")))");
});

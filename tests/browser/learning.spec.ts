import { test, expect, type Page } from "@playwright/test";
const intro = "basics/notebooks/00_python_introduction";
async function cell(page: Page, needle: string) {
  const edit = page.locator(".code-cell textarea");
  await edit.first().waitFor();
  const i = await edit.evaluateAll(
    (nodes, text) =>
      nodes.findIndex((node) =>
        (node as HTMLTextAreaElement).value.includes(text),
      ),
    needle,
  );
  expect(i).toBeGreaterThanOrEqual(0);
  return page.locator(".code-cell").nth(i);
}
test("dashboard, filters, mobile theme, data migration and achievement gating", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Start learning" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Switch to/ }).click();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme!);
  expect(
    await page.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole("link", { name: "Curriculum", exact: true }).click();
  await page.getByLabel("Search notebooks").fill("00_python_introduction");
  await expect(page.getByRole("status")).toContainText("1 matching");
  await page.getByLabel("Search notebooks").fill("");
  await page
    .getByRole("combobox", { name: /^Content/ })
    .selectOption("projects");
  await expect(page.locator("summary").first()).toContainText("Projects");
  await page.goto("/progress");
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
  await expect(
    page.getByRole("link", { name: "Continue learning" }),
  ).toHaveAttribute("href", new RegExp(intro));
  await page.goto("/achievements");
  await expect(page.getByText(/Finish every workbook/).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create your claim file" }),
  ).toHaveCount(0);
  await page.goto("/progress");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset progress" }).click();
  await expect(page.getByRole("status")).toHaveText("Progress reset.");
});
test("real Python exercise, saved edits, stop and restart", async ({
  page,
}) => {
  await page.goto("/lesson/" + intro);
  const setup = await cell(page, "Exercises(");
  await setup.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Python ready", {
    timeout: 120000,
  });
  const ex = await cell(page, "check(2,");
  const editor = ex.getByRole("textbox");
  await editor.fill("check(2, 10080)");
  await editor.press("Shift+Enter");
  await expect(ex.locator(".output")).toContainText("✅ Exercise 2: correct");
  await page.reload();
  await expect(
    (await cell(page, "check(2, 10080)")).getByRole("textbox"),
  ).toHaveValue("check(2, 10080)");
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
  await page.goto("/lesson/basics/exercises/02_control_flow_exercises");
  const setup = await cell(page, "from check import Checker");
  await setup.getByRole("button", { name: "Run", exact: true }).click();
  await expect(setup).not.toHaveClass(/busy/, { timeout: 180000 });
  await expect(setup.locator(".output")).not.toContainText("Error");
  const fn = await cell(page, "def classify_temperature");
  await fn
    .getByRole("textbox")
    .fill(
      'def classify_temperature(celsius):\n    return "freezing" if celsius <= 0 else "cold" if celsius < 15 else "comfortable" if celsius < 25 else "hot"',
    );
  await fn.getByRole("textbox").press("Shift+Enter");
  const check = await cell(page, "check('classify_temperature')");
  await check.getByRole("button", { name: "Run", exact: true }).click();
  await expect(check.locator(".output")).toContainText(
    "✅ classify_temperature",
    { timeout: 90000 },
  );
});

test("Python syntax colors follow edits and theme while preserving literal code", async ({
  page,
}) => {
  await page.goto("/lesson/" + intro);
  const editor = page.getByRole("textbox", { name: "Python code" }).first();
  const code = 'def greet():\n    # example\n    return "<tag>" * 2';
  await editor.fill(code);
  const layer = page.locator(".syntax-layer").first();
  await expect(layer.locator(".token.function")).toHaveText("greet");
  await expect(layer.locator(".token.string")).toHaveText('"<tag>"');
  await expect(layer.locator(".token.comment")).toHaveText("# example");
  await expect(layer.locator(".token.number")).toHaveText("2");
  const colors = () =>
    layer
      .locator(".token.keyword, .token.string, .token.number, .token.comment")
      .evaluateAll((nodes) => [
        ...new Set(nodes.map((n) => getComputedStyle(n).color)),
      ]);
  const before = await colors();
  expect(before).toHaveLength(4);
  await page.getByRole("button", { name: /Switch to/ }).click();
  await expect.poll(colors).not.toEqual(before);
  expect(await colors()).toHaveLength(4);
  await expect(editor).toHaveValue(code);
  await expect(layer.locator("tag")).toHaveCount(0);
});

test("playground runs independent scratch code and restores edits", async ({
  page,
}) => {
  await page.goto("/curriculum");
  await page.getByRole("button", { name: /Intermediate/ }).click();
  await expect(
    page.getByRole("heading", { name: "Intermediate", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Python playground" }).click();
  const editor = page.getByRole("textbox", { name: "Python code" });
  await editor.fill("print(21 * 2)");
  await editor.press("Shift+Enter");
  await expect(page.locator(".console-pane .output")).toHaveText("42", {
    timeout: 120000,
  });
  await page.reload();
  await expect(editor).toHaveValue("print(21 * 2)");
  await page.setViewportSize({ width: 390, height: 820 });
  await expect(page.getByRole("heading", { name: "Console" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

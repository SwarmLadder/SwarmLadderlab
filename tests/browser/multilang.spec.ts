import { test, expect } from "@playwright/test";

test("Rust lessons have CodeMirror syntax colors and can transfer a draft to the playground", async ({ page }) => {
  await page.goto("/lesson/rust/basics/mastery/B01");
  const editor = page.getByRole("textbox", { name: "Rust code draft" });
  await expect(editor).toContainText("pub fn parse_port");
  await expect(editor.locator(".tok-keyword").first()).toBeVisible();
  await expect(editor.locator(".tok-typeName").first()).toBeVisible();
  await editor.fill('pub fn demo() { println!("Hello rust"); }');
  await page.getByRole("button", { name: "Try in Playground" }).click();
  await expect(page).toHaveURL(/\/playground\?language=rust/);
  await expect(page.getByLabel("Playground language")).toHaveValue("rust");
  await expect(page.getByRole("textbox", { name: "Rust code" })).toContainText("Hello rust");
  await expect(page.locator(".ide-editor .tok-keyword").first()).toBeVisible();
});

test("Git lesson commands are highlighted, and Git practice commands actually change simulated state", async ({ page }) => {
  await page.goto("/lesson/git/basics/labs/B01");
  const editor = page.getByRole("textbox", { name: "Git command notes" });
  await expect(editor).toContainText("python tools/practice.py");
  await expect(editor.locator(".tok-definition").first()).toBeVisible();
  await page.goto("/playground?language=git");
  await expect(page.getByLabel("Playground language")).toHaveValue("git");
  const scratch = page.getByRole("textbox", { name: "Git commands" });
  await scratch.fill('write README.md "Practical Git"\ngit add README.md\ngit commit -m "Learn staging"\ngit log --oneline');
  await page.getByRole("button", { name: "Run Git" }).click();
  await expect(page.locator(".console-pane .output")).toContainText("Learn staging");
  await expect(page.locator(".run-meta")).toContainText("Finished");
  await scratch.fill("git status");
  await scratch.press("Shift+Enter");
  await expect(page.locator(".console-pane .output")).toContainText("working tree clean");
  await expect(scratch.locator(".tok-definition").first()).toBeVisible();
});

test("Playground switches between Python, SQL, Rust and Git with independent saved files", async ({ page }) => {
  await page.goto("/playground");
  const choice = page.getByLabel("Playground language");
  await expect(choice).toHaveValue("python");
  const py = page.getByRole("textbox", { name: "Python code" });
  await py.fill('print("Python retained")');
  await choice.selectOption("sql");
  await expect(page.getByRole("textbox", { name: "SQL code" })).toContainText("SELECT");
  await expect(page.locator(".runtime").first()).toContainText("SQLite ready", { timeout: 120000 });
  const sql = page.getByRole("textbox", { name: "SQL code" });
  await sql.fill("SELECT 42 AS answer;");
  await page.getByRole("button", { name: "Run SQL" }).click();
  await expect(page.locator(".console-pane .output")).toContainText("answer", { timeout: 120000 });
  await expect(page.locator(".console-pane .output")).toContainText("42");
  await choice.selectOption("rust");
  await expect(page.getByRole("textbox", { name: "Rust code" })).toContainText("fn main");
  await choice.selectOption("git");
  await expect(page.getByRole("textbox", { name: "Git commands" })).toContainText("git status");
  await choice.selectOption("sql");
  await expect(sql).toContainText("SELECT 42 AS answer;");
  await choice.selectOption("python");
  await expect(py).toContainText('print("Python retained")');
  await page.reload();
  await expect(choice).toHaveValue("python");
  await expect(py).toContainText('print("Python retained")');
});

test("Rust Run sends code only on click and displays real compiler response", async ({ page }) => {
  let requests = 0;
  await page.route("https://play.rust-lang.org/execute", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      } });
      return;
    }
    requests++;
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({ channel: "stable", mode: "debug", edition: "2021",
      crateType: "bin", tests: false, code: 'fn main() { println!("Real Rust"); }' });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, stdout: "Real Rust\n", stderr: "", exitDetail: "exit code: 0" }),
      headers: { "access-control-allow-origin": "*" },
    });
  });
  await page.goto("/playground?language=rust");
  await expect(page.getByLabel("Playground language")).toHaveValue("rust");
  await expect(page.getByRole("note")).toContainText("Clicking Run Rust sends");
  const editor = page.getByRole("textbox", { name: "Rust code" });
  await editor.fill('fn main() { println!("Real Rust"); }');
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "Run Rust" }).click();
  await expect(page.locator(".console-pane .output")).toContainText("Real Rust", { timeout: 20000 });
  await expect(page.locator(".run-meta")).toContainText("Finished");
  expect(requests).toBe(1);
  await expect(editor.locator(".tok-keyword").first()).toBeVisible();
  await expect(editor.locator(".tok-string").first()).toBeVisible();
});

test("Rust compiler errors are shown on the correct CodeMirror line", async ({ page }) => {
  await page.route("https://play.rust-lang.org/execute", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      } });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        success: false,
        stdout: "",
        stderr: "error[E0425]: cannot find value\n --> src/main.rs:2:5\n",
        exitDetail: "compiler error",
      }),
    });
  });
  await page.goto("/playground?language=rust");
  await page.getByRole("textbox", { name: "Rust code" }).fill("fn main() {\n    missing();\n}");
  await page.getByRole("button", { name: "Run Rust" }).click();
  await expect(page.locator(".console-pane .output")).toContainText("error[E0425]");
  await expect(page.locator(".run-meta")).toContainText("Error");
  await expect(page.locator(".cm-lintRange-error")).toHaveCount(1, { timeout: 20000 });
});

test("Mobile language switch keeps the playground usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto("/playground?language=git");
  await expect(page.getByLabel("Playground language")).toHaveValue("git");
  await expect(page.getByRole("heading", { name: "Console" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

import { test, expect } from "@playwright/test";

test("Git & GitHub is on the shelf and its local lab progress is explicit", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /Git & GitHub, Open now/ })).toBeVisible();

  await page.goto("/learn/git");
  await expect(page.getByRole("heading", { name: "Git & GitHub", exact: true })).toBeVisible();
  await expect(page.getByText(/24 checks/).first()).toBeVisible();

  await page.goto("/lesson/git/basics/labs/B01");
  await expect(page.getByRole("heading", { name: /B01.*Create your first commit/i })).toBeVisible();
  await expect(page.getByText("python tools/practice.py check B01").first()).toBeVisible();
  await expect(page.getByText(/does not execute Git commands or compile Rust/)).toBeVisible();

  const complete = page.getByRole("button", { name: /Mark verified locally/ });
  await expect(complete).toBeDisabled();
  await page.getByRole("checkbox", { name: /I ran the verification command locally/ }).check();
  await expect(complete).toBeEnabled();
  await complete.click();
  await expect(page.getByText("✓ Completed")).toBeVisible();

  await page.reload();
  await expect(page.getByText("✓ Completed")).toBeVisible();
});

test("Git course serves the 45 interview answers as explorable content", async ({ page }) => {
  await page.goto("/lesson/git/basics/interview/01");
  await expect(page.getByRole("heading", { name: /Interview 01/ })).toBeVisible();
  const explanation = page.locator("details").filter({ hasText: "Reveal explained answer" });
  await expect(explanation).toBeVisible();
  await explanation.locator("summary").click();
  await expect(explanation).toContainText(/commit|tree|snapshot/i);
});

test("Rust code editing and external Cargo verification persist without fake runtime", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /Rust, Open now/ })).toBeVisible();
  await page.goto("/learn/rust");
  await expect(page.getByRole("heading", { name: "Rust", exact: true })).toBeVisible();
  await expect(page.getByText(/176 checks/).first()).toBeVisible();

  await page.goto("/lesson/rust/basics/mastery/B01");
  await expect(page.getByRole("heading", { name: /B01.*Parse Port/ })).toBeVisible();
  await expect(page.getByText("cargo test --test mastery b01_")).toBeVisible();
  const draft = page.getByRole("textbox", { name: "Rust code draft" });
  await expect(draft).toHaveValue(/pub fn parse_port/);
  await draft.fill("pub fn parse_port(input: &str) -> Result<u16, PortError> {\n    todo!()\n}");
  await page.reload();
  await expect(draft).toHaveValue(/pub fn parse_port/);
  await expect(page.getByText(/The Lab does not execute Git commands or compile Rust/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Mark verified locally/ })).toBeDisabled();

  await page.getByRole("checkbox", { name: /I ran the verification command locally/ }).check();
  await page.getByRole("button", { name: /Mark verified locally/ }).click();
  await expect(page.getByText("✓ Completed")).toBeVisible();
});

test("Rust guides are readable and completion is tracked separately from checked code", async ({ page }) => {
  await page.goto("/lesson/rust/basics/guides/workshop-1");
  await expect(page.getByRole("heading", { name: /Reading sensor values/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mark activity complete/ })).toBeVisible();
  await page.getByRole("button", { name: /Mark activity complete/ }).click();
  await expect(page.getByText("✓ Completed")).toBeVisible();

  await page.goto("/progress");
  await expect(page.getByText("Git & GitHub · Basics")).toBeVisible();
  await expect(page.getByText("Rust · Basics")).toBeVisible();
  await expect(page.getByText("SQL · Basics")).toBeVisible();
  await expect(page.getByText("Python · Basics")).toBeVisible();
});

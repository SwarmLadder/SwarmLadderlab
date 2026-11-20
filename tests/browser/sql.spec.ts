import { test, expect } from "@playwright/test";

test("SQL shelf, interactive SQLite lesson, two-dataset grading and progress", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /SQL, Open now/ })).toBeVisible();
  await page.goto("/learn/sql");
  await expect(page.getByRole("heading", { name: "SQL", exact: true })).toBeVisible();
  await expect(page.getByText(/52 checks/).first()).toBeVisible();

  await page.goto("/lesson/sql/basics/lessons/00_select");
  await expect(page.getByRole("heading", { name: /SELECT and columns/ })).toBeVisible();
  await expect(page.locator(".runtime")).toContainText("SQLite ready", { timeout: 120000 });
  await page.getByRole("button", { name: "Run SQL" }).click();
  await expect(page.getByLabel("SQL output")).toContainText("Statement 1", { timeout: 30000 });
  await expect(page.getByLabel("SQL output")).toContainText("customer_id");

  await page.goto("/lesson/sql/basics/interview/B01");
  const editor = page.getByRole("textbox", { name: "SQL code" });
  await editor.fill("SELECT sku, product_name FROM products WHERE active = 1 ORDER BY sku;");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByLabel("SQL output")).toContainText(
    "✅ SQL challenge B01: passed both datasets", { timeout: 120000 },
  );
  await page.reload();
  await expect(editor).toHaveText("SELECT sku, product_name FROM products WHERE active = 1 ORDER BY sku;");
  await expect(page.getByText("✓ Completed")).toBeVisible();
});

test("PostgreSQL labs are read-only reference examples, never run in SQLite", async ({ page }) => {
  await page.goto("/lesson/sql/advanced/postgresql/01_jsonb");
  await expect(page.getByRole("heading", { name: /PostgreSQL/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Run SQL" })).toHaveCount(0);
  await expect(page.getByText(/not runnable with the Lab/)).toBeVisible();
});


test("schema-design challenges validate real SQLite constraints", async ({ page }) => {
  await page.goto("/lesson/sql/advanced/schema/C01");
  const editor = page.getByRole("textbox", { name: "SQL code" });
  await editor.fill(
    "CREATE TABLE accounts (account_id INTEGER PRIMARY KEY, " +
    "email TEXT NOT NULL UNIQUE, balance_cents INTEGER NOT NULL CHECK(balance_cents >= 0));",
  );
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByLabel("SQL output")).toContainText(
    "✅ SQL challenge C01: passed schema tests", { timeout: 120000 },
  );
});

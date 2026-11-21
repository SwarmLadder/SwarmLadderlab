import { test, expect } from "@playwright/test";

test("multi-course directory offers searchable, honest and navigable courses", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: /Choose what you'll build next/i })).toBeVisible();
  await expect(page.locator(".library-card")).toHaveCount(7);
  await expect(page.getByRole("status")).toContainText("7 courses found");
  await page.getByRole("button", { name: "Available now" }).click();
  await expect(page.locator(".library-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Coming soon" }).click();
  await expect(page.locator(".library-card")).toHaveCount(2);
  await page.getByRole("button", { name: "All courses" }).click();
  await page.getByRole("searchbox", { name: "Search courses" }).fill("SQLite");
  await expect(page.locator(".library-card")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("1 course found");
  await page.getByRole("searchbox", { name: "Search courses" }).fill("not-a-real-course");
  await expect(page.getByText("No matching courses")).toBeVisible();
  await page.getByRole("button", { name: "Show all courses" }).click();
  await page.locator(".library-card").filter({ has: page.getByRole("heading", { name: "SQL", exact: true }) })
    .getByRole("link", { name: "SQL, Open now" }).click();
  await expect(page).toHaveURL(/\/learn\/sql$/);
  await expect(page.getByRole("heading", { name: "SQL", exact: true })).toBeVisible();
});

test("SQL progress resumes SQL only, and mobile directory fits", async ({ page }) => {
  await page.goto("/learn");
  await page.evaluate(() => localStorage.setItem("swarmladderlab.v1", JSON.stringify({
    last: "sql/basics/lessons/00_select",
    finished: { "sql/basics/lessons/00_select": Date.now() },
  })));
  await page.reload();
  const sql = page.locator(".library-card").filter({ has: page.getByRole("heading", { name: "SQL", exact: true }) });
  await expect(sql.getByText("1 of 105 completed")).toBeVisible();
  await expect(sql.getByRole("link", { name: "SQL, Continue learning" }))
    .toHaveAttribute("href", "/lesson/sql/basics/lessons/00_select");
  const python = page.locator(".library-card").filter({ has: page.getByRole("heading", { name: "Python", exact: true }) });
  await expect(python.getByRole("link", { name: "Python, Open now" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 820 });
  await expect(page.getByRole("searchbox", { name: "Search courses" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

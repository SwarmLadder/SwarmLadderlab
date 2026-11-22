import { test, expect } from "@playwright/test";

test("multi-course directory offers searchable, honest and navigable courses", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: /Choose what you'll build next/i })).toBeVisible();
  // Eight open courses are listed; the one in preparation is named separately, never as a course card.
  await expect(page.locator(".library-card")).toHaveCount(8);
  await expect(page.getByRole("status")).toContainText("8 courses found");
  await expect(page.getByRole("region", { name: "In preparation" })).toContainText("JavaScript");
  for (const [school, count] of [["Software", 4], ["Systems", 3], ["Data", 1]] as const) {
    const button = page.getByRole("button", { name: school, exact: true });
    // Retry until the page is interactive: a click before hydration does nothing.
    await expect(async () => {
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
    }).toPass();
    await expect(page.locator(".library-card")).toHaveCount(count);
  }
  await page.getByRole("button", { name: "All schools" }).click();
  // Every available course shows its technology mark.
  await expect(page.locator(".library-card .tech-logo")).toHaveCount(8);
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

import { test, expect, type Page } from "@playwright/test";

type Catalog = { levels: { sections: { items: { id: string; graded: number }[] }[] }[] };
const items = (c: Catalog) => c.levels.flatMap((l) => l.sections.flatMap((s) => s.items));
const catalogUrl = (id: string) => id === "python" ? "/data/catalog.json" : `/data/${id}/catalog.json`;
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test("primary navigation reaches every campus stage, by keyboard too", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const [name, path, heading] of [
    ["Schools", "/schools", /Choose a discipline/],
    ["Studio", "/studio", /Own a project/],
    ["Community", "/community", /Learn in the open/],
  ] as const) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(path + "$"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
  }
  // From a fresh load, the first Tab reaches the skip link, and Enter opens a nav link.
  await page.goto("/community");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await nav.getByRole("link", { name: "Studio", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/studio$/);
});

test("schools show catalog-backed counts, real courses and a next step", async ({ page, request }) => {
  await page.goto("/schools");
  const expected = { software: ["python", "dsa", "java", "git"], systems: ["c", "rust", "linux"], data: ["sql"] };
  for (const [school, ids] of Object.entries(expected)) {
    const all = (await Promise.all(ids.map(async (id) => items(await (await request.get(catalogUrl(id))).json()))));
    const activities = all.reduce((n, list) => n + list.length, 0);
    const checks = all.reduce((n, list) => n + list.reduce((m, i) => m + i.graded, 0), 0);
    const facts = page.getByTestId("school-facts-" + school);
    await expect(facts).toContainText(`${ids.length} course`);
    await expect(facts).toContainText(`${activities} activities`);
    await expect(facts).toContainText(`${checks} graded checks`);
  }
  // Every school link (courses, lessons, projects) opens a working page.
  const links = await page.locator(".school a").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
  expect(links.length).toBeGreaterThan(10);
  for (const href of links) expect((await request.get(href)).status(), href).toBe(200);
  await expect(page.locator("#software").getByRole("link", { name: /Start Python/ })).toHaveAttribute("href", "/learn/python");
  await expect(page.getByText(/not an accredited institution/)).toBeVisible();
});

test("studio lists every real project with honest assessment and no fake completion", async ({ page, request }) => {
  const studio: { id: string; automaticCheck: boolean; acceptance: string[] }[] = await (await request.get("/data/studio.json")).json();
  const projects = items(await (await request.get("/data/catalog.json")).json()).filter((i) => i.id.includes("/projects/"));
  expect(studio.map((p) => p.id).sort()).toEqual(projects.map((p) => p.id).sort());
  await page.goto("/studio");
  await expect(page.locator(".studio-row")).toHaveCount(studio.length);
  for (const p of studio) {
    const row = page.locator(`[data-project="${p.id}"]`);
    await expect(row.locator(".studio-assess")).toHaveText(p.automaticCheck ? "Automatic ticket check" : "Review required");
    const brief = await row.getByRole("link", { name: /^Open brief/ }).getAttribute("href");
    expect((await request.get(brief!)).status(), brief!).toBe(200);
  }
  // A project brief is a ticket: every acceptance criterion, an honest evaluation label, a working Lab link.
  const sample = studio.find((p) => !p.automaticCheck)!;
  await page.locator(`[data-project="${sample.id}"]`).getByRole("link", { name: /^Open brief/ }).click();
  await expect(page.locator(".ticket-checklist li")).toHaveCount(sample.acceptance.length);
  await expect(page.locator(".ticket-side .studio-assess")).toHaveText("Review required");
  await expect(page.getByText("never records this project as complete")).toBeVisible();
  expect((await request.get(await page.getByRole("link", { name: /Open in the Lab/ }).getAttribute("href") ?? "")).status()).toBe(200);
  await page.goto("/studio");
  await expect(page.locator(".research-list li")).toHaveCount(3);
  await expect(page.getByText(/not published studies/)).toBeVisible();
  await page.locator(".research-list a").first().click();
  await expect(page.getByText("Open experiment · not a published study")).toBeVisible();
  // Scrolling to the end finishes a reading page (control) but never a project.
  const finished = () => page.evaluate(() => JSON.parse(localStorage.getItem("swarmladderlab.v1") || "{}").finished ?? {});
  const readToEnd = async (id: string) => {
    await page.goto("/lesson/" + id);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(250);
    }
  };
  await page.evaluate(() => localStorage.setItem("swarmladderlab.view", "all"));
  await readToEnd("basics/worked_examples/01_worked_examples");
  await expect.poll(async () => Boolean((await finished())["basics/worked_examples/01_worked_examples"])).toBe(true);
  await readToEnd("advanced/projects/03_transactional_event_processor");
  expect((await finished())["advanced/projects/03_transactional_event_processor"]).toBeUndefined();
});

test("community links only to real GitHub pathways and states what is not offered", async ({ page }) => {
  await page.goto("/community");
  const hrefs = await page.locator(".community a[href^='http']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  expect(hrefs.length).toBeGreaterThan(6);
  for (const href of hrefs) expect(href).toMatch(/^https:\/\/(github\.com\/SwarmLadder\/(python-notebook|SwarmLadderlab)\/|docs\.github\.com\/)/);
  await expect(page.getByRole("heading", { name: "Peer code review" })).toBeVisible();
  await expect(page.getByText(/Not available yet: mentoring/)).toBeVisible();
  for (const action of ["Ask for help", "Contribute to a project", "Review someone's code"]) await expect(page.getByRole("heading", { name: action })).toBeVisible();
});

test("campus pages fit a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 820 });
  for (const path of ["/schools", "/studio", "/community"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await noSideScroll(page), path).toBeTruthy();
  }
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(async () => {
    if ((await menu.getAttribute("aria-expanded")) !== "true") await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass();
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Studio" })).toBeVisible();
});

test("a check names the saved cells it runs with", async ({ page }) => {
  await page.goto("/lesson/intermediate/notebooks/09_functional_tools_and_itertools");
  const note = page.locator('[data-cell-id="ch-3-check"] .nb-requires');
  await expect(note).toHaveText("Runs your saved code from power, make_square");
  await expect(note.getByRole("link", { name: "power" })).toHaveAttribute("href", "#cell-ch-2");
});

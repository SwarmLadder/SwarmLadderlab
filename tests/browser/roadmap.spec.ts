import { test, expect } from "@playwright/test";

const stage = (page: import("@playwright/test").Page, id: string) => page.locator(`.rm-stage[data-stage="${id}"]`);

test("Python roadmap: stages, dependencies, keyboard and accurate progress", async ({ page }) => {
  await page.goto("/learn/python/roadmap");
  await expect(page.getByRole("heading", { level: 1, name: "Python" })).toBeVisible();
  await expect(page.locator(".rm-stage")).toHaveCount(16);
  // A new learner starts at Fundamentals, which is available; later stages are not started.
  await expect(stage(page, "fundamentals")).toHaveClass(/available/);
  await expect(stage(page, "concurrency")).toHaveClass(/not-started/);
  await expect(page.getByRole("link", { name: /Start: Welcome to Python/ })).toBeVisible();

  // Clicking a node reveals its lessons, skills, checks and what it builds on.
  await expect(async () => {
    await stage(page, "collections").click();
    await expect(page.locator("#rm-panel-title")).toHaveText("Collections", { timeout: 1000 });
  }).toPass();
  await expect(page.locator(".rm-item")).toHaveCount(3);
  await expect(page.locator(".rm-builds")).toContainText("Builds on");
  await page.locator(".rm-builds button").first().click();
  await expect(page.locator("#rm-panel-title")).not.toHaveText("Collections");

  // Arrow keys move between stages.
  await stage(page, "fundamentals").click();
  await stage(page, "fundamentals").focus();
  await page.keyboard.press("ArrowDown");
  await expect(stage(page, "control-flow")).toBeFocused();
  await expect(page.locator("#rm-panel-title")).toHaveText("Control flow");
  await page.keyboard.press("End");
  await expect(page.locator("#rm-panel-title")).toHaveText("Production engineering");
  // The level's worked example and projects close its last stage; projects open their Studio brief.
  await expect(page.locator(".rm-group.kind-project a.rm-item-title")).toHaveCount(3);
  await expect(page.locator(".rm-group.kind-project a.rm-item-title").first()).toHaveAttribute("href", /^\/studio\//);

  // Opening a lesson is not completion: it is "in progress"; stale evidence asks for a re-check.
  await page.evaluate(() => localStorage.setItem("swarmladderlab.v1", JSON.stringify({
    version: 2, last: "basics/notebooks/05_conditional_statements",
    current: { "basics/notebooks/06_loops#ex1": { status: "stale", cells: ["ex-1"], revision: "old" } },
  })));
  await page.reload();
  await expect(stage(page, "control-flow")).toHaveClass(/stale/);
  await stage(page, "control-flow").click();
  await expect(page.locator(".rm-item").nth(0)).toHaveClass(/progress/);
  await expect(page.locator(".rm-item").nth(1)).toHaveClass(/stale/);
  await expect(page.locator(".rm-stage.completed")).toHaveCount(0);
});

test("roadmaps exist for every course and work on a phone", async ({ page }) => {
  for (const id of ["sql", "git", "rust", "linux", "c", "java"]) {
    await page.goto(`/learn/${id}/roadmap`);
    await expect(page.getByText("suggested order from the course outline")).toBeVisible();
    await expect(page.locator(".rm-stage").first()).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto("/learn/python/roadmap");
  await expect(page.locator(".rm-panel")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("the DSA roadmap shows checked dependencies and why each is needed", async ({ page }) => {
  await page.goto("/learn/dsa/roadmap");
  await expect(page.getByText("dependencies from the DSA concept map, each with its reason")).toBeVisible();
  await expect(page.locator(".rm-stage")).toHaveCount(14);
  await page.locator(".rm-stage", { hasText: "Graphs" }).click();
  const why = page.getByRole("list", { name: /Why Weighted paths, disjoint sets and minimum networks/ });
  await expect(why).toContainText("Dijkstra needs a priority queue");
  await expect(why.getByRole("link", { name: /Heaps/ })).toHaveAttribute("href", /\/lesson\/dsa\/intermediate\/lessons\/08_heaps/);
  await expect(page.locator(".rm-builds")).toContainText("Priority and greed");
});

test("every course page is its roadmap, with every activity reachable", async ({ page, request }) => {
  for (const id of ["python", "sql", "git", "rust", "linux", "dsa", "c", "java"]) {
    await page.goto(`/learn/${id}`);
    await expect(page.locator(".rm-stage").first()).toBeVisible();
    await expect(page.locator(".rm-head .button.primary")).toBeVisible();
    // The old ladder page is gone.
    await expect(page.locator(".rung-link")).toHaveCount(0);
    const catalog = await (await request.get(id === "python" ? "/data/catalog.json" : `/data/${id}/catalog.json`)).json();
    const total = catalog.levels.reduce((n: number, l: { sections: { items: unknown[] }[] }) => n + l.sections.reduce((m, s) => m + s.items.length, 0), 0);
    await expect(page.locator(".rm-facts-line")).toContainText(`${total} activities`);
  }
  // DSA: a lesson's interview problems sit with it in its stage.
  await page.goto("/learn/dsa");
  await page.locator(".rm-stage", { hasText: "Ordered state" }).click();
  await expect(page.locator(".rm-group.kind-practice")).toContainText("B04");
});

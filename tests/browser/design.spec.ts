import { test, expect, type Page } from "@playwright/test";

// Relative luminance and contrast from computed CSS colours (WCAG formula).
const luminance = (rgb: string) => {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const style = (page: Page, selector: string, prop: string) =>
  page.locator(selector).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
const useTheme = (page: Page, theme: "light" | "dark") =>
  page.addInitScript((t) => localStorage.setItem("swarmladderlab.theme", t), theme);

for (const theme of ["light", "dark"] as const) {
  test(`playground follows the ${theme} theme with readable code`, async ({ page }) => {
    await useTheme(page, theme);
    await page.goto("/playground");
    const editor = page.locator(".ide-editor .cm-content");
    await editor.fill('for word in ["a", "b"]:\n    print(word)');
    await expect(page.locator(".ide-editor .tok-keyword").first()).toBeVisible();
    await expect(page.locator(".ide-editor .tok-string").first()).toBeVisible();
    const editorBg = await style(page, ".ide-editor .cm-editor", "background-color");
    const consoleBg = await style(page, ".console-pane", "background-color");
    const barBg = await style(page, ".ide-bar", "background-color");
    for (const bg of [editorBg, consoleBg, barBg]) {
      if (theme === "light") expect(luminance(bg), bg).toBeGreaterThan(0.75);
      else expect(luminance(bg), bg).toBeLessThan(0.05);
    }
    // Syntax colours and console text keep WCAG AA contrast on their panels.
    for (const token of [".tok-keyword", ".tok-string"]) {
      expect(contrast(await style(page, ".ide-editor " + token, "color"), editorBg), token).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(await style(page, ".console-pane .output", "color"), consoleBg)).toBeGreaterThanOrEqual(7);
    // Python runs in the browser: no implementation banner, just the mode label.
    await expect(page.locator(".ide-mode")).toHaveText("In browser");
    await expect(page.getByRole("note")).toHaveCount(0);
  });
}

test("the chosen theme persists across pages and reloads", async ({ page }) => {
  await page.goto("/learn");
  await page.evaluate(() => localStorage.setItem("swarmladderlab.theme", "light"));
  await page.reload();
  await expect(async () => {
    await page.getByRole("button", { name: /Switch to night/ }).click({ timeout: 1000 });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", { timeout: 1000 });
  }).toPass();
  await page.goto("/playground");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/studio");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("no page scrolls sideways at phone, tablet and laptop widths", async ({ page }) => {
  const paths = ["/", "/learn", "/learn/python", "/learn/python/roadmap", "/schools", "/studio", "/studio/transactional-event-processor",
    "/community", "/playground", "/progress", "/achievements", "/lesson/basics/notebooks/05_conditional_statements",
    "/lesson/dsa/advanced/lessons/09_fenwick_segment_trees_and_range_queries"];
  for (const width of [320, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeAttached();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});

test("course rungs give unnumbered titles the full row (DSA lessons)", async ({ page }) => {
  await page.goto("/learn/dsa");
  const name = page.locator(".rung-name").first();
  await expect(name).toContainText("Hash maps");
  // One line of text, not one word per line in the number column.
  const box = await name.boundingBox();
  expect(box!.width).toBeGreaterThan(250);
  expect(box!.height).toBeLessThan(60);
});

test("the header collapses into a menu below laptop width and keeps the theme toggle visible", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto("/schools");
  await expect(page.getByRole("button", { name: /Switch to/ })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
});

test("motion respects the reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/python/roadmap");
  const transition = await style(page, ".rm-stage", "transition-duration");
  expect(transition.split(",").every((d) => parseFloat(d) === 0)).toBeTruthy();
});

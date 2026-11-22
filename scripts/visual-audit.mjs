// Visual audit: node scripts/visual-audit.mjs <base-url> <out-dir> <prefix>
// Captures every route at desktop, tablet and phone widths in both themes and reports
// horizontal overflow. Set CHROMIUM_PATH to use a preinstalled browser.
import { chromium } from "playwright";
const [base, out, phase] = process.argv.slice(2);
const routes = [
  ["home", "/"], ["learn", "/learn"], ["roadmap-python", "/learn/python/roadmap"], ["studio-ticket", "/studio/transactional-event-processor"], ["course-python", "/learn/python"], ["course-sql", "/learn/sql"],
  ["schools", "/schools"], ["studio", "/studio"], ["community", "/community"], ["playground", "/playground"],
  ["lesson-python", "/lesson/basics/notebooks/05_conditional_statements"], ["lesson-sql", "/lesson/sql/basics/lessons/00_select"],
  ["lesson-dsa", "/lesson/dsa/basics/problems/B01"], ["lesson-c", "/lesson/c/basics/drills/whole_minutes"],
  ["lesson-rust", "/lesson/rust/basics/guides/workshop-1"], ["lesson-java", "/lesson/java/basics/drills/two-sum"],
  ["lesson-git", "/lesson/git/basics/lessons/00_git_model_and_setup"], ["lesson-linux", "/lesson/linux/basics/lessons/00_shell_and_linux"],
  ["progress", "/progress"], ["achievements", "/achievements"], ["notfound", "/no-such-page"],
];
const widths = { desktop: 1440, tablet: 768, mobile: 390 };
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const theme of ["light", "dark"]) for (const [wname, w] of Object.entries(widths)) {
  if (wname === "tablet" && theme === "dark") continue;
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme });
  await ctx.addInitScript((t) => localStorage.setItem("swarmladderlab.theme", t), theme);
  const page = await ctx.newPage();
  for (const [name, path] of routes) {
    if (wname !== "desktop" && name.startsWith("lesson-") && !["lesson-python", "lesson-sql"].includes(name)) continue;
    try {
      await page.goto(base + path, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/${phase}-${name}-${wname}-${theme}.png`, fullPage: wname !== "desktop" || ["home","learn","schools","studio","community"].includes(name) });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (overflow > 0) console.log("OVERFLOW", name, wname, theme, overflow);
    } catch (e) { console.log("FAIL", name, wname, theme, String(e).slice(0, 80)); }
  }
  await ctx.close();
}
await b.close();

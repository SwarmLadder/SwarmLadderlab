// End-to-end test of the built site in headless Chromium (needs network for the Pyodide CDN).
//   python build/build_site.py --course ../python-notebook --out dist
//   node tests/e2e.cjs            (serves dist/ on a free port)
//   BASE_URL=https://swarmladder.github.io/SwarmLadderlab/ node tests/e2e.cjs   (test the live site)
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.resolve(__dirname, "..", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".py": "text/plain" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(DIST, url === "/" ? "index.html" : url);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

let failures = 0;
function expect(label, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${condition ? "" : "  -> " + detail}`);
  if (!condition) failures++;
}

async function setCode(page, cellIndex, code) {
  const editor = page.locator("section.code-cell textarea").nth(cellIndex);
  await editor.fill(code);
}
async function runCell(page, cellIndex) {
  if (cellIndex < 0) return "(cell not found in this version of the course)";
  const cell = page.locator("section.code-cell").nth(cellIndex);
  await cell.locator("button.run").click();
  await page.waitForFunction((i) => !document.querySelectorAll("section.code-cell")[i].classList.contains("busy"), cellIndex, { timeout: 180000 });
  return (await cell.locator("pre.output").innerText()).trim();
}
async function cellIndexBy(page, predicate) {
  return page.evaluate((src) => {
    const fn = new Function("text", "return " + src);
    return [...document.querySelectorAll("section.code-cell textarea")].findIndex((t) => fn(t.value));
  }, predicate);
}

(async () => {
  let base = process.env.BASE_URL;
  if (!base) {
    await new Promise((resolve) => server.listen(0, resolve));
    base = `http://localhost:${server.address().port}/`;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror:", e.message));

  // 1. Lesson page: blank exercise, then a correct answer, then the quiz.
  await page.goto(base + "lesson.html?nb=basics/notebooks/00_python_introduction");
  await page.waitForSelector("section.code-cell");
  const setup = await cellIndexBy(page, "text.includes('Exercises(')");
  expect("lesson setup cell runs", (await runCell(page, setup)) === "", "unexpected output");
  const ex2 = await cellIndexBy(page, "text.includes('check(2,')");
  const blank = await runCell(page, ex2);
  expect("blank exercise asks to fill in", blank.includes("Fill in every ___"), blank);
  await setCode(page, ex2, 'minutes_per_day = 24 * 60\nminutes_in_week = minutes_per_day * 7\ncheck(2, minutes_in_week)');
  const good = await runCell(page, ex2);
  expect("correct exercise passes", good.includes("✅ Exercise 2: correct"), good);
  await setCode(page, ex2, 'check(2, 123)');
  const wrong = await runCell(page, ex2);
  expect("wrong answer says not yet, without the answer", wrong.includes("❌ Exercise 2: not yet") && !wrong.includes("10080"), wrong);

  // 2. Async code runs in the browser (TaskGroup via lesson.run -> run_sync).
  await page.goto(base + "lesson.html?nb=advanced/notebooks/06_taskgroups_cancellation_timeouts");
  await page.waitForSelector("section.code-cell");
  const exampleIndex = await cellIndexBy(page, "text.includes('from lesson import run')");
  expect("asyncio example uses lesson.run (needs python-notebook#6 on the course's main)", exampleIndex >= 0, "not found");
  const exampleOut = await runCell(page, exampleIndex);
  expect("asyncio lesson example runs", exampleIndex >= 0 && !/Error/.test(exampleOut), exampleOut);

  // 3. Workbook check with pytest in the browser.
  await page.goto(base + "lesson.html?nb=basics/exercises/02_control_flow_exercises");
  await page.waitForSelector("section.code-cell");
  const wbSetup = await cellIndexBy(page, "text.includes('from check import Checker')");
  await runCell(page, wbSetup);
  const fnIndex = await cellIndexBy(page, "text.startsWith('def classify_temperature')");
  const checkIndex = await cellIndexBy(page, "text.trim() === \"check('classify_temperature')\"");
  await runCell(page, fnIndex);
  const todo = await runCell(page, checkIndex);
  expect("workbook blank check says fill in", todo.startsWith("✏️"), todo);
  await setCode(page, fnIndex, 'def classify_temperature(celsius):\n    if celsius <= 0:\n        return "freezing"\n    if celsius < 15:\n        return "cold"\n    if celsius < 25:\n        return "comfortable"\n    return "hot"');
  await runCell(page, fnIndex);
  const passed = await runCell(page, checkIndex);
  expect("workbook check passes with pytest in the browser", passed.includes("✅ classify_temperature"), passed);
  await setCode(page, fnIndex, 'def classify_temperature(celsius):\n    return "hot"');
  await runCell(page, fnIndex);
  const hinted = await runCell(page, checkIndex);
  expect("failed workbook check shows input and a hint", hinted.includes("❌") && hinted.includes("hint"), hinted);

  // 4. Stop button kills an infinite loop.
  const loopCell = fnIndex;
  await setCode(page, loopCell, "while True:\n    pass");
  await page.locator("section.code-cell").nth(loopCell).locator("button.run").click();
  await page.waitForTimeout(1500);
  await page.click("#stop");
  await page.waitForFunction((i) => !document.querySelectorAll("section.code-cell")[i].classList.contains("busy"), loopCell, { timeout: 30000 });
  const stopped = (await page.locator("section.code-cell").nth(loopCell).locator("pre.output").innerText()).trim();
  expect("Stop interrupts an infinite loop", stopped.includes("Stopped"), stopped);

  // 5. Dashboard shows progress and remembers the last notebook.
  await page.goto(base + "index.html");
  await page.waitForSelector(".level");
  const cta = await page.locator(".cta").innerText();
  expect("dashboard offers to continue", cta.includes("Continue"), cta);
  const basicsBar = await page.locator(".level").first().locator(".bar em").innerText();
  expect("Basics progress counted", /^[1-9]\d* \//.test(basicsBar), basicsBar);

  // 6. Redesigned dashboard: search, filters, theme and mobile layout.
  expect("brand and catalog are visible", await page.locator(".brand-name").isVisible()
    && await page.locator("#catalog").isVisible());
  await page.locator("#search").fill("00_python_introduction");
  expect("search narrows to one level", await page.locator(".level").count() === 1);
  await page.locator("#search").fill("a-value-that-will-never-match");
  expect("empty search shows guidance", await page.locator(".empty-state").isVisible());
  await page.locator("#search").fill("");
  await page.locator('button[data-filter="projects"]').click();
  expect("project filter produces results", await page.locator(".level").count() > 0
    && await page.locator('button[data-filter="projects"]').getAttribute("aria-pressed") === "true");
  await page.locator('button[data-filter="all"]').click();
  const beforeTheme = await page.locator("html").getAttribute("data-theme");
  await page.locator("#theme-toggle").click();
  const afterTheme = await page.locator("html").getAttribute("data-theme");
  expect("theme toggle works", beforeTheme !== afterTheme);
  await page.reload();
  expect("theme persists across reload", await page.locator("html").getAttribute("data-theme") === afterTheme);
  await page.setViewportSize({ width: 390, height: 820 });
  await page.waitForTimeout(200);
  const viewport = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: innerWidth }));
  expect("mobile home has no horizontal overflow", viewport.body <= viewport.viewport + 1,
    JSON.stringify(viewport));
  await page.setViewportSize({ width: 1280, height: 800 });

  // 7. Claim page lists workbooks and keeps the claim locked until all pass.

  await page.goto(base + "claim.html");
  await page.waitForSelector(".level");
  const claimText = await page.locator(".level").first().innerText();
  expect("claim page lists each workbook and stays locked", /Control Flow/.test(claimText) && /\d+\/\d+/.test(claimText) && claimText.includes("Finish every workbook"), claimText);

  await browser.close();
  if (server.listening) server.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nall end-to-end checks passed");
  process.exit(failures ? 1 : 0);
})();

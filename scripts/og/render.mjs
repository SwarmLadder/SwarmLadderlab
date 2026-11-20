// Renders the social preview card (public/og.png, 1200×630) from card.html.
// Run: node scripts/og/render.mjs (set CHROMIUM_PATH to use a specific Chromium)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = fileURLToPath(new URL(".", import.meta.url));
const mark = readFileSync(new URL("../../public/favicon.svg", import.meta.url), "utf8");
const html = readFileSync(here + "card.html", "utf8").replace("__MARK__", mark);
writeFileSync(here + ".card.rendered.html", html);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto("file://" + here + ".card.rendered.html");
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: fileURLToPath(new URL("../../public/og.png", import.meta.url)) });
// Home-screen icon for iOS (it rounds the corners itself, so the tile fills the square).
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(`<style>body{margin:0;background:#0c1729}svg{width:180px;height:180px;display:block}</style>${mark.replace('rx="232"', 'rx="0"')}`);
await icon.screenshot({ path: fileURLToPath(new URL("../../public/apple-touch-icon.png", import.meta.url)) });
await browser.close();
console.log("wrote public/og.png and public/apple-touch-icon.png");

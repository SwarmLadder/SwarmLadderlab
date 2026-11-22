// Renders public/og.png and public/apple-touch-icon.png from scripts/brand-assets.html.
// node scripts/brand-assets.mjs   (set CHROMIUM_PATH to use a preinstalled browser)
import { chromium } from "playwright";
import { resolve } from "node:path";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await b.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto("file://" + resolve("scripts/brand-assets.html"));
await page.evaluate(() => document.fonts.ready);
await page.locator("#og").screenshot({ path: "public/og.png" });
await page.locator("#icon").screenshot({ path: "public/apple-touch-icon.png" });
await b.close();

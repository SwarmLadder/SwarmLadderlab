import { test, expect } from "@playwright/test";

test("Linux course exposes guided lessons, labs and progress", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /Linux & Bash, Open now/ })).toBeVisible();
  await page.goto("/learn/linux");
  await expect(page.getByRole("heading", { name: "Linux & Bash", exact: true })).toBeVisible();
  await expect(page.getByText(/87 checks/).first()).toBeVisible();
  await page.goto("/lesson/linux/basics/lessons/00_shell_and_linux");
  await expect(page.getByRole("heading", { name: /Shell, terminal, and Linux processes/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", /linux-course/);
  await expect(page.getByText(/browser offers a limited command simulator/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Mark activity complete/ })).toBeVisible();
  await page.getByRole("button", { name: /Mark activity complete/ }).click();
  await expect(page.getByText("✓ Completed")).toBeVisible();
  await page.goto("/progress");
  await expect(page.getByRole("list", { name: "Linux & Bash Basics" })).toBeVisible();
});

test("Linux lab requires explicit local PASS attestation", async ({ page }) => {
  await page.goto("/lesson/linux/basics/labs/B01");
  await expect(page.getByRole("heading", { name: /Count error log entries/i })).toBeVisible();
  await expect(page.getByText("python tools/grade.py B01").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Mark verified locally/ })).toBeDisabled();
  await page.getByRole("checkbox", { name: /I ran the verification command locally/ }).check();
  await page.getByRole("button", { name: /Mark verified locally/ }).click();
  await expect(page.getByText("✓ Completed")).toBeVisible();
});

test("browser Linux simulator is honest and safely isolated", async ({ page }) => {
  await page.goto("/playground?language=linux");
  // The simulator is named up front; its full limits are one click away.
  await expect(page.getByRole("note")).toContainText("Teaching simulator");
  await page.getByText("Limits", { exact: true }).click();
  await expect(page.getByText(/Linux teaching simulator: a virtual filesystem/)).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Linux commands" });
  await editor.fill("pwd\nwc -l logs/app.log\ngrep -n ERROR logs/app.log");
  await page.getByRole("button", { name: "Run commands" }).click();
  await expect(page.getByText("/home/learner")).toBeVisible();
  await expect(page.getByText(/2026-11-20 ERROR user=bob/)).toBeVisible();
  await editor.fill("sudo cat /etc/passwd");
  await page.getByRole("button", { name: "Run commands" }).click();
  await expect(page.getByText(/Unsupported command: sudo/)).toBeVisible();
});


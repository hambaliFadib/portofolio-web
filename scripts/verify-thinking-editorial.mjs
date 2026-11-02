import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const origin = process.env.PORTFOLIO_PREVIEW_URL ?? "http://127.0.0.1:3000";
const output = process.env.PORTFOLIO_THINKING_OUTPUT_DIR;
if (!output) throw new Error("PORTFOLIO_THINKING_OUTPUT_DIR is required.");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const scenario of [
    { mode: "desktop-light", width: 1440, height: 900, theme: "light", reducedMotion: "no-preference" },
    { mode: "mobile-light", width: 390, height: 844, theme: "light", reducedMotion: "no-preference" },
    { mode: "desktop-dark", width: 1440, height: 900, theme: "dark", reducedMotion: "no-preference" },
    { mode: "reduced-motion", width: 390, height: 844, theme: "dark", reducedMotion: "reduce" },
  ]) {
    const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height }, reducedMotion: scenario.reducedMotion });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(`${origin}/?persona=qa&theme=${scenario.theme}`, { waitUntil: "domcontentloaded" });
      assert.equal(response?.status(), 200, "homepage should load");
      const section = page.locator("section#thinking");
      await section.waitFor({ state: "visible" });
      await section.scrollIntoViewIfNeeded();
      assert.equal(await section.getByRole("heading", { level: 2 }).count(), 1, "one accessible section heading");
      assert.equal(await section.locator("details[data-thinking-principle]").count(), 4, "all four original principles retained");
      const first = section.locator("details").first();
      const second = section.locator("details").nth(1);
      assert.equal(await first.evaluate((el) => el.open), true, "first principle visible by default");
      assert.equal(await second.evaluate((el) => el.open), false, "other principles start collapsed");
      const summary = second.locator("summary");
      const minimumTarget = await summary.evaluate((el) => el.getBoundingClientRect().height);
      assert.ok(minimumTarget >= 44, "summary touch target must be at least 44px");
      await summary.click();
      assert.equal(await second.evaluate((el) => el.open), true, "click expands principle");
      assert.equal(await second.locator("p").isVisible(), true, "expanded content visible");
      await summary.focus();
      await page.keyboard.press("Enter");
      assert.equal(await second.evaluate((el) => el.open), false, "keyboard activation closes principle");
      await summary.focus();
      await page.keyboard.press(" ");
      assert.equal(await second.evaluate((el) => el.open), true, "space keyboard activation opens principle");
      const fieldGuide = section.getByRole("link", { name: "Explore the field guide" });
      assert.equal(await fieldGuide.getAttribute("href"), "#field-guide");
      assert.equal(await page.locator("#field-guide").count(), 1, "link target preserved");
      assert.equal(await section.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true, "section must not overflow horizontally");
      assert.deepEqual(errors, [], "no browser page errors");
      await section.screenshot({ path: path.join(output, `thinking-${scenario.mode}.png`), animations: "disabled" });
      results.push({ mode: scenario.mode, passed: true });
    } finally {
      await context.close();
    }
  }
  await fs.writeFile(path.join(output, "thinking-regression.json"), JSON.stringify({ origin, results }, null, 2) + "\n");
  console.log("Thinking editorial: 4/4 viewport/theme/motion states PASS; disclosure click, keyboard and target checks PASS.");
} finally {
  await browser.close();
}

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const origin = process.env.PORTFOLIO_PREVIEW_URL || "http://127.0.0.1:3000";
const output = process.env.PORTFOLIO_PROJECTS_OUTPUT_DIR;
if (!output) throw new Error("PORTFOLIO_PROJECTS_OUTPUT_DIR must point to the regression evidence directory.");

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const repositoryContracts = [
  { id: "ai-test-case-generator", name: "Explore source: AI Test Case Generator on GitHub", href: "https://github.com/hambaliFadib/ai-test-case-generator" },
  { id: "playwright-quality-framework", name: "Explore source: Playwright Quality Framework on GitHub", href: "https://github.com/hambaliFadib/playwright-quality-framework" },
];
try {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "no-preference" });
    await context.route("https://github.com/**", (route) => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Intercepted GitHub destination</title>",
    }));
    try {
      const page = await context.newPage();
      const failures = [];
      page.on("pageerror", (error) => failures.push(error.message));
      await page.goto(origin + "/?theme=light", { waitUntil: "domcontentloaded" });
      const section = page.locator("#projects");
      await section.scrollIntoViewIfNeeded();
      assert.equal(await section.locator("article[data-project-feature]").count(), 2);
      assert.equal(await section.getByRole("heading", { level: 2 }).count(), 1);
      const artwork = section.locator("[data-ascii-lens]");
      assert.equal(await artwork.count(), 2);
      for (const [index, contract] of repositoryContracts.entries()) {
        const article = section.locator("article[data-project-feature]").nth(index);
        assert.equal(await article.getAttribute("data-project-feature"), contract.id);
        const img = article.locator("[data-ascii-lens] img");
        await img.scrollIntoViewIfNeeded();
        await img.evaluate((el) => el instanceof HTMLImageElement && el.decode());
        assert.ok(await img.evaluate((el) => el instanceof HTMLImageElement && el.naturalWidth > 0), "project artwork must load");
        const source = article.getByRole("link", { name: contract.name, exact: true });
        assert.equal(await source.count(), 1, `${contract.id} must expose its exact repository link name`);
        assert.equal((await source.innerText()).trim(), "Explore source", "the visible repository action remains concise");
        assert.equal(await source.getAttribute("href"), contract.href, `${contract.id} repository destination must remain exact`);
        assert.equal(await source.getAttribute("target"), "_blank", "repository action must open a separate browsing context");
        assert.ok((await source.getAttribute("rel") ?? "").split(/\s+/).includes("noopener"), "external link must retain noopener");
        const [popup] = await Promise.all([page.waitForEvent("popup"), source.click()]);
        await popup.waitForLoadState("domcontentloaded");
        assert.equal(popup.url(), contract.href, `${contract.id} action must open its expected GitHub repository`);
        await popup.close();
        const bounds = await img.boundingBox();
        assert.ok(bounds && bounds.width > 0 && bounds.height > 0);
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await article.locator("[data-ascii-lens] canvas").waitFor({ state: "visible", timeout: 5000 });
        assert.ok(await article.locator("[data-ascii-lens] canvas").evaluate((canvas) => canvas instanceof HTMLCanvasElement && canvas.width > 0), "magnified ASCII lens must render");
        await page.mouse.move(2, 2);
        await article.locator("[data-ascii-lens] canvas").waitFor({ state: "detached", timeout: 5000 });
      }
      assert.deepEqual(failures, [], "browser must not raise page errors");
      await section.screenshot({ path: `${output}/projects-${viewport.name}.png` });
      results.push({ viewport: viewport.name, passed: true });
    } finally { await context.close(); }
  }
  const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  try {
    const page = await reduced.newPage();
    await page.goto(origin + "/?theme=dark", { waitUntil: "domcontentloaded" });
    const image = page.locator("#projects [data-ascii-lens] img").first();
    await image.scrollIntoViewIfNeeded();
    await image.hover();
    assert.equal(await page.locator("#projects [data-ascii-lens] canvas").count(), 0, "reduced motion must disable lens");
    results.push({ viewport: "reduced-motion", passed: true });
  } finally { await reduced.close(); }
  await fs.writeFile(`${output}/projects-regression.json`, JSON.stringify({ origin, results }, null, 2) + "\n");
  console.log("Editorial Projects: desktop, mobile, lens hover/leave, links and reduced motion PASS.");
} finally {
  await browser.close();
}

import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const origin = process.env.IDENTITY_PREVIEW_URL ?? "http://localhost:3002";
const output = path.resolve("output/playwright/cp-03u");
const modes = [
  { persona: "qa", theme: "light", background: "rgb(239, 243, 247)" },
  { persona: "qa", theme: "dark", background: "rgb(11, 21, 36)" },
  { persona: "fullstack", theme: "light", background: "rgb(240, 244, 237)" },
  { persona: "fullstack", theme: "dark", background: "rgb(16, 26, 21)" },
];
const viewports = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 760 },
];
const failures = [];
const results = { firstPaint: [], journeys: [], interactions: [], transitions: [], reducedMotion: null, errors: [], telemetryBlocked: [] };

function observe(page, scope) {
  page.on("pageerror", (error) => results.errors.push(`${scope}: ${error.message}`));
  let optionalTelemetry404 = false;
  page.on("response", (response) => {
    if (response.status() < 400) return;
    if (response.url().includes("/_vercel/insights/")) {
      optionalTelemetry404 = true;
      results.telemetryBlocked.push(`${scope}: HTTP ${response.status()} ${response.url()}`);
    } else {
      results.errors.push(`${scope}: HTTP ${response.status()} ${response.url()}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("ERR_NETWORK_ACCESS_DENIED") || (optionalTelemetry404 && text.includes("404 (Not Found)"))) {
      results.telemetryBlocked.push(`${scope}: ${text}`);
    } else {
      results.errors.push(`${scope}: ${text}`);
    }
  });
}

async function waitForUrl(page, pattern, timeout = 5000) {
  await page.waitForFunction(({ source, flags }) => new RegExp(source, flags).test(location.href), {
    source: pattern.source,
    flags: pattern.flags,
  }, { timeout });
}

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const mode of modes) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      observe(page, `${mode.persona}/${mode.theme}/${viewport.width}`);
      await page.addInitScript(() => {
        window.__identityFirstPaint = [];
        const sample = () => {
          const surface = document.querySelector(".identity-surface");
          if (surface && window.__identityFirstPaint.length < 4) {
            const style = getComputedStyle(surface);
            const heading = surface.querySelector("#top h1");
            window.__identityFirstPaint.push({
              persona: surface.dataset.persona,
              appearance: surface.dataset.appearance,
              background: style.backgroundColor,
              foreground: style.color,
              heroOpacity: heading ? getComputedStyle(heading).opacity : null,
              fontLoaded: document.fonts.check('700 16px Space Grotesk'),
            });
          }
          if (window.__identityFirstPaint.length < 4) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      const response = await page.goto(`${origin}/?persona=${mode.persona}&theme=${mode.theme}`, { waitUntil: "domcontentloaded" });
      if (response?.status() !== 200) failures.push(`${mode.persona}/${mode.theme} ${viewport.width}: HTTP ${response?.status()}`);
      await page.waitForSelector("#top h1", { state: "visible" });
      await page.waitForTimeout(100);
      await page.locator("#top img").scrollIntoViewIfNeeded();
      await page.locator("#top img").evaluate((image) => image.decode());
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.evaluate(() => document.fonts.ready);
      const check = await page.evaluate(() => {
        const surface = document.querySelector(".identity-surface");
        const heading = surface?.querySelector("#top h1");
        const image = surface?.querySelector("#top img");
        return {
          persona: surface?.getAttribute("data-persona"),
          appearance: surface?.getAttribute("data-appearance"),
          background: surface ? getComputedStyle(surface).backgroundColor : "missing",
          foreground: surface ? getComputedStyle(surface).color : "missing",
          heroOpacity: heading ? getComputedStyle(heading).opacity : "missing",
          imageLoaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          fontLoaded: document.fonts.check('700 16px Space Grotesk'),
          overflow: document.documentElement.scrollWidth > innerWidth,
          firstFrames: window.__identityFirstPaint,
        };
      });
      if (check.persona !== mode.persona || check.appearance !== mode.theme || check.background !== mode.background) {
        failures.push(`first paint mismatch ${mode.persona}/${mode.theme}/${viewport.width}: ${JSON.stringify(check)}`);
      }
      if (Number(check.heroOpacity) < 0.99 || !check.imageLoaded || !check.fontLoaded || check.overflow) failures.push(`render integrity ${mode.persona}/${mode.theme}/${viewport.width}: ${JSON.stringify(check)}`);
      results.firstPaint.push({ ...mode, viewport, ...check });
      if (viewport.width === 1440) {
        await page.screenshot({ path: path.join(output, `${mode.persona}-${mode.theme}-1440x900.png`) });
      }
      await context.close();
    }
  }

  const qa = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  observe(qa, "Journey");
  await qa.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "networkidle" });
  for (const stage of ["Signal", "Connection", "Evidence", "Decision"]) {
    await qa.getByRole("tab", { name: new RegExp(stage, "i") }).click();
    const selected = await qa.getByRole("tab", { name: new RegExp(stage, "i") }).getAttribute("aria-selected");
    if (selected !== "true") failures.push(`Journey stage did not select: ${stage}`);
    results.journeys.push({ stage, selected });
  }
  await qa.getByRole("button", { name: /reveal assessment/i }).waitFor();
  await qa.getByRole("button", { name: /reveal assessment/i }).click();
  if ((await qa.getByRole("button", { name: /hide assessment/i }).getAttribute("aria-expanded")) !== "true") failures.push("Assessment did not expand");
  await qa.getByRole("button", { name: /hide assessment/i }).click();
  await qa.getByRole("tab", { name: /signal/i }).click();
  await qa.locator("#qa-profile-name").fill("Sam Lee");
  await qa.getByRole("button", { name: /save profile/i }).click();
  await qa.waitForFunction(() => /profile saved/i.test(document.querySelector("#qa-motion")?.innerText ?? ""));
  await qa.getByRole("button", { name: /reload profile/i }).click();
  await qa.getByText("Nadia Putri").first().waitFor();
  results.interactions.push("Signal simulated reload");
  await qa.getByRole("tab", { name: /connection/i }).click();
  const persistenceNode = qa.getByRole("button", { name: /data persistence/i });
  await persistenceNode.click();
  if ((await persistenceNode.getAttribute("aria-pressed")) !== "true") failures.push("Connection node did not select");
  results.interactions.push("Connection node selection");
  await qa.getByRole("tab", { name: /evidence/i }).click();
  await qa.getByRole("button", { name: "Run verification" }).click();
  await qa.getByText(/Evidence confirms a mismatch in this example/).waitFor();
  results.interactions.push("Evidence simulation");
  await qa.getByRole("tab", { name: /decision/i }).click();
  await qa.getByRole("button", { name: /reveal assessment/i }).click();
  results.interactions.push("Decision assessment expand/collapse");
  const viewWork = qa.getByRole("link", { name: /view work/i });
  await viewWork.scrollIntoViewIfNeeded();
  await qa.mouse.move(0, 0);
  await qa.waitForTimeout(50);
  const borderBefore = await viewWork.evaluate((element) => getComputedStyle(element).borderColor);
  await viewWork.hover();
  await qa.waitForTimeout(220);
  const borderHover = await viewWork.evaluate((element) => getComputedStyle(element).borderColor);
  if (borderBefore === borderHover) failures.push("View Work border did not react on hover");
  results.interactions.push("View Work hover border");
  const themeButton = qa.locator("[data-theme-toggle]");
  await themeButton.click();
  await qa.waitForFunction(() => new URLSearchParams(location.search).get("theme") === "dark", null, { timeout: 5000 });
  if (await qa.locator(".identity-surface").getAttribute("data-appearance") !== "dark") failures.push("Theme toggle failed to update identity surface");
  await qa.reload({ waitUntil: "domcontentloaded" });
  await qa.waitForFunction(() => new URLSearchParams(location.search).get("theme") === "dark");
  if (await qa.locator(".identity-surface").getAttribute("data-appearance") !== "dark") failures.push("Direct reload did not preserve URL appearance");
  results.interactions.push("Theme URL survives reload");

  for (const section of ["top", "qa-motion", "projects", "about", "contact"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    observe(page, `Transition QA ${section}`);
    await page.goto(`${origin}/?persona=qa&theme=dark`, { waitUntil: "networkidle" });
    await page.locator(`#${section}`).scrollIntoViewIfNeeded();
    if (section !== "top") {
      await page.waitForFunction((id) => {
        const element = document.getElementById(id);
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return Number(getComputedStyle(element).opacity) > 0.95 && rect.bottom > 80 && rect.top < innerHeight;
      }, section, { timeout: 5000 });
    }
    const beforeY = await page.evaluate(() => window.scrollY);
    if (section === "projects" || section === "qa-motion") {
      await page.screenshot({ path: path.join(output, `transition-qa-${section}-before.png`) });
    }
    await page.getByRole("button", { name: "Switch to Full Stack Engineer" }).click();
    if (!(await page.locator("canvas[data-persona-transition]").count())) failures.push(`transition canvas missing from ${section}`);
    await page.waitForTimeout(110);
    if (section === "projects" || section === "qa-motion") {
      await page.screenshot({ path: path.join(output, `transition-qa-${section}-covered.png`) });
    }
    const coveredY = await page.evaluate(() => window.scrollY);
    if (section !== "top" && Math.abs(coveredY - beforeY) > 24) failures.push(`scroll moved before dissolve cover from ${section}`);
    await waitForUrl(page, /persona=fullstack.*theme=dark.*#top/);
    await page.waitForFunction(() => !document.querySelector("canvas[data-persona-transition]"), null, { timeout: 5000 });
    const final = await page.evaluate(() => ({
      persona: document.querySelector(".identity-surface")?.getAttribute("data-persona"),
      theme: document.querySelector(".identity-surface")?.getAttribute("data-appearance"),
      y: window.scrollY,
      title: document.querySelector("#top h1")?.textContent,
    }));
    if (final.persona !== "fullstack" || final.theme !== "dark" || final.y > 4 || !final.title?.includes("Thoughtful software")) failures.push(`bad transition destination from ${section}: ${JSON.stringify(final)}`);
    if (section === "projects" || section === "qa-motion") {
      await page.screenshot({ path: path.join(output, `transition-qa-${section}-after.png`) });
    }
    results.transitions.push({ from: `QA ${section}`, ...final });
    await page.close();
  }

  const reverse = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  observe(reverse, "Reverse transition");
  await reverse.goto(`${origin}/?persona=fullstack&theme=light`, { waitUntil: "networkidle" });
  await reverse.screenshot({ path: path.join(output, "transition-fullstack-home-before.png") });
  await reverse.getByRole("button", { name: "Switch to QA Engineer" }).click();
  await reverse.waitForTimeout(110);
  await reverse.screenshot({ path: path.join(output, "transition-fullstack-home-covered.png") });
  await waitForUrl(reverse, /persona=qa.*theme=light.*#top/);
  await reverse.waitForFunction(() => !document.querySelector("canvas[data-persona-transition]"));
  await reverse.screenshot({ path: path.join(output, "transition-fullstack-home-after.png") });
  if (await reverse.locator("#qa-motion").count() !== 1) failures.push("Reverse switch did not restore QA journey");

  const history = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  observe(history, "History");
  await history.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "networkidle" });
  await history.locator("#about").scrollIntoViewIfNeeded();
  const historyScroll = await history.evaluate(() => window.scrollY);
  await history.getByRole("button", { name: "Switch to Full Stack Engineer" }).click();
  await waitForUrl(history, /persona=fullstack.*#top/);
  await history.waitForFunction(() => !document.querySelector("canvas[data-persona-transition]"));
  await history.goBack();
  await waitForUrl(history, /persona=qa/);
  await history.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-persona") === "qa");
  await history.waitForFunction((scroll) => Math.abs(window.scrollY - scroll) < 30, historyScroll, { timeout: 3000 }).catch(() => {});
  if (Math.abs((await history.evaluate(() => window.scrollY)) - historyScroll) > 30) failures.push("Back did not restore previous persona and scroll");
  await history.goForward();
  await waitForUrl(history, /persona=fullstack.*#top/);
  if (await history.locator(".identity-surface").getAttribute("data-appearance") !== "light") failures.push("Forward did not restore Full Stack appearance");
  results.interactions.push("Back/Forward persona and scroll restoration");

  const keyboard = await browser.newPage({ viewport: { width: 390, height: 844 } });
  observe(keyboard, "Keyboard");
  await keyboard.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "networkidle" });
  const keyboardBrand = keyboard.getByRole("button", { name: "Switch to Full Stack Engineer" });
  await keyboardBrand.focus();
  await keyboard.keyboard.press("Enter");
  await waitForUrl(keyboard, /persona=fullstack.*#top/);
  results.interactions.push("Keyboard persona activation");

  const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  observe(touch, "Touch");
  await touch.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "networkidle" });
  await touch.getByRole("button", { name: "Switch to Full Stack Engineer" }).tap();
  await waitForUrl(touch, /persona=fullstack.*#top/);
  results.interactions.push("Touch persona activation");

  const reduced = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  observe(reduced, "Reduced motion");
  await reduced.goto(`${origin}/?persona=qa&theme=dark`, { waitUntil: "networkidle" });
  await reduced.getByRole("button", { name: "Switch to Full Stack Engineer" }).click();
  await waitForUrl(reduced, /persona=fullstack.*theme=dark.*#top/);
  if (await reduced.locator("canvas[data-persona-transition]").count()) failures.push("Reduced motion rendered transition particles");
  results.reducedMotion = { persona: "fullstack", theme: "dark", particles: 0 };

  if (results.errors.length) failures.push(`uncaught browser errors: ${results.errors.join(" | ")}`);
} finally {
  await browser.close();
}

results.failures = failures;
await fs.writeFile(path.join(output, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ output, firstPaintCases: results.firstPaint.length, journeyCases: results.journeys.length, transitionCases: results.transitions.length + 1, failures }, null, 2));
if (failures.length) process.exitCode = 1;

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const baselineOrigin = process.env.PORTFOLIO_STICKY_BASELINE_URL || "http://127.0.0.1:3015";
const previewOrigin = process.env.PORTFOLIO_PREVIEW_URL || "http://127.0.0.1:3009";
const output = process.env.PORTFOLIO_STICKY_CANVAS_OUTPUT_DIR || path.join(os.tmpdir(), "portfolio-about-sticky-canvas-evidence");
const stateKeys = [
  "data-processing",
  "technical-support",
  "quality-assurance",
  "education",
  "education",
  "personal-note",
];
const pageErrors = [];
const consoleErrors = [];
const failedResponses = [];
const results = [];

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

function observe(page, label) {
  page.on("pageerror", (error) => pageErrors.push(`${label}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const expectedAnalytics404 = message.text().includes("status of 404") && failedResponses.some((item) => item.url.includes("/_vercel/insights/script.js"));
    if (!expectedAnalytics404) consoleErrors.push(`${label}: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push({ label, status: response.status(), url: response.url() });
  });
}

function record(name, details = {}) {
  results.push({ name, passed: true, ...details });
}

async function openAbout(origin, width, theme, label) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  observe(page, label);
  const response = await page.goto(`${origin}/?persona=qa&theme=${theme}#about`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, `${label} must return HTTP 200`);
  await page.locator("#about [data-about-timeline]").waitFor({ state: "visible" });
  await page.locator(`html[data-appearance="${theme}"]`).waitFor({ state: "attached" });
  await page.waitForTimeout(180);
  return page;
}

async function captureBaseline() {
  for (const [width, size] of [[1440, "desktop"], [390, "mobile"]]) {
    for (const theme of ["light", "dark"]) {
      const page = await openAbout(baselineOrigin, width, theme, `baseline-${size}-${theme}`);
      const about = page.locator("#about");
      assert.equal(await about.locator("[data-about-timeline] > li[data-about-milestone]").count(), 6, "RECTO baseline must keep all six milestones");
      await page.screenshot({ path: path.join(output, `before-${size}-${theme}.png`), fullPage: true, animations: "disabled" });
      await page.close();
    }
  }
  record("RECTO before screenshots", { files: 4 });
}

async function responsiveMatrix() {
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    for (const theme of ["light", "dark"]) {
      const page = await openAbout(previewOrigin, width, theme, `after-${width}-${theme}`);
      const metrics = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        appearance: document.documentElement.dataset.appearance,
        canvasDisplay: getComputedStyle(document.querySelector("[data-about-canvas]").closest("aside")).display,
        milestoneCount: document.querySelectorAll("#about [data-about-timeline] > li[data-about-milestone]").length,
      }));
      assert.equal(metrics.appearance, theme, `theme query was not applied at ${width}px/${theme}`);
      assert.ok(metrics.documentWidth <= metrics.viewportWidth, `horizontal overflow at ${width}px/${theme}: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.milestoneCount, 6, `timeline content changed at ${width}px/${theme}`);
      assert.equal(metrics.canvasDisplay !== "none", width >= 1280, `canvas breakpoint mismatch at ${width}px/${theme}`);

      if ((width === 1440 || width === 390)) {
        await page.screenshot({
          path: path.join(output, `after-${width === 1440 ? "desktop" : "mobile"}-${theme}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
      record(`responsive ${width}px ${theme}`, metrics);
      await page.close();
    }
  }
}

async function stateAndBoundaryChecks() {
  const page = await openAbout(previewOrigin, 1440, "light", "journey-state-checks");
  const timeline = page.locator("#about [data-about-timeline]");
  const canvas = page.locator("#about [data-about-canvas]");
  const nav = page.getByRole("navigation", { name: "Professional Journey chapters" });
  assert.equal(await nav.getByRole("button").count(), 3, "chapter navigation must provide three career controls");
  assert.equal(await canvas.getAttribute("data-about-canvas-state"), stateKeys[0], "initial milestone canvas mismatch");

  for (let index = 0; index < stateKeys.length; index += 1) {
    const milestone = timeline.locator(":scope > li[data-about-milestone]").nth(index);
    await milestone.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "center" }));
    await page.waitForTimeout(340);
    assert.equal(await milestone.getAttribute("data-active"), "true", `milestone ${index + 1} did not activate`);
    assert.equal(await canvas.getAttribute("data-about-canvas-state"), stateKeys[index], `canvas state mismatch for milestone ${index + 1}`);
    const canvasBox = await canvas.boundingBox();
    assert.ok(canvasBox && canvasBox.y < 900 && canvasBox.y + canvasBox.height > 0, `canvas must stay visible while reading milestone ${index + 1}: ${JSON.stringify(canvasBox)}`);
    assert.ok(canvasBox.y >= 68, `sticky canvas must remain below the fixed header at milestone ${index + 1}: ${JSON.stringify(canvasBox)}`);
    await page.screenshot({ path: path.join(output, `state-${String(index + 1).padStart(2, "0")}.png`), animations: "disabled" });
    record(`canvas state ${index + 1}`, { key: stateKeys[index], viewportTop: canvasBox.y, canvasHeight: canvasBox.height });
  }

  const grid = await page.locator("[data-about-canvas]").evaluate((figure) => {
    const aside = figure.closest("aside");
    const sticky = figure.parentElement;
    const parent = aside?.parentElement;
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { top: value.top + scrollY, bottom: value.bottom + scrollY };
    };
    return { sticky: rect(sticky), parent: rect(parent) };
  });
  assert.ok(grid.sticky.top >= grid.parent.top - 1 && grid.sticky.bottom <= grid.parent.bottom + 1, `sticky canvas must remain inside its grid parent: ${JSON.stringify(grid)}`);

  const contact = page.locator("#contact");
  await contact.scrollIntoViewIfNeeded();
  const boundary = await page.evaluate(() => {
    const figure = document.querySelector("#about [data-about-canvas]");
    const contactSection = document.querySelector("#contact");
    const figureRect = figure.getBoundingClientRect();
    const contactRect = contactSection.getBoundingClientRect();
    return { canvasBottom: figureRect.bottom, contactTop: contactRect.top };
  });
  assert.ok(boundary.canvasBottom <= boundary.contactTop + 1, `canvas overlapped Contact: ${JSON.stringify(boundary)}`);
  await page.screenshot({ path: path.join(output, "boundary-about-contact.png"), fullPage: false, animations: "disabled" });
  record("sticky parent and Contact boundary", { grid, boundary });

  await page.evaluate(() => window.scrollTo({ top: document.querySelector("#about-stage-01").getBoundingClientRect().top + scrollY - innerHeight * 0.5, behavior: "instant" }));
  await page.waitForTimeout(340);
  assert.equal(await canvas.getAttribute("data-about-canvas-state"), stateKeys[0], "reverse scrolling must restore the first state");
  await page.evaluate(() => window.scrollTo({ top: document.querySelector("#about-personal-note").getBoundingClientRect().top + scrollY - innerHeight * 0.3, behavior: "instant" }));
  await page.waitForTimeout(340);
  assert.equal(await canvas.getAttribute("data-about-canvas-state"), stateKeys.at(-1), "fast scroll must settle on the current final state");
  record("scroll reversal and fast-scroll synchronization");

  const finalChapter = nav.getByRole("button", { name: /Quality Assurance/ });
  await finalChapter.press("Enter");
  await page.waitForTimeout(1200);
  assert.equal(await page.locator("#about-stage-03").getAttribute("data-active"), "true", "keyboard activation must navigate to its milestone");
  assert.equal(await canvas.getAttribute("data-about-canvas-state"), "quality-assurance", "keyboard chapter activation must update the canvas");
  record("keyboard chapter activation");
  await page.close();
}

async function touchAndReducedMotionChecks() {
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const touchPage = await touchContext.newPage();
  observe(touchPage, "mobile-touch");
  await touchPage.goto(`${previewOrigin}/?persona=qa&theme=light#about`, { waitUntil: "networkidle" });
  await touchPage.locator("#about [data-about-timeline]").waitFor({ state: "visible" });
  const chapterButton = touchPage.getByRole("navigation", { name: "Professional Journey chapters" }).getByRole("button", { name: /Data Processing$/ });
  await chapterButton.scrollIntoViewIfNeeded();
  const buttonBox = await chapterButton.boundingBox();
  assert.ok(buttonBox && buttonBox.height >= 44, `touch target must be at least 44px high: ${JSON.stringify(buttonBox)}`);
  await touchPage.touchscreen.tap(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
  await touchPage.waitForTimeout(650);
  assert.equal(await touchPage.locator("#about-stage-01").getAttribute("data-active"), "true", "touch chapter activation must reach the timeline milestone");
  record("mobile touch chapter navigation", { targetHeight: buttonBox.height });
  await touchContext.close();

  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  observe(reducedPage, "reduced-motion");
  await reducedPage.goto(`${previewOrigin}/?persona=qa&theme=dark#about`, { waitUntil: "networkidle" });
  await reducedPage.locator("#about [data-about-canvas]").waitFor({ state: "visible" });
  assert.equal(await reducedPage.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true, "reduced-motion preference must be active");
  await reducedPage.locator("#about-education-01").evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "center" }));
  await reducedPage.waitForFunction(() => document.querySelector("[data-about-canvas]")?.getAttribute("data-about-canvas-state") === "education", null, { timeout: 3000 });
  assert.equal(await reducedPage.locator("[data-about-canvas]").getAttribute("data-about-canvas-state"), "education", "reduced motion must retain the correct visual state");
  record("reduced-motion state remains readable");
  await reducedContext.close();
}

async function performanceProbe(origin, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    window.__stickyPerf = { active: false, frames: [], longTasks: [] };
    let previous = 0;
    const sample = (timestamp) => {
      if (window.__stickyPerf.active && previous) window.__stickyPerf.frames.push(timestamp - previous);
      previous = window.__stickyPerf.active ? timestamp : 0;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    if (PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
      new PerformanceObserver((list) => window.__stickyPerf.longTasks.push(...list.getEntries()
        .filter((entry) => window.__stickyPerf.active && entry.startTime >= window.__stickyPerf.startedAt)
        .map(({ duration }) => duration)))
        .observe({ type: "longtask", buffered: true });
    }
  });
  await page.goto(`${origin}/?persona=qa&theme=light#about`, { waitUntil: "networkidle" });
  await page.locator("#about [data-about-timeline]").waitFor({ state: "visible" });
  await page.evaluate(() => { window.__stickyPerf.startedAt = performance.now(); window.__stickyPerf.active = true; });
  const positions = [0.1, 0.4, 0.82, 0.98, 0.52, 0.08];
  const range = await page.locator("[data-about-timeline]").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { start: rect.top + scrollY - innerHeight * 0.45, end: rect.bottom + scrollY - innerHeight * 0.45 };
  });
  for (const fraction of positions) {
    await page.evaluate((scrollY) => window.scrollTo({ top: scrollY, behavior: "instant" }), range.start + (range.end - range.start) * fraction);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(450);
  const measurement = await page.evaluate((name) => {
    const frames = window.__stickyPerf.frames.toSorted((a, b) => a - b);
    const percentile = (fraction) => frames.length ? frames[Math.min(frames.length - 1, Math.floor(frames.length * fraction))] : null;
    return {
      label: name,
      frameCount: frames.length,
      averageFrameMs: frames.length ? Math.round((frames.reduce((sum, value) => sum + value, 0) / frames.length) * 100) / 100 : null,
      p95FrameMs: percentile(0.95) === null ? null : Math.round(percentile(0.95) * 100) / 100,
      framesOver20ms: frames.filter((value) => value > 20).length,
      longTaskDurationsMs: window.__stickyPerf.longTasks,
    };
  }, label);
  await page.close();
  return measurement;
}

async function recordedInteraction() {
  const videoDir = path.join(output, "video-temp");
  await fs.mkdir(videoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  const page = await context.newPage();
  observe(page, "recorded-interaction");
  await page.goto(`${previewOrigin}/?persona=qa&theme=light#about`, { waitUntil: "networkidle" });
  await page.locator("#about [data-about-canvas]").waitFor({ state: "visible" });
  const milestones = page.locator("#about [data-about-timeline] > li[data-about-milestone]");
  await milestones.nth(0).evaluate((element) => element.scrollIntoView({ behavior: "smooth", block: "center" }));
  await page.waitForTimeout(800);
  await milestones.nth(1).evaluate((element) => element.scrollIntoView({ behavior: "smooth", block: "center" }));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo({ top: document.querySelector("#about-personal-note").getBoundingClientRect().top + scrollY - innerHeight * 0.28, behavior: "instant" }));
  await page.waitForTimeout(450);
  await page.evaluate(() => window.scrollTo({ top: document.querySelector("#about-stage-01").getBoundingClientRect().top + scrollY - innerHeight * 0.48, behavior: "instant" }));
  await page.waitForTimeout(450);
  await context.tracing.stop({ path: path.join(output, "about-sticky-canvas-trace.zip") });
  const videoPath = await page.video().path();
  await context.close();
  await fs.copyFile(videoPath, path.join(output, "about-sticky-canvas-scroll.webm"));
  record("slow, fast, and reverse scroll recording", { video: "about-sticky-canvas-scroll.webm", trace: "about-sticky-canvas-trace.zip" });
}

try {
  await captureBaseline();
  await responsiveMatrix();
  await stateAndBoundaryChecks();
  await touchAndReducedMotionChecks();
  const performance = {
    baseline: await performanceProbe(baselineOrigin, "RECTO baseline"),
    prototype: await performanceProbe(previewOrigin, "sticky canvas"),
  };
  await recordedInteraction();
  assert.deepEqual(pageErrors, [], `application page errors: ${pageErrors.join(" | ")}`);
  const unexpectedFailures = failedResponses.filter((item) => !(item.status === 404 && item.url.includes("/_vercel/insights/script.js")));
  const analytics404s = failedResponses.filter((item) => item.status === 404 && item.url.includes("/_vercel/insights/script.js"));
  assert.deepEqual(consoleErrors, [], `browser console errors: ${consoleErrors.join(" | ")}`);
  assert.deepEqual(unexpectedFailures, [], `failed browser responses: ${JSON.stringify(unexpectedFailures)}`);
  record("browser runtime and application errors", { pageErrors: 0, consoleErrors: 0, unexpectedFailedResponses: 0, expectedAnalytics404s: analytics404s.length });
  const report = { baselineOrigin, previewOrigin, output, results, performance, pageErrors, consoleErrors, failedResponses };
  await fs.writeFile(path.join(output, "verification.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

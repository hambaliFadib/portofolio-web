import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const origin = process.env.PORTFOLIO_PREVIEW_URL || "http://127.0.0.1:3009";
const output = process.env.PORTFOLIO_ABOUT_OUTPUT_DIR || path.join(os.tmpdir(), "portfolio-about-evidence");
const expectedCopy = [
  "The path behind the work.",
  "I started with the systems behind everyday operations: handling data, supporting infrastructure, and investigating technical issues when things didn't work as expected.",
  "Those experiences taught me that software is more than what appears on screen. They eventually led me into quality engineering, where understanding business rules, system dependencies, and real-world behavior became an essential part of my work.",
  "I began in manufacturing data operations, checking production records against physical inventory and supporting warehouse workflows. Data accuracy had visible consequences for daily operations.",
  "I then worked with storage and network infrastructure, monitoring system health, investigating logs, and supporting data integrity. Troubleshooting taught me to look beyond the application interface.",
  "I moved into testing complex software across business rules, UI, API, and integrations. Repetitive work led me to build reusable automation workflows, while evidence, quality gates, and explicit risks remained central to release decisions.",
  "Asia Cyber University",
  "Bachelor of Information Systems",
  "In Progress",
  "Vocational Education",
  "Computer and Network Engineering (TKJ)",
  "I don't need every decision to be perfect. I need to understand the evidence, the assumptions, and the risks behind it.",
];

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const pageErrors = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "no-preference" });
      page.on("pageerror", (error) => pageErrors.push(`${width}px/${theme}: ${error.message}`));
      await page.goto(`${origin}/?persona=qa&theme=${theme}#about`, { waitUntil: "domcontentloaded" });
      const about = page.locator("#about");
      await about.scrollIntoViewIfNeeded();
      const heading = about.getByRole("heading", { level: 2, name: expectedCopy[0] });
      await heading.waitFor({ state: "visible" });
      for (const text of expectedCopy) assert.equal(await about.getByText(text, { exact: true }).count(), 1, `approved About copy missing at ${width}px/${theme}: ${text}`);
      const chapterNavigation = about.getByRole("navigation", { name: "Professional Journey chapters" });
      assert.equal(await chapterNavigation.getByRole("button").count(), 3, "Professional Journey must expose exactly three career chapter controls");
      const timeline = about.locator("[data-about-timeline]");
      assert.equal(await timeline.locator(":scope > li[data-about-milestone]").count(), 6, "timeline must contain three jobs, two education entries, and one personal note");
      assert.equal(await timeline.locator(":scope > li[id^=about-stage-]").count(), 3, "Professional Journey must contain exactly three career milestones");
      assert.equal(await timeline.locator(":scope > li[id^=about-education-]").count(), 2, "Education must contain exactly two records");
      assert.equal(await timeline.locator(":scope > li#about-personal-note").count(), 1, "Personal Note must remain the conclusion");
      for (const [index, [id, stage, company]] of [
        ["papyrus-internship", "01 — Electronic Data Processing Staff", "PT. Papyrus Sakti · Internship"],
        ["technical-support-specialist", "02 — Technical Support Specialist", "PT. Neuronworks Indonesia"],
        ["neuronworks-qa-engineer", "03 — Software Quality Assurance Engineer", "PT. Neuronworks Indonesia"],
      ].entries()) {
        assert.equal(await about.getByRole("heading", { level: 4, name: stage }).count(), 1, `career stage must match: ${stage}`);
        const milestone = timeline.locator(":scope > li[data-experience-id]").nth(index);
        assert.equal(await milestone.getAttribute("data-experience-id"), id, `career order must match ${id}`);
        assert.ok((await milestone.innerText()).includes(company), `career company must match ${id}`);
      }
      assert.equal(await chapterNavigation.getByRole("button", { name: /QA Engineering & Automation/ }).count(), 0, "automation must not replace a career milestone");
      assert.equal(await about.getByRole("link", { name: "View CV" }).getAttribute("href"), "/Hambali_Fadib_CV_QA_2026.pdf");
      assert.equal(await page.locator("html").getAttribute("data-appearance"), theme);

      const layout = await about.evaluate((section) => {
        const lens = section.querySelector("[data-ascii-lens]");
        const image = lens?.querySelector("img");
        const bounds = lens?.getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          width: bounds?.width ?? 0,
          height: bounds?.height ?? 0,
          imageLoaded: image instanceof HTMLImageElement && image.naturalWidth > 0,
          imageAlt: image instanceof HTMLImageElement ? image.alt : "",
          imageSourceWidth: image instanceof HTMLImageElement ? image.naturalWidth : 0,
          imageSourceHeight: image instanceof HTMLImageElement ? image.naturalHeight : 0,
          ratio: lens?.getAttribute("data-ascii-lens-ratio"),
          lensCount: lens?.querySelectorAll("canvas").length ?? 0,
        };
      });
      assert.equal(layout.overflow, false, `horizontal overflow at ${width}px/${theme}`);
      assert.ok(layout.width > 0 && layout.height > 0 && layout.imageLoaded, `About portrait must render at ${width}px/${theme}`);
      assert.ok(layout.imageAlt.trim(), "About portrait must retain a text alternative");
      const expectedRatio = width >= 1024 ? 0.8 : 4 / 3;
      assert.ok(Math.abs(layout.width / layout.height - expectedRatio) < 0.02, `photo crop changed at ${width}px/${theme}: ${JSON.stringify(layout)}`);
      assert.equal(layout.lensCount, 0, "lens should not render before pointer hover");

      if (width === 390 && theme === "light") {
        const image = about.locator("[data-ascii-lens] img");
        await image.evaluate((el) => el.decode());
        const bounds = await image.boundingBox();
        assert.ok(bounds, "portrait bounds must be measurable");
        const pointer = { x: bounds.x + bounds.width * 0.34, y: bounds.y + bounds.height * 0.38 };
        await page.mouse.move(pointer.x, pointer.y);
        const canvas = about.locator("[data-ascii-lens] canvas").last();
        await canvas.waitFor({ state: "visible" });
        await page.waitForTimeout(260);
        const geometry = await page.evaluate(({ x, y }) => {
          const lens = document.querySelector("#about [data-ascii-lens]");
          const image = lens?.querySelector("img");
          const overlay = lens?.querySelector("canvas:last-of-type");
          const lensCircle = overlay?.parentElement;
          if (!(image instanceof HTMLImageElement) || !(overlay instanceof HTMLCanvasElement) || !lensCircle) return null;
          const rect = lens.getBoundingClientRect();
          const localX = x - rect.left;
          const localY = y - rect.top;
          const scale = Math.max(image.clientWidth / image.naturalWidth, image.clientHeight / image.naturalHeight);
          const offsetX = (image.clientWidth - image.naturalWidth * scale) / 2;
          const offsetY = (image.clientHeight - image.naturalHeight * scale) / 2;
          const expectedX = (localX - offsetX) / scale;
          const expectedY = (localY - offsetY) / scale;
          const actualX = Number(overlay.dataset.sourceCenterX);
          const actualY = Number(overlay.dataset.sourceCenterY);
          const circle = lensCircle.getBoundingClientRect();
          return {
            expectedX, expectedY, actualX, actualY,
            pointerCenterError: Math.hypot(circle.left + circle.width / 2 - x, circle.top + circle.height / 2 - y),
            sourceError: Math.hypot(actualX - expectedX, actualY - expectedY),
          };
        }, pointer);
        assert.ok(geometry, "lens crop geometry must be available");
        assert.ok(geometry.pointerCenterError <= 1, `lens should track pointer: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.sourceError <= 1, `cover crop mapping must sample the visible photo point: ${JSON.stringify(geometry)}`);
        await about.screenshot({ path: path.join(output, "about-mobile-light-hover.png") });
        await page.mouse.move(2, 2);
        await canvas.waitFor({ state: "detached" });
        results.push({ check: "hover tracking, cover crop alignment, pointer leave", passed: true, geometry });
        await about.screenshot({ path: path.join(output, `about-mobile-light.png`) });
      }

      if (width === 1440 && theme === "light") await about.screenshot({ path: path.join(output, "about-desktop-light.png") });
      if (width === 1440 && theme === "dark") await about.screenshot({ path: path.join(output, "about-desktop-dark.png") });
      if (width === 390 && theme === "dark") await about.screenshot({ path: path.join(output, "about-mobile-dark.png") });
      results.push({ check: `copy, CV, theme, crop and overflow ${width}px/${theme}`, passed: true });
      await page.close();
    }
  }

  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", hasTouch: true, isMobile: true });
  reduced.on("pageerror", (error) => pageErrors.push(`reduced-motion/touch: ${error.message}`));
  await reduced.goto(`${origin}/?persona=qa&theme=dark#about`, { waitUntil: "domcontentloaded" });
  const touchImage = reduced.locator("#about [data-ascii-lens] img");
  await touchImage.scrollIntoViewIfNeeded();
  await touchImage.evaluate((el) => el.decode());
  assert.ok(await touchImage.isVisible(), "touch fallback must keep the original portrait visible");
  await touchImage.tap();
  assert.equal(await reduced.locator("#about [data-ascii-lens] canvas").count(), 0, "reduced motion must disable the lens canvas");
  results.push({ check: "reduced motion and touch portrait fallback", passed: true });
  await reduced.close();

  const transitions = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  transitions.on("pageerror", (error) => pageErrors.push(`section transitions: ${error.message}`));
  await transitions.goto(`${origin}/?persona=qa&theme=light#thinking`, { waitUntil: "domcontentloaded" });
  await transitions.locator('nav[aria-label="Primary"] a[href="#about"]').click();
  await transitions.waitForFunction(() => location.hash === "#about");
  await transitions.locator("#about").waitFor({ state: "visible" });
  await transitions.locator('nav[aria-label="Primary"] a[href="#contact"]').click();
  await transitions.waitForFunction(() => location.hash === "#contact");
  await transitions.locator("#contact").waitFor({ state: "visible" });
  results.push({ check: "Thinking to About to Contact navigation", passed: true });
  await transitions.close();

  assert.deepEqual(pageErrors, [], "About must not produce application browser errors");
  results.push({ check: "no application browser errors", passed: true });
  await fs.writeFile(path.join(output, "about-regression.json"), `${JSON.stringify({ origin, results, pageErrors }, null, 2)}\n`);
  console.log(JSON.stringify({ output, passed: results.length, failed: 0, checks: results }, null, 2));
} finally {
  await browser.close();
}

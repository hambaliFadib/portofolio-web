import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const origin = process.env.PORTFOLIO_PREVIEW_URL || "http://127.0.0.1:3009";
const output = process.env.PORTFOLIO_ABOUT_OUTPUT_DIR || path.join(os.tmpdir(), "portfolio-about-journey-evidence");
const names = ["Quality Engineering", "QA Engineering & Automation"];
const errors = [];
const browser = await chromium.launch({ headless: true });
await fs.mkdir(output, { recursive: true });
try {
  for (const width of [320, 390, 768, 1024, 1440]) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on("pageerror", (error) => errors.push(`${width}/${theme}: ${error.message}`));
      await page.goto(`${origin}/?persona=qa&theme=${theme}#about`, { waitUntil: "domcontentloaded" });
      const about = page.locator("#about");
      await about.scrollIntoViewIfNeeded();
      assert.equal(await page.locator("html").getAttribute("data-appearance"), theme);
      assert.equal(await about.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow ${width}px/${theme}`);
      const horizontalLayout = await about.evaluate((section) => ({
        left: section.getBoundingClientRect().left,
        mainScrollLeft: document.querySelector("main")?.scrollLeft ?? 0,
        journeyWidth: section.querySelector("[data-about-timeline]")?.clientWidth ?? 0,
      }));
      assert.equal(horizontalLayout.left, 0, `About section shifted horizontally ${width}px/${theme}: ${JSON.stringify(horizontalLayout)}`);
      assert.equal(horizontalLayout.mainScrollLeft, 0, `main scrolled horizontally ${width}px/${theme}: ${JSON.stringify(horizontalLayout)}`);
      assert.ok(horizontalLayout.journeyWidth <= width, `journey wider than viewport ${width}px/${theme}`);
      const nav = about.getByRole("navigation", { name: "Professional Journey chapters" });
      const controls = nav.getByRole("button");
      assert.equal(await controls.count(), 2);
      assert.equal(await about.locator("[data-about-timeline] > li[data-about-milestone]").count(), 5);
      for (let index = 0; index < names.length; index += 1) {
        const control = controls.nth(index);
        const box = await control.boundingBox();
        assert.ok(box && box.height >= 44, `chapter target under 44px: ${width}/${theme}/${index}`);
        assert.ok((await control.innerText()).includes(names[index]));
        assert.equal(await control.getAttribute("aria-controls"), `about-stage-${String(index + 1).padStart(2, "0")}`);
        await control.click();
        const expectedId = `about-stage-${String(index + 1).padStart(2, "0")}`;
        await page.waitForFunction((id) => document.querySelector('#about nav[aria-label="Professional Journey chapters"] [aria-current="step"]')?.getAttribute("aria-controls") === id, expectedId);
        await page.waitForTimeout(650);
        assert.equal(await nav.locator('[aria-current="step"]').getAttribute("aria-controls"), expectedId, `selected chapter must remain active after its smooth scroll ${width}px/${theme}/${expectedId}`);
        await about.locator(`#${expectedId}`).evaluate((stage) => stage.scrollIntoView({ behavior: "auto", block: "center" }));
        await page.waitForFunction((id) => document.querySelector('#about nav[aria-label="Professional Journey chapters"] [aria-current="step"]')?.getAttribute("aria-controls") === id, expectedId);
        await page.waitForTimeout(250);
        assert.equal(await nav.locator('[aria-current="step"]').getAttribute("aria-controls"), expectedId, `scrollspy state must remain stable ${width}px/${theme}/${expectedId}`);
      }
      assert.equal(await about.getByRole("heading", { name: "Education" }).count(), 1);
      assert.equal(await about.getByRole("heading", { name: "Personal Note" }).count(), 1);
      if (width === 1440) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, `about-recto-desktop-${theme}.png`), fullPage: true });
      }
      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, `about-recto-mobile-${theme}.png`), fullPage: true });
      }
      await page.close();
    }
  }

  await browser.close();
  const motionBrowser = await chromium.launch({ headless: true });
  try {
    for (const theme of ["light", "dark"]) {
      for (const reducedMotion of ["reduce", "no-preference"]) {
        const label = `${reducedMotion}/${theme}`;
        const page = await motionBrowser.newPage({
          viewport: { width: 390, height: 844 },
          reducedMotion,
        });
        page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
        await page.goto(`${origin}/?persona=qa&theme=${theme}#about`, { waitUntil: "networkidle" });
        await page.waitForTimeout(350);
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
        const nav = page.getByRole("navigation", { name: "Professional Journey chapters" });
        const finalChapter = nav.getByRole("button").nth(1);
        await finalChapter.focus();
        assert.notEqual(
          await finalChapter.evaluate((el) => getComputedStyle(el).outlineStyle),
          "none",
          `keyboard focus must remain visible ${label}`,
        );

        const before = await page.evaluate(() => {
          const nativeScrollTo = window.scrollTo.bind(window);
          window.__aboutScrollProbe = { calls: [], frames: [] };
          window.scrollTo = (...args) => {
            const [first, second] = args;
            const options = first && typeof first === "object" ? first : null;
            window.__aboutScrollProbe.calls.push({
              api: "window.scrollTo",
              top: options ? options.top ?? null : second ?? null,
              behavior: options
                ? Object.hasOwn(options, "behavior") ? options.behavior : "(omitted)"
                : "(positional)",
            });
            return nativeScrollTo(...args);
          };
          let frameCount = 0;
          const sample = () => {
            window.__aboutScrollProbe.frames.push(window.scrollY);
            frameCount += 1;
            if (frameCount < 120) requestAnimationFrame(sample);
          };
          window.__aboutScrollProbe.frames.push(window.scrollY);
          requestAnimationFrame(sample);
          return {
            scrollY: window.scrollY,
            reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
            scrollBehavior: getComputedStyle(document.scrollingElement).scrollBehavior,
          };
        });
        assert.equal(before.reducedMotion, reducedMotion === "reduce", `media preference mismatch ${label}`);

        await page.keyboard.press("Enter");
        await page.waitForFunction(
          () => document.querySelector('#about nav[aria-label="Professional Journey chapters"] [aria-current="step"]')?.getAttribute("aria-controls") === "about-stage-02",
          null,
          { timeout: 7000 },
        );
        await page.evaluate(() => new Promise((resolve) => {
          let previous = window.scrollY;
          let stableFrames = 0;
          let frameCount = 0;
          const waitForSettle = () => {
            frameCount += 1;
            stableFrames = window.scrollY === previous ? stableFrames + 1 : 0;
            previous = window.scrollY;
            if (stableFrames >= 6 || frameCount >= 120) resolve();
            else requestAnimationFrame(waitForSettle);
          };
          requestAnimationFrame(waitForSettle);
        }));

        const after = await page.evaluate(() => ({
          scrollY: window.scrollY,
          scrollBehavior: getComputedStyle(document.scrollingElement).scrollBehavior,
          calls: window.__aboutScrollProbe.calls,
          frames: window.__aboutScrollProbe.frames,
          activeControl: document.querySelector('#about nav[aria-label="Professional Journey chapters"] [aria-current="step"]')?.getAttribute("aria-controls"),
          activeMilestone: [...document.querySelectorAll("#about [data-about-milestone]")].find((item) => item.dataset.active === "true")?.id,
          focusVisible: document.activeElement.matches(":focus-visible"),
        }));
        assert.equal(after.activeControl, "about-stage-02", `chapter activation failed ${label}`);
        assert.equal(after.activeMilestone, "about-stage-02", `milestone activation failed ${label}`);
        assert.equal(after.focusVisible, true, `keyboard focus must remain visible after navigation ${label}`);
        assert.equal(after.calls.length, 1, `expected one chapter window.scrollTo call ${label}: ${JSON.stringify(after.calls)}`);
        assert.equal(after.calls[0].api, "window.scrollTo");
        assert.equal(typeof after.calls[0].top, "number", `chapter scroll target missing ${label}`);
        assert.equal(Math.abs(after.scrollY - after.calls[0].top) <= 1, true, `scroll did not reach chapter target ${label}`);

        if (reducedMotion === "reduce") {
          assert.equal(before.scrollBehavior, "auto", `reduced motion CSS must disable smooth scrolling ${label}`);
          assert.equal(after.scrollBehavior, "auto", `reduced motion CSS must remain non-smooth ${label}`);
          assert.equal(after.calls[0].behavior, "auto", `reduced motion API call must explicitly request auto ${label}`);
          const firstMovedFrame = after.frames.findIndex((position) => Math.abs(position - before.scrollY) > 1);
          assert.notEqual(firstMovedFrame, -1, `reduced motion navigation did not move ${label}`);
          const finalY = after.frames.at(-1);
          assert.ok(
            after.frames.slice(firstMovedFrame).every((position) => Math.abs(position - finalY) <= 1),
            `reduced motion navigation animated across frames ${label}: ${JSON.stringify(after.frames.slice(firstMovedFrame, firstMovedFrame + 8))}`,
          );
        } else {
          assert.equal(before.scrollBehavior, "smooth", `normal motion CSS must preserve smooth scrolling ${label}`);
          assert.equal(after.scrollBehavior, "smooth", `normal motion CSS must preserve smooth scrolling ${label}`);
          assert.equal(after.calls[0].behavior, "smooth", `normal motion API call must preserve smooth behavior ${label}`);
          const firstMovedFrame = after.frames.findIndex((position) => Math.abs(position - before.scrollY) > 1);
          const finalY = after.frames.at(-1);
          assert.ok(firstMovedFrame >= 0, `normal motion navigation did not move ${label}`);
          assert.ok(
            after.frames.slice(firstMovedFrame, -1).some((position) => Math.abs(position - before.scrollY) > 1 && Math.abs(position - finalY) > 1),
            `normal motion navigation did not show smooth intermediate positions ${label}`,
          );
        }
        await page.close();
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await motionBrowser.close();
  }
  console.log(JSON.stringify({ status: "PASS", viewportThemePairs: 10, stages: 2, motionThemePairs: 4, keyboard: "PASS", reducedMotion: "PASS", normalMotion: "PASS", pageErrors: errors, screenshots: output }, null, 2));
} finally {
  await browser.close().catch(() => {});
}

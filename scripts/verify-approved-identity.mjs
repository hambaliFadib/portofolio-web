import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { observeBrowserErrors } from "./browser-error-observer.mjs";

const origin = process.env.IDENTITY_PREVIEW_URL ?? "http://localhost:3002";
const output = path.resolve(process.env.IDENTITY_EVIDENCE_DIR ?? "output/playwright/cp-03u");
const modes = [
  { persona: "qa", theme: "light", background: "rgb(239, 243, 247)" },
  { persona: "qa", theme: "dark", background: "rgb(11, 21, 36)" },
  { persona: "fullstack", theme: "light", background: "rgb(240, 244, 237)" },
  { persona: "fullstack", theme: "dark", background: "rgb(16, 26, 21)" },
];
const expectedBrowserTitles = {
  qa: "Hambali Fadib — Software Quality Assurance Engineer",
  fullstack: "Hambali Fadib — Full Stack Engineer",
};
const viewports = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 760 },
];
const failures = [];
const personaSwitchNames = {
  qa: "Hambali Fadib, QA Engineer. Switch to Full Stack Engineer",
  fullstack: "Hambali Fadib, Full Stack Engineer. Switch to QA Engineer",
};
const personaSwitchButton = (page, persona) => page.getByRole("button", { name: personaSwitchNames[persona], exact: true });
const results = { firstPaint: [], metadata: [], journeys: [], journeyLayouts: [], interactions: [], transitions: [], reducedMotion: null, errors: [], telemetryBlocked: [], expectedNavigationAborts: [] };

function observe(page, scope) {
  observeBrowserErrors(page, { label: scope, origin, errors: results.errors, telemetryBlocked: results.telemetryBlocked, expectedNavigationAborts: results.expectedNavigationAborts });
}

async function waitForUrl(page, pattern, timeout = 5000) {
  await page.waitForFunction(({ source, flags }) => new RegExp(source, flags).test(location.href), {
    source: pattern.source,
    flags: pattern.flags,
  }, { timeout });
}

async function waitForPersonaSettled(page, persona, timeout = 5000) {
  await page.waitForFunction((expected) => {
    const surface = document.querySelector(".identity-surface");
    return surface?.getAttribute("data-persona") === expected && surface.getAttribute("aria-busy") === "false";
  }, persona, { timeout });
}

async function waitForMobileMenuExit(page) {
  await page.waitForFunction(() => {
    const menu = document.querySelector("#primary-mobile-menu");
    if (!menu) return true;
    const top = new DOMMatrixReadOnly(getComputedStyle(menu).transform).m42;
    return menu.getAttribute("aria-hidden") === "true"
      && top <= -menu.getBoundingClientRect().height + 1
      && getComputedStyle(document.body).overflow !== "hidden";
  }, undefined, { timeout: 4000 });
}

function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    if (!channels || channels.length !== 3) return 0;
    const linear = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
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
      const html = await response?.text() ?? "";
      const serverTitle = html.match(/<title>(.*?)<\/title>/i)?.[1] ?? null;
      const expectedTitle = expectedBrowserTitles[mode.persona];
      await page.waitForFunction((title) => document.title === title, expectedTitle);
      const metadata = await page.evaluate(() => ({
        title: document.title,
        openGraphTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? null,
      }));
      if (serverTitle !== expectedTitle || metadata.title !== expectedTitle || metadata.openGraphTitle !== expectedTitle) {
        failures.push(`browser metadata mismatch ${mode.persona}/${mode.theme}/${viewport.width}: ${JSON.stringify({ serverTitle, ...metadata, expectedTitle })}`);
      }
      results.metadata.push({ persona: mode.persona, theme: mode.theme, viewport, serverTitle, ...metadata, expectedTitle });
      await page.waitForSelector("#top h1", { state: "visible" });
      await page.waitForTimeout(100);
      await page.locator("#top img").scrollIntoViewIfNeeded();
      await page.locator("#top img").evaluate((image) => image.decode());
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.evaluate(() => document.fonts.ready);
      await waitForPersonaSettled(page, mode.persona);
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
          saveColors: (() => {
            const save = surface.querySelector('button[type="submit"]');
            if (!save) return null;
            const style = getComputedStyle(save);
            return { foreground: style.color, background: style.backgroundColor };
          })(),
          overflow: document.documentElement.scrollWidth > innerWidth,
          firstFrames: window.__identityFirstPaint,
        };
      });
      if (check.persona !== mode.persona || check.appearance !== mode.theme || check.background !== mode.background) {
        failures.push(`first paint mismatch ${mode.persona}/${mode.theme}/${viewport.width}: ${JSON.stringify(check)}`);
      }
      if (Number(check.heroOpacity) < 0.99 || !check.imageLoaded || !check.fontLoaded || check.overflow) failures.push(`render integrity ${mode.persona}/${mode.theme}/${viewport.width}: ${JSON.stringify(check)}`);
      if (mode.persona === "qa" && check.saveColors && contrastRatio(check.saveColors.foreground, check.saveColors.background) < 4.5) failures.push(`Save profile text contrast below 4.5:1 in ${mode.theme}: ${JSON.stringify(check.saveColors)}`);
      results.firstPaint.push({ ...mode, viewport, ...check });
      if (mode.persona === "qa") {
        const journey = page.locator("#qa-motion");
        const layout = await journey.evaluate((section) => {
          const canvas = section.querySelector("[data-qa-canvas]");
          const controls = Array.from(section.querySelectorAll("button")).map((button) => ({
            name: button.innerText.trim(),
            height: button.getBoundingClientRect().height,
          }));
          return {
            viewport: innerWidth,
            surfaceOpacity: Number(getComputedStyle(document.querySelector(".identity-surface")).opacity),
            sectionWidth: section.getBoundingClientRect().width,
            sectionScrollWidth: section.scrollWidth,
            canvasWidth: canvas?.getBoundingClientRect().width ?? 0,
            chapterCount: section.querySelectorAll('nav[aria-label="QA investigation chapters"] button').length,
            activeChapter: section.querySelector('nav[aria-label="QA investigation chapters"] button[aria-current="step"]')?.innerText.trim() ?? null,
            hasLegacyProfileField: Boolean(section.querySelector("#qa-profile-name")),
            minimumControlHeight: controls.length ? Math.min(...controls.map((control) => control.height)) : 0,
          };
        });
        if (layout.sectionScrollWidth > layout.sectionWidth + 1) failures.push(`QA Journey horizontal overflow ${mode.theme}/${viewport.width}: ${JSON.stringify(layout)}`);
        if (layout.surfaceOpacity < 0.99) failures.push(`QA Journey screenshot was captured during a persona transition ${mode.theme}/${viewport.width}: ${JSON.stringify(layout)}`);
        if (layout.chapterCount !== 4 || !layout.activeChapter?.includes("Signal")) failures.push(`QA Journey chapter navigation mismatch ${mode.theme}/${viewport.width}: ${JSON.stringify(layout)}`);
        if (layout.hasLegacyProfileField) failures.push(`Legacy profile form is still present ${mode.theme}/${viewport.width}`);
        if (layout.minimumControlHeight < 44) failures.push(`QA Journey control target below 44px ${mode.theme}/${viewport.width}: ${JSON.stringify(layout)}`);
        results.journeyLayouts.push({ theme: mode.theme, ...layout });
        if (viewport.width === 1440 || viewport.width === 390) {
          await journey.scrollIntoViewIfNeeded();
          await page.waitForFunction(() => {
            const section = document.querySelector("#qa-motion");
            if (!section) return false;
            const style = getComputedStyle(section);
            const transform = new DOMMatrix(style.transform);
            return Number(style.opacity) >= 0.99 && Math.abs(transform.m42) < 0.5;
          });
          await journey.screenshot({ path: path.join(output, `qa-journey-${mode.theme}-${viewport.width}.png`) });
        }
      }
      if (viewport.width === 1440) {
        await page.screenshot({ path: path.join(output, `${mode.persona}-${mode.theme}-1440x900.png`) });
      }
      await context.close();
    }
  }

  const titleHistory = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  observe(titleHistory, "Browser title history");
  await titleHistory.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "networkidle" });
  await titleHistory.getByRole("button", { name: "Switch to Full Stack Engineer" }).click();
  await waitForPersonaSettled(titleHistory, "fullstack");
  await titleHistory.waitForFunction((title) => document.title === title, expectedBrowserTitles.fullstack);
  if (await titleHistory.locator('meta[property="og:title"]').getAttribute("content") !== expectedBrowserTitles.fullstack) {
    failures.push("Persona switch did not update the Open Graph title");
  }
  await titleHistory.goBack();
  await titleHistory.waitForFunction(() => new URLSearchParams(location.search).get("persona") === "qa");
  await waitForPersonaSettled(titleHistory, "qa");
  await titleHistory.waitForFunction((title) => document.title === title, expectedBrowserTitles.qa);
  await titleHistory.goForward();
  await titleHistory.waitForFunction(() => new URLSearchParams(location.search).get("persona") === "fullstack");
  await waitForPersonaSettled(titleHistory, "fullstack");
  await titleHistory.waitForFunction((title) => document.title === title, expectedBrowserTitles.fullstack);
  await titleHistory.reload({ waitUntil: "domcontentloaded" });
  await titleHistory.waitForFunction((title) => document.title === title, expectedBrowserTitles.fullstack);
  results.metadata.push({ personaSwitch: "fullstack", back: "qa", forward: "fullstack", refresh: "fullstack", passed: true });
  await titleHistory.close();

  const qa = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  observe(qa, "Journey");
  await qa.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "networkidle" });
  const journey = qa.locator("#qa-motion");
  for (const stage of ["Signal", "Connection", "Evidence", "Decision"]) {
    const chapter = journey.getByRole("button", { name: new RegExp(stage, "i") });
    await chapter.click();
    const selected = await chapter.getAttribute("aria-current");
    if (selected !== "step") failures.push(`Journey stage did not select: ${stage}`);
    results.journeys.push({ stage, selected });
  }
  const signalChapter = journey.getByRole("button", { name: /signal/i });
  await signalChapter.focus();
  await qa.keyboard.press("Enter");
  if ((await signalChapter.getAttribute("aria-current")) !== "step") failures.push("Signal chapter was not keyboard activatable");
  await qa.getByRole("button", { name: /check after reload/i }).click();
  await qa.getByText(/the earlier value returned/i).waitFor();
  if (!(await qa.getByText("Maya Putri").count())) failures.push("Signal replay did not show the previous profile value");
  results.interactions.push("Signal read-back observation");
  await journey.getByRole("button", { name: /connection/i }).click();
  const persistenceNode = qa.getByRole("button", { name: /stored value/i });
  await persistenceNode.click();
  if ((await persistenceNode.getAttribute("aria-pressed")) !== "true") failures.push("Connection node did not select");
  results.interactions.push("Connection node selection");
  await journey.getByRole("button", { name: /evidence/i }).click();
  await qa.getByRole("button", { name: "Run evidence replay" }).click();
  await qa.getByText(/Evidence confirms a mismatch in this example/).waitFor();
  await qa.getByRole("button", { name: /run it again/i }).click();
  await qa.getByRole("button", { name: /checking evidence/i }).waitFor();
  await qa.emulateMedia({ reducedMotion: "reduce" });
  await qa.getByRole("button", { name: /run it again/i }).waitFor();
  await qa.getByText(/Evidence confirms a mismatch in this example/).waitFor();
  await qa.emulateMedia({ reducedMotion: "no-preference" });
  results.interactions.push("In-flight verification completes when reduced motion is enabled");
  results.interactions.push("Evidence replay and reduced-motion completion");
  await journey.getByRole("button", { name: /decision/i }).click();
  const nextStep = qa.getByRole("button", { name: /hold release until persistence is verified/i });
  await nextStep.click();
  if ((await nextStep.getAttribute("aria-pressed")) !== "true") failures.push("Decision recommendation did not select");
  results.interactions.push("Decision recommendation selection");
  // Keep the Hero hover contract independent from the Journey's reduced-motion emulation.
  const heroHover = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  observe(heroHover, "Hero View Work hover");
  await heroHover.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "networkidle" });
  const viewWork = heroHover.getByRole("link", { name: /view work/i });
  await viewWork.scrollIntoViewIfNeeded();
  await heroHover.waitForFunction(() => {
    const heading = document.querySelector("#top h1");
    if (!heading) return false;
    const style = getComputedStyle(heading);
    return Number(style.opacity) >= 0.99 && Math.abs(new DOMMatrix(style.transform).m42) < 0.5;
  });
  await heroHover.mouse.move(0, 0);
  await heroHover.waitForTimeout(50);
  const borderBefore = await viewWork.evaluate((element) => getComputedStyle(element).borderColor);
  await viewWork.hover();
  await heroHover.waitForTimeout(220);
  const borderHover = await viewWork.evaluate((element) => getComputedStyle(element).borderColor);
  if (borderBefore === borderHover) failures.push("View Work border did not react on hover");
  results.interactions.push("View Work hover border");
  await heroHover.close();
  const themeButton = qa.locator('header [data-theme-toggle]');
  await themeButton.click();
  await qa.waitForFunction(() => new URLSearchParams(location.search).get("theme") === "dark", null, { timeout: 5000 });
  if (await qa.evaluate(() => localStorage.getItem("theme")) !== "dark") failures.push("Theme compatibility preference was not stored");
  if (!(await qa.evaluate(() => document.cookie.split("; ").includes("theme=dark")))) failures.push("Theme SSR preference cookie was not stored");
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
    } else {
      await page.waitForFunction(() => {
        const heading = document.querySelector("#top h1");
        if (!heading) return false;
        const style = getComputedStyle(heading);
        return Number(style.opacity) > 0.99 && Math.abs(new DOMMatrix(style.transform).m42) < 0.1;
      }, null, { timeout: 5000 });
    }
    const beforeHeadlineTop = section === "top"
      ? await page.locator("#top h1").evaluate((heading) => heading.getBoundingClientRect().top)
      : null;
    if (await page.locator('[data-ascii-lens] [data-ascii-transition]').count() !== 0) failures.push(`ASCII transition was already active before switching from ${section}`);
    if (section === "top" || section === "projects" || section === "qa-motion") {
      await page.screenshot({ path: path.join(output, `transition-qa-${section}-before.png`) });
    }
    await page.getByRole("button", { name: "Switch to Full Stack Engineer" }).click();
    if (await page.locator(".identity-surface").getAttribute("aria-busy") !== "true") failures.push(`transition did not mark the surface busy from ${section}`);
    await page.locator('[data-ascii-transition="introduce"] canvas').waitFor({ state: "visible", timeout: 3000 }).catch(() => {
      failures.push(`automatic ASCII introduction did not start from ${section} with the pointer outside the portrait`);
    });
    await page.waitForTimeout(50);
    const midpoint = await page.evaluate(() => ({
      persona: document.querySelector(".identity-surface")?.getAttribute("data-persona"),
      opacity: Number(getComputedStyle(document.querySelector(".identity-surface")).opacity),
      busy: document.querySelector(".identity-surface")?.getAttribute("aria-busy"),
      ascii: (() => {
        const canvas = document.querySelector('[data-ascii-transition="introduce"] canvas');
        if (!(canvas instanceof HTMLCanvasElement)) return null;
        const context = canvas.getContext("2d");
        if (!context) return null;
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let visiblePixels = 0;
        for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) visiblePixels++;
        return { width: canvas.width, height: canvas.height, visiblePixels, opacity: getComputedStyle(canvas).opacity };
      })(),
    }));
    if (midpoint.persona !== "qa" || midpoint.busy !== "true" || midpoint.opacity >= 1 || midpoint.opacity < 0.8) failures.push(`unexpected transition midpoint from ${section}: ${JSON.stringify(midpoint)}`);
    if (!midpoint.ascii || midpoint.ascii.visiblePixels < 100) failures.push(`ASCII introduction was not visibly derived from the portrait at midpoint from ${section}: ${JSON.stringify(midpoint.ascii)}`);
    if (section === "top" || section === "projects" || section === "qa-motion") {
      await page.screenshot({ path: path.join(output, `transition-qa-${section}-midpoint.png`) });
    }
    await waitForUrl(page, /persona=fullstack.*theme=dark.*#top/);
    await page.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-persona") === "fullstack", null, { timeout: 5000 });
    await page.locator('[data-ascii-transition="dissolve"] canvas').waitFor({ state: "visible", timeout: 3000 }).catch(() => {
      failures.push(`ASCII composition did not dissolve over the destination persona from ${section}`);
    });
    const revealY = await page.evaluate(() => window.scrollY);
    if (section !== "top" && revealY > 4) failures.push(`destination did not return to top from ${section}`);
    if (section === "top" || section === "projects" || section === "qa-motion") {
      await page.screenshot({ path: path.join(output, `transition-qa-${section}-destination-reveal.png`) });
    }
    await waitForPersonaSettled(page, "fullstack");
    if (await page.locator("[data-ascii-transition]").count() !== 0) failures.push(`ASCII transition canvas remained after settling from ${section}`);
    if (section === "top") {
      // Only the hero lens is under test; projects may mount their own lenses.
      const heroLens = page.locator("#top [data-ascii-lens]");
      if (await heroLens.count() !== 1) throw new Error("Identity regression requires exactly one hero ASCII Lens");
      await heroLens.hover();
      await heroLens.locator("canvas").waitFor({ state: "visible", timeout: 3000 }).catch(() => {
        failures.push("ordinary ASCII hover did not resume after persona transition");
      });
      await page.mouse.move(0, 0);
      await heroLens.locator("canvas").waitFor({ state: "hidden", timeout: 3000 }).catch(() => {
        failures.push("ordinary ASCII hover did not clear after pointer exit following persona transition");
      });
      results.interactions.push("ASCII Lens hover resumes and clears after persona transition");
    }
    const final = await page.evaluate(() => ({
      persona: document.querySelector(".identity-surface")?.getAttribute("data-persona"),
      theme: document.querySelector(".identity-surface")?.getAttribute("data-appearance"),
      y: window.scrollY,
      title: document.querySelector("#top h1")?.textContent,
      headlineTop: document.querySelector("#top h1")?.getBoundingClientRect().top,
    }));
    if (final.persona !== "fullstack" || final.theme !== "dark" || final.y > 4 || !final.title?.includes("Thoughtful software")) failures.push(`bad transition destination from ${section}: ${JSON.stringify(final)}`);
    if (beforeHeadlineTop !== null && Math.abs(final.headlineTop - beforeHeadlineTop) > 2) failures.push(`headline shifted across persona transition: ${beforeHeadlineTop} -> ${final.headlineTop}`);
    if (section === "top" || section === "projects" || section === "qa-motion") {
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
  await reverse.locator('[data-ascii-transition="introduce"] canvas').waitFor({ state: "visible", timeout: 3000 }).catch(() => failures.push("Full Stack to QA did not automatically introduce ASCII"));
  await reverse.waitForTimeout(50);
  await reverse.screenshot({ path: path.join(output, "transition-fullstack-home-midpoint.png") });
  await waitForUrl(reverse, /persona=qa.*theme=light.*#top/);
  await reverse.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-persona") === "qa");
  await reverse.locator('[data-ascii-transition="dissolve"] canvas').waitFor({ state: "visible", timeout: 3000 }).catch(() => failures.push("Full Stack to QA did not dissolve ASCII into the destination"));
  await reverse.screenshot({ path: path.join(output, "transition-fullstack-home-destination-reveal.png") });
  await waitForPersonaSettled(reverse, "qa");
  await reverse.screenshot({ path: path.join(output, "transition-fullstack-home-after.png") });
  if (await reverse.locator("#qa-motion").count() !== 1) failures.push("Reverse switch did not restore QA journey");

  const history = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  observe(history, "History");
  await history.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "networkidle" });
  await history.locator("#about").scrollIntoViewIfNeeded();
  const historyScroll = await history.evaluate(() => window.scrollY);
  await history.getByRole("button", { name: "Switch to Full Stack Engineer" }).click();
  await waitForUrl(history, /persona=fullstack.*#top/);
  await waitForPersonaSettled(history, "fullstack");
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
  await waitForPersonaSettled(keyboard, "fullstack");
  if (await keyboard.evaluate(() => document.activeElement !== document.querySelector("#top h1"))) failures.push("Keyboard persona activation did not focus the destination heading");
  results.interactions.push("Keyboard persona activation");

  const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  observe(touch, "Touch");
  await touch.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "networkidle" });
  await touch.getByRole("button", { name: "Switch to Full Stack Engineer" }).tap();
  await touch.locator('[data-ascii-transition="introduce"] canvas').waitFor({ state: "visible", timeout: 3000 }).catch(() => failures.push("Mobile persona switch did not automatically introduce ASCII"));
  await touch.screenshot({ path: path.join(output, "transition-mobile-introduce.png") });
  await waitForUrl(touch, /persona=fullstack.*#top/);
  await touch.locator('[data-ascii-transition="dissolve"] canvas').waitFor({ state: "visible", timeout: 3000 }).catch(() => failures.push("Mobile persona switch did not dissolve ASCII into the destination"));
  await touch.screenshot({ path: path.join(output, "transition-mobile-destination-reveal.png") });
  await waitForPersonaSettled(touch, "fullstack");
  if (await touch.locator("[data-ascii-transition]").count() !== 0) failures.push("Mobile ASCII transition canvas remained after settling");
  await touch.screenshot({ path: path.join(output, "transition-mobile-after.png") });
  results.interactions.push("Touch persona activation");

  const reduced = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  observe(reduced, "Reduced motion");
  await reduced.goto(`${origin}/?persona=qa&theme=dark`, { waitUntil: "networkidle" });
  await reduced.getByRole("button", { name: "Switch to Full Stack Engineer" }).click();
  await waitForUrl(reduced, /persona=fullstack.*theme=dark.*#top/);
  if (await reduced.locator(".identity-surface").getAttribute("aria-busy") === "true") failures.push("Reduced motion kept the persona surface busy");
  if (await reduced.evaluate(() => document.activeElement !== document.querySelector("#top h1"))) failures.push("Reduced motion did not focus the destination heading");
  if (await reduced.locator("[data-ascii-transition]").count() !== 0) failures.push("Reduced motion unexpectedly triggered the automatic ASCII introduction");
  results.reducedMotion = { persona: "fullstack", theme: "dark", transitioning: false, focusedHeading: true };

  // P2-01: appearance resolution follows URL, history entry, stored preference, then Dark fallback.
  const fresh = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  observe(fresh, "Appearance fresh fallback");
  await fresh.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await fresh.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-appearance") === "dark");
  if (await fresh.locator("html").getAttribute("data-appearance") !== "dark" || await fresh.locator("html").evaluate((element) => !element.classList.contains("dark"))) failures.push("Fresh URL without preference did not initialize Dark");
  await fresh.close();

  const storedLight = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await storedLight.addInitScript(() => localStorage.setItem("theme", "light"));
  observe(storedLight, "Stored Light without server preference");
  await storedLight.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await storedLight.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-appearance") === "dark");
  if (await storedLight.locator("html").getAttribute("data-appearance") !== "dark" || await storedLight.locator("html").evaluate((element) => !element.classList.contains("dark"))) failures.push("LocalStorage-only value changed the server-rendered fallback");
  if (new URLSearchParams(await storedLight.evaluate(() => location.search)).has("theme")) failures.push("LocalStorage-only value rewrote the URL after hydration");
  if (!(await storedLight.evaluate(() => localStorage.getItem("theme") === "light"))) failures.push("Server-first initialization removed the legacy localStorage value");
  await storedLight.close();

  const fallbackHistory = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  observe(fallbackHistory, "Appearance history fallback");
  await fallbackHistory.goto(`${origin}/`, { waitUntil: "networkidle" });
  await fallbackHistory.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-appearance") === "dark");
  await fallbackHistory.getByRole("button", { name: "Switch to Full Stack Engineer" }).click();
  await waitForUrl(fallbackHistory, /persona=fullstack.*theme=dark.*#top/);
  await waitForPersonaSettled(fallbackHistory, "fullstack");
  await fallbackHistory.goBack();
  await fallbackHistory.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-persona") === "qa" && document.querySelector(".identity-surface")?.getAttribute("data-appearance") === "dark");
  if (await fallbackHistory.evaluate(() => localStorage.getItem("theme")) !== null) failures.push("History restoration fabricated a stored appearance preference");
  await fallbackHistory.goForward();
  await fallbackHistory.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-persona") === "fullstack" && document.querySelector(".identity-surface")?.getAttribute("data-appearance") === "dark");
  await fallbackHistory.reload({ waitUntil: "domcontentloaded" });
  await fallbackHistory.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-persona") === "fullstack" && document.querySelector(".identity-surface")?.getAttribute("data-appearance") === "dark");
  await fallbackHistory.close();

  // A theme click commits immediately, and a following persona switch preserves that selection.
  const pendingThemeSwitch = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  observe(pendingThemeSwitch, "Pending theme/persona transition");
  await pendingThemeSwitch.goto(`${origin}/?persona=qa&theme=dark`, { waitUntil: "networkidle" });
  await pendingThemeSwitch.locator('header [data-theme-toggle]').click();
  await pendingThemeSwitch.getByRole("button", { name: "Switch to Full Stack Engineer" }).click();
  await waitForPersonaSettled(pendingThemeSwitch, "fullstack");
  if (await pendingThemeSwitch.locator("html").getAttribute("data-appearance") !== "light" || !new URLSearchParams(await pendingThemeSwitch.evaluate(() => location.search)).toString().includes("theme=light")) failures.push("Committed theme click was lost during persona transition");
  if (await pendingThemeSwitch.locator("html").evaluate((root) => root.classList.contains("theme-transitioning"))) failures.push("Persona switch left a theme-transition overlay active");
  await pendingThemeSwitch.close();

  const committedThemeSwitch = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  observe(committedThemeSwitch, "Committed theme/persona transition");
  await committedThemeSwitch.goto(`${origin}/?persona=qa&theme=dark`, { waitUntil: "networkidle" });
  await committedThemeSwitch.locator('header [data-theme-toggle]').click();
  await committedThemeSwitch.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-appearance") === "light" && new URLSearchParams(location.search).get("theme") === "light");
  await committedThemeSwitch.getByRole("button", { name: "Switch to Full Stack Engineer" }).click();
  await waitForPersonaSettled(committedThemeSwitch, "fullstack");
  if (await committedThemeSwitch.locator(".identity-surface").getAttribute("data-appearance") !== "light" || !new URLSearchParams(await committedThemeSwitch.evaluate(() => location.search)).toString().includes("theme=light")) failures.push("Committed theme was lost during persona transition");
  await committedThemeSwitch.close();

  const historyThemeSwitch = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  observe(historyThemeSwitch, "Pending theme/history transition");
  await historyThemeSwitch.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "networkidle" });
  await historyThemeSwitch.evaluate(() => {
    window.history.pushState({ persona: "qa", appearance: "dark" }, "", "/?persona=qa&theme=dark");
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  });
  await historyThemeSwitch.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-appearance") === "dark");
  await historyThemeSwitch.locator('header [data-theme-toggle]').click();
  await historyThemeSwitch.goBack();
  await historyThemeSwitch.waitForFunction(() => new URLSearchParams(location.search).get("theme") === "light" && document.querySelector(".identity-surface")?.getAttribute("data-appearance") === "light");
  await historyThemeSwitch.waitForFunction(() => !document.documentElement.classList.contains("theme-transitioning"));
  await historyThemeSwitch.close();
  results.interactions.push("Pending and committed theme changes serialize with persona switching");

  for (const theme of ["light", "dark"]) {
    const explicit = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await explicit.context().addCookies([{ name: "theme", value: theme === "light" ? "dark" : "light", url: origin }]);
    observe(explicit, `Explicit ${theme}`);
    await explicit.goto(`${origin}/?persona=qa&theme=${theme}`, { waitUntil: "domcontentloaded" });
    await explicit.waitForFunction((value) => document.querySelector("html")?.getAttribute("data-appearance") === value, theme);
    if (await explicit.locator(".identity-surface").getAttribute("data-appearance") !== theme) failures.push(`Explicit URL ${theme} did not override stored preference`);
    await explicit.close();
  }
  results.interactions.push("Appearance URL, stored preference, and canonical fallback resolution");

  // P2-02: observer is rebuilt after persona section mount/unmount cycles.
  const spy = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  observe(spy, "Persona scroll spy");
  await spy.goto(`${origin}/?persona=qa&theme=light#projects`, { waitUntil: "networkidle" });
  const activeNav = () => spy.locator('nav[aria-label="Primary"] a[aria-current="true"]');
  await spy.waitForFunction(() => document.querySelector('nav[aria-label="Primary"] a[aria-current="true"]')?.getAttribute("href") === "#projects");
  results.interactions.push("Direct #projects hash initializes active navigation");
  await spy.locator("#projects").scrollIntoViewIfNeeded();
  await spy.waitForFunction(() => document.querySelector('nav[aria-label="Primary"] a[aria-current="true"]')?.getAttribute("href") === "#projects");
  if (await personaSwitchButton(spy, "qa").count() !== 1) failures.push("QA persona must expose its exact full accessible switch name");
  await personaSwitchButton(spy, "qa").click();
  await waitForPersonaSettled(spy, "fullstack");
  if (await personaSwitchButton(spy, "fullstack").count() !== 1) failures.push("switch must expose the Full Stack persona and inverse action after transition");
  await personaSwitchButton(spy, "fullstack").click();
  await waitForPersonaSettled(spy, "qa");
  for (const section of ["projects", "thinking", "about", "contact", "projects", "thinking", "about", "contact"]) {
    await spy.locator(`#${section}`).scrollIntoViewIfNeeded();
    const href = section === "contact" ? "#contact" : `#${section}`;
    await spy.waitForFunction((expected) => document.querySelector(`nav[aria-label="Primary"] a[href="${expected}"][aria-current="true"]`) !== null, href);
  }
  if (await activeNav().count() !== 1) failures.push("Scroll spy did not retain a single active navigation item after persona round trips");
  results.interactions.push("Scroll spy reconnects after repeated persona round trips");
  await spy.close();

  // P2-03: closing the mobile dialog precedes persona transition and restores scrolling.
  for (const width of [390, 320]) {
    const mobile = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 760 }, isMobile: true, hasTouch: true });
    observe(mobile, `Mobile persona menu ${width}`);
    await mobile.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "networkidle" });
    const menuToggle = mobile.locator('button[aria-controls="primary-mobile-menu"]');
    if (await mobile.locator(".identity-surface").getAttribute("data-persona") !== "qa") failures.push(`QA persona must be active before the ${width}px switch`);
    if (await personaSwitchButton(mobile, "qa").count() !== 1) failures.push(`QA switch must expose its exact full accessible name at ${width}px`);
    await personaSwitchButton(mobile, "qa").click();
    await waitForPersonaSettled(mobile, "fullstack");
    if (await personaSwitchButton(mobile, "fullstack").count() !== 1) failures.push(`switch must change the active persona and accessible action at ${width}px`);
    if (await mobile.getByRole("button", { name: "Close menu" }).count()) failures.push(`Closed-menu switch left mobile menu open at ${width}px`);
    if (await mobile.evaluate(() => getComputedStyle(document.body).overflow === "hidden")) failures.push(`Closed-menu switch retained body lock at ${width}px`);
    if (await mobile.locator(".identity-surface").getAttribute("data-persona") !== "fullstack") failures.push(`Full Stack persona must remain active after the first switch at ${width}px`);
    await personaSwitchButton(mobile, "fullstack").click();
    await waitForPersonaSettled(mobile, "qa");
    if (await personaSwitchButton(mobile, "qa").count() !== 1) failures.push(`inverse switch must restore the QA accessible action at ${width}px`);

    await menuToggle.click();
    await mobile.getByRole("dialog", { name: "Site navigation" }).waitFor();
    if (await menuToggle.getAttribute("aria-expanded") !== "true") failures.push(`Mobile menu did not set aria-expanded at ${width}px`);
    await mobile.keyboard.press("Escape");
    await mobile.waitForFunction(() => !document.querySelector('[role="dialog"][aria-label="Site navigation"]'));
    await waitForMobileMenuExit(mobile);
    if (await mobile.evaluate(() => document.activeElement?.getAttribute("aria-controls")) !== "primary-mobile-menu") failures.push(`Escape did not return focus to menu toggle at ${width}px`);
    await menuToggle.click();
    const mobileDialog = mobile.getByRole("dialog", { name: "Site navigation" });
    const modalHeader = mobileDialog.locator(".absolute.inset-x-0");
    const modalHeaderButtons = modalHeader.getByRole("button");
    if (await modalHeaderButtons.count() !== 1 || await modalHeaderButtons.first().getAttribute("aria-label") !== "Close menu") {
      failures.push(`Mobile menu header must contain only its Close menu control at ${width}px`);
    }
    if (await modalHeader.locator("[data-theme-toggle]").count()) failures.push(`Mobile menu header exposed the theme toggle at ${width}px`);
    if (await mobileDialog.getByRole("button", { name: /Switch to/ }).count()) failures.push(`Mobile menu exposed the persona switch at ${width}px`);
    if (width === 320) await mobileDialog.getByRole("button", { name: "Close menu" }).tap();
    else {
      await mobileDialog.getByRole("button", { name: "Close menu" }).focus();
      await mobile.keyboard.press("Enter");
    }
    await mobile.waitForFunction(() => !document.querySelector('[role="dialog"][aria-label="Site navigation"]'));
    await waitForMobileMenuExit(mobile);
    if (await menuToggle.getAttribute("aria-expanded") !== "false") failures.push(`Close menu control did not close navigation at ${width}px`);
    if (await mobile.evaluate(() => getComputedStyle(document.body).overflow === "hidden")) failures.push(`Close menu control retained body lock at ${width}px`);
    if (await mobile.evaluate(() => document.documentElement.scrollHeight <= innerHeight)) failures.push(`Destination page could not scroll at ${width}px`);
    if (width === 390) {
      await waitForPersonaSettled(mobile, "qa");
      await personaSwitchButton(mobile, "qa").evaluate((button) => {
        button.click();
        button.click();
      });
      await waitForPersonaSettled(mobile, "fullstack");
      if (!new URLSearchParams(await mobile.evaluate(() => location.search)).get("persona")?.includes("fullstack")) failures.push("Rapid repeated activation corrupted persona URL");
    }
    results.interactions.push(`Mobile menu keyboard/touch close, focus, and scroll restoration ${width}px`);
    await mobile.close();
  }

  if (results.errors.length) failures.push(`uncaught browser errors: ${results.errors.join(" | ")}`);
} finally {
  await browser.close();
}

results.failures = failures;
await fs.writeFile(path.join(output, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ output, firstPaintCases: results.firstPaint.length, journeyCases: results.journeys.length, transitionCases: results.transitions.length + 1, failures }, null, 2));
if (failures.length) process.exitCode = 1;

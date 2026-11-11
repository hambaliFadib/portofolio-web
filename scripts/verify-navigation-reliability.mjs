import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const origin = process.env.NAVIGATION_PREVIEW_URL ?? "http://127.0.0.1:3000";
const evidencePath = path.resolve(
  process.env.NAVIGATION_EVIDENCE_PATH ?? path.join(os.tmpdir(), "fadibfolio-navigation-reliability.json"),
);
const viewport = { width: 1440, height: 900 };
const directTargets = [
  { id: "top", active: "#top" },
  { id: "qa-motion", active: "#top" },
  { id: "projects", active: "#projects" },
  { id: "thinking", active: "#thinking" },
  { id: "about", active: "#about" },
  { id: "contact", active: "#contact" },
];
const legacyAliases = ["framework", "field-guide"];
const failures = [];
const results = { origin, viewport, browser: "Chromium / Playwright", structure: null, direct: [], legacyAliases: [], projectsReliability: [], interactions: [], failures };

async function createPage(options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  await page.addInitScript(() => {
    window.__navigationTrace = [];
    window.__navigationEventSequence = 0;
    window.__lastNavigationScrollAt = 0;
    window.__initialHistoryLength = history.length;
    window.__legacyReplaceEvents = [];
    const originalReplaceState = history.replaceState.bind(history);
    history.replaceState = (state, title, url) => {
      const previousHash = location.hash;
      const nextUrl = url == null ? new URL(location.href) : new URL(String(url), location.href);
      const historyLengthBefore = history.length;
      const result = originalReplaceState(state, title, url);
      if (["#framework", "#field-guide"].includes(previousHash) && location.hash === "#thinking" && nextUrl.hash === "#thinking") {
        window.__legacyReplaceEvents.push({ previousHash, nextHash: location.hash, historyLengthBefore, historyLengthAfter: history.length });
      }
      return result;
    };
    const record = (type) => {
      const targetId = location.hash.slice(1).split("#")[0];
      const target = document.getElementById(targetId);
      const active = [...document.querySelectorAll('nav[aria-label="Primary"] a[aria-current="true"]')]
        .map((link) => link.getAttribute("href"));
      window.__navigationTrace.push({
        type,
        at: performance.now(),
        hash: location.hash,
        scrollY,
        targetTop: target?.getBoundingClientRect().top ?? null,
        active,
      });
      if (window.__navigationTrace.length > 80) window.__navigationTrace.shift();
    };
    addEventListener("scroll", () => {
      window.__lastNavigationScrollAt = performance.now();
      record("scroll");
    }, { passive: true });
    addEventListener("hashchange", () => {
      window.__navigationEventSequence += 1;
      record("hashchange");
    });
    addEventListener("popstate", () => {
      window.__navigationEventSequence += 1;
      record("popstate");
    });
    addEventListener("pageshow", () => record("pageshow"));
  });
  return page;
}

async function createFontGatedPage(options = {}) {
  const page = await createPage(options);
  await page.addInitScript(() => {
    const addEventListener = window.addEventListener.bind(window);
    window.__registeredAlignmentGuardEvents = [];
    window.addEventListener = (type, listener, options) => {
      if (["hashchange", "wheel", "touchstart", "keydown"].includes(type)) {
        window.__registeredAlignmentGuardEvents.push(type);
      }
      addEventListener(type, listener, options);
    };
    let resolveFontGate;
    const fontGate = new Promise((resolve) => {
      resolveFontGate = resolve;
    });
    Object.defineProperty(document.fonts, "ready", {
      configurable: true,
      get() {
        window.__fontGateRequested = true;
        return fontGate;
      },
    });
    window.__releaseFontGate = () => resolveFontGate(document.fonts);
  });
  return page;
}

async function waitForAlignmentGuard(page) {
  await page.waitForFunction(() => window.__fontGateRequested === true
    && ["hashchange", "wheel", "touchstart", "keydown"].every((type) =>
      window.__registeredAlignmentGuardEvents?.includes(type)), { timeout: 8000 });
}

async function readState(page, id) {
  return page.evaluate((targetId) => {
    const target = document.getElementById(targetId);
    const active = [...document.querySelectorAll('nav[aria-label="Primary"] a[aria-current="true"]')]
      .map((link) => link.getAttribute("href"));
    if (!target) {
      return { url: location.href, hash: location.hash, hashCount: (location.href.match(/#/g) ?? []).length, exists: false, scrollY, active };
    }

    const style = getComputedStyle(target);
    const scrollMarginTop = Number.parseFloat(style.scrollMarginTop) || 0;
    const pageTop = target.getBoundingClientRect().top + scrollY;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const expectedScroll = Math.min(maxScroll, Math.max(0, pageTop - scrollMarginTop));
    const scrollIdleMs = performance.now() - (window.__lastNavigationScrollAt ?? 0);
    return {
      url: location.href,
      hash: location.hash,
      hashCount: (location.href.match(/#/g) ?? []).length,
      exists: true,
      scrollY,
      targetTop: target.getBoundingClientRect().top,
      expectedScroll,
      scrollIdleMs,
      active,
    };
  }, id);
}

async function isSettled(page, id, active) {
  const state = await readState(page, id);
  return state.hash === `#${id}`
    && state.hashCount === 1
    && state.exists
    && Math.abs(state.scrollY - state.expectedScroll) <= 30
    && state.scrollIdleMs >= 300
    && state.active.length === 1
    && state.active[0] === active;
}

async function waitForSettled(page, id, active, timeout = 8000) {
  const startedAt = Date.now();
  let stableSince = null;
  let previousScrollY = null;
  while (Date.now() - startedAt < timeout) {
    const state = await readState(page, id);
    const aligned = state.hash === `#${id}`
      && state.hashCount === 1
      && state.exists
      && state.active.length === 1
      && state.active[0] === active
      && state.scrollIdleMs >= 300
      && Math.abs(state.scrollY - state.expectedScroll) <= 30;
    if (!aligned || (previousScrollY !== null && Math.abs(state.scrollY - previousScrollY) > 2)) {
      stableSince = null;
    } else if (stableSince === null) {
      stableSince = Date.now();
    }
    previousScrollY = state.scrollY;
    if (aligned && stableSince !== null && Date.now() - stableSince >= 300) return;
    await page.waitForTimeout(50);
  }
  throw new Error(`Navigation to #${id} did not remain aligned and scroll-idle for 300ms.`);
}

async function waitForNavigationEvent(page, previousSequence, expectedHash) {
  await page.waitForFunction(({ sequence, hash }) =>
    window.__navigationEventSequence > sequence && location.hash === hash,
  { sequence: previousSequence, hash: expectedHash }, { timeout: 5000 });
}

async function recordNavigation(page, id, active, label, bucket) {
  let settled = false;
  let unchanged = false;
  let finalState = await readState(page, id);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await waitForSettled(page, id, active);
      settled = true;
    } catch {
      break;
    }
    const before = await readState(page, id);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    finalState = await readState(page, id);
    unchanged = finalState.hash === before.hash
      && finalState.active.join() === before.active.join()
      && Math.abs(finalState.scrollY - before.scrollY) <= 2
      && finalState.scrollIdleMs >= 300;
    if (unchanged && await isSettled(page, id, active)) break;
  }
  const pass = settled && unchanged && await isSettled(page, id, active);
  const trace = pass ? undefined : await page.evaluate(() => window.__navigationTrace.slice(-12));
  const record = { label, id, expectedActive: active, settled, unchanged, pass, ...finalState, ...(trace ? { trace } : {}) };
  bucket.push(record);
  if (!pass) {
    failures.push({
      label,
      id,
      settled,
      hash: finalState.hash,
      hashCount: finalState.hashCount,
      scrollY: finalState.scrollY,
      expectedScroll: finalState.expectedScroll,
      targetTop: finalState.targetTop,
      active: finalState.active,
      scrollIdleMs: finalState.scrollIdleMs,
      trace: record.trace,
    });
  }
  return record;
}

async function verifyHomepageStructure(page) {
  const structure = await page.evaluate(() => {
    const expected = ["top", "qa-motion", "projects", "thinking", "about", "contact"];
    const actualOrder = [...document.querySelectorAll("[id]")]
      .map((element) => element.id)
      .filter((id) => expected.includes(id));
    const removed = ["framework", "field-guide", "framework-heading", "field-guide-heading"];
    const missing = expected.filter((id) => !document.getElementById(id));
    const remainingRemovedIds = removed.filter((id) => document.getElementById(id));
    const brokenLabels = [...document.querySelectorAll("[aria-labelledby]")]
      .flatMap((element) => (element.getAttribute("aria-labelledby") ?? "").split(/\s+/))
      .filter((id) => id && !document.getElementById(id));
    return {
      expectedOrder: expected,
      actualOrder,
      missing,
      remainingRemovedIds,
      brokenLabels,
      pass: missing.length === 0
        && actualOrder.join("|") === expected.join("|")
        && remainingRemovedIds.length === 0
        && brokenLabels.length === 0,
    };
  });
  results.structure = structure;
  if (!structure.pass) failures.push({ label: "homepage structure and section order", ...structure });
}

async function verifyLegacyAlias(legacyId) {
  const page = await createPage();
  const probe = `legacy-${legacyId}`;
  await page.goto(`${origin}/?persona=qa&theme=dark&probe=${probe}#${legacyId}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => location.hash === "#thinking", null, { timeout: 8000 });
  await waitForSettled(page, "thinking", "#thinking");

  const state = await readState(page, "thinking");
  const details = await page.evaluate((expectedProbe) => {
    const replaceEvents = window.__legacyReplaceEvents.filter((event) => event.previousHash === `#${expectedProbe}`);
    return {
      search: location.search,
      probe: new URLSearchParams(location.search).get("probe"),
      hashCount: (location.href.match(/#/g) ?? []).length,
      initialHistoryLength: window.__initialHistoryLength,
      finalHistoryLength: history.length,
      replaceEvents,
    };
  }, legacyId);
  let historyFlow = null;
  if (legacyId === "field-guide") historyFlow = await verifyLegacyBackForward();

  const replacement = details.replaceEvents.at(-1);
  const pass = state.hash === "#thinking"
    && state.exists
    && Math.abs(state.scrollY - state.expectedScroll) <= 30
    && state.scrollIdleMs >= 300
    && state.active.length === 1
    && state.active[0] === "#thinking"
    && details.probe === probe
    && details.hashCount === 1
    && details.initialHistoryLength === details.finalHistoryLength
    && details.replaceEvents.length === 1
    && replacement.historyLengthBefore === replacement.historyLengthAfter
    && (!historyFlow || historyFlow.pass);
  const record = {
    label: `legacy #${legacyId} resolves to #thinking`,
    legacyId,
    canonicalHash: state.hash,
    queryPreserved: details.probe === probe,
    hashCount: details.hashCount,
    targetExists: state.exists,
    scrollY: state.scrollY,
    expectedScroll: state.expectedScroll,
    targetTop: state.targetTop,
    scrollIdleMs: state.scrollIdleMs,
    active: state.active,
    historyLengthBefore: details.initialHistoryLength,
    historyLengthAfter: details.finalHistoryLength,
    replaceEvents: details.replaceEvents,
    ...(historyFlow ? { historyFlow } : {}),
    pass,
  };
  results.legacyAliases.push(record);
  if (!pass) failures.push(record);
  await page.close();
}

async function verifyLegacyBackForward() {
  const page = await createPage();
  await page.goto(`${origin}/?persona=qa&theme=light&probe=history#top`, { waitUntil: "networkidle" });
  await waitForSettled(page, "top", "#top");
  await page.locator('nav[aria-label="Primary"] a[href="#projects"]').click();
  await page.waitForFunction(() => location.hash === "#projects");
  await waitForSettled(page, "projects", "#projects");
  const historyBeforeAlias = await page.evaluate(() => history.length);

  let eventSequence = await page.evaluate(() => window.__navigationEventSequence);
  await page.evaluate(() => { location.hash = "#field-guide"; });
  await waitForNavigationEvent(page, eventSequence, "#thinking");
  await waitForSettled(page, "thinking", "#thinking");
  const historyAfterAlias = await page.evaluate(() => history.length);

  eventSequence = await page.evaluate(() => window.__navigationEventSequence);
  await page.goBack();
  await waitForNavigationEvent(page, eventSequence, "#projects");
  await waitForSettled(page, "projects", "#projects");
  const back = await readState(page, "projects");

  eventSequence = await page.evaluate(() => window.__navigationEventSequence);
  await page.goForward();
  await waitForNavigationEvent(page, eventSequence, "#thinking");
  await waitForSettled(page, "thinking", "#thinking");
  const forward = await readState(page, "thinking");
  const queryPreserved = await page.evaluate(() => new URLSearchParams(location.search).get("probe") === "history");
  const pass = historyAfterAlias === historyBeforeAlias + 1
    && back.hash === "#projects"
    && back.active.length === 1
    && back.active[0] === "#projects"
    && forward.hash === "#thinking"
    && Math.abs(forward.scrollY - forward.expectedScroll) <= 30
    && forward.active.length === 1
    && forward.active[0] === "#thinking"
    && forward.hashCount === 1
    && queryPreserved;
  const result = { pass, historyBeforeAlias, historyAfterAlias, back, forward, queryPreserved };
  await page.close();
  return result;
}

const browser = await chromium.launch({ headless: true });
try {
  for (const { id, active } of directTargets) {
    const page = await createPage(id === "contact" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {});
    await page.goto(`${origin}/?persona=qa&theme=light#${id}`, { waitUntil: "networkidle" });
    if (id === "top") await verifyHomepageStructure(page);
    await recordNavigation(page, id, active, `direct #${id}`, results.direct);
    await page.close();
  }

  for (const id of legacyAliases) await verifyLegacyAlias(id);

  for (let run = 1; run <= 20; run += 1) {
    const page = await createPage();
    await page.goto(`${origin}/?persona=qa&theme=light#projects`, { waitUntil: "networkidle" });
    await recordNavigation(page, "projects", "#projects", `#projects repetition ${run}/20`, results.projectsReliability);
    await page.close();
  }

  const clicks = await createPage();
  await clicks.goto(`${origin}/?persona=qa&theme=light#top`, { waitUntil: "networkidle" });
  await waitForSettled(clicks, "top", "#top");
  let eventSequence = await clicks.evaluate(() => window.__navigationEventSequence);
  await clicks.locator('nav[aria-label="Primary"] a[href="#projects"]').click();
  await waitForNavigationEvent(clicks, eventSequence, "#projects");
  await recordNavigation(clicks, "projects", "#projects", "anchor click from #top", results.interactions);
  eventSequence = await clicks.evaluate(() => window.__navigationEventSequence);
  await clicks.locator('nav[aria-label="Primary"] a[href="#projects"]').click();
  await waitForNavigationEvent(clicks, eventSequence, "#projects");
  await recordNavigation(clicks, "projects", "#projects", "repeated anchor click", results.interactions);
  eventSequence = await clicks.evaluate(() => window.__navigationEventSequence);
  await clicks.goBack();
  await waitForNavigationEvent(clicks, eventSequence, "#top");
  await recordNavigation(clicks, "top", "#top", "browser Back", results.interactions);
  eventSequence = await clicks.evaluate(() => window.__navigationEventSequence);
  await clicks.goForward();
  await waitForNavigationEvent(clicks, eventSequence, "#projects");
  await recordNavigation(clicks, "projects", "#projects", "browser Forward", results.interactions);
  await clicks.close();

  const exactDuplicate = await createPage();
  await exactDuplicate.goto(`${origin}/?persona=qa&theme=light#thinking`, { waitUntil: "networkidle" });
  await waitForSettled(exactDuplicate, "thinking", "#thinking");
  eventSequence = await exactDuplicate.evaluate(() => window.__navigationEventSequence);
  await exactDuplicate.locator('nav[aria-label="Primary"] a[href="#thinking"]').click();
  await waitForNavigationEvent(exactDuplicate, eventSequence, "#thinking");
  await recordNavigation(exactDuplicate, "thinking", "#thinking", "same-anchor click from #thinking", results.interactions);
  await exactDuplicate.close();

  const delayedCorrection = await createFontGatedPage();
  await delayedCorrection.goto(`${origin}/?persona=qa&theme=light#projects`, { waitUntil: "networkidle" });
  await waitForAlignmentGuard(delayedCorrection);
  eventSequence = await delayedCorrection.evaluate(() => window.__navigationEventSequence);
  await delayedCorrection.locator('nav[aria-label="Primary"] a[href="#about"]').click();
  await waitForNavigationEvent(delayedCorrection, eventSequence, "#about");
  await delayedCorrection.evaluate(() => window.__releaseFontGate());
  await recordNavigation(delayedCorrection, "about", "#about", "deferred correction respects later anchor navigation", results.interactions);
  await delayedCorrection.close();

  const scrollIntent = await createFontGatedPage();
  await scrollIntent.goto(`${origin}/?persona=qa&theme=light#projects`, { waitUntil: "networkidle" });
  await waitForAlignmentGuard(scrollIntent);
  await scrollIntent.waitForFunction(() => performance.now() - (window.__lastNavigationScrollAt ?? 0) >= 300);
  const beforeManualScrollY = await scrollIntent.evaluate(() => scrollY);
  await scrollIntent.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });
  await scrollIntent.keyboard.press("PageDown");
  await scrollIntent.waitForFunction((previousY) => Math.abs(scrollY - previousY) > 2, beforeManualScrollY, { timeout: 3000 });
  await scrollIntent.waitForFunction(() => performance.now() - (window.__lastNavigationScrollAt ?? 0) >= 250);
  const manualScrollY = await scrollIntent.evaluate(() => scrollY);
  await scrollIntent.evaluate(() => window.__releaseFontGate());
  await scrollIntent.waitForTimeout(500);
  const postIntentState = await readState(scrollIntent, "projects");
  const scrollIntentRecord = {
    label: "deferred correction respects deliberate keyboard scroll",
    id: "projects",
    pass: postIntentState.hash === "#projects"
      && postIntentState.hashCount === 1
      && Math.abs(manualScrollY - beforeManualScrollY) > 2
      && Math.abs(postIntentState.scrollY - manualScrollY) <= 2,
    beforeManualScrollY,
    manualScrollY,
    ...postIntentState,
  };
  results.interactions.push(scrollIntentRecord);
  if (!scrollIntentRecord.pass) failures.push(scrollIntentRecord);
  await scrollIntent.close();

  const theme = await createPage();
  await theme.goto(`${origin}/?persona=qa&theme=light#projects`, { waitUntil: "networkidle" });
  await waitForSettled(theme, "projects", "#projects");
  await theme.locator('header [data-theme-toggle]').click();
  await theme.waitForFunction(() => new URLSearchParams(location.search).get("theme") === "dark");
  await recordNavigation(theme, "projects", "#projects", "theme switch preserves anchor", results.interactions);
  await theme.close();

  const persona = await createPage();
  await persona.goto(`${origin}/?persona=qa&theme=light#projects`, { waitUntil: "networkidle" });
  await waitForSettled(persona, "projects", "#projects");
  await persona.getByRole("button", { name: "Switch to Full Stack Engineer" }).click();
  await persona.waitForFunction(() => new URLSearchParams(location.search).get("persona") === "fullstack" && location.hash === "#top");
  await persona.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("aria-busy") === "false");
  await recordNavigation(persona, "top", "#top", "persona switch keeps canonical top anchor", results.interactions);
  await persona.close();

  const mobile = await createPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto(`${origin}/?persona=qa&theme=light#top`, { waitUntil: "networkidle" });
  await waitForSettled(mobile, "top", "#top");
  await mobile.locator('button[aria-controls="primary-mobile-menu"]').click();
  eventSequence = await mobile.evaluate(() => window.__navigationEventSequence);
  await mobile.getByRole("dialog", { name: "Site navigation" }).getByRole("link", { name: "Projects" }).click();
  await waitForNavigationEvent(mobile, eventSequence, "#projects");
  await mobile.waitForFunction(() => !document.querySelector('[role="dialog"][aria-label="Site navigation"]'));
  await recordNavigation(mobile, "projects", "#projects", "mobile menu anchor navigation", results.interactions);
  await mobile.close();
} finally {
  await browser.close();
}

await fs.mkdir(path.dirname(evidencePath), { recursive: true });
await fs.writeFile(evidencePath, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({
  evidencePath,
  structure: results.structure?.pass ? "PASS" : "FAIL",
  direct: `${results.direct.filter((item) => item.pass).length}/${results.direct.length}`,
  legacyAliases: `${results.legacyAliases.filter((item) => item.pass).length}/${results.legacyAliases.length}`,
  projectsReliability: `${results.projectsReliability.filter((item) => item.pass).length}/${results.projectsReliability.length}`,
  interactions: `${results.interactions.filter((item) => item.pass).length}/${results.interactions.length}`,
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;

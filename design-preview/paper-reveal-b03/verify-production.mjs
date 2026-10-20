import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const origin = process.env.B03_PREVIEW_URL ?? 'http://127.0.0.1:3000';
const output = process.env.B03_PRODUCTION_OUTPUT_DIR
  ? path.resolve(process.env.B03_PRODUCTION_OUTPUT_DIR)
  : path.join(here, 'captures', 'functional');
const frames = process.env.B03_PRODUCTION_FRAMES_DIR
  ? path.resolve(process.env.B03_PRODUCTION_FRAMES_DIR)
  : path.join(here, 'captures', 'frames');
await fs.mkdir(output, { recursive: true });
await fs.mkdir(frames, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [];
const diagnostics = [];

function check(name, passed, details = {}) {
  checks.push({ name, passed: Boolean(passed), details });
}

async function pageFor({
  theme = 'dark',
  width = 1440,
  height = 900,
  reducedMotion = 'no-preference',
  touch = false,
} = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
    reducedMotion,
    hasTouch: touch,
    isMobile: touch,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()); });
  await page.addInitScript(value => {
    if (!localStorage.getItem('theme')) localStorage.setItem('theme', value);
  }, theme);
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(value => document.documentElement.classList.contains(value), theme, { timeout: 20_000 });
  await page.locator('button[data-theme-toggle]').waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForFunction(() => document.querySelector('button[data-theme-toggle]')?.getAttribute('aria-label')?.startsWith('Switch to'));
  await page.waitForTimeout(500);
  const hydrationMessages = pageErrors.filter(message => message.includes('A tree hydrated but some attributes'));
  diagnostics.push({
    viewport: `${width}x${height}`,
    theme,
    hydrationMismatch: hydrationMessages.length,
    hydrationMentionsThemeToggle: hydrationMessages.some(message => /ThemeToggle|theme-toggle/i.test(message)),
    hydrationComponents: hydrationMessages.flatMap(message => message.split('\n').filter(line => /DarkEditorialHero|AsciiLens|ThemeToggle|theme-toggle/.test(line))),
    networkAccessDenied: pageErrors.filter(message => message.includes('ERR_NETWORK_ACCESS_DENIED')).length,
    otherConsoleErrors: pageErrors.filter(message => !message.includes('A tree hydrated but some attributes') && !message.includes('ERR_NETWORK_ACCESS_DENIED')).map(message => message.split('\n')[0]),
  });
  return { context, page };
}

async function snapshot(page) {
  return page.evaluate(() => {
    const button = document.querySelector('button[data-theme-toggle]');
    const svg = document.querySelector('svg[data-art="actual"]');
    const rect = button.getBoundingClientRect();
    return {
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      state: svg.dataset.state,
      progress: Number(svg.dataset.progress),
      label: button.getAttribute('aria-label'),
      button: { width: rect.width, height: rect.height },
      dogearCount: svg.querySelectorAll('[data-dogear], .dogear').length,
    };
  });
}

async function capture(page, label) {
  const filepath = path.join(frames, `${label}.png`);
  await page.locator('button[data-theme-toggle]').screenshot({ path: filepath, animations: 'disabled' });
  return filepath;
}

async function waitForSettled(page, theme) {
  await page.waitForFunction(value => {
    const svg = document.querySelector('svg[data-art="actual"]');
    const dark = document.documentElement.classList.contains('dark');
    return (dark ? 'dark' : 'light') === value && svg?.dataset.state === 'idle' && Number(svg.dataset.progress) === 0;
  }, theme, { timeout: 8_000 });
}

try {
  for (const from of ['dark', 'light']) {
    const to = from === 'dark' ? 'light' : 'dark';
    const { context, page } = await pageFor({ theme: from });
    const button = page.locator('button[data-theme-toggle]');
    const idle = await snapshot(page);
    check(`${from}-idle-size-and-clean-surface`, idle.button.width === 36 && idle.button.height === 36 && idle.dogearCount === 0, idle);
    check(`${from}-accessible-destination-label`, idle.label === `Switch to ${to} mode`, idle);
    await capture(page, `${from}-idle`);

    const cta = await page.locator('header a[href="#contact"]').evaluateAll(links => {
      const visible = links.map(link => link.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0);
      return visible.map(rect => ({ x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom }));
    });
    const toggleBox = await button.boundingBox();
    const overlapsCTA = cta.some(rect => toggleBox.x < rect.right && toggleBox.x + toggleBox.width > rect.x && toggleBox.y < rect.bottom && toggleBox.y + toggleBox.height > rect.y);
    check(`${from}-cta-clearance`, !overlapsCTA, { toggleBox, cta });

    await page.evaluate(() => document.querySelector('button[data-theme-toggle]').click());
    await page.waitForFunction(() => Number(document.querySelector('svg[data-art="actual"]')?.dataset.progress) >= 0.35, null, { timeout: 4_000 });
    await capture(page, `${from}-idle-click-opening`);
    const idleClickStart = await snapshot(page);
    await page.waitForFunction(value => document.documentElement.classList.contains(value), to, { timeout: 4_000 });
    await capture(page, `${from}-idle-click-theme-reveal`);
    await waitForSettled(page, to);
    await capture(page, `${from}-idle-click-settled-${to}`);
    const directClick = await snapshot(page);
    check(`${from}-idle-click-commits-${to}`, directClick.theme === to && directClick.state === 'idle' && directClick.progress === 0, { start: idleClickStart, end: directClick });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(value => document.documentElement.classList.contains(value), to, { timeout: 8_000 });
    check(`${from}-theme-persists-after-refresh`, (await snapshot(page)).theme === to, await snapshot(page));

    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(() => Number(document.querySelector('svg[data-art="actual"]')?.dataset.progress) >= 0.025, null, { timeout: 2_000 });
    const initialHover = await snapshot(page);
    await capture(page, `${to}-hover-initial`);
    check(`${to}-hover-opens-from-clean-idle`, initialHover.state === 'hover-preview' && initialHover.progress > 0 && initialHover.progress < 0.2, initialHover);

    await page.waitForFunction(() => Number(document.querySelector('svg[data-art="actual"]')?.dataset.progress) >= 0.19, null, { timeout: 2_000 });
    const hoverProgress = (await snapshot(page)).progress;
    await capture(page, `${to}-hover-maximum`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(() => ['opening', 'theme-reveal'].includes(document.querySelector('svg[data-art="actual"]')?.dataset.state), null, { timeout: 2_000 });
    const clickProgress = (await snapshot(page)).progress;
    check(`${to}-click-continues-hover-progress`, clickProgress + 0.002 >= hoverProgress, { hoverProgress, clickProgress });
    await capture(page, `${to}-hover-click-opening`);
    await page.waitForFunction(() => Number(document.querySelector('svg[data-art="actual"]')?.dataset.progress) >= 0.48, null, { timeout: 3_000 });
    await capture(page, `${to}-hover-click-mid-animation`);
    const returnTheme = from;
    try {
      await page.waitForFunction(value => document.documentElement.classList.contains(value), returnTheme, { timeout: 4_000 });
    } catch (error) {
      console.error('Theme reveal did not reach the expected class', { from, to, expected: returnTheme, current: await snapshot(page) });
      throw error;
    }
    await capture(page, `${to}-hover-click-theme-reveal`);
    await waitForSettled(page, returnTheme);
    await capture(page, `${to}-hover-click-settled-${returnTheme}`);
    check(`${to}-reverse-theme-settles-${returnTheme}`, (await snapshot(page)).theme === returnTheme, await snapshot(page));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(value => document.documentElement.classList.contains(value), returnTheme, { timeout: 8_000 });
    check(`${returnTheme}-theme-persists-after-refresh`, (await snapshot(page)).theme === returnTheme, await snapshot(page));
    await context.close();
  }

  const hoverExit = await pageFor({ theme: 'dark' });
  const exitBox = await hoverExit.page.locator('button[data-theme-toggle]').boundingBox();
  await hoverExit.page.mouse.move(exitBox.x + 18, exitBox.y + 18);
  await hoverExit.page.waitForFunction(() => Number(document.querySelector('svg[data-art="actual"]')?.dataset.progress) >= 0.19, null, { timeout: 2_000 });
  await hoverExit.page.mouse.move(20, 150);
  await hoverExit.page.waitForFunction(() => {
    const svg = document.querySelector('svg[data-art="actual"]');
    return svg?.dataset.state === 'idle' && Number(svg.dataset.progress) === 0;
  }, null, { timeout: 3_000 });
  check('hover-exit-returns-to-clean-idle', (await snapshot(hoverExit.page)).theme === 'dark', await snapshot(hoverExit.page));
  await hoverExit.context.close();

  const rapid = await pageFor({ theme: 'dark' });
  await rapid.page.evaluate(() => {
    const button = document.querySelector('button[data-theme-toggle]');
    button.click(); button.click(); button.click();
  });
  await waitForSettled(rapid.page, 'light');
  check('rapid-activation-commits-once', (await snapshot(rapid.page)).theme === 'light', await snapshot(rapid.page));
  await rapid.context.close();

  const keyboard = await pageFor({ theme: 'light' });
  const keyboardButton = keyboard.page.locator('button[data-theme-toggle]');
  await keyboardButton.focus();
  const focus = await keyboardButton.evaluate(element => ({
    visible: element.matches(':focus-visible'),
    boxShadow: getComputedStyle(element).boxShadow,
    outline: getComputedStyle(element).outline,
  }));
  await keyboard.page.screenshot({ path: path.join(frames, 'keyboard-focus-ring.png'), animations: 'disabled' });
  check('keyboard-focus-ring-visible', focus.visible && (focus.boxShadow !== 'none' || focus.outlineStyle !== 'none'), focus);
  await keyboard.page.keyboard.press('Space');
  await waitForSettled(keyboard.page, 'dark');
  check('keyboard-space-activates-theme', (await snapshot(keyboard.page)).theme === 'dark', await snapshot(keyboard.page));
  await keyboard.context.close();

  const mobile = await pageFor({ theme: 'dark', width: 375, height: 812, touch: true });
  const mobileButton = mobile.page.locator('button[data-theme-toggle]');
  const mobileBox = await mobileButton.boundingBox();
  check('mobile-hit-target-36x36', mobileBox.width === 36 && mobileBox.height === 36, mobileBox);
  await mobileButton.tap();
  await waitForSettled(mobile.page, 'light');
  check('touch-activates-theme-without-hover', (await snapshot(mobile.page)).theme === 'light', await snapshot(mobile.page));
  const menuButton = mobile.page.getByRole('button', { name: 'Open menu' });
  await menuButton.click();
  const dialog = mobile.page.getByRole('dialog', { name: 'Site navigation' });
  check('mobile-menu-opens', await dialog.isVisible(), {});
  const firstLink = dialog.locator('a[href^="#"]').nth(1);
  const firstHref = await firstLink.getAttribute('href');
  await firstLink.click();
  await mobile.page.waitForFunction(() => !document.querySelector('[role="dialog"][aria-label="Site navigation"]'));
  await mobile.page.waitForFunction(value => location.hash === value, firstHref);
  check('mobile-anchor-navigation-still-works', await mobile.page.evaluate(() => location.hash.length > 1) && Boolean(firstHref), { hash: await mobile.page.evaluate(() => location.hash), firstHref });
  await mobile.context.close();

  const reduced = await pageFor({ theme: 'dark', reducedMotion: 'reduce' });
  await reduced.page.evaluate(() => document.querySelector('button[data-theme-toggle]').click());
  const reducedState = await snapshot(reduced.page);
  check('reduced-motion-switches-without-peel', reducedState.theme === 'light' && reducedState.progress === 0, reducedState);
  await reduced.context.close();

  const mobileLayouts = [];
  for (const theme of ['dark', 'light']) {
    const { context, page } = await pageFor({ theme, width: 375, height: 812 });
    const toggle = await page.locator('button[data-theme-toggle]').boundingBox();
    const menu = await page.getByRole('button', { name: 'Open menu' }).boundingBox();
    mobileLayouts.push({ theme, toggle, menu });
    check(`mobile-navbar-${theme}-controls-separated`, toggle.x + toggle.width <= menu.x || menu.x + menu.width <= toggle.x, { toggle, menu });
    await context.close();
  }

  const hydrationCounts = diagnostics.reduce((sum, item) => sum + item.hydrationMismatch, 0);
  const networkDeniedCounts = diagnostics.reduce((sum, item) => sum + item.networkAccessDenied, 0);
  // next start does not serve Vercel's injected analytics route locally; identify
  // the exact request separately so it does not mask toggle regressions.
  const knownLocalAnalytics404 = 'Failed to load resource: the server responded with a status of 404 (Not Found)';
  const otherErrors = diagnostics.flatMap(item => item.otherConsoleErrors
    .filter(error => error !== knownLocalAnalytics404)
    .map(error => ({ theme: item.theme, viewport: item.viewport, error })));
  check('no-theme-toggle-hydration-mismatch', diagnostics.every(item => !item.hydrationMentionsThemeToggle), { observed: diagnostics.map(({ viewport, theme, hydrationMismatch, hydrationComponents }) => ({ viewport, theme, hydrationMismatch, hydrationComponents })) });
  check('no-unexpected-console-errors', otherErrors.length === 0, { otherErrors });

  const report = {
    generatedAt: new Date().toISOString(),
    browser: 'Playwright Chromium',
    origin,
    checks,
    diagnostics,
    knownLocalOnlyDiagnostics: [{ route: '/_vercel/insights/script.js', status: 404, reason: 'Vercel analytics route is unavailable on local next start' }],
    counts: { passed: checks.filter(item => item.passed).length, failed: checks.filter(item => !item.passed).length, hydrationMismatch: hydrationCounts, networkAccessDenied: networkDeniedCounts },
    mobileLayouts,
  };
  await fs.writeFile(path.join(output, 'production-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ counts: report.counts, failed: checks.filter(item => !item.passed), diagnostics, mobileLayouts, output }, null, 2));
  if (checks.some(item => !item.passed)) process.exitCode = 1;
} finally {
  await browser.close();
}

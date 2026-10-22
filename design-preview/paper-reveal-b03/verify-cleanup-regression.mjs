import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const origin = process.env.B03_PREVIEW_URL ?? 'http://127.0.0.1:3000';
const output = process.env.B03_HOMEPAGE_OUTPUT_DIR
  ? path.resolve(process.env.B03_HOMEPAGE_OUTPUT_DIR)
  : path.join(here, 'captures', 'cleanup-final');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [];
const diagnostics = [];
function check(name, passed, details = {}) { checks.push({ name, passed: Boolean(passed), details }); }

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 375, height: 812 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: 'dark', reducedMotion: 'no-preference', deviceScaleFactor: 1,
      hasTouch: viewport.name === 'mobile', isMobile: viewport.name === 'mobile',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => {
      if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark');
      localStorage.setItem('portfolio-locale', 'id');
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('section#top');
    const hero = page.locator('section#top');
    const languageState = await page.evaluate(() => ({
      htmlLanguage: document.documentElement.lang,
      navLabels: [...document.querySelectorAll('header nav ul a')].map(link => link.textContent.trim()),
      heroLabel: document.querySelector('section#top')?.getAttribute('aria-label'),
      heroCopy: document.querySelector('section#top')?.innerText,
      storedLegacyLocale: localStorage.getItem('portfolio-locale'),
      languageToggle: document.querySelector('[aria-label="Language selection"]') !== null,
    }));
    const englishOnly = languageState.htmlLanguage === 'en' &&
      languageState.navLabels.join('|') === 'Home|Projects|Thinking|About' &&
      languageState.heroLabel === 'QUALITY ENGINEERING' &&
      languageState.heroCopy.toLowerCase().includes('software quality assurance engineer') &&
      languageState.heroCopy.includes('Clarity before speed.') &&
      languageState.storedLegacyLocale === 'id' &&
      !languageState.languageToggle;
    check(`${viewport.name}-english-only-content-ignores-legacy-locale`, englishOnly, languageState);
    const heading = hero.getByRole('heading', { level: 1 }).first();
    const cta = hero.locator('a[href="#qa-motion"]').first();
    const image = hero.locator('img[alt="Hambali Fadib"]').first();
    await image.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const img = document.querySelector('section#top img[alt="Hambali Fadib"]');
      return img?.complete && img.naturalWidth > 0;
    }, null, { timeout: 10_000 });
    const heroVisible = await hero.isVisible();
    const headingVisible = await heading.isVisible();
    const ctaVisible = await cta.isVisible();
    const imageBox = await image.boundingBox();
    const gridColumns = await hero.locator(':scope > div').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    check(`${viewport.name}-hero-and-portrait-render`, heroVisible && headingVisible && ctaVisible && imageBox.width > 0 && imageBox.x >= 0 && imageBox.x + imageBox.width <= viewport.width, { heroVisible, headingVisible, ctaVisible, imageBox, gridColumns });
    check(`${viewport.name}-responsive-hero-columns`, viewport.name === 'desktop' ? gridColumns === 2 : gridColumns === 1, { gridColumns, viewportWidth: viewport.width });

    const nav = page.locator('header nav ul').first();
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    if (viewport.name === 'desktop') {
      check('desktop-navigation-visible', await nav.isVisible() && await menuButton.isHidden(), { navVisible: await nav.isVisible(), menuHidden: await menuButton.isHidden() });
    } else {
      const mobileNavHidden = await nav.isHidden();
      const menuVisible = await menuButton.isVisible();
      await menuButton.click();
      const dialog = page.getByRole('dialog', { name: 'Site navigation' });
      const menuOpen = await dialog.isVisible();
      check('mobile-navigation-opens', mobileNavHidden && menuVisible && menuOpen, { mobileNavHidden, menuVisible, menuOpen });
      await page.getByRole('button', { name: 'Close menu' }).click();
    }

    const missingTargets = await page.evaluate(() => {
      const anchors = [...document.querySelectorAll('header a[href^="#"], section#top a[href^="#"]')];
      return [...new Set(anchors.map(anchor => anchor.getAttribute('href')).filter(href => href && href.length > 1 && !document.getElementById(href.slice(1))))];
    });
    check(`${viewport.name}-navigation-and-cta-anchor-targets-exist`, missingTargets.length === 0, { missingTargets });

    await image.scrollIntoViewIfNeeded();
    const box = await image.boundingBox();
    await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.46);
    const canvas = page.locator('[data-ascii-lens] canvas');
    await canvas.waitFor({ state: 'visible', timeout: 3_000 });
    const first = await canvas.evaluate(element => {
      const pixels = element.getContext('2d').getImageData(0, 0, element.width, element.height).data;
      let alphaPixels = 0; let colorVariety = new Set();
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0) alphaPixels++;
        if (pixels[i + 3] > 0) colorVariety.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
      }
      return { width: element.width, height: element.height, alphaPixels, colorVariety: colorVariety.size, dataUrl: element.toDataURL() };
    });
    await page.mouse.move(box.x + box.width * 0.69, box.y + box.height * 0.58);
    await page.waitForFunction(previous => document.querySelector('[data-ascii-lens] canvas')?.toDataURL() !== previous, first.dataUrl, { timeout: 3_000 });
    const moved = await canvas.evaluate(element => ({ width: element.width, height: element.height, dataUrl: element.toDataURL() }));
    await page.screenshot({ path: path.join(output, `${viewport.name}-ascii-lens-hover.png`), animations: 'disabled' });
    check(`${viewport.name}-ascii-lens-zooms-and-follows-pointer`, first.width === 180 && first.height === 180 && first.alphaPixels > 10_000 && first.colorVariety > 10 && moved.dataUrl !== first.dataUrl, { initial: { width: first.width, height: first.height, alphaPixels: first.alphaPixels, colorVariety: first.colorVariety }, changedAfterPointerMove: moved.dataUrl !== first.dataUrl });
    await page.mouse.move(10, 100);
    await page.waitForFunction(() => !document.querySelector('[data-ascii-lens] canvas'));
    check(`${viewport.name}-ascii-lens-clears-on-pointer-exit`, await canvas.count() === 0, {});

    diagnostics.push({ viewport: viewport.name, consoleErrors: errors.map(message => message.split('\n')[0]) });
    await context.close();
  }

  const missing = checks.filter(item => !item.passed);
  const report = { generatedAt: new Date().toISOString(), origin, browser: 'Playwright Chromium', checks, diagnostics, counts: { passed: checks.filter(item => item.passed).length, failed: missing.length }, note: 'Missing anchor targets reflect the current source shape: app/page.tsx renders DarkEditorialHero, which only defines #top. No route or navigation source was changed by repository cleanup.' };
  await fs.writeFile(path.join(output, 'repository-regression.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ counts: report.counts, failed: missing, diagnostics, output: path.join(output, 'repository-regression.json') }, null, 2));
  // Every homepage assertion is authoritative; no special exemption for missing anchors.
  if (checks.length !== 14 || missing.length !== 0) process.exitCode = 1;
} finally { await browser.close(); }

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { observeBrowserErrors } from "./browser-error-observer.mjs";

const origin = process.env.THEME_TOGGLE_PREVIEW_URL ?? "http://localhost:3011";
const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const output = path.resolve(process.env.THEME_TOGGLE_OUTPUT_DIR ?? path.join(os.tmpdir(), "fadibfolio-theme-toggle", timestamp));
const viewports = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 760 },
];
const failures = [];
const browserErrors = [];
const telemetryBlocked = [];
const expectedNavigationAborts = [];
const checks = [];

function check(name, passed, details = {}) {
  checks.push({ name, passed: Boolean(passed), details });
  if (!passed) failures.push({ name, details });
}

function observe(page, label) {
  observeBrowserErrors(page, { label, origin, errors: browserErrors, telemetryBlocked, expectedNavigationAborts });
}

async function openPage(persona, theme, viewport) {
  const page = await browser.newPage({ viewport });
  observe(page, `${persona}/${theme}/${viewport.width}`);
  await page.goto(`${origin}/?persona=${persona}&theme=${theme}`, { waitUntil: "domcontentloaded" });
  await page.locator('header [data-theme-toggle]').waitFor({ state: "visible" });
  await page.locator("#top h1").waitFor({ state: "visible" });
  return page;
}

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    for (const persona of ["qa", "fullstack"]) {
      for (const theme of ["light", "dark"]) {
        const page = await openPage(persona, theme, viewport);
        const button = page.locator('header [data-theme-toggle]');
        const original = await button.evaluate(element => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            width: rect.width,
            height: rect.height,
            radius: style.borderTopLeftRadius,
            label: element.getAttribute("aria-label"),
            title: element.getAttribute("title"),
            theme: document.querySelector(".identity-surface")?.getAttribute("data-appearance"),
            scrollWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth,
            iconCount: element.querySelectorAll("svg").length,
          };
        });
        check(`${persona}/${theme}/${viewport.width}-size-radius-label-tooltip`,
          original.width === 44 && original.height === 44 && original.radius === "14px" &&
          original.label === `Switch to ${theme === "light" ? "dark" : "light"} mode` &&
          original.title === null && original.iconCount === 2, original);
        check(`${persona}/${theme}/${viewport.width}-no-horizontal-overflow`, original.scrollWidth === original.viewportWidth, original);

        await button.hover();
        await page.waitForTimeout(220);
        check(`${persona}/${theme}/${viewport.width}-hover-does-not-switch-theme`,
          await page.locator(".identity-surface").getAttribute("data-appearance") === theme, {});
        await page.mouse.move(8, 8);
        await page.waitForTimeout(220);
        check(`${persona}/${theme}/${viewport.width}-pointer-leave-does-not-switch-theme`,
          await page.locator(".identity-surface").getAttribute("data-appearance") === theme, {});

        await button.click();
        const next = theme === "light" ? "dark" : "light";
        await page.waitForFunction(value => document.querySelector(".identity-surface")?.getAttribute("data-appearance") === value, next);
        check(`${persona}/${theme}/${viewport.width}-one-click-updates-url-and-persistence`,
          new URL(page.url()).searchParams.get("theme") === next &&
          await page.evaluate(value => localStorage.getItem("theme") === value && document.cookie.split("; ").includes(`theme=${value}`), next),
          { next, url: page.url() });
        const iconState = await button.evaluate(element => [...element.querySelectorAll("svg")].map(icon => Number(getComputedStyle(icon).opacity)));
        check(`${persona}/${theme}/${viewport.width}-sun-moon-crossfade`, iconState.length === 2 && iconState.some(value => value < 1) && iconState.some(value => value > 0), iconState);
        await page.waitForTimeout(230);
        check(`${persona}/${theme}/${viewport.width}-theme-transition-clears`,
          await page.evaluate(() => !document.documentElement.classList.contains("theme-transitioning")), {});

        await button.click();
        await page.waitForFunction(value => document.querySelector(".identity-surface")?.getAttribute("data-appearance") === value, theme);
        check(`${persona}/${theme}/${viewport.width}-repeated-click-returns-to-origin`,
          new URL(page.url()).searchParams.get("theme") === theme, { theme, url: page.url() });
        await page.close();
      }
    }
  }

  const keyboard = await openPage("qa", "light", viewports[0]);
  const keyboardButton = keyboard.locator('header [data-theme-toggle]');
  for (let index = 0; index < 12; index += 1) {
    if (await keyboardButton.evaluate(element => document.activeElement === element)) break;
    await keyboard.keyboard.press("Tab");
  }
  const focusVisible = await keyboardButton.evaluate(element => element.matches(":focus-visible"));
  check("keyboard-focus-visible", focusVisible, {});
  await keyboard.keyboard.press("Enter");
  await keyboard.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-appearance") === "dark");
  check("keyboard-enter-activates-and-updates-label", await keyboardButton.getAttribute("aria-label") === "Switch to light mode", {});
  await keyboard.close();

  const reduced = await browser.newPage({ viewport: viewports[0], reducedMotion: "reduce" });
  observe(reduced, "reduced-motion");
  await reduced.goto(`${origin}/?persona=qa&theme=light`, { waitUntil: "domcontentloaded" });
  const reducedButton = reduced.locator('header [data-theme-toggle]');
  const reducedStyle = await reducedButton.locator("svg").first().evaluate(element => ({
    property: getComputedStyle(element).transitionProperty,
    buttonProperty: getComputedStyle(element.parentElement).transitionProperty,
  }));
  check("reduced-motion-disables-icon-and-button-transition",
    reducedStyle.property === "none" && reducedStyle.buttonProperty === "none", reducedStyle);
  await reducedButton.click();
  await reduced.waitForFunction(() => document.querySelector(".identity-surface")?.getAttribute("data-appearance") === "dark");
  await reduced.waitForTimeout(30);
  const running = await reducedButton.locator("svg").evaluateAll(icons => icons.reduce((count, icon) => count + icon.getAnimations().filter(animation => animation.playState === "running").length, 0));
  check("reduced-motion-switches-without-running-animation", running === 0, { running });
  await reduced.close();
} finally {
  await browser.close();
}

if (browserErrors.length) failures.push({ name: "no-unexpected-browser-errors", details: browserErrors });
const report = {
  generatedAt: new Date().toISOString(),
  browser: "Playwright Chromium",
  origin,
  counts: { passed: checks.filter(item => item.passed).length, failed: checks.filter(item => !item.passed).length },
  checks,
  browserErrors,
  telemetryBlocked,
  expectedNavigationAborts,
  failures,
};
await fs.writeFile(path.join(output, "theme-toggle-verification.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output, counts: report.counts, failures }, null, 2));
if (failures.length) process.exitCode = 1;

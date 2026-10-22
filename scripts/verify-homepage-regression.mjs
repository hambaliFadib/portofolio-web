import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EXPECTED_HOMEPAGE_CHECKS = Object.freeze([
  "desktop-english-only-content-ignores-legacy-locale",
  "desktop-hero-and-portrait-render",
  "desktop-responsive-hero-columns",
  "desktop-navigation-visible",
  "desktop-navigation-and-cta-anchor-targets-exist",
  "desktop-ascii-lens-zooms-and-follows-pointer",
  "desktop-ascii-lens-clears-on-pointer-exit",
  "mobile-english-only-content-ignores-legacy-locale",
  "mobile-hero-and-portrait-render",
  "mobile-responsive-hero-columns",
  "mobile-navigation-opens",
  "mobile-navigation-and-cta-anchor-targets-exist",
  "mobile-ascii-lens-zooms-and-follows-pointer",
  "mobile-ascii-lens-clears-on-pointer-exit",
]);

export function verifyHomepageReport(report, expectedOrigin = "http://127.0.0.1:3000") {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Homepage report must be an object.");
  }
  if (report.browser !== "Playwright Chromium" || report.origin !== expectedOrigin) {
    throw new Error("Homepage report browser or tested origin does not match the expected runtime.");
  }
  if (!Array.isArray(report.checks) || report.checks.length !== EXPECTED_HOMEPAGE_CHECKS.length) {
    throw new Error("Homepage report must contain exactly fourteen checks.");
  }
  const names = new Set();
  const expected = new Set(EXPECTED_HOMEPAGE_CHECKS);
  for (const [index, check] of report.checks.entries()) {
    if (!check || typeof check !== "object" || Array.isArray(check) ||
        typeof check.name !== "string" || !expected.has(check.name) ||
        names.has(check.name) || typeof check.passed !== "boolean") {
      throw new Error("Unknown, duplicate or malformed homepage check at index " + index + ".");
    }
    names.add(check.name);
    if (!check.passed) throw new Error("Homepage assertion failed: " + check.name);
  }
  if (names.size !== expected.size || [...expected].some((name) => !names.has(name))) {
    throw new Error("Homepage report is missing a required check.");
  }
  if (!report.counts || report.counts.passed !== expected.size || report.counts.failed !== 0) {
    throw new Error("Homepage report has inconsistent pass/fail counts.");
  }
  if (!Array.isArray(report.diagnostics) || report.diagnostics.length !== 2 ||
      new Set(report.diagnostics.map((d) => d?.viewport)).size !== 2 ||
      !report.diagnostics.some((d) => d?.viewport === "desktop") ||
      !report.diagnostics.some((d) => d?.viewport === "mobile")) {
    throw new Error("Homepage report must contain distinct desktop and mobile diagnostics.");
  }
  return { passed: expected.size, failed: 0, reportStatus: "verified" };
}

export function readAndVerifyHomepageReport(filename, expectedOrigin) {
  const absolute = path.resolve(filename);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    throw new Error("Homepage regression evidence is missing: " + absolute);
  }
  if (fs.statSync(absolute).size > 4 * 1024 * 1024) {
    throw new Error("Homepage regression evidence exceeds the approved maximum size.");
  }
  let report;
  try {
    report = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch {
    throw new Error("Homepage regression evidence is not valid JSON.");
  }
  return verifyHomepageReport(report, expectedOrigin);
}

function main() {
  const filename = process.argv[2];
  if (!filename) throw new Error("Usage: node scripts/verify-homepage-regression.mjs <report.json>");
  const result = readAndVerifyHomepageReport(filename, process.env.B03_PREVIEW_URL || "http://127.0.0.1:3000");
  console.log("Homepage regression: " + JSON.stringify(result));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

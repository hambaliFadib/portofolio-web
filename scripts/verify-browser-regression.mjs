import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAndVerifyHomepageReport } from './verify-homepage-regression.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = process.env.PORTFOLIO_PREVIEW_URL ?? 'http://127.0.0.1:3000';
const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const defaultArtifactRoot = path.join(os.tmpdir(), 'fadibfolio-regression');
const artifactRoot = process.env.CI_EVIDENCE_DIR
  ? path.resolve(process.env.CI_EVIDENCE_DIR)
  : defaultArtifactRoot;
const outputRoot = process.env.PORTFOLIO_BROWSER_OUTPUT_DIR
  ? path.resolve(process.env.PORTFOLIO_BROWSER_OUTPUT_DIR)
  : path.join(artifactRoot, `${timestamp}-${randomUUID()}`);
const themeOutput = path.join(outputRoot, 'theme-toggle');
const homepageOutput = path.join(outputRoot, 'homepage');
const identityOutput = path.join(outputRoot, 'identity');

if (path.dirname(outputRoot) !== artifactRoot) {
  throw new Error(`Browser regression output must be a unique child of ${artifactRoot}`);
}

try {
  const response = await fetch(origin);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
} catch {
  console.error(`No app responding at ${origin}. Run npm run build, then npm run start in another terminal.`);
  process.exit(1);
}

await fs.mkdir(artifactRoot, { recursive: true });
await fs.mkdir(outputRoot, { recursive: false });
await fs.writeFile(path.join(outputRoot, '.fadibfolio-session.json'), `${JSON.stringify({ version: 1, repository: root }, null, 2)}\n`, { flag: 'wx' });
console.log(`Temporary regression output: ${outputRoot}`);

const suites = [
  {
    name: 'Theme Toggle',
    script: 'scripts/verify-theme-toggle.mjs',
    env: {
      THEME_TOGGLE_OUTPUT_DIR: themeOutput,
      THEME_TOGGLE_PREVIEW_URL: origin,
    },
  },
  {
    name: 'Homepage, navbar, ASCII Lens',
    script: 'design-preview/paper-reveal-b03/verify-cleanup-regression.mjs',
    env: { PORTFOLIO_HOMEPAGE_OUTPUT_DIR: homepageOutput },
  },
  {
    name: 'Identity, persona, browser metadata',
    script: 'scripts/verify-approved-identity.mjs',
    env: {
      IDENTITY_EVIDENCE_DIR: identityOutput,
      IDENTITY_PREVIEW_URL: origin,
    },
  },
];

let failed = false;
const suiteResults = [];

for (const suite of suites) {
  console.log(`\n=== ${suite.name} ===`);
  const result = spawnSync(process.execPath, [path.join(root, suite.script)], {
    cwd: root,
    env: { ...process.env, PORTFOLIO_PREVIEW_URL: origin, ...suite.env },
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  suiteResults.push({ name: suite.name, status: result.status });
  if (result.status !== 0) failed = true;
}

const evidenceFailures = [];
try {
  const homepage = readAndVerifyHomepageReport(path.join(homepageOutput, 'repository-regression.json'), origin);
  const theme = JSON.parse(await fs.readFile(path.join(themeOutput, 'theme-toggle-verification.json'), 'utf8'));
  const identity = JSON.parse(await fs.readFile(path.join(identityOutput, 'results.json'), 'utf8'));

  if (!theme.counts || theme.counts.passed !== theme.checks?.length || theme.counts.failed !== 0 ||
      theme.checks.some((check) => check.passed !== true) || theme.browserErrors?.length || theme.failures?.length) {
    throw new Error('Theme Toggle evidence has missing, failed, or inconsistent checks.');
  }
  if (!Array.isArray(identity.firstPaint) || identity.firstPaint.length !== 16 ||
      !Array.isArray(identity.metadata) || identity.metadata.length < 17 ||
      !Array.isArray(identity.errors) || identity.errors.length ||
      !Array.isArray(identity.failures) || identity.failures.length) {
    throw new Error('Identity/persona evidence has missing checks, browser errors, or failures.');
  }
  console.log(`Validated regression evidence: homepage ${homepage.passed}/${homepage.passed}, Theme Toggle ${theme.counts.passed}/${theme.counts.passed}, identity first paint ${identity.firstPaint.length}/16 and metadata ${identity.metadata.length}.`);
} catch (error) {
  evidenceFailures.push(error.message);
  failed = true;
  console.error(`Browser regression evidence invalid: ${error.message}`);
}

await fs.writeFile(path.join(outputRoot, 'browser-regression-summary.json'), `${JSON.stringify({ origin, suiteResults, evidenceFailures, failed }, null, 2)}\n`);
console.log(`\nRegression evidence: ${outputRoot}`);
if (failed) process.exitCode = 1;

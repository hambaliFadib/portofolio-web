import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = process.env.B03_PREVIEW_URL ?? 'http://127.0.0.1:3000';
const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const artifactRoot = path.join(os.tmpdir(), 'fadibfolio-regression');
const outputRoot = process.env.B03_OUTPUT_DIR
  ? path.resolve(process.env.B03_OUTPUT_DIR)
  : path.join(artifactRoot, `${timestamp}-${randomUUID()}`);
const themeOutput = path.join(outputRoot, 'theme-reveal');
const homepageOutput = path.join(outputRoot, 'homepage');

if (path.dirname(outputRoot) !== artifactRoot) {
  throw new Error(`Output must be a unique session directly under ${artifactRoot}`);
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
    name: 'B03 theme reveal',
    script: 'design-preview/paper-reveal-b03/verify-production.mjs',
    env: {
      B03_PRODUCTION_OUTPUT_DIR: themeOutput,
      B03_PRODUCTION_FRAMES_DIR: path.join(themeOutput, 'frames'),
    },
  },
  {
    name: 'Homepage, navbar, ASCII Lens',
    script: 'design-preview/paper-reveal-b03/verify-cleanup-regression.mjs',
    env: { B03_HOMEPAGE_OUTPUT_DIR: homepageOutput },
  },
];

let failed = false;

for (const suite of suites) {
  console.log(`\n=== ${suite.name} ===`);
  const result = spawnSync(process.execPath, [path.join(root, suite.script)], {
    cwd: root,
    env: { ...process.env, B03_PREVIEW_URL: origin, ...suite.env },
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) failed = true;
}

console.log(`\nRegression evidence: ${outputRoot}`);
if (failed) process.exitCode = 1;

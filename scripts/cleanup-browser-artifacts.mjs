import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactRoot = path.join(os.tmpdir(), 'fadibfolio-regression');
const [flag, suppliedPath, ...extra] = process.argv.slice(2);

if (flag !== '--session' || !suppliedPath || extra.length) {
  console.error('Usage: npm run cleanup:browser-artifacts -- --session <session-directory>');
  process.exit(2);
}

const sessionPath = path.resolve(suppliedPath);
if (path.dirname(sessionPath) !== artifactRoot || sessionPath === artifactRoot) {
  throw new Error(`Refusing cleanup outside the direct session folders under ${artifactRoot}`);
}

const sessionStat = await fs.lstat(sessionPath);
if (!sessionStat.isDirectory() || sessionStat.isSymbolicLink()) {
  throw new Error('Refusing cleanup: session path is not a regular directory.');
}

const sessionInfoPath = path.join(sessionPath, '.fadibfolio-session.json');
try {
  const sessionInfo = JSON.parse(await fs.readFile(sessionInfoPath, 'utf8'));
  if (sessionInfo.version !== 1 || path.resolve(sessionInfo.repository) !== repositoryRoot) {
    throw new Error('Refusing cleanup: session marker does not belong to this repository.');
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const legacySessionName = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;
  if (!legacySessionName.test(path.basename(sessionPath))) {
    throw new Error('Refusing cleanup: session marker missing and path is not a recognized legacy session.');
  }
}

await fs.rm(sessionPath, { recursive: true, force: false });
console.log(`Removed regression session: ${sessionPath}`);

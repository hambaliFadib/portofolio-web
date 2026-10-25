import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

export const ITERATIONS = 10;
export const EXPECTED = Object.freeze({ b03: 31, homepage: 14, qa: 7 });
const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const REQUIRED_B03_FRAMES = [
  'dark-idle-click-theme-reveal.png', 'light-idle-click-theme-reveal.png',
  'dark-hover-click-theme-reveal.png', 'light-hover-click-theme-reveal.png',
];
function readJson(filename) {
  if (!existsSync(filename) || !statSync(filename).isFile()) throw new Error('Missing evidence: ' + filename);
  const bytes = statSync(filename).size;
  if (!bytes || bytes > 8 * 1024 * 1024) throw new Error('Invalid evidence size: ' + filename);
  return JSON.parse(readFileSync(filename, 'utf8'));
}
function immutableCheckout(root, expectedSha) {
  if (!/^[a-f0-9]{40}$/.test(expectedSha)) throw new Error('Invalid SHA for ' + root);
  const run = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 10_000 });
  if (run.status !== 0 || run.stdout.trim() !== expectedSha) throw new Error('Source SHA mismatch: ' + root);
}
export function verifyB03(root) {
  const r = readJson(path.join(root, 'production-verification.json'));
  if (!Array.isArray(r.checks) || r.checks.length !== 31 ||
      r.counts?.passed !== 31 || r.counts?.failed !== 0) throw new Error('B03 count mismatch');
  const names = r.checks.map(x => x?.name);
  if (names.some(x => typeof x !== 'string' || !x.trim()) ||
      new Set(names).size !== 31 || r.checks.some(x => x.passed !== true)) {
    throw new Error('B03 duplicate, malformed or failed assertion');
  }
  for (const name of REQUIRED_B03_FRAMES) {
    const file = path.join(root, 'frames', name);
    if (!existsSync(file) || !statSync(file).isFile() || statSync(file).size < 8 ||
        !readFileSync(file).subarray(0, 8).equals(PNG_MAGIC)) throw new Error('Invalid B03 frame: ' + name);
  }
  return names.sort();
}
export function verifyHomepage(root) {
  const r = readJson(path.join(root, 'repository-regression.json'));
  if (!Array.isArray(r.checks) || r.checks.length !== 14 ||
      r.counts?.passed !== 14 || r.counts?.failed !== 0 ||
      r.checks.some(c => c.passed !== true || typeof c.name !== 'string') ||
      new Set(r.checks.map(c => c.name)).size !== 14 ||
      !Array.isArray(r.diagnostics) || r.diagnostics.length !== 2) {
    throw new Error('Homepage 14/14 evidence invalid');
  }
  return r.checks.map(c => c.name).sort();
}
export function verifyObservation(root, suite) {
  const r = readJson(path.join(root, 'reliability-observation.json'));
  if (r.schemaVersion !== 1 || r.kind !== 'portfolio-regression-reliability-observation' ||
      r.suite !== suite || r.origin !== 'http://127.0.0.1:3000' ||
      !Array.isArray(r.timings) || !r.timings.length || !Array.isArray(r.browserEvents) ||
      r.limits?.timingTruncated !== false || r.limits?.eventTruncated !== false ||
      r.timings.some(t => t.outcome !== 'success')) throw new Error('Invalid observations: ' + suite);
  return { timings: r.timings.length, browserEvents: r.browserEvents.length };
}
function runNode(label, cwd, args, filename, extraEnv, timeout) {
  const started = performance.now();
  const result = spawnSync(process.execPath, args, {
    cwd, env: { ...process.env, ...extraEnv }, encoding: 'utf8',
    timeout, killSignal: 'SIGTERM', maxBuffer: 12 * 1024 * 1024,
  });
  const log = [result.stdout ?? '', result.stderr ?? '', result.error?.message ?? ''].join('\n');
  writeFileSync(filename, log);
  const passed = result.status === 0 && !result.error && !result.signal;
  if (!passed) console.error(label + ' failed: ' + (result.error?.message || result.signal || result.status) +
    '\n' + log.split('\n').slice(-14).join('\n'));
  return { passed, durationMs: Math.round(performance.now()-started), exitCode: result.status,
    signal: result.signal ?? null };
}
function verify(label, fn) {
  try { return { passed: true, value: fn(), error: null }; }
  catch(e) { console.error(label + ': ' + e.message); return { passed: false, value: null, error: e.message }; }
}
export function summarize(iterations, meta) {
  const totals = Object.fromEntries(Object.keys(EXPECTED).map(name =>
    [name, iterations.filter(x => x.stages[name]?.passed).length]));
  const passed = iterations.length === ITERATIONS && Object.values(totals).every(x => x === ITERATIONS);
  return {
    schemaVersion: 1, kind: 'portfolio-same-sha-stability-probe',
    ...meta, expectedIterations: ITERATIONS, completedIterations: iterations.length,
    expectedChecksPerIteration: EXPECTED, observedPassingIterations: totals,
    expectedTotalChecks: ITERATIONS * 52, passed,
    classification: passed ? 'NO_FAILURE_OBSERVED_IN_SAMPLE' : 'FAIL_OR_INCOMPLETE',
    note: 'Ten sequential runs against identical app and QA commits; no retries. Not statistical proof of zero flakiness.',
    iterations,
  };
}
function save(output, meta, iterations) {
  const result = summarize(iterations, meta);
  writeFileSync(path.join(output, 'stability-report.json'), JSON.stringify(result, null, 2) + '\n');
  const rows = ['iteration,b03,homepage,qa,b03_ms,homepage_ms,qa_ms'];
  for (const i of iterations) rows.push([i.iteration,
    ...Object.keys(EXPECTED).map(s => i.stages[s]?.passed ? 'PASS' : 'FAIL'),
    ...Object.keys(EXPECTED).map(s => i.stages[s]?.durationMs ?? ''),
  ].join(','));
  writeFileSync(path.join(output, 'stability-results.csv'), rows.join('\n') + '\n');
  return result;
}
async function main() {
  for (const name of ['PORTFOLIO_APP_ROOT','PORTFOLIO_QA_ROOT','P4D1B_OUTPUT_DIR','P4D1B_APP_SHA','P4D1B_QA_SHA']) {
    if (!process.env[name]) throw new Error('Missing ' + name);
  }
  const app = path.resolve(process.env.PORTFOLIO_APP_ROOT);
  const qa = path.resolve(process.env.PORTFOLIO_QA_ROOT);
  const output = path.resolve(process.env.P4D1B_OUTPUT_DIR);
  if (app === qa || app === path.resolve(process.cwd()) || qa === path.resolve(process.cwd())) {
    throw new Error('Checkout roots are not isolated');
  }
  immutableCheckout(app, process.env.P4D1B_APP_SHA);
  immutableCheckout(qa, process.env.P4D1B_QA_SHA);
  mkdirSync(output, { recursive: true });
  const meta = { appSha: process.env.P4D1B_APP_SHA, qaSha: process.env.P4D1B_QA_SHA,
    probeSha: process.env.GITHUB_SHA || null,
    event: process.env.GITHUB_EVENT_NAME || null, runId: process.env.GITHUB_RUN_ID || null };
  const iterations = [];
  let b03Names, homeNames;
  for (let index = 1; index <= ITERATIONS; index++) {
    const id = String(index).padStart(2, '0');
    const dir = path.join(output, 'iteration-' + id);
    const b03 = path.join(dir, 'b03'), home = path.join(dir, 'homepage');
    mkdirSync(b03, { recursive: true });
    mkdirSync(home, { recursive: true });
    console.log('::group::Iteration ' + id + ' / ' + ITERATIONS);
    const item = { iteration: index, stages: {} };
    const a = runNode('B03', app, ['design-preview/paper-reveal-b03/verify-production.mjs'],
      path.join(dir, 'b03.log'),
      { B03_PREVIEW_URL: 'http://127.0.0.1:3000', B03_PRODUCTION_OUTPUT_DIR: b03,
        B03_PRODUCTION_FRAMES_DIR: path.join(b03, 'frames') }, 120_000);
    const ae = verify('B03 evidence', () => {
      const names = verifyB03(b03), obs = verifyObservation(b03, 'b03');
      if (b03Names && JSON.stringify(b03Names) !== JSON.stringify(names)) throw new Error('B03 check names changed');
      b03Names = names; return obs;
    });
    item.stages.b03 = { ...a, passed: a.passed && ae.passed, evidence: ae.value, error: ae.error };
    const h = runNode('Homepage', app, ['design-preview/paper-reveal-b03/verify-cleanup-regression.mjs'],
      path.join(dir, 'homepage.log'),
      { B03_PREVIEW_URL: 'http://127.0.0.1:3000', B03_HOMEPAGE_OUTPUT_DIR: home }, 60_000);
    const hg = runNode('Homepage evidence gate', app,
      ['scripts/verify-homepage-regression.mjs', path.join(home, 'repository-regression.json')],
      path.join(dir, 'homepage-gate.log'), { B03_PREVIEW_URL: 'http://127.0.0.1:3000' }, 15_000);
    const he = verify('Homepage evidence', () => {
      const names = verifyHomepage(home), obs = verifyObservation(home, 'homepage');
      if (homeNames && JSON.stringify(homeNames) !== JSON.stringify(names)) throw new Error('Homepage check names changed');
      homeNames = names; return obs;
    });
    item.stages.homepage = { ...h, passed: h.passed && hg.passed && he.passed,
      strictGatePassed: hg.passed, evidence: he.value, error: he.error };
    const report = path.join(dir, 'qa-all-results.json');
    const q = runNode('QA', qa, ['node_modules/@playwright/test/cli.js', 'test', '--workers=1',
      '--retries=0', '--trace=retain-on-failure'],
      path.join(dir, 'qa.log'),
      { CI: 'true', BASE_URL: 'http://127.0.0.1:3000', PORTFOLIO_APP_ROOT: app,
        PORTFOLIO_APP_TEST_SHA: meta.appSha, PLAYWRIGHT_JSON_REPORT: report }, 90_000);
    const qg = runNode('QA report gate', qa, ['scripts/verify-test-report.js', report],
      path.join(dir, 'qa-gate.log'), {}, 15_000);
    item.stages.qa = { ...q, passed: q.passed && qg.passed, strictGatePassed: qg.passed };
    if (!item.stages.qa.passed) for (const folder of ['test-results','playwright-report']) {
      const source = path.join(qa, folder);
      if (existsSync(source)) cpSync(source, path.join(dir, 'qa-'+folder), { recursive: true, force: true });
    }
    iterations.push(item);
    save(output, meta, iterations);
    console.log('Iteration ' + id + ': ' + Object.entries(item.stages).map(([k,v]) =>
      k + '=' + (v.passed ? 'PASS':'FAIL')).join(', '));
    console.log('::endgroup::');
  }
  const result = save(output, meta, iterations);
  console.log('P4-D1b final: ' + JSON.stringify({ result: result.classification, appSha: meta.appSha,
    qaSha: meta.qaSha, counts: result.observedPassingIterations, expectedTotalChecks: result.expectedTotalChecks }));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = ['## P4-D1b Same-SHA Stability Test', '',
      'Application SHA: '+meta.appSha, 'QA SHA: '+meta.qaSha, '',
      '| Suite | Successful iterations | Total |','|---|---:|---:|',
      ...Object.entries(result.observedPassingIterations).map(([k,n]) => '| '+k+' | '+n+' | 10 |'),
      '', 'Decision: '+result.classification+'. Test retries: 0.', ''];
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'), { flag: 'a' });
  }
  if (!result.passed) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.stack || e.message); process.exitCode = 1; });
}

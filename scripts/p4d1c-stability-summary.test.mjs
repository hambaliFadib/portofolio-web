import assert from 'node:assert/strict';
import { summarize, ITERATIONS, EXPECTED } from './p4d1b-stability-probe.mjs';

function sample() {
  return Array.from({ length: ITERATIONS }, (_, index) => ({
    iteration: index + 1,
    stages: {
      b03: { passed: true, exitCode: 0, signal: null, durationMs: 1,
        evidence: { timings: 1, browserEvents: 0 } },
      homepage: { passed: true, exitCode: 0, signal: null, durationMs: 1,
        strictGatePassed: true, evidence: { timings: 1, browserEvents: 0 } },
      qa: { passed: true, exitCode: 0, signal: null, durationMs: 1,
        strictGatePassed: true },
    },
  }));
}
const valid = summarize(sample(), {});
assert.equal(valid.passed, true);
assert.equal(valid.expectedTotalChecks, ITERATIONS * Object.values(EXPECTED).reduce((a, b) => a + b, 0));
const invalid = [
  ['duplicate iteration', rows => { rows[9].iteration = 9; }],
  ['out-of-order iteration', rows => { [rows[0], rows[1]] = [rows[1], rows[0]]; }],
  ['exit code masks failure', rows => { rows[2].stages.b03.exitCode = 1; }],
  ['missing strict QA gate', rows => { rows[1].stages.qa.strictGatePassed = false; }],
  ['missing homepage evidence', rows => { delete rows[4].stages.homepage.evidence; }],
  ['signal masks failure', rows => { rows[4].stages.qa.signal = 'SIGTERM'; }],
  ['missing B03 stage', rows => { delete rows[3].stages.b03; }],
  ['invalid duration', rows => { rows[0].stages.qa.durationMs = -1; }],
];
for (const [name, mutate] of invalid) {
  const rows = sample();
  mutate(rows);
  const report = summarize(rows, {});
  assert.equal(report.passed, false, name);
  assert.equal(report.classification, 'FAIL_OR_INCOMPLETE', name);
}
assert.equal(summarize([], {}).passed, false);
console.log('P4-D1c summary self-test: 1 positive and 9 negative cases passed.');

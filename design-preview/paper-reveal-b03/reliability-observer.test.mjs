import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createReliabilityObserver } from './reliability-observer.mjs';

const origin = 'http://127.0.0.1:3000';
const observer = createReliabilityObserver({ suite: 'homepage', origin });
const never = new Promise(() => {});
const error = new Error('original navigation timeout');
const hungPage = { isClosed: () => false, evaluate: () => never };
const t0 = performance.now();
await assert.rejects(observer.measure('hung-evaluate', hungPage, async () => { throw error; }),
  (received) => received === error, 'original error must be preserved');
const elapsed = performance.now() - t0;
assert.ok(elapsed >= 1200 && elapsed < 4500, 'snapshot must be bounded: ' + elapsed);
const result = observer.report();
assert.equal(result.timings.length, 1);
assert.equal(result.timings[0].outcome, 'failure');
assert.equal(result.timings[0].errorMessage, error.message);
assert.deepEqual(result.timings[0].stateAtFailure, { state: 'snapshot-unavailable' });
const rejectedPage = { isClosed: () => false, evaluate: async () => { throw new Error('browser disconnected'); } };
await assert.rejects(observer.measure('rejected-evaluate', rejectedPage, async () => { throw error; }),
  (received) => received === error);
assert.deepEqual(observer.report().timings[1].stateAtFailure, { state: 'snapshot-unavailable' });
const closedPage = { isClosed: () => true };
await assert.rejects(observer.measure('closed-page', closedPage, async () => { throw error; }),
  (received) => received === error);
assert.deepEqual(observer.report().timings[2].stateAtFailure, { state: 'page-closed' });
console.log('P4-D1a snapshot deadline self-test: original errors preserved; hanging, rejected and closed-page snapshots bounded.');

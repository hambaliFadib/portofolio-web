import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const MAX_EVENTS = 80;
const MAX_TIMINGS = 160;
// Diagnostics must not extend a failed verifier indefinitely if Chromium stops responding.
const FAILURE_SNAPSHOT_TIMEOUT_MS = 1_500;

function safeMessage(value) {
  return String(value ?? 'unknown')
    .replace(/https?:\/\/[^\s)"']+/gi, '[URL]')
    .replace(/([?&](?:token|key|secret|password|code|auth)=)[^\s&]+/gi, '$1[REDACTED]')
    .split('\n')[0]
    .slice(0, 240);
}

function safeRoute(value, origin) {
  try {
    const url = new URL(value);
    return url.origin === origin ? url.pathname.slice(0, 160) : '[external-origin]';
  } catch {
    return '[invalid-url]';
  }
}

export function createReliabilityObserver({ suite, origin }) {
  if (!['homepage', 'b03'].includes(suite)) throw new Error('Unsupported observability suite.');
  const startedAt = new Date().toISOString();
  const timings = [];
  const browserEvents = [];
  const observedPages = new WeakSet();

  function event(kind, pageLabel, message, extra = {}) {
    if (browserEvents.length >= MAX_EVENTS) return;
    browserEvents.push({ kind, page: pageLabel, message: safeMessage(message), ...extra });
  }

  function observe(page, label) {
    if (observedPages.has(page)) return;
    observedPages.add(page);
    page.on('pageerror', (error) => event('pageerror', label, error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') event('console-error', label, message.text());
    });
    page.on('requestfailed', (request) => {
      event('request-failed', label, request.failure()?.errorText, {
        method: request.method(),
        route: safeRoute(request.url(), origin),
      });
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        event('http-error', label, 'HTTP ' + response.status(), {
          status: response.status(),
          route: safeRoute(response.url(), origin),
        });
      }
    });
  }

  async function stateOf(page) {
    if (!page || page.isClosed()) return { state: 'page-closed' };
    let deadline;
    try {
      // A Node-side deadline is required: Playwright page.evaluate() can hang while
      // the renderer is unresponsive. Never let diagnostic capture mask the failure.
      return await Promise.race([
        page.evaluate(() => {
        const theme = document.documentElement.classList.contains('dark') ? 'dark'
          : document.documentElement.classList.contains('light') ? 'light' : 'unset';
        const svg = document.querySelector('svg[data-art="actual"]');
        const canvas = document.querySelector('[data-ascii-lens] canvas');
        return {
          readyState: document.readyState,
          theme,
          animationState: svg?.dataset.state ?? null,
          animationProgress: svg ? Number(svg.dataset.progress) : null,
          lensCanvasPresent: Boolean(canvas),
          viewport: { width: innerWidth, height: innerHeight },
        };
        }),
        new Promise(resolve => {
          deadline = setTimeout(() => resolve({ state: 'snapshot-unavailable' }), FAILURE_SNAPSHOT_TIMEOUT_MS);
        }),
      ]);
    } catch {
      return { state: 'snapshot-unavailable' };
    } finally {
      clearTimeout(deadline);
    }
  }

  async function measure(label, page, operation) {
    if (typeof label !== 'string' || !label || typeof operation !== 'function') {
      throw new Error('Reliability timing requires a label and operation.');
    }
    const start = performance.now();
    let outcome = 'success';
    let errorName = null;
    let errorMessage = null;
    try {
      return await operation();
    } catch (error) {
      outcome = 'failure';
      errorName = safeMessage(error?.name || 'Error');
      errorMessage = safeMessage(error?.message);
      throw error;
    } finally {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      if (timings.length < MAX_TIMINGS) {
        const item = { label, outcome, durationMs };
        if (outcome === 'failure') {
          item.errorName = errorName;
          item.errorMessage = errorMessage;
          item.stateAtFailure = await stateOf(page);
        }
        timings.push(item);
      }
    }
  }

  function report() {
    return {
      schemaVersion: 1,
      kind: 'portfolio-regression-reliability-observation',
      suite,
      origin,
      startedAt,
      finishedAt: new Date().toISOString(),
      timings,
      browserEvents,
      limits: {
        events: MAX_EVENTS,
        timings: MAX_TIMINGS,
        eventTruncated: browserEvents.length >= MAX_EVENTS,
        timingTruncated: timings.length >= MAX_TIMINGS,
      },
      interpretation: 'Diagnostic only. Assertions and CI verdict are owned by the existing verifier.',
    };
  }

  async function write(filename) {
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, JSON.stringify(report(), null, 2) + '\n');
  }

  return { observe, measure, report, write };
}

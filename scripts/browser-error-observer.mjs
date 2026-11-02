const OPTIONAL_TELEMETRY_PATH = "/_vercel/insights/script.js";

function isOptionalTelemetryUrl(value, origin) {
  try {
    const url = new URL(value);
    return url.origin === new URL(origin).origin && url.pathname === OPTIONAL_TELEMETRY_PATH;
  } catch {
    return false;
  }
}

function isExpectedNextFlightAbort(value, origin) {
  try {
    const url = new URL(value);
    return url.origin === new URL(origin).origin && url.pathname === "/" && url.searchParams.has("_rsc");
  } catch {
    return false;
  }
}

export function observeBrowserErrors(page, { label, origin, errors, telemetryBlocked, expectedNavigationAborts }) {
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));

  page.on("response", (response) => {
    if (response.status() < 400) return;
    const details = `${label}: HTTP ${response.status()} ${response.url()}`;
    if (response.status() === 404 && isOptionalTelemetryUrl(response.url(), origin)) {
      telemetryBlocked.push(details);
      return;
    }
    errors.push(details);
  });

  page.on("requestfailed", (request) => {
    const details = `${label}: ${request.failure()?.errorText ?? "request failed"} ${request.url()}`;
    if (isOptionalTelemetryUrl(request.url(), origin)) {
      telemetryBlocked.push(details);
      return;
    }
    if (request.failure()?.errorText === "net::ERR_ABORTED" && isExpectedNextFlightAbort(request.url(), origin)) {
      expectedNavigationAborts.push(details);
      return;
    }
    errors.push(details);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();

    // Chromium also emits console copies of network failures. The response and
    // requestfailed listeners above record those with their exact URL.
    if (/^Failed to load resource: (?:the server responded with a status of \d+|net::ERR_[A-Z0-9_]+)/.test(text)) return;
    errors.push(`${label}: ${text}`);
  });
}

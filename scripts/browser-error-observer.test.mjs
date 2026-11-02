import assert from "node:assert/strict";
import { observeBrowserErrors } from "./browser-error-observer.mjs";

const handlers = new Map();
const page = { on: (event, handler) => handlers.set(event, handler) };
const errors = [];
const telemetryBlocked = [];
const expectedNavigationAborts = [];

observeBrowserErrors(page, {
  label: "test",
  origin: "http://127.0.0.1:3000",
  errors,
  telemetryBlocked,
  expectedNavigationAborts,
});

const requestfailed = handlers.get("requestfailed");
const emitFailure = (errorText, url) => requestfailed({ failure: () => ({ errorText }), url: () => url });

emitFailure("net::ERR_ABORTED", "http://127.0.0.1:3000/?persona=fullstack&_rsc=flight-token");
assert.equal(expectedNavigationAborts.length, 1, "same-origin root Flight abort is recorded separately");
assert.equal(errors.length, 0, "expected Flight abort does not become an application error");

emitFailure("net::ERR_ABORTED", "http://127.0.0.1:3000/api/data?_rsc=flight-token");
assert.equal(errors.length, 1, "an aborted non-root request remains an application error");

emitFailure("net::ERR_CONNECTION_RESET", "http://127.0.0.1:3000/?persona=fullstack&_rsc=flight-token");
assert.equal(errors.length, 2, "a non-abort root Flight failure remains an application error");

emitFailure("net::ERR_ABORTED", "https://other.example/?_rsc=flight-token");
assert.equal(errors.length, 3, "a cross-origin Flight abort remains an application error");

console.log("Browser error observer targeted Flight-abort tests passed.");

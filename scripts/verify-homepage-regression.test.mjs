import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EXPECTED_HOMEPAGE_CHECKS, verifyHomepageReport, readAndVerifyHomepageReport } from "./verify-homepage-regression.mjs";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "p4c-homepage-contract-"));
const filename = path.join(root, "report.json");
const valid = () => ({
  browser: "Playwright Chromium", origin: "http://127.0.0.1:3000",
  counts: { passed: 14, failed: 0 },
  diagnostics: [{ viewport: "desktop", consoleErrors: [] }, { viewport: "mobile", consoleErrors: [] }],
  checks: EXPECTED_HOMEPAGE_CHECKS.map(name => ({ name, passed: true })),
});
const mustReject = (label, modify) => {
  const v = valid(); modify(v);
  assert.throws(() => verifyHomepageReport(v), undefined, label);
};
try {
  assert.deepEqual(verifyHomepageReport(valid()), { passed: 14, failed: 0, reportStatus: "verified" });
  assert.equal(new Set(EXPECTED_HOMEPAGE_CHECKS).size, 14);
  mustReject("one failure", x => { x.checks[0].passed = false; });
  mustReject("false check status", x => { x.checks[0].passed = "true"; });
  mustReject("duplicate", x => { x.checks[0].name = x.checks[1].name; });
  mustReject("unknown", x => { x.checks[0].name = "unapproved"; });
  mustReject("missing", x => { x.checks.pop(); });
  mustReject("bad counts", x => { x.counts.passed = 13; });
  mustReject("wrong origin", x => { x.origin = "http://remote:3000"; });
  mustReject("wrong browser", x => { x.browser = "Unknown"; });
  mustReject("missing mobile", x => { x.diagnostics = [{ viewport: "desktop" }, { viewport: "desktop" }]; });
  assert.throws(() => readAndVerifyHomepageReport(filename), /missing/);
  fs.writeFileSync(filename, "{");
  assert.throws(() => readAndVerifyHomepageReport(filename), /valid JSON/);
  fs.writeFileSync(filename, JSON.stringify(valid()));
  assert.equal(readAndVerifyHomepageReport(filename).passed, 14);
  console.log("P4-C homepage evidence contract negative and positive self-tests passed.");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const output = path.join(os.tmpdir(), "thinking-3d-evidence");
const origin = process.env.THINKING_PREVIEW_URL ?? "http://127.0.0.1:3000";
const evidenceOutput = process.env.THINKING_EVIDENCE_DIR
  ? path.resolve(process.env.THINKING_EVIDENCE_DIR)
  : output;
await fs.mkdir(evidenceOutput, { recursive: true });
const browser = await chromium.launch({
  headless: process.env.THINKING_HEADLESS !== "false",
  executablePath: process.env.THINKING_CHROMIUM_EXECUTABLE || undefined,
  args: process.env.THINKING_HARDWARE_RENDERER === "true" ? ["--ignore-gpu-blocklist", "--enable-webgl"] : [],
});
const results = [];
const save = async (page, name) => page.screenshot({ path: path.join(evidenceOutput, name), animations: "disabled" });
const alignSection = async (page) => page.evaluate(() => {
  const heading = document.querySelector("#thinking-heading");
  if (heading) window.scrollTo({ top: window.scrollY + heading.getBoundingClientRect().top - 100, behavior: "instant" });
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__thinkingStartedAt = performance.now();
    window.__thinkingFrames = 0;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      const context = getContext.call(this, type, ...args);
      if (type === "webgl2" && context && !context.__thinkingCounter) {
        context.__thinkingCounter = true;
        const clear = context.clear.bind(context);
        context.clear = (...clearArgs) => {
          window.__thinkingFrames += 1;
          return clear(...clearArgs);
        };
      }
      return context;
    };
  });
  await page.goto(`${origin}/?theme=light#thinking`, { waitUntil: "networkidle" });
  const thinking = page.locator("#thinking");
  await alignSection(page);
  const canvas = thinking.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelectorAll("#thinking canvas").length === 1);
  await page.waitForFunction(() => {
    const canvas = document.querySelector("#thinking canvas");
    return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0 && Boolean(canvas.getContext("webgl2"));
  });
  await page.waitForFunction(() => document.querySelector("#thinking canvas")?.parentElement?.dataset.thinkingReady === "true");
  const rendererInfo = await canvas.evaluate((element) => {
    const context = element.getContext("webgl2");
    const debug = context?.getExtension("WEBGL_debug_renderer_info");
    return {
      vendor: debug ? context?.getParameter(debug.UNMASKED_VENDOR_WEBGL) : context?.getParameter(context.RENDERER),
      renderer: debug ? context?.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context?.getParameter(context.RENDERER),
      version: context?.getParameter(context.VERSION),
    };
  });
  assert.ok(rendererInfo.renderer, "WebGL renderer identity should be available");
  const hardwareRenderer = /NVIDIA|AMD|Intel/i.test(rendererInfo.renderer)
    && !/SwiftShader|llvmpipe|Software/i.test(rendererInfo.renderer);
  const attributionLink = page.getByRole("link", { name: "Source and modification details" });
  assert.equal(await attributionLink.getAttribute("href"), "/models/HRA-Brain-Attribution.md");
  const attributionResponse = await page.request.get(`${origin}/models/HRA-Brain-Attribution.md`);
  assert.equal(attributionResponse.status(), 200, "model attribution must be publicly accessible");
  const attribution = await attributionResponse.text();
  assert.match(attribution, /CC BY 4\.0/);
  assert.match(attribution, /Geometry resampled and transformed/);
  await page.waitForTimeout(180);
  const modelMetrics = await page.locator("#thinking canvas").evaluate((element) => {
    const data = element.parentElement?.dataset;
    return {
      initMs: Number(data?.thinkingInitMs),
      points: Number(data?.thinkingPoints),
      connections: Number(data?.thinkingConnections),
      meshCount: Number(data?.thinkingMeshes),
      corticalMeshes: Number(data?.thinkingCorticalMeshes),
      triangleCount: Number(data?.thinkingTriangles),
      pointSpread: Number(data?.thinkingPointSpread),
      riskClusters: JSON.parse(data?.thinkingRiskClusters ?? "{}"),
    };
  });
  assert.ok(modelMetrics.points >= 2500, `anatomical point count too low: ${modelMetrics.points}`);
  assert.ok(modelMetrics.connections > modelMetrics.points, `surface paths too sparse: ${modelMetrics.connections}`);
  assert.ok(modelMetrics.meshCount >= 200 && modelMetrics.corticalMeshes >= 50, `anatomical surface meshes missing: ${JSON.stringify(modelMetrics)}`);
  assert.ok(modelMetrics.triangleCount > 10000, `cortical triangle count too low: ${modelMetrics.triangleCount}`);
  assert.ok(modelMetrics.pointSpread > 1, `neural surface points do not occupy an anatomical volume: ${modelMetrics.pointSpread}`);
  assert.ok(Object.values(modelMetrics.riskClusters).every((count) => count > 0), `Risk subregions are empty: ${JSON.stringify(modelMetrics.riskClusters)}`);
  const canvasInitializationMs = await page.evaluate(() => performance.now() - window.__thinkingStartedAt);
  const modelInitializationMs = modelMetrics.initMs;
  const nav = page.getByRole("navigation", { name: "Explore thinking concepts" });
  assert.equal(await nav.getByRole("button").count(), 5);
  await save(page, "desktop-light-idle.png");
  await save(page, "desktop-three-quarter.png");

  const start = await canvas.boundingBox();
  assert.ok(start);
  const resetView = page.getByRole("button", { name: "Reset network view and concept selection" });
  const rotateTo = async (degrees, name) => {
    await resetView.click();
    await page.waitForTimeout(420);
    const bounds = await canvas.boundingBox();
    assert.ok(bounds);
    const currentAzimuth = Math.atan2(3.2, 5.7);
    const targetAzimuth = degrees * Math.PI / 180;
    const deltaX = (currentAzimuth - targetAzimuth) * bounds.height / (Math.PI * 2);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + deltaX, bounds.y + bounds.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(320);
    await save(page, name);
  };
  await rotateTo(0, "desktop-front.png");
  await rotateTo(90, "desktop-left-side.png");
  await rotateTo(180, "desktop-rear.png");
  await rotateTo(270, "desktop-right-side.png");
  await resetView.click();
  await page.waitForTimeout(420);

  const frameStart = await page.evaluate(() => ({ count: window.__thinkingFrames, time: performance.now() }));
  await page.mouse.move(start.x + start.width * 0.5, start.y + start.height * 0.53);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width * 0.8, start.y + start.height * 0.51, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(450);
  const frameEnd = await page.evaluate(() => ({ count: window.__thinkingFrames, time: performance.now() }));
  const interactionFps = (frameEnd.count - frameStart.count) / ((frameEnd.time - frameStart.time) / 1000);
  if (hardwareRenderer) {
    assert.ok(interactionFps >= 30, `orbit interaction below 30 FPS: ${interactionFps.toFixed(1)}`);
  }
  await save(page, "desktop-rotated.png");
  const initialBytes = await fs.readFile(path.join(evidenceOutput, "desktop-light-idle.png"));
  const rotatedBytes = await fs.readFile(path.join(evidenceOutput, "desktop-rotated.png"));
  assert.notEqual(createHash("sha256").update(initialBytes).digest("hex"), createHash("sha256").update(rotatedBytes).digest("hex"), "orbit gesture should change rendered view");

  const beforePan = await canvas.screenshot();
  await page.mouse.move(start.x + start.width * 0.5, start.y + start.height * 0.5);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(start.x + start.width * 0.62, start.y + start.height * 0.6, { steps: 8 });
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(300);
  const afterPan = await canvas.screenshot();
  assert.notEqual(createHash("sha256").update(beforePan).digest("hex"), createHash("sha256").update(afterPan).digest("hex"), "right-drag pan should change rendered view");
  await page.mouse.move(start.x + start.width * 0.5, start.y + start.height * 0.5);
  await page.mouse.wheel(0, -280);
  await page.waitForTimeout(100);
  const afterZoom = await canvas.screenshot();
  assert.notEqual(createHash("sha256").update(afterPan).digest("hex"), createHash("sha256").update(afterZoom).digest("hex"), "wheel zoom should change rendered view");

  await resetView.click();
  await page.waitForTimeout(400);
  const findAndSelectSurfaceRegion = async () => {
    const bounds = await canvas.boundingBox();
    assert.ok(bounds);
    const samples = [
      [0.5, 0.5], [0.42, 0.42], [0.58, 0.42], [0.38, 0.55], [0.62, 0.55],
      [0.5, 0.34], [0.5, 0.66], [0.3, 0.48], [0.7, 0.48],
    ];
    for (const [x, y] of samples) {
      const point = { x: bounds.x + bounds.width * x, y: bounds.y + bounds.height * y };
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(45);
      const hoveredId = await canvas.evaluate((element) => element.parentElement?.dataset.thinkingHoveredRegion ?? null);
      if (!hoveredId) continue;
      await page.mouse.click(point.x, point.y);
      await page.waitForFunction((expected) => document.querySelector("#thinking canvas")?.parentElement?.dataset.thinkingSelectedRegion === expected, hoveredId);
      return hoveredId;
    }
    throw new Error("No clickable anatomical surface region was found at the sampled canvas positions.");
  };
  const regionStart = await page.evaluate(() => ({ count: window.__thinkingFrames, time: performance.now() }));
  const sceneSelectedRegion = await findAndSelectSurfaceRegion();
  const regionEnd = await page.evaluate(() => ({ count: window.__thinkingFrames, time: performance.now() }));
  const regionSelectionFps = (regionEnd.count - regionStart.count) / ((regionEnd.time - regionStart.time) / 1000);
  if (hardwareRenderer) {
    assert.ok(regionSelectionFps >= 30, `region selection interaction below 30 FPS: ${regionSelectionFps.toFixed(1)}`);
  }
  assert.equal(await canvas.evaluate((element) => element.parentElement?.dataset.thinkingSelectedRegion), sceneSelectedRegion);
  assert.ok(await thinking.getByRole("heading", { name: /Business Understanding|Problem Breakdown|Risk Analysis|Evidence & Validation|Decision Making/ }).count());
  await save(page, "desktop-selected-surface-region.png");
  await resetView.click();
  await page.waitForTimeout(400);
  await rotateTo(120, "desktop-interaction-rotated.png");
  const rotatedSelection = await findAndSelectSurfaceRegion();
  assert.ok(rotatedSelection, "surface selection after orbit should identify a region");
  await resetView.click();
  await page.waitForTimeout(400);
  await nav.getByRole("button", { name: /Business Understanding/ }).click();
  assert.equal(await thinking.getByRole("heading", { name: "Business Understanding" }).count(), 1);
  await save(page, "desktop-selected-business.png");
  await nav.getByRole("button", { name: /Problem Breakdown/ }).click();
  assert.equal(await nav.getByRole("button", { name: /Problem Breakdown/ }).getAttribute("aria-pressed"), "true");
  assert.equal(await thinking.getByRole("heading", { name: "Problem Breakdown" }).count(), 1);
  await nav.getByRole("button", { name: /Risk Analysis/ }).click();
  for (const label of ["Ambiguity", "Impact", "Dependency", "Detectability"]) {
    assert.equal(await thinking.getByRole("heading", { name: label }).count(), 1);
  }
  await save(page, "desktop-risk-expanded.png");
  await resetView.click();
  assert.equal(await thinking.getByText(/No concept selected/).count(), 1);
  const graphCanvas = thinking.locator("canvas");
  const graphBox = await graphCanvas.boundingBox();
  assert.ok(graphBox);
  await graphCanvas.evaluate((element, rect) => {
    const position = { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2, bubbles: true };
    const setCapture = element.setPointerCapture;
    const releaseCapture = element.releasePointerCapture;
    element.setPointerCapture = () => {};
    element.releasePointerCapture = () => {};
    element.dispatchEvent(new PointerEvent("pointerdown", { ...position, pointerId: 101, pointerType: "touch" }));
    element.dispatchEvent(new PointerEvent("pointerdown", { ...position, pointerId: 102, pointerType: "touch" }));
    element.dispatchEvent(new PointerEvent("pointerup", { ...position, pointerId: 101, pointerType: "touch" }));
    element.dispatchEvent(new PointerEvent("pointerup", { ...position, pointerId: 102, pointerType: "touch" }));
    element.setPointerCapture = setCapture;
    element.releasePointerCapture = releaseCapture;
  }, graphBox);
  assert.equal(await nav.getByRole("button", { pressed: true }).count(), 0, "multi-pointer gesture must not select a concept");
  results.push(`desktop: HRA anatomical surface, ${modelMetrics.meshCount} source meshes / ${modelMetrics.corticalMeshes} cortical meshes / ${modelMetrics.triangleCount} triangles, ${modelMetrics.points} neural points / ${modelMetrics.connections} local connections (spread radius ${modelMetrics.pointSpread}), hover and mesh selection before/after rotation, orbit, pan, zoom, Risk clusters, reset, two-pointer safety PASS; canvas ${canvasInitializationMs.toFixed(0)}ms, model ${modelInitializationMs}ms, renderer ${rendererInfo.vendor} / ${rendererInfo.renderer} (${rendererInfo.version}), hardware=${hardwareRenderer}, orbit ${interactionFps.toFixed(1)} fps, selection ${regionSelectionFps.toFixed(1)} fps`);

  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 1320 } });
  const darkPage = await darkContext.newPage();
  darkPage.on("pageerror", (error) => pageErrors.push(error.message));
  await darkPage.goto(`${origin}/?theme=dark#thinking`, { waitUntil: "networkidle" });
  await alignSection(darkPage);
  await darkPage.locator("#thinking canvas").waitFor({ state: "visible" });
  await darkPage.waitForFunction(() => document.querySelector("#thinking canvas")?.parentElement?.dataset.thinkingReady === "true");
  await darkPage.waitForTimeout(180);
  await save(darkPage, "desktop-dark-idle.png");
  await darkPage.getByRole("navigation", { name: "Explore thinking concepts" }).getByRole("button", { name: /Risk Analysis/ }).click();
  await save(darkPage, "desktop-dark-risk.png");
  results.push("dark theme: WebGL visible and Risk selection PASS");

  const darkMobileContext = await browser.newContext({ viewport: { width: 390, height: 2000 } });
  const darkMobilePage = await darkMobileContext.newPage();
  darkMobilePage.on("pageerror", (error) => pageErrors.push(error.message));
  await darkMobilePage.goto(`${origin}/?theme=dark#thinking`, { waitUntil: "networkidle" });
  await alignSection(darkMobilePage);
  await darkMobilePage.locator("#thinking canvas").waitFor({ state: "visible" });
  await darkMobilePage.waitForFunction(() => document.querySelector("#thinking canvas")?.parentElement?.dataset.thinkingReady === "true");
  await darkMobilePage.waitForTimeout(180);
  await save(darkMobilePage, "mobile-dark-idle.png");
  await darkMobilePage.getByRole("navigation", { name: "Explore thinking concepts" }).getByRole("button", { name: /Risk Analysis/ }).click();
  await save(darkMobilePage, "mobile-dark-risk.png");
  await darkMobileContext.close();

  for (const width of [1440, 768, 390, 320]) {
    const mobileContext = await browser.newContext({ viewport: { width, height: width <= 390 ? 2000 : 1320 }, reducedMotion: width === 390 ? "reduce" : "no-preference" });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on("pageerror", (error) => pageErrors.push(error.message));
    await mobilePage.goto(`${origin}/?theme=light#thinking`, { waitUntil: "networkidle" });
    await alignSection(mobilePage);
    await mobilePage.locator("#thinking canvas").waitFor({ state: "visible" });
    await mobilePage.waitForFunction(() => document.querySelector("#thinking canvas")?.parentElement?.dataset.thinkingReady === "true");
    await mobilePage.waitForTimeout(180);
    const sizes = await mobilePage.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(sizes.document <= sizes.viewport, `horizontal overflow at ${width}px: ${JSON.stringify(sizes)}`);
    const mobileNav = mobilePage.getByRole("navigation", { name: "Explore thinking concepts" });
    const riskButton = mobileNav.getByRole("button", { name: /Risk Analysis/ });
    const targetHeight = await riskButton.evaluate((element) => element.getBoundingClientRect().height);
    assert.ok(targetHeight >= 44, `concept target below 44px at ${width}px`);
    if (width === 390) {
      await riskButton.focus();
      await mobilePage.keyboard.press("Enter");
      assert.equal(await riskButton.getAttribute("aria-pressed"), "true", "keyboard activation failed");
      await save(mobilePage, "mobile-light-risk.png");
    }
    results.push(`${width}px: no horizontal overflow, target ${targetHeight}px, scene PASS`);
    await mobileContext.close();
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await nav.getByRole("button", { name: /Evidence & Validation/ }).focus();
  await page.keyboard.press("Enter");
  assert.equal(await nav.getByRole("button", { name: /Evidence & Validation/ }).getAttribute("aria-pressed"), "true");
  results.push("reduced motion and keyboard selection PASS");
  assert.deepEqual(pageErrors, [], `application page errors: ${pageErrors.join("; ")}`);
  await page.goto(`${origin}/about`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator("#thinking canvas").count(), 0, "canvas must be removed on unmount");
  results.push("scene canvas removed on route unmount PASS");
  await context.close();
  await darkContext.close();

  const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === "webgl2") return null;
      return getContext.call(this, type, ...args);
    };
  });
  await fallbackPage.goto(`${origin}/#thinking`, { waitUntil: "networkidle" });
  await alignSection(fallbackPage);
  await fallbackPage.getByRole("status").filter({ hasText: "3D is unavailable" }).waitFor();
  assert.equal(await fallbackPage.getByRole("navigation", { name: "Explore thinking concepts" }).getByRole("button").count(), 5);
  results.push("unsupported WebGL fallback preserves all five accessible concept controls PASS");
  await fallbackContext.close();
} finally {
  await browser.close();
}

console.log(JSON.stringify({ output: evidenceOutput, results }, null, 2));

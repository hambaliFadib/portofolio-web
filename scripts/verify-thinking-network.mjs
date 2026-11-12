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
const compareCanvasImages = async (page, first, second) => page.evaluate(async ({ first, second }) => {
  const decode = async (image) => {
    const binary = atob(image);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return createImageBitmap(new Blob([bytes], { type: "image/png" }));
  };
  const [left, right] = await Promise.all([decode(first), decode(second)]);
  if (left.width !== right.width || left.height !== right.height) {
    left.close();
    right.close();
    return { meanAbsoluteError: 1, changedPixelRatio: 1 };
  }
  const canvas = document.createElement("canvas");
  canvas.width = left.width;
  canvas.height = left.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("2D canvas is required to compare stable Thinking captures.");
  context.drawImage(left, 0, 0);
  const leftPixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(right, 0, 0);
  const rightPixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  left.close();
  right.close();
  let totalDifference = 0;
  let changedPixels = 0;
  const pixelCount = canvas.width * canvas.height;
  for (let offset = 0; offset < leftPixels.length; offset += 4) {
    const difference = Math.max(
      Math.abs(leftPixels[offset] - rightPixels[offset]),
      Math.abs(leftPixels[offset + 1] - rightPixels[offset + 1]),
      Math.abs(leftPixels[offset + 2] - rightPixels[offset + 2]),
    );
    totalDifference += Math.abs(leftPixels[offset] - rightPixels[offset])
      + Math.abs(leftPixels[offset + 1] - rightPixels[offset + 1])
      + Math.abs(leftPixels[offset + 2] - rightPixels[offset + 2]);
    if (difference > 12) changedPixels += 1;
  }
  return {
    meanAbsoluteError: totalDifference / (pixelCount * 3 * 255),
    changedPixelRatio: changedPixels / pixelCount,
  };
}, { first: first.toString("base64"), second: second.toString("base64") });
const captureVisibleCanvas = async (page, canvas) => {
  const before = await page.evaluate(() => {
    const element = document.querySelector("#thinking canvas");
    const rect = element?.getBoundingClientRect();
    return rect && { scrollY: window.scrollY, top: rect.top, bottom: rect.bottom, height: window.innerHeight };
  });
  assert.ok(before && before.top >= 0 && before.bottom <= before.height,
    `Thinking canvas must remain fully in view before capture: ${JSON.stringify(before)}`);
  const screenshot = await canvas.screenshot({ animations: "disabled" });
  const after = await page.evaluate(() => window.scrollY);
  assert.equal(after, before.scrollY, "canvas capture must not auto-scroll the page");
  return screenshot;
};
const waitForStableCanvas = async (page, canvas) => {
  const deadline = Date.now() + 8000;
  let previous = await captureVisibleCanvas(page, canvas);
  let stableComparisons = 0;
  let finalDifference = { meanAbsoluteError: 1, changedPixelRatio: 1 };
  while (Date.now() < deadline) {
    await page.waitForTimeout(80);
    const current = await captureVisibleCanvas(page, canvas);
    finalDifference = await compareCanvasImages(page, previous, current);
    if (finalDifference.meanAbsoluteError <= 0.0005 && finalDifference.changedPixelRatio <= 0.002) {
      stableComparisons += 1;
      if (stableComparisons >= 2) return { image: current, difference: finalDifference };
    } else {
      stableComparisons = 0;
    }
    previous = current;
  }
  throw new Error(`Thinking canvas did not settle before capture: ${JSON.stringify(finalDifference)}`);
};
const CAMERA_STATE_FIELDS = ["position", "quaternion", "target", "viewMatrix"];
const cameraStateDeltas = (baseline, actual) => Object.fromEntries(CAMERA_STATE_FIELDS.map((field) => [
  field,
  Math.max(...baseline[field].map((value, index) => Math.abs(value - actual[field][index]))),
]));
const assertCameraStateMatchesBaseline = (baseline, actual, label, tolerance = 0.00001) => {
  assert.ok(actual && CAMERA_STATE_FIELDS.every((field) => Array.isArray(actual[field])),
    `${label} must expose position, quaternion, target, and view matrix`);
  const deltas = cameraStateDeltas(baseline, actual);
  for (const field of CAMERA_STATE_FIELDS) {
    assert.ok(deltas[field] <= tolerance,
      `${label} must restore camera ${field}; max absolute delta ${deltas[field]} exceeds ${tolerance}`);
  }
  return deltas;
};

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__thinkingStartedAt = performance.now();
    window.__thinkingFrames = 0;
    window.__thinkingModelViewMatrix = null;
    window.__thinkingCameraState = null;
    window.__thinkingCameraProbe = (state) => { window.__thinkingCameraState = state; };
    const uniformNames = new WeakMap();
    const originalGetUniformLocation = WebGL2RenderingContext.prototype.getUniformLocation;
    const originalUniformMatrix4fv = WebGL2RenderingContext.prototype.uniformMatrix4fv;
    WebGL2RenderingContext.prototype.getUniformLocation = function (program, name) {
      const location = originalGetUniformLocation.call(this, program, name);
      if (location) uniformNames.set(location, name);
      return location;
    };
    WebGL2RenderingContext.prototype.uniformMatrix4fv = function (location, transpose, value) {
      if (uniformNames.get(location) === "modelViewMatrix") window.__thinkingModelViewMatrix = Array.from(value);
      return originalUniformMatrix4fv.call(this, location, transpose, value);
    };
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
  const resetView = page.getByRole("button", { name: "Reset view and concept selection", exact: true });
  assert.equal(await resetView.count(), 1, "reset control must expose its exact accessible name and button role");
  const initialCamera = await waitForStableCanvas(page, canvas);
  const initialModelViewMatrix = await page.evaluate(() => window.__thinkingModelViewMatrix);
  assert.ok(Array.isArray(initialModelViewMatrix) && initialModelViewMatrix.length === 16,
    "initial camera modelViewMatrix must be measurable");
  const initialCameraState = await page.evaluate(() => window.__thinkingCameraState);
  assert.ok(initialCameraState
    && initialCameraState.position?.length === 3
    && initialCameraState.quaternion?.length === 4
    && initialCameraState.target?.length === 3
    && initialCameraState.viewMatrix?.length === 16,
  "initial camera position, orientation, target, and view matrix must be measurable");
  await fs.writeFile(path.join(evidenceOutput, "desktop-light-idle-canvas.png"), initialCamera.image);
  await save(page, "desktop-light-idle.png");
  await save(page, "desktop-three-quarter.png");

  const start = await canvas.boundingBox();
  assert.ok(start);
  const resetMeasurements = [];
  const assertInitialCameraRestored = async (cause) => {
    const restored = await waitForStableCanvas(page, canvas);
    const difference = await compareCanvasImages(page, initialCamera.image, restored.image);
    assert.ok(difference.meanAbsoluteError <= 0.001 && difference.changedPixelRatio <= 0.01,
      `reset after ${cause} must restore the initial camera/orbit view: ${JSON.stringify(difference)}`);
    const modelViewMatrix = await page.evaluate(() => window.__thinkingModelViewMatrix);
    assert.ok(Array.isArray(modelViewMatrix) && modelViewMatrix.length === 16,
      `reset after ${cause} must retain a measurable modelViewMatrix`);
    const modelViewMaxAbsDifference = Math.max(...initialModelViewMatrix.map((value, index) => Math.abs(value - modelViewMatrix[index])));
    assert.ok(modelViewMaxAbsDifference <= 0.00001,
      `reset after ${cause} must restore initial camera pose/orientation and target: max modelViewMatrix delta ${modelViewMaxAbsDifference}`);
    const cameraState = await page.evaluate(() => window.__thinkingCameraState);
    const cameraDeltas = assertCameraStateMatchesBaseline(initialCameraState, cameraState, `reset after ${cause}`);
    assert.equal(await nav.getByRole("button", { pressed: true }).count(), 0,
      `reset after ${cause} must clear concept selection`);
    const state = await page.evaluate(() => ({
      selectedRegion: document.querySelector("#thinking canvas")?.parentElement?.dataset.thinkingSelectedRegion ?? null,
      modelViewMatrix: window.__thinkingModelViewMatrix,
      camera: window.__thinkingCameraState,
    }));
    assert.equal(state.selectedRegion, null, `reset after ${cause} must clear selected scene region`);
    const measurement = { cause, screenshot: difference, modelViewMaxAbsDifference, cameraDeltas, state };
    resetMeasurements.push(measurement);
    return measurement;
  };
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
  const resetDifference = await assertInitialCameraRestored("orbit, pan, and zoom");
  results.push(`Reset restored initial camera/orbit view after orbit, pan, and zoom: ${JSON.stringify(resetDifference)}; concept selection cleared PASS`);

  const gestureBounds = async () => {
    const bounds = await canvas.boundingBox();
    assert.ok(bounds);
    return bounds;
  };
  const orbitGesture = async () => {
    const bounds = await gestureBounds();
    await page.mouse.move(bounds.x + bounds.width * 0.38, bounds.y + bounds.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.66, bounds.y + bounds.height * 0.58, { steps: 8 });
    await page.mouse.up();
  };
  const panGesture = async () => {
    const bounds = await gestureBounds();
    await page.mouse.move(bounds.x + bounds.width * 0.38, bounds.y + bounds.height * 0.45);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(bounds.x + bounds.width * 0.57, bounds.y + bounds.height * 0.61, { steps: 8 });
    await page.mouse.up({ button: "right" });
  };
  const zoomGesture = async () => {
    const bounds = await gestureBounds();
    await page.mouse.move(bounds.x + bounds.width * 0.52, bounds.y + bounds.height * 0.48);
    await page.mouse.wheel(0, -240);
  };
  const negativeControls = [];
  const runCameraNegativeControl = async (name, action, requiredChangedFields, input) => {
    await resetView.click();
    await page.waitForTimeout(420);
    await assertInitialCameraRestored(`baseline before negative control: ${name}`);
    await action();
    await page.waitForTimeout(320);
    const perturbedState = await page.evaluate(() => window.__thinkingCameraState);
    const deltas = cameraStateDeltas(initialCameraState, perturbedState);
    for (const field of requiredChangedFields) {
      assert.ok(deltas[field] > 0.00001,
        `${name} negative control must actually perturb ${field}: ${deltas[field]}`);
    }
    assert.throws(
      () => assertCameraStateMatchesBaseline(initialCameraState, perturbedState, `negative control: ${name}`),
      /must restore camera/,
      `${name} negative control must be rejected by strict camera-state validation`,
    );
    const screenshot = `negative-control-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.png`;
    await canvas.screenshot({ path: path.join(evidenceOutput, screenshot), animations: "disabled" });
    negativeControls.push({
      name,
      input,
      expected: "strict position/quaternion/target/view-matrix check rejects this state",
      rejected: true,
      requiredChangedFields,
      deltas,
      baseline: initialCameraState,
      perturbed: perturbedState,
      screenshot,
    });
    await resetView.click();
    await page.waitForTimeout(420);
    const restored = await assertInitialCameraRestored(`restoration after negative control: ${name}`);
    negativeControls.at(-1).restorationDeltas = restored.cameraDeltas;
  };
  await runCameraNegativeControl(
    "camera-position-orbit",
    orbitGesture,
    ["position", "quaternion", "viewMatrix"],
    "real pointer orbit gesture",
  );
  await runCameraNegativeControl(
    "camera-target-pan",
    panGesture,
    ["position", "target", "viewMatrix"],
    "real right-pointer pan gesture",
  );
  const smallResidualDrift = async () => {
    await canvas.evaluate((element) => element.dispatchEvent(new WheelEvent("wheel", {
      deltaY: 0.01,
      bubbles: true,
      cancelable: true,
    })));
  };
  await runCameraNegativeControl(
    "small-residual-drift-after-reset",
    smallResidualDrift,
    ["position", "viewMatrix"],
    "cancelable WheelEvent zoom with deltaY=0.01",
  );
  await fs.writeFile(path.join(evidenceOutput, "camera-negative-controls.json"), `${JSON.stringify({
    tolerance: 0.00001,
    expectedBaseline: initialCameraState,
    negativeControls,
  }, null, 2)}\n`);
  results.push(`camera-state negative controls rejected position/orbit, target/pan, and small residual drift; each reset restored baseline: ${JSON.stringify(negativeControls.map(({ name, deltas, restorationDeltas }) => ({ name, deltas, restorationDeltas })))}`);
  const resetScenarios = [
    { name: "orbit", actions: [orbitGesture] },
    { name: "pan", actions: [panGesture] },
    { name: "zoom", actions: [zoomGesture] },
    { name: "orbit + pan", actions: [orbitGesture, panGesture] },
    { name: "orbit + zoom", actions: [orbitGesture, zoomGesture] },
    { name: "pan + zoom", actions: [panGesture, zoomGesture] },
    { name: "multiple interactions", actions: [orbitGesture, panGesture, zoomGesture] },
  ];
  for (const scenario of resetScenarios) {
    for (const action of scenario.actions) await action();
    await page.waitForTimeout(260);
    await resetView.click();
    await page.waitForTimeout(400);
    await assertInitialCameraRestored(scenario.name);
  }
  await orbitGesture();
  await page.waitForTimeout(80);
  await resetView.click();
  await page.waitForTimeout(400);
  await assertInitialCameraRestored("reset during damping");
  for (let cycle = 1; cycle <= 10; cycle += 1) {
    await orbitGesture();
    await resetView.click();
    await page.waitForTimeout(400);
    await assertInitialCameraRestored(`consecutive reset cycle ${cycle}`);
  }
  await fs.writeFile(path.join(evidenceOutput, "reset-state-measurements.json"), `${JSON.stringify({
    initialModelViewMatrix,
    initialCameraState,
    modelViewTolerance: 0.00001,
    cameraStateTolerance: 0.00001,
    existingScreenshotTolerance: { meanAbsoluteError: 0.001, changedPixelRatio: 0.01 },
    measurements: resetMeasurements,
    consecutiveResetCycles: 10,
  }, null, 2)}\n`);
  results.push(`camera reset scenarios PASS: ${resetMeasurements.length} baseline comparisons, 10 consecutive post-orbit resets; modelView tolerance 0.00001`);

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

  const cameraResumeContext = await browser.newContext({ viewport: { width: 390, height: 640 }, reducedMotion: "no-preference" });
  await cameraResumeContext.addInitScript(() => {
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
  const cameraResumePage = await cameraResumeContext.newPage();
  cameraResumePage.on("pageerror", (error) => pageErrors.push(error.message));
  await cameraResumePage.goto(`${origin}/?theme=light#thinking`, { waitUntil: "networkidle" });
  await alignSection(cameraResumePage);
  const resumeCanvas = cameraResumePage.locator("#thinking canvas");
  await cameraResumePage.waitForFunction(() => document.querySelector("#thinking canvas")?.parentElement?.dataset.thinkingReady === "true");
  const decisionButton = cameraResumePage.getByRole("navigation", { name: "Explore thinking concepts" }).getByRole("button", { name: /Decision Making/ });
  await decisionButton.scrollIntoViewIfNeeded();
  await cameraResumePage.waitForFunction(() => {
    const rect = document.querySelector("#thinking canvas")?.getBoundingClientRect();
    return rect && (rect.bottom <= 0 || rect.top >= window.innerHeight);
  });
  await cameraResumePage.waitForTimeout(80);
  await decisionButton.click();
  assert.equal(await decisionButton.getAttribute("aria-pressed"), "true", "offscreen concept selection failed");
  const framesBeforeResume = await cameraResumePage.evaluate(() => window.__thinkingFrames);
  await resumeCanvas.scrollIntoViewIfNeeded();
  await cameraResumePage.waitForTimeout(600);
  const resumedFrames = (await cameraResumePage.evaluate(() => window.__thinkingFrames)) - framesBeforeResume;
  assert.ok(resumedFrames >= 3, `camera transition did not resume when the canvas re-entered view: ${resumedFrames} rendered frame(s)`);
  results.push("mobile offscreen chapter selection resumes camera transition on re-entry PASS");
  await cameraResumeContext.close();

  // Keep the chapter control and canvas in view together. At 1200px, the
  // selected story can move the button below the viewport; Playwright then
  // scrolls to click it and canvas.screenshot() scrolls back, pausing/resuming
  // the visibility-gated camera tween between the two captures.
  const pendingSelectionContext = await browser.newContext({ viewport: { width: 1440, height: 2000 }, reducedMotion: "no-preference" });
  const pendingSelectionPage = await pendingSelectionContext.newPage();
  pendingSelectionPage.on("pageerror", (error) => pageErrors.push(error.message));
  let modelRequestStarted;
  const modelRequest = new Promise((resolve) => { modelRequestStarted = resolve; });
  await pendingSelectionPage.route("**/models/hra-brain-female-v1.3.glb", async (route) => {
    modelRequestStarted();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await pendingSelectionPage.goto(`${origin}/?theme=light#thinking`, { waitUntil: "domcontentloaded" });
  await alignSection(pendingSelectionPage);
  const pendingCanvas = pendingSelectionPage.locator("#thinking canvas");
  const pendingRiskButton = pendingSelectionPage.getByRole("navigation", { name: "Explore thinking concepts" }).getByRole("button", { name: /Risk Analysis/ });
  await pendingRiskButton.waitFor({ state: "visible" });
  await modelRequest;
  assert.equal(await pendingSelectionPage.evaluate(() => document.querySelector("#thinking canvas")?.parentElement?.dataset.thinkingReady === "true"), false, "test must select the concept before the model is ready");
  await pendingRiskButton.click();
  assert.equal(await pendingRiskButton.getAttribute("aria-pressed"), "true", "selection during model loading failed");
  await pendingSelectionPage.waitForFunction(() => document.querySelector("#thinking canvas")?.parentElement?.dataset.thinkingReady === "true");
  const readPendingGeometry = () => pendingSelectionPage.evaluate(() => {
    const canvas = document.querySelector("#thinking canvas");
    const canvasRect = canvas?.getBoundingClientRect();
    const button = [...document.querySelectorAll("nav button")].find((element) => element.textContent?.includes("Risk Analysis"));
    const buttonRect = button?.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      selected: canvas?.parentElement?.dataset.thinkingSelectedRegion,
      canvas: canvasRect && { top: canvasRect.top, bottom: canvasRect.bottom },
      button: buttonRect && { top: buttonRect.top, bottom: buttonRect.bottom },
    };
  });
  let pendingGeometry = await readPendingGeometry();
  const requiredViewportHeight = Math.ceil(Math.max(pendingGeometry.canvas?.bottom ?? 0, pendingGeometry.button?.bottom ?? 0) + 32);
  if (requiredViewportHeight > pendingGeometry.viewportHeight) {
    await pendingSelectionPage.setViewportSize({ width: 1440, height: requiredViewportHeight });
    pendingGeometry = await readPendingGeometry();
  }
  assert.equal(pendingGeometry.selected, "risk", "pending Risk selection should be replayed to the ready scene");
  assert.ok(pendingGeometry.canvas?.top >= 0 && pendingGeometry.canvas.bottom <= pendingGeometry.viewportHeight,
    `pending-selection canvas should remain in view: ${JSON.stringify(pendingGeometry)}`);
  assert.ok(pendingGeometry.button?.top >= 0 && pendingGeometry.button.bottom <= pendingGeometry.viewportHeight,
    `repeat-selection control should remain in view: ${JSON.stringify(pendingGeometry)}`);
  const beforeRepeatFocus = await waitForStableCanvas(pendingSelectionPage, pendingCanvas);
  const scrollBeforeRepeat = await pendingSelectionPage.evaluate(() => window.scrollY);
  await pendingRiskButton.click();
  const scrollAfterRepeat = await pendingSelectionPage.evaluate(() => window.scrollY);
  assert.equal(scrollAfterRepeat, scrollBeforeRepeat, "repeat activation must not move the canvas out of view");
  const afterRepeatFocus = await waitForStableCanvas(pendingSelectionPage, pendingCanvas);
  const repeatFocusDifference = await compareCanvasImages(pendingSelectionPage, beforeRepeatFocus.image, afterRepeatFocus.image);
  assert.ok(repeatFocusDifference.meanAbsoluteError <= 0.002 && repeatFocusDifference.changedPixelRatio <= 0.01,
    `selection during model loading must focus before repeat activation, with no repeat-click camera drift: ${JSON.stringify(repeatFocusDifference)}`);
  results.push(`pending selection focus and repeat activation PASS (stable capture MAE ${repeatFocusDifference.meanAbsoluteError.toFixed(6)}, changed pixels ${(repeatFocusDifference.changedPixelRatio * 100).toFixed(3)}%)`);
  await pendingSelectionContext.close();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await orbitGesture();
  await resetView.click();
  const reducedMotionReset = async () => page.evaluate(() => window.__thinkingModelViewMatrix);
  const reducedMotionResetMatrix = await reducedMotionReset();
  const reducedMotionResetDelta = Math.max(...initialModelViewMatrix.map((value, index) => Math.abs(value - reducedMotionResetMatrix[index])));
  assert.ok(reducedMotionResetDelta <= 0.00001,
    `reduced-motion reset must restore the initial camera immediately: max modelViewMatrix delta ${reducedMotionResetDelta}`);
  await page.waitForTimeout(160);
  const reducedMotionSettledMatrix = await reducedMotionReset();
  const reducedMotionSettledDelta = Math.max(...initialModelViewMatrix.map((value, index) => Math.abs(value - reducedMotionSettledMatrix[index])));
  assert.ok(reducedMotionSettledDelta <= 0.00001,
    `reduced-motion reset must not continue a camera tween: max modelViewMatrix delta ${reducedMotionSettledDelta}`);
  assert.equal(await nav.getByRole("button", { pressed: true }).count(), 0,
    "reduced-motion reset must clear concept selection");
  const reducedMotionCameraState = await page.evaluate(() => window.__thinkingCameraState);
  const reducedMotionCameraDeltas = assertCameraStateMatchesBaseline(
    initialCameraState,
    reducedMotionCameraState,
    "reduced-motion reset",
  );
  results.push(`reduced-motion reset is immediate and stable PASS (initial delta ${reducedMotionResetDelta}, after 160ms ${reducedMotionSettledDelta})`);
  results.push(`reduced-motion camera position, orientation, target, and matrix PASS ${JSON.stringify(reducedMotionCameraDeltas)}`);
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

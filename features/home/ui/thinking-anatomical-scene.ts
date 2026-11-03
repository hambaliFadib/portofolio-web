import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MODEL_URL = "/models/hra-brain-female-v1.3.glb";
const MODEL_MAX_SIZE = 3.35;
const POINT_COUNT = 3600;
const MAX_CONNECTION_DISTANCE = 0.17;
const CELL_SIZE = MAX_CONNECTION_DISTANCE;

const regions = [
  { id: "business", colorToken: "--color-coral", anchor: new THREE.Vector3(0, 0.28, 0.7) },
  { id: "problem", colorToken: "--color-cobalt", anchor: new THREE.Vector3(0, 0.76, -0.02) },
  { id: "risk", colorToken: "--color-coral", anchor: new THREE.Vector3(0, -0.66, 0.08) },
  { id: "evidence", colorToken: "--color-mint", anchor: new THREE.Vector3(0, 0.2, -0.72) },
  { id: "decision", colorToken: "--color-lime", anchor: new THREE.Vector3(0, -0.55, -0.55) },
] as const;

const riskSubregionIds = ["ambiguity", "impact", "dependency", "detectability"] as const;
const riskSubregionMix: Record<(typeof riskSubregionIds)[number], number> = {
  ambiguity: 0.26,
  impact: 0.4,
  dependency: 0.54,
  detectability: 0.68,
};

type RegionId = (typeof regions)[number]["id"];
type NeuralPoint = { position: THREE.Vector3; normal: THREE.Vector3; regionId: RegionId; riskSubregion?: (typeof riskSubregionIds)[number] };
type Triangle = { mesh: THREE.Mesh; a: number; b: number; c: number; cumulativeArea: number };
type NeuralConnection = { from: number; to: number; regionId: RegionId; middle: THREE.Vector3 };
type ThinkingView = "combined" | "anatomy" | "network";
type ThinkingNetworkScene = {
  focus: (id: string) => void;
  reset: () => void;
  select: (id: string | null) => void;
  dispose: () => void;
};

function randomSource(seed = 0x3d020959) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function normalizedPosition(position: THREE.Vector3, halfSize: THREE.Vector3) {
  return new THREE.Vector3(position.x / halfSize.x, position.y / halfSize.y, position.z / halfSize.z);
}

function colorLuminance(color: THREE.Color) {
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
}

function nearestRegion(position: THREE.Vector3, halfSize: THREE.Vector3): RegionId {
  const x = position.x / halfSize.x;
  const y = position.y / halfSize.y;
  const z = position.z / halfSize.z;
  let closest: (typeof regions)[number] = regions[0];
  let distance = Number.POSITIVE_INFINITY;
  for (const region of regions) {
    const dx = x - region.anchor.x;
    const dy = y - region.anchor.y;
    const dz = z - region.anchor.z;
    const candidate = dx * dx + dy * dy + dz * dz;
    if (candidate < distance) {
      closest = region;
      distance = candidate;
    }
  }
  return closest.id;
}

function isCorticalSurface(name: string) {
  return /(gyrus|lobule|precuneus|cuneus|_pole)/i.test(name) && !/cerebell/i.test(name);
}

function collectMeshes(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
  });
  return meshes;
}

function buildTriangleIndex(meshes: THREE.Mesh[]) {
  const triangles: Triangle[] = [];
  let totalArea = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    const position = geometry.getAttribute("position");
    const index = geometry.getIndex();
    if (!position) continue;
    const triangleCount = index ? index.count / 3 : position.count / 3;
    for (let face = 0; face < triangleCount; face += 1) {
      const aIndex = index ? index.getX(face * 3) : face * 3;
      const bIndex = index ? index.getX(face * 3 + 1) : face * 3 + 1;
      const cIndex = index ? index.getX(face * 3 + 2) : face * 3 + 2;
      a.fromBufferAttribute(position, aIndex);
      b.fromBufferAttribute(position, bIndex);
      c.fromBufferAttribute(position, cIndex);
      const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5;
      if (!Number.isFinite(area) || area < 1e-12) continue;
      totalArea += area;
      triangles.push({ mesh, a: aIndex, b: bIndex, c: cIndex, cumulativeArea: totalArea });
    }
  }

  return { triangles, totalArea };
}

function sampleSurface(triangles: Triangle[], totalArea: number, count: number, halfSize: THREE.Vector3) {
  const random = randomSource();
  const points: NeuralPoint[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normalA = new THREE.Vector3();
  const normalB = new THREE.Vector3();
  const normalC = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let index = 0; index < count; index += 1) {
    const areaTarget = random() * totalArea;
    let low = 0;
    let high = triangles.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (triangles[middle].cumulativeArea < areaTarget) low = middle + 1;
      else high = middle;
    }
    const triangle = triangles[low];
    const mesh = triangle.mesh;
    const geometry = mesh.geometry;
    const positionAttribute = geometry.getAttribute("position");
    if (!positionAttribute) continue;
    const rootA = Math.sqrt(random());
    const weightA = 1 - rootA;
    const weightB = rootA * (1 - random());
    const weightC = 1 - weightA - weightB;
    a.fromBufferAttribute(positionAttribute, triangle.a);
    b.fromBufferAttribute(positionAttribute, triangle.b);
    c.fromBufferAttribute(positionAttribute, triangle.c);
    position.set(0, 0, 0)
      .addScaledVector(a, weightA)
      .addScaledVector(b, weightB)
      .addScaledVector(c, weightC)
      .applyMatrix4(mesh.matrixWorld);

    const normalAttribute = geometry.getAttribute("normal");
    if (normalAttribute) {
      normalA.fromBufferAttribute(normalAttribute, triangle.a);
      normalB.fromBufferAttribute(normalAttribute, triangle.b);
      normalC.fromBufferAttribute(normalAttribute, triangle.c);
      normal.set(0, 0, 0)
        .addScaledVector(normalA, weightA)
        .addScaledVector(normalB, weightB)
        .addScaledVector(normalC, weightC);
    } else {
      normal.copy(b).sub(a).cross(c.clone().sub(a));
    }
    normalMatrix.getNormalMatrix(mesh.matrixWorld);
    normal.applyMatrix3(normalMatrix).normalize();
    if (!Number.isFinite(normal.x + normal.y + normal.z) || normal.lengthSq() < 0.5) continue;
    const regionId = nearestRegion(position, halfSize);
    points.push({
      position: position.clone().addScaledVector(normal, 0.014),
      normal: normal.clone(),
      regionId,
    });
  }
  return points;
}

function assignRiskSubregions(points: NeuralPoint[], halfSize: THREE.Vector3) {
  const riskPoints = points.filter((point) => point.regionId === "risk");
  const samples = riskPoints.map((point) => ({ point, normalized: normalizedPosition(point.position, halfSize) }));
  if (samples.length < riskSubregionIds.length) return;

  const byHemisphereSide = [...samples].sort((left, right) => left.normalized.x - right.normalized.x);
  const middle = Math.ceil(byHemisphereSide.length / 2);
  const sides = [byHemisphereSide.slice(0, middle), byHemisphereSide.slice(middle)];
  const labels: (typeof riskSubregionIds)[number][] = ["detectability", "ambiguity", "dependency", "impact"];
  sides.forEach((side, sideIndex) => {
    const byDepth = side.sort((left, right) => left.normalized.z - right.normalized.z);
    const depthMiddle = Math.ceil(byDepth.length / 2);
    const depthGroups = [byDepth.slice(0, depthMiddle), byDepth.slice(depthMiddle)];
    depthGroups.forEach((group, depthIndex) => {
      group.forEach(({ point }) => { point.riskSubregion = labels[sideIndex * 2 + depthIndex]; });
    });
  });
}

function createConnections(points: NeuralPoint[]) {
  const buckets = new Map<string, number[]>();
  const keyFor = (position: THREE.Vector3) => [
    Math.floor(position.x / CELL_SIZE),
    Math.floor(position.y / CELL_SIZE),
    Math.floor(position.z / CELL_SIZE),
  ];
  const key = (x: number, y: number, z: number) => `${x}:${y}:${z}`;
  const connections: NeuralConnection[] = [];
  const seen = new Set<string>();

  points.forEach((point, index) => {
    const [cellX, cellY, cellZ] = keyFor(point.position);
    const neighbors: Array<{ index: number; distance: number }> = [];
    for (let x = cellX - 1; x <= cellX + 1; x += 1) {
      for (let y = cellY - 1; y <= cellY + 1; y += 1) {
        for (let z = cellZ - 1; z <= cellZ + 1; z += 1) {
          for (const candidateIndex of buckets.get(key(x, y, z)) ?? []) {
            const candidate = points[candidateIndex];
            if (candidate.regionId !== point.regionId || candidate.normal.dot(point.normal) < 0.22) continue;
            if (point.regionId === "risk" && candidate.riskSubregion !== point.riskSubregion) continue;
            const distance = candidate.position.distanceTo(point.position);
            if (distance < MAX_CONNECTION_DISTANCE) neighbors.push({ index: candidateIndex, distance });
          }
        }
      }
    }
    neighbors.sort((left, right) => left.distance - right.distance);
    for (const neighbor of neighbors.slice(0, 2)) {
      const first = Math.min(index, neighbor.index);
      const second = Math.max(index, neighbor.index);
      const connectionKey = `${first}:${second}`;
      if (seen.has(connectionKey)) continue;
      seen.add(connectionKey);
      const other = points[neighbor.index];
      const middle = point.position.clone().lerp(other.position, 0.5)
        .add(point.normal.clone().add(other.normal).normalize().multiplyScalar(0.022));
      connections.push({ from: first, to: second, regionId: point.regionId, middle });
    }
    const cellKey = key(cellX, cellY, cellZ);
    buckets.set(cellKey, [...(buckets.get(cellKey) ?? []), index]);
  });

  return connections;
}

function buildAnatomicalSurface(meshes: THREE.Mesh[], halfSize: THREE.Vector3) {
  const vertexCount = meshes.reduce((total, mesh) => total + mesh.geometry.getAttribute("position").count, 0);
  const indexCount = meshes.reduce((total, mesh) => {
    const position = mesh.geometry.getAttribute("position");
    return total + (mesh.geometry.getIndex()?.count ?? position.count);
  }, 0);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(indexCount);
  const regionIds = new Uint8Array(vertexCount);
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  const regionIndex = new Map<RegionId, number>(regions.map((region, index) => [region.id, index]));
  let vertexOffset = 0;
  let indexOffset = 0;

  meshes.forEach((mesh) => {
    const geometry = mesh.geometry;
    const positionAttribute = geometry.getAttribute("position");
    const normalAttribute = geometry.getAttribute("normal");
    const index = geometry.getIndex();
    if (!normalAttribute) throw new Error(`Cortical mesh ${mesh.name} is missing normals.`);
    normalMatrix.getNormalMatrix(mesh.matrixWorld);

    for (let vertex = 0; vertex < positionAttribute.count; vertex += 1) {
      position.fromBufferAttribute(positionAttribute, vertex).applyMatrix4(mesh.matrixWorld);
      normal.fromBufferAttribute(normalAttribute, vertex).applyMatrix3(normalMatrix).normalize();
      const offset = (vertexOffset + vertex) * 3;
      positions[offset] = position.x;
      positions[offset + 1] = position.y;
      positions[offset + 2] = position.z;
      normals[offset] = normal.x;
      normals[offset + 1] = normal.y;
      normals[offset + 2] = normal.z;
      regionIds[vertexOffset + vertex] = regionIndex.get(nearestRegion(position, halfSize)) ?? 0;
    }

    if (index) {
      for (let item = 0; item < index.count; item += 1) indices[indexOffset + item] = index.getX(item) + vertexOffset;
      indexOffset += index.count;
    } else {
      for (let item = 0; item < positionAttribute.count; item += 1) indices[indexOffset + item] = item + vertexOffset;
      indexOffset += positionAttribute.count;
    }
    vertexOffset += positionAttribute.count;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, regionIds, vertexCount, indexCount };
}

function resolveThinkingView(): ThinkingView {
  const requested = new URLSearchParams(window.location.search).get("thinkingView");
  return requested === "anatomy" || requested === "network" ? requested : "combined";
}

export function mountThinkingNetwork(
  host: HTMLElement,
  onSelect: (id: string | null) => void,
  onHover: (id: string | null) => void,
  onReady: () => void,
  onFailure: () => void,
): ThinkingNetworkScene {
  const startedAt = performance.now();
  const assetRequestedAt = performance.now();
  const thinkingView = resolveThinkingView();
  const width = Math.max(host.clientWidth, 1);
  const height = Math.max(host.clientHeight, 1);
  const probeCanvas = document.createElement("canvas");
  const probeContext = probeCanvas.getContext("webgl2", { powerPreference: "low-power" });
  if (!probeContext) {
    onFailure();
    return { focus() {}, reset() {}, select() {}, dispose() {} };
  }
  probeContext.getExtension("WEBGL_lose_context")?.loseContext();

  const scene = new THREE.Scene();
  const hemisphereLight = new THREE.HemisphereLight(0xeaf0ff, 0x465268, 1.15);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(4, 5, 6);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.65);
  fillLight.position.set(-4, 1.5, -4);
  scene.add(hemisphereLight, keyLight, fillLight);
  const camera = new THREE.PerspectiveCamera(width < 600 ? 39 : 34, width / height, 0.1, 100);
  const initialPosition = new THREE.Vector3(width < 600 ? 2.6 : 3.2, width < 600 ? 1.5 : 1.9, width < 600 ? 6.1 : 5.7);
  camera.position.copy(initialPosition);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.className = "absolute inset-0 h-full w-full touch-pan-y";
  renderer.domElement.style.cursor = "grab";
  host.appendChild(renderer.domElement);

  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = media.matches;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.07;
  controls.minDistance = 4.5;
  controls.maxDistance = 11;
  controls.minPolarAngle = 0.28;
  controls.maxPolarAngle = Math.PI - 0.28;
  controls.screenSpacePanning = true;
  controls.autoRotate = false;

  const getToken = (name: string, fallback: string) =>
    getComputedStyle(host).getPropertyValue(name).trim() || fallback;
  const foreground = new THREE.Color(getToken("--foreground", "#111319"));
  const background = new THREE.Color(getToken("--background", "#f1efe8"));
  const idleColor = foreground.clone().lerp(background, 0.34);
  const surfaceBaseColor = background.clone().lerp(foreground, colorLuminance(background) > 0.45 ? 0.12 : 0.2);
  const regionColors = new Map<RegionId, THREE.Color>(regions.map((region) => [
    region.id,
    new THREE.Color(getToken(region.colorToken, "#ff7057")),
  ]));

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const originalMaterials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const proxyMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
  const surfaceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
  const pointMaterial = new THREE.PointsMaterial({ size: 0.017, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.82, depthWrite: false, alphaTest: 0.02 });
  const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.24, depthWrite: false });
  materials.add(proxyMaterial);
  materials.add(surfaceMaterial);
  materials.add(pointMaterial);
  materials.add(lineMaterial);

  let disposed = false;
  let failed = false;
  let assetScene: THREE.Group | THREE.Scene | null = null;
  let brainHalfSize: THREE.Vector3 | null = null;
  let hitMeshes: THREE.Mesh[] = [];
  let animationFrame = 0;
  let interactionFrame = 0;
  let interactionActive = false;
  let settleUntil = 0;
  let inView = true;
  let resizeObserver: ResizeObserver | undefined;
  let visibilityObserver: IntersectionObserver | undefined;
  let selectedConceptId: string | null = null;
  let hoveredConceptId: string | null = null;
  let cameraTween: {
    start: number;
    duration: number;
    fromPosition: THREE.Vector3;
    toPosition: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null = null;
  let pointerStart: { x: number; y: number } | null = null;
  let primaryPointerId: number | null = null;
  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(1);
  const pointer = new THREE.Vector2();
  const regionTargets = new Map<string, THREE.Vector3>();
  let neuralPoints: NeuralPoint[] = [];
  let neuralConnections: NeuralConnection[] = [];
  let surfaceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null = null;
  let surfaceColors: THREE.BufferAttribute | null = null;
  let surfaceRegionIds = new Uint8Array();
  let pointCloud: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null;
  let lineSegments: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
  let pointColors: THREE.BufferAttribute | null = null;
  let lineColors: THREE.BufferAttribute | null = null;

  const render = () => {
    if (!disposed && inView) {
      renderer.render(scene, camera);
      if (host.dataset.thinkingReady === "true") {
        host.dataset.thinkingDrawCalls = String(renderer.info.render.calls);
        host.dataset.thinkingRenderedTriangles = String(renderer.info.render.triangles);
        host.dataset.thinkingGpuGeometries = String(renderer.info.memory.geometries);
        host.dataset.thinkingGpuTextures = String(renderer.info.memory.textures);
      }
    }
  };

  const cameraPositionFor = (target: THREE.Vector3) => {
    const direction = camera.position.clone().sub(controls.target).normalize();
    const distance = Math.max(controls.getDistance(), 5.2);
    return target.clone().addScaledVector(direction, distance);
  };

  const moveCamera = (target: THREE.Vector3, duration = 320) => {
    const nextPosition = cameraPositionFor(target);
    if (reducedMotion) {
      camera.position.copy(nextPosition);
      controls.target.copy(target);
      controls.update();
      render();
      return;
    }
    cameraTween = {
      start: performance.now(), duration,
      fromPosition: camera.position.clone(), toPosition: nextPosition,
      fromTarget: controls.target.clone(), toTarget: target.clone(),
    };
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(animate);
  };

  const animate = (now: number) => {
    if (disposed || !inView) return;
    if (cameraTween) {
      const progress = Math.min((now - cameraTween.start) / cameraTween.duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
      controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
      if (progress >= 1) cameraTween = null;
      controls.update();
    }
    renderer.render(scene, camera);
    if (cameraTween) animationFrame = requestAnimationFrame(animate);
  };

  const applyRegionStyle = () => {
    if (!pointColors || !lineColors || !surfaceColors) return;
    const surfaceColor = new THREE.Color();
    if (surfaceMesh) surfaceMesh.visible = thinkingView !== "network";
    if (pointCloud) pointCloud.visible = thinkingView !== "anatomy";
    if (lineSegments) lineSegments.visible = thinkingView !== "anatomy";
    for (let index = 0; index < surfaceRegionIds.length; index += 1) {
      const region = regions[surfaceRegionIds[index]];
      const selected = selectedConceptId === region.id;
      const hovered = selectedConceptId === null && hoveredConceptId === region.id;
      surfaceColor.copy(surfaceBaseColor);
      if (selected) surfaceColor.lerp(regionColors.get(region.id) ?? foreground, 0.36);
      else if (hovered) surfaceColor.lerp(regionColors.get(region.id) ?? foreground, 0.18);
      else if (selectedConceptId) surfaceColor.lerp(foreground, 0.08);
      surfaceColors.setXYZ(index, surfaceColor.r, surfaceColor.g, surfaceColor.b);
    }
    surfaceColors.needsUpdate = true;
    neuralPoints.forEach((point, index) => {
      const regionColor = regionColors.get(point.regionId) ?? foreground;
      const selected = selectedConceptId === point.regionId;
      const hovered = selectedConceptId === null && hoveredConceptId === point.regionId;
      let color = idleColor;
      if (selected) {
        color = point.riskSubregion && point.regionId === "risk"
          ? regionColor.clone().lerp(regionColors.get("problem") ?? foreground, riskSubregionMix[point.riskSubregion])
          : regionColor.clone().lerp(foreground, 0.16);
      } else if (hovered) {
        color = regionColor.clone().lerp(foreground, 0.3);
      } else if (selectedConceptId) {
        color = background.clone().lerp(foreground, 0.28);
      }
      pointColors?.setXYZ(index, color.r, color.g, color.b);
    });
    pointColors.needsUpdate = true;

    neuralConnections.forEach((connection, index) => {
      const selected = selectedConceptId === connection.regionId;
      const hovered = selectedConceptId === null && hoveredConceptId === connection.regionId;
      const base = regionColors.get(connection.regionId) ?? foreground;
      const color = selected
        ? base.clone().lerp(foreground, 0.2)
        : hovered
          ? base.clone().lerp(foreground, 0.38)
          : selectedConceptId
            ? background.clone().lerp(foreground, 0.18)
            : idleColor.clone().lerp(background, 0.2);
      const offset = index * 4;
      for (let vertex = 0; vertex < 4; vertex += 1) lineColors?.setXYZ(offset + vertex, color.r, color.g, color.b);
    });
    lineColors.needsUpdate = true;
    render();
  };

  const setHoveredRegion = (id: string | null) => {
    const next = id && regions.some((region) => region.id === id) ? id : null;
    if (hoveredConceptId === next) return;
    hoveredConceptId = next;
    if (next) host.dataset.thinkingHoveredRegion = next;
    else delete host.dataset.thinkingHoveredRegion;
    renderer.domElement.style.cursor = next ? "pointer" : interactionActive ? "grabbing" : "grab";
    onHover(next);
    applyRegionStyle();
  };

  const setSelectedRegion = (id: string | null) => {
    selectedConceptId = id;
    if (id) host.dataset.thinkingSelectedRegion = id;
    else delete host.dataset.thinkingSelectedRegion;
    applyRegionStyle();
  };

  const resolveRegionAt = (clientX: number, clientY: number) => {
    if (!hitMeshes.length) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hitMeshes, false)[0];
    if (!hit) return null;
    return brainHalfSize ? nearestRegion(hit.point, brainHalfSize) : null;
  };

  const onControlsChange = () => render();
  const animateControls = () => {
    interactionFrame = 0;
    if (disposed || !inView) return;
    controls.update();
    if (interactionActive || performance.now() < settleUntil) interactionFrame = requestAnimationFrame(animateControls);
  };
  const requestControlsFrame = () => {
    if (!reducedMotion && !interactionFrame) interactionFrame = requestAnimationFrame(animateControls);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (primaryPointerId !== null) {
      pointerStart = null;
      primaryPointerId = null;
      interactionActive = true;
      renderer.domElement.style.cursor = "grabbing";
      requestControlsFrame();
      return;
    }
    primaryPointerId = event.pointerId;
    pointerStart = { x: event.clientX, y: event.clientY };
    interactionActive = true;
    settleUntil = 0;
    renderer.domElement.style.cursor = "grabbing";
    requestControlsFrame();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (interactionActive) return;
    setHoveredRegion(resolveRegionAt(event.clientX, event.clientY));
  };
  const onPointerLeave = () => {
    if (!interactionActive) setHoveredRegion(null);
  };
  const onPointerUp = (event: PointerEvent) => {
    interactionActive = false;
    settleUntil = reducedMotion ? 0 : performance.now() + 220;
    renderer.domElement.style.cursor = "grab";
    requestControlsFrame();
    const isSinglePointer = primaryPointerId === event.pointerId && pointerStart !== null;
    primaryPointerId = null;
    if (!isSinglePointer || !pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) {
      pointerStart = null;
      return;
    }
    const id = resolveRegionAt(event.clientX, event.clientY);
    if (id) onSelect(id);
    pointerStart = null;
  };
  const onPointerCancel = () => {
    interactionActive = false;
    settleUntil = reducedMotion ? 0 : performance.now() + 220;
    renderer.domElement.style.cursor = "grab";
    requestControlsFrame();
    pointerStart = null;
    primaryPointerId = null;
  };
  const resize = () => {
    const nextWidth = Math.max(host.clientWidth, 1);
    const nextHeight = Math.max(host.clientHeight, 1);
    camera.aspect = nextWidth / nextHeight;
    camera.fov = nextWidth < 600 ? 39 : 34;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, nextHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    render();
  };
  const onMotionChange = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches;
    controls.enableDamping = !reducedMotion;
    if (reducedMotion) {
      interactionActive = false;
      settleUntil = 0;
      cancelAnimationFrame(interactionFrame);
      interactionFrame = 0;
      if (cameraTween) {
        camera.position.copy(cameraTween.toPosition);
        controls.target.copy(cameraTween.toTarget);
        cameraTween = null;
        cancelAnimationFrame(animationFrame);
        controls.update();
      }
    }
    render();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    if (!failed) {
      failed = true;
      onFailure();
    }
  };

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerCancel);
  renderer.domElement.addEventListener("webglcontextlost", onContextLost);
  controls.addEventListener("change", onControlsChange);
  media.addEventListener("change", onMotionChange);

  const themeObserver = new MutationObserver(() => {
    foreground.set(getToken("--foreground", "#111319"));
    background.set(getToken("--background", "#f1efe8"));
    idleColor.copy(foreground).lerp(background, 0.34);
    surfaceBaseColor.copy(background).lerp(foreground, colorLuminance(background) > 0.45 ? 0.12 : 0.2);
    for (const region of regions) regionColors.get(region.id)?.set(getToken(region.colorToken, "#ff7057"));
    applyRegionStyle();
  });
  themeObserver.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["class", "data-appearance", "data-persona"] });
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
  }
  if (typeof IntersectionObserver !== "undefined") {
    visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) render();
      else {
        cancelAnimationFrame(animationFrame);
        cancelAnimationFrame(interactionFrame);
        interactionFrame = 0;
        interactionActive = false;
      }
    });
    visibilityObserver.observe(host);
  }

  const onLoaded = (gltf: { scene: THREE.Group }) => {
    if (disposed) {
      collectMeshes(gltf.scene).forEach((mesh) => mesh.geometry.dispose());
      return;
    }
    assetScene = gltf.scene;
    const allMeshes = collectMeshes(gltf.scene);
    const corticalMeshes = allMeshes.filter((mesh) => isCorticalSurface(mesh.name));
    if (!corticalMeshes.length) {
      failed = true;
      collectMeshes(gltf.scene).forEach((mesh) => mesh.geometry.dispose());
      onFailure();
      return;
    }

    const originalBounds = new THREE.Box3().setFromObject(gltf.scene);
    const dimensions = originalBounds.getSize(new THREE.Vector3());
    const originalCenter = originalBounds.getCenter(new THREE.Vector3());
    const scale = MODEL_MAX_SIZE / Math.max(dimensions.x, dimensions.y, dimensions.z);
    gltf.scene.scale.setScalar(scale);
    gltf.scene.position.copy(originalCenter).multiplyScalar(-scale);
    gltf.scene.updateMatrixWorld(true);
    const centeredBounds = new THREE.Box3().setFromObject(gltf.scene);
    const halfSize = centeredBounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    brainHalfSize = halfSize;
    const corticalSet = new Set(corticalMeshes);
    const corticalGeometrySet = new Set(corticalMeshes.map((mesh) => mesh.geometry));
    const unusedGeometry = new Set<THREE.BufferGeometry>();

    for (const mesh of allMeshes) {
      const oldMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      oldMaterials.forEach((material) => {
        originalMaterials.add(material);
        for (const value of Object.values(material)) {
          if ((value as THREE.Texture | undefined)?.isTexture) textures.add(value as THREE.Texture);
        }
      });
      if (corticalSet.has(mesh)) {
        mesh.material = proxyMaterial;
        mesh.layers.set(1);
      } else {
        if (!corticalGeometrySet.has(mesh.geometry)) unusedGeometry.add(mesh.geometry);
        mesh.removeFromParent();
      }
    }
    unusedGeometry.forEach((geometry) => geometry.dispose());
    hitMeshes = corticalMeshes;

    const { triangles, totalArea } = buildTriangleIndex(corticalMeshes);
    neuralPoints = sampleSurface(triangles, totalArea, POINT_COUNT, halfSize);
    assignRiskSubregions(neuralPoints, halfSize);
    neuralConnections = createConnections(neuralPoints);
    const mergedSurface = buildAnatomicalSurface(corticalMeshes, halfSize);
    surfaceRegionIds = mergedSurface.regionIds;
    const surfaceColorValues = new Float32Array(mergedSurface.vertexCount * 3);
    surfaceColors = new THREE.BufferAttribute(surfaceColorValues, 3);
    mergedSurface.geometry.setAttribute("color", surfaceColors);
    geometries.add(mergedSurface.geometry);
    surfaceMesh = new THREE.Mesh(mergedSurface.geometry, surfaceMaterial);
    surfaceMesh.renderOrder = 0;
    scene.add(surfaceMesh);

    const pointPositions = new Float32Array(neuralPoints.length * 3);
    const pointColorValues = new Float32Array(neuralPoints.length * 3);
    const centroidSums = new Map<string, THREE.Vector3>();
    const centroidCounts = new Map<string, number>();
    neuralPoints.forEach((point, index) => {
      pointPositions.set(point.position.toArray(), index * 3);
      const initialColor = idleColor;
      pointColorValues.set([initialColor.r, initialColor.g, initialColor.b], index * 3);
      const sum = centroidSums.get(point.regionId) ?? new THREE.Vector3();
      centroidSums.set(point.regionId, sum.add(point.position));
      centroidCounts.set(point.regionId, (centroidCounts.get(point.regionId) ?? 0) + 1);
    });
    for (const region of regions) {
      const count = centroidCounts.get(region.id) ?? 0;
      const sum = centroidSums.get(region.id);
      if (sum && count) regionTargets.set(region.id, sum.multiplyScalar(1 / count));
    }
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
    pointColors = new THREE.BufferAttribute(pointColorValues, 3);
    pointGeometry.setAttribute("color", pointColors);
    pointGeometry.computeBoundingSphere();
    geometries.add(pointGeometry);
    pointCloud = new THREE.Points(pointGeometry, pointMaterial);
    pointCloud.renderOrder = 2;
    scene.add(pointCloud);

    const linePositionValues = new Float32Array(neuralConnections.length * 12);
    const lineColorValues = new Float32Array(neuralConnections.length * 12);
    neuralConnections.forEach((connection, index) => {
      const from = neuralPoints[connection.from].position;
      const to = neuralPoints[connection.to].position;
      const offset = index * 12;
      linePositionValues.set(from.toArray(), offset);
      linePositionValues.set(connection.middle.toArray(), offset + 3);
      linePositionValues.set(connection.middle.toArray(), offset + 6);
      linePositionValues.set(to.toArray(), offset + 9);
      for (let vertex = 0; vertex < 4; vertex += 1) {
        lineColorValues.set([idleColor.r, idleColor.g, idleColor.b], offset + vertex * 3);
      }
    });
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositionValues, 3));
    lineColors = new THREE.BufferAttribute(lineColorValues, 3);
    lineGeometry.setAttribute("color", lineColors);
    lineGeometry.computeBoundingSphere();
    geometries.add(lineGeometry);
    lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    lineSegments.renderOrder = 1;
    scene.add(lineSegments);
    pointCloud.renderOrder = 2;

    host.dataset.thinkingReady = "true";
    host.dataset.thinkingRenderMode = thinkingView;
    host.dataset.thinkingPoints = String(neuralPoints.length);
    host.dataset.thinkingConnections = String(neuralConnections.length);
    host.dataset.thinkingMeshes = String(allMeshes.length);
    host.dataset.thinkingCorticalMeshes = String(corticalMeshes.length);
    host.dataset.thinkingTriangles = String(triangles.length);
    host.dataset.thinkingSurfaceVertices = String(mergedSurface.vertexCount);
    host.dataset.thinkingSurfaceIndices = String(mergedSurface.indexCount);
    host.dataset.thinkingMaterialCount = String(materials.size);
    host.dataset.thinkingAssetLoadMs = String(Math.round(performance.now() - assetRequestedAt));
    host.dataset.thinkingPointSpread = String(Number((pointGeometry.boundingSphere?.radius ?? 0).toFixed(3)));
    const riskCounts = Object.fromEntries(riskSubregionIds.map((id) => [id, neuralPoints.filter((point) => point.riskSubregion === id).length]));
    host.dataset.thinkingRiskClusters = JSON.stringify(riskCounts);
    host.dataset.thinkingInitMs = String(Math.round(performance.now() - startedAt));
    controls.target.set(0, 0, 0);
    controls.update();
    applyRegionStyle();
    render();
    onReady();
  };

  new GLTFLoader().load(MODEL_URL, onLoaded, undefined, () => {
    if (disposed || failed) return;
    failed = true;
    onFailure();
  });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(animationFrame);
    cancelAnimationFrame(interactionFrame);
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    themeObserver.disconnect();
    media.removeEventListener("change", onMotionChange);
    controls.removeEventListener("change", onControlsChange);
    controls.dispose();
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
    renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
    surfaceMesh?.removeFromParent();
    pointCloud?.removeFromParent();
    lineSegments?.removeFromParent();
    assetScene?.removeFromParent();
    collectMeshes(assetScene ?? new THREE.Group()).forEach((mesh) => geometries.add(mesh.geometry));
    geometries.forEach((geometry) => geometry.dispose());
    originalMaterials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    delete host.dataset.thinkingReady;
    delete host.dataset.thinkingHoveredRegion;
    delete host.dataset.thinkingSelectedRegion;
    delete host.dataset.thinkingRiskClusters;
    delete host.dataset.thinkingPointSpread;
    delete host.dataset.thinkingRenderMode;
    delete host.dataset.thinkingSurfaceVertices;
    delete host.dataset.thinkingSurfaceIndices;
    delete host.dataset.thinkingMaterialCount;
    delete host.dataset.thinkingAssetLoadMs;
    delete host.dataset.thinkingDrawCalls;
    delete host.dataset.thinkingRenderedTriangles;
    delete host.dataset.thinkingGpuGeometries;
    delete host.dataset.thinkingGpuTextures;
    brainHalfSize = null;
    surfaceRegionIds = new Uint8Array();
    surfaceMesh = null;
    surfaceColors = null;
  };

  controls.update();
  render();
  return {
    focus(id) {
      const target = regionTargets.get(id);
      if (target) moveCamera(target);
    },
    reset() {
      setSelectedRegion(null);
      moveCamera(new THREE.Vector3(0, 0, 0), 360);
      if (!reducedMotion) {
        const from = camera.position.clone();
        cameraTween = {
          start: performance.now(), duration: 360,
          fromPosition: from, toPosition: initialPosition.clone(),
          fromTarget: controls.target.clone(), toTarget: new THREE.Vector3(0, 0, 0),
        };
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(animate);
      } else {
        camera.position.copy(initialPosition);
        controls.target.set(0, 0, 0);
        controls.update();
        render();
      }
    },
    select: setSelectedRegion,
    dispose,
  };
}

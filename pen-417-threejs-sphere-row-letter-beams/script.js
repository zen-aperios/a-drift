import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const app = document.getElementById("app");
const statusText = document.getElementById("statusText");

const sequenceInput = document.getElementById("sequenceInput");
const glyphAmountRange = document.getElementById("glyphAmountRange");
const fontStyleSelect = document.getElementById("fontStyleSelect");
const radiusRange = document.getElementById("radiusRange");
const textScaleRange = document.getElementById("textScaleRange");
const poleShrinkRange = document.getElementById("poleShrinkRange");
const densityRange = document.getElementById("densityRange");
const pointSizeRange = document.getElementById("pointSizeRange");
const beamAlphaRange = document.getElementById("beamAlphaRange");
const beamDensityRange = document.getElementById("beamDensityRange");
const beamFadeRange = document.getElementById("beamFadeRange");
const beamJitterRange = document.getElementById("beamJitterRange");
const pulseRange = document.getElementById("pulseRange");
const morphDurationRange = document.getElementById("morphDurationRange");
const holdDurationRange = document.getElementById("holdDurationRange");
const travelModeSelect = document.getElementById("travelModeSelect");
const rotationSpeedRange = document.getElementById("rotationSpeedRange");
const rotationEaseSelect = document.getElementById("rotationEaseSelect");
const tiltRange = document.getElementById("tiltRange");
const pauseCheck = document.getElementById("pauseCheck");
const rebuildBtn = document.getElementById("rebuildBtn");
const nextBtn = document.getElementById("nextBtn");

const glyphAmountVal = document.getElementById("glyphAmountVal");
const beamFadeVal = document.getElementById("beamFadeVal");
const radiusVal = document.getElementById("radiusVal");
const textScaleVal = document.getElementById("textScaleVal");
const poleShrinkVal = document.getElementById("poleShrinkVal");
const densityVal = document.getElementById("densityVal");
const pointSizeVal = document.getElementById("pointSizeVal");
const beamAlphaVal = document.getElementById("beamAlphaVal");
const beamDensityVal = document.getElementById("beamDensityVal");
const beamJitterVal = document.getElementById("beamJitterVal");
const pulseVal = document.getElementById("pulseVal");
const morphDurationVal = document.getElementById("morphDurationVal");
const holdDurationVal = document.getElementById("holdDurationVal");
const rotationSpeedVal = document.getElementById("rotationSpeedVal");
const tiltVal = document.getElementById("tiltVal");

const config = {
  sequence: "A\nR\nT\nE",
  glyphAmount: 16,
  fontStyle: "arial-black",
  radius: 3.35,
  textScale: 8,
  poleShrink: 0,
  density: 1,
  pointSize: 0.1,
  beamAlpha: 0.14,
  beamDensity: 0.35,
  beamFade: 0.9,
  beamJitter: 0,
  pulse: 0,
  morphDuration: 6,
  holdDuration: 0,
  travelMode: "horizontal",
  rotationSpeed: 24,
  rotationEase: "soft",
  tilt: -18,
  paused: false,
};

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#000000");

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = true;
controls.enableDamping = true;
controls.minDistance = 5.5;
controls.maxDistance = 18;

scene.add(new THREE.AmbientLight("#ffffff", 0.85));
const keyLight = new THREE.DirectionalLight("#ffffff", 0.75);
keyLight.position.set(3, 5, 7);
scene.add(keyLight);

const root = new THREE.Group();
scene.add(root);
const globeGroup = new THREE.Group();
root.add(globeGroup);

const sampleCanvas = document.createElement("canvas");
sampleCanvas.width = 220;
sampleCanvas.height = 220;
const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

let pointMesh = null;
let lineMesh = null;
let pointGeometry = null;
let lineGeometry = null;
let pointMaterial = null;
let lineMaterial = null;
let currentSet = [];
let nextSet = [];
let maxPointCount = 0;
let sequenceChars = [];
let currentIndex = 0;
let stageTime = 0;
let morphMix = 0;
let holdMode = false;
let pausedRotation = 0;
const BEAM_SEGMENTS = 48;
const MAX_TOTAL_POINTS = 22000;

function makeDotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(32, 32, 18, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const dotTexture = makeDotTexture();

const workingPosition = new THREE.Vector3();
const currentDirection = new THREE.Vector3();
const nextDirection = new THREE.Vector3();
const center = new THREE.Vector3(0, 0, 0);
const clock = new THREE.Clock();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / Math.max(0.000001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function hash(value) {
  const x = Math.sin(value * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function downsampleEvenly(points, count) {
  if (count >= points.length) return points;
  const sampled = [];
  for (let index = 0; index < count; index += 1) {
    const sourceIndex = Math.round((index / Math.max(1, count - 1)) * (points.length - 1));
    sampled.push(points[sourceIndex]);
  }
  return sampled;
}

function dedupeBySpacing(points, spacing) {
  const kept = [];
  const occupied = new Set();
  const safeSpacing = Math.max(0.0001, spacing);

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const gridX = Math.round(point.x / safeSpacing);
    const gridY = Math.round(point.y / safeSpacing);
    const key = `${gridX}:${gridY}`;
    if (occupied.has(key)) continue;
    occupied.add(key);
    kept.push(point);
  }

  return kept.length ? kept : points.slice(0, 1);
}

function dedupeUvPoints(points, spacingU, spacingV) {
  const kept = [];
  const occupied = new Set();
  const safeSpacingU = Math.max(0.0001, spacingU);
  const safeSpacingV = Math.max(0.0001, spacingV);

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const gridU = Math.round(point.u / safeSpacingU);
    const gridV = Math.round(point.v / safeSpacingV);
    const key = `${gridU}:${gridV}`;
    if (occupied.has(key)) continue;
    occupied.add(key);
    kept.push(point);
  }

  return kept.length ? kept : points.slice(0, 1);
}

function updateLabels() {
  glyphAmountVal.textContent = String(Math.round(config.glyphAmount));
  beamFadeVal.textContent = config.beamFade.toFixed(2);
  radiusVal.textContent = config.radius.toFixed(2);
  textScaleVal.textContent = config.textScale.toFixed(2);
  poleShrinkVal.textContent = config.poleShrink.toFixed(2);
  densityVal.textContent = String(Number(config.density.toFixed(2)));
  pointSizeVal.textContent = config.pointSize.toFixed(2);
  beamAlphaVal.textContent = config.beamAlpha.toFixed(2);
  beamDensityVal.textContent = config.beamDensity.toFixed(2);
  beamJitterVal.textContent = config.beamJitter.toFixed(2);
  pulseVal.textContent = config.pulse.toFixed(2);
  morphDurationVal.textContent = `${config.morphDuration.toFixed(1)}s`;
  holdDurationVal.textContent = `${config.holdDuration.toFixed(1)}s`;
  rotationSpeedVal.textContent = `${config.rotationSpeed.toFixed(1)}s`;
  tiltVal.textContent = `${config.tilt.toFixed(0)}deg`;
}

function syncConfig() {
  config.sequence = sequenceInput.value || "A";
  config.glyphAmount = parseInt(glyphAmountRange.value, 10);
  config.fontStyle = fontStyleSelect.value;
  config.radius = parseFloat(radiusRange.value);
  config.textScale = parseFloat(textScaleRange.value);
  config.poleShrink = parseFloat(poleShrinkRange.value);
  config.density = parseFloat(densityRange.value);
  config.pointSize = parseFloat(pointSizeRange.value);
  config.beamAlpha = parseFloat(beamAlphaRange.value);
  config.beamDensity = parseFloat(beamDensityRange.value);
  config.beamFade = parseFloat(beamFadeRange.value);
  config.beamJitter = parseFloat(beamJitterRange.value);
  config.pulse = parseFloat(pulseRange.value);
  config.morphDuration = parseFloat(morphDurationRange.value);
  config.holdDuration = parseFloat(holdDurationRange.value);
  config.travelMode = travelModeSelect.value;
  config.rotationSpeed = parseFloat(rotationSpeedRange.value);
  config.rotationEase = rotationEaseSelect.value;
  config.tilt = parseFloat(tiltRange.value);
  config.paused = pauseCheck.checked;
  updateLabels();
}

function getRotationPhase(time) {
  return time / Math.max(0.1, config.rotationSpeed);
}

function sanitizeSequence(text) {
  return Array.from(
    text
      .toUpperCase()
      .replace(/[^A-Z0-9\n]/g, "\n")
      .replace(/\n+/g, "\n")
  )
    .filter((char) => /[A-Z0-9]/.test(char));
}

function getFontString(size) {
  const safeSize = Math.max(12, Math.floor(size));
  if (config.fontStyle === "dm-sans") {
    return `800 ${safeSize}px "DM Sans", Arial, sans-serif`;
  }
  if (config.fontStyle === "georgia") {
    return `700 ${safeSize}px Georgia, "Times New Roman", serif`;
  }
  if (config.fontStyle === "courier") {
    return `700 ${safeSize}px "Courier New", monospace`;
  }
  return `900 ${safeSize}px Arial Black, Arial, sans-serif`;
}

function uvToSphere(u, v) {
  const theta = u * Math.PI * 2;
  const phi = v * Math.PI;
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    config.radius * Math.cos(theta) * sinPhi,
    config.radius * Math.cos(phi),
    config.radius * Math.sin(theta) * sinPhi
  );
}

function sampleGlyphShape(char) {
  const size = sampleCanvas.width;
  sampleCtx.clearRect(0, 0, size, size);
  sampleCtx.fillStyle = "#000";
  sampleCtx.fillRect(0, 0, size, size);
  sampleCtx.fillStyle = "#fff";
  sampleCtx.textAlign = "center";
  sampleCtx.textBaseline = "middle";
  const normalizedScale = clamp(config.textScale / 8, 1, 1.25);
  sampleCtx.font = `900 ${Math.round(120 + normalizedScale * 70)}px Arial Black, Arial, sans-serif`;
  sampleCtx.fillText(char, size * 0.5, size * 0.56);
  const imageData = sampleCtx.getImageData(0, 0, size, size);
  const step = Math.max(4, Math.round(10 - normalizedScale * 2.8));
  const points = [];

  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const index = (y * size + x) * 4;
      if (imageData.data[index] < 30) continue;
      points.push({
        x: (x / size - 0.5) * 1.5 * normalizedScale,
        y: (0.5 - y / size) * 1.5 * normalizedScale,
      });
    }
  }

  if (!points.length) {
    points.push({ x: 0, y: 0 });
  }

  points.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 0.0001) return a.y - b.y;
    return a.x - b.x;
  });

  const spacingFiltered = dedupeBySpacing(points, (step / size) * 1.25);
  const keepRatio = clamp(config.density, 0.1, 1);
  const keepCount = Math.max(1, Math.round(spacingFiltered.length * keepRatio));
  const densityFiltered = downsampleEvenly(spacingFiltered, keepCount);
  const maxPointsPerGlyph = Math.max(160, Math.floor(MAX_TOTAL_POINTS / Math.max(1, config.glyphAmount)));

  return downsampleEvenly(densityFiltered, maxPointsPerGlyph);
}

function getFibonacciAnchor(index, count, poleInset) {
  const safeCount = Math.max(1, count);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const t = (index + 0.5) / safeCount;
  const minY = -1 + poleInset * 2;
  const maxY = 1 - poleInset * 2;
  const y = THREE.MathUtils.lerp(maxY, minY, t);
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = (index + 0.5) * golden;
  return new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
}

function buildSphereGlyphField(char) {
  const glyphPoints = sampleGlyphShape(char);
  const instanceCount = Math.max(1, config.glyphAmount);
  const poleInset = THREE.MathUtils.lerp(0.03, 0.18, config.poleShrink);
  const glyphSurfaceScale = 0.23 * config.textScale;
  const points = [];

  for (let glyphIndex = 0; glyphIndex < instanceCount; glyphIndex += 1) {
    const normal = getFibonacciAnchor(glyphIndex, instanceCount, poleInset).normalize();
    const upSeed = Math.abs(normal.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3().crossVectors(upSeed, normal).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    const jitterScale = config.beamJitter * 0.02;

    for (let pointIndex = 0; pointIndex < glyphPoints.length; pointIndex += 1) {
      const glyphPoint = glyphPoints[pointIndex];
      const offsetX = glyphPoint.x * glyphSurfaceScale;
      const offsetY = glyphPoint.y * glyphSurfaceScale;
      const pos = new THREE.Vector3()
        .copy(normal)
        .multiplyScalar(config.radius)
        .addScaledVector(tangent, offsetX)
        .addScaledVector(bitangent, -offsetY)
        .normalize()
        .multiplyScalar(config.radius);

      const u = (Math.atan2(pos.z, pos.x) / (Math.PI * 2) + 1) % 1;
      const v = Math.acos(clamp(pos.y / config.radius, -1, 1)) / Math.PI;
      const seed = glyphIndex * 997 + pointIndex;
      points.push({
        u,
        v,
        jx: (hash(seed * 0.31 + 0.27) - 0.5) * jitterScale,
        jy: (hash(seed * 0.17 + 0.43) - 0.5) * jitterScale,
        jz: (hash(seed * 0.53 + 0.13) - 0.5) * jitterScale,
      });
    }
  }

  if (!points.length) {
    points.push({ u: 0, v: 0.5, jx: 0, jy: 0, jz: 0 });
  }

  points.sort((a, b) => {
    if (Math.abs(a.v - b.v) > 0.0001) return a.v - b.v;
    return a.u - b.u;
  });

  return dedupeUvPoints(points, 0.0018, 0.0018);
}

function disposeMeshes() {
  if (pointMesh) {
    globeGroup.remove(pointMesh);
    pointGeometry.dispose();
    pointMaterial.dispose();
    pointMesh = null;
  }
  if (lineMesh) {
    globeGroup.remove(lineMesh);
    lineGeometry.dispose();
    lineMaterial.dispose();
    lineMesh = null;
  }
}

function pairPoint(points, index, salt = 0, mode = "ordered") {
  if (!points.length) return { u: 0, v: 0.5, jx: 0, jy: 0, jz: 0 };
  if (mode === "random") {
    const warpedIndex = Math.floor(hash(index * 1.731 + salt * 17.23) * points.length) % points.length;
    return points[warpedIndex];
  }
  const normalized = maxPointCount <= 1 ? 0 : index / (maxPointCount - 1);
  const scaledIndex = Math.round(normalized * (points.length - 1));
  const wrappedIndex = clamp(scaledIndex, 0, points.length - 1);
  return points[wrappedIndex];
}

function wrapMix(startU, endU, mix) {
  let delta = endU - startU;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  let value = startU + delta * mix;
  value %= 1;
  if (value < 0) value += 1;
  return value;
}

function buildGeometry() {
  try {
    sequenceChars = sanitizeSequence(config.sequence);
    if (!sequenceChars.length) sequenceChars = ["A", "R", "T"];

    currentIndex = 0;
    currentSet = buildSphereGlyphField(sequenceChars[currentIndex]);
    nextSet = buildSphereGlyphField(sequenceChars[(currentIndex + 1) % sequenceChars.length]);
    maxPointCount = Math.max(currentSet.length, nextSet.length);
    rebuildGeometryMeshes();
  } catch (error) {
    console.error("[pen-417] buildGeometry failed", error);
    statusText.textContent = "The sphere build failed. Try lowering Glyph Scale or Glyph Amount, then rebuild.";
  }
}

function rebuildGeometryMeshes() {
  disposeMeshes();

  const pointPositions = new Float32Array(maxPointCount * 3);
  const linePositions = new Float32Array(maxPointCount * BEAM_SEGMENTS * 2 * 3);
  const lineAlpha = new Float32Array(maxPointCount * BEAM_SEGMENTS * 2);

  pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));

  lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute("aAlpha", new THREE.BufferAttribute(lineAlpha, 1));

  pointMaterial = new THREE.PointsMaterial({
    color: "#ffffff",
    size: config.pointSize,
    map: dotTexture,
    alphaMap: dotTexture,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    alphaTest: 0.5,
    blending: THREE.NormalBlending,
  });

  lineMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uOpacity: { value: config.beamAlpha },
    },
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;

      void main() {
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vAlpha;

      void main() {
        gl_FragColor = vec4(vec3(1.0), vAlpha * uOpacity);
      }
    `,
  });

  pointMesh = new THREE.Points(pointGeometry, pointMaterial);
  lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
  globeGroup.add(lineMesh);
  globeGroup.add(pointMesh);

  stageTime = 0;
  morphMix = 0;
  holdMode = false;
  root.rotation.x = THREE.MathUtils.degToRad(config.tilt);
  updateStatus();
  updateGeometryFrame(0);
}

function advanceLetter() {
  const nextIndex = (currentIndex + 1) % sequenceChars.length;

  if (nextIndex === 0) {
    currentIndex = 0;
    currentSet = buildSphereGlyphField(sequenceChars[0]);
    nextSet = buildSphereGlyphField(sequenceChars[1 % sequenceChars.length]);
    maxPointCount = Math.max(currentSet.length, nextSet.length);
    rebuildGeometryMeshes();
    return;
  }

  currentIndex = nextIndex;
  currentSet = nextSet;
  nextSet = buildSphereGlyphField(sequenceChars[(currentIndex + 1) % sequenceChars.length]);
  maxPointCount = Math.max(currentSet.length, nextSet.length);
  rebuildGeometryMeshes();
}

function updateStatus() {
  const currentChar = sequenceChars[currentIndex] || "A";
  const nextChar = sequenceChars[(currentIndex + 1) % sequenceChars.length] || currentChar;
  statusText.textContent = `Glyphs of "${currentChar}" are spread across the sphere and breaking toward "${nextChar}" while the sphere keeps spinning and every beam pulls back to center.`;
}

function updateGeometryFrame(time) {
  if (!pointGeometry || !lineGeometry) return;

  const pointPositions = pointGeometry.attributes.position.array;
  const linePositions = lineGeometry.attributes.position.array;
  const lineAlpha = lineGeometry.attributes.aAlpha.array;
  const pulse = 1 + Math.sin(time * 2.4) * 0.05 * config.pulse;
  const useRandomTravel = config.travelMode === "random";

  for (let i = 0; i < maxPointCount; i += 1) {
    const from = pairPoint(currentSet, i, 0.2, useRandomTravel ? "random" : "ordered");
    const to = pairPoint(nextSet, i, 0.8, useRandomTravel ? "random" : "ordered");
    const beamVisible = hash(i * 2.173 + 19.7) <= config.beamDensity;
    const horizontalWave = Math.sin(morphMix * Math.PI);
    const alternateDirection = i % 2 === 0 ? -1 : 1;
    let mixedU = wrapMix(from.u, to.u, morphMix);
    let mixedV = THREE.MathUtils.lerp(from.v, to.v, morphMix);
    if (config.travelMode === "alternate-horizontal") {
      mixedU += alternateDirection * 0.12 * horizontalWave;
      mixedU %= 1;
      if (mixedU < 0) mixedU += 1;
    } else if (config.travelMode === "diagonal") {
      const diagonalArc = (wrapMix(from.u, to.u, 1) - from.u) >= 0 ? 1 : -1;
      mixedV = clamp(mixedV + diagonalArc * 0.08 * Math.sin(morphMix * Math.PI), 0, 1);
    } else if (config.travelMode === "alternate-diagonal") {
      mixedU += alternateDirection * 0.1 * horizontalWave;
      mixedU %= 1;
      if (mixedU < 0) mixedU += 1;
      mixedV = clamp(mixedV + alternateDirection * 0.08 * horizontalWave, 0, 1);
    } else if (config.travelMode === "random") {
      mixedV = clamp(
        mixedV + (hash(i * 4.31 + 7.1) - 0.5) * 0.12 * Math.sin(morphMix * Math.PI),
        0,
        1
      );
    }
    workingPosition.copy(uvToSphere(mixedU, mixedV));
    workingPosition.x += THREE.MathUtils.lerp(from.jx, to.jx, morphMix);
    workingPosition.y += THREE.MathUtils.lerp(from.jy, to.jy, morphMix);
    workingPosition.z += THREE.MathUtils.lerp(from.jz, to.jz, morphMix);
    workingPosition.normalize().multiplyScalar(config.radius * pulse);

    const pointBase = i * 3;
    pointPositions[pointBase] = workingPosition.x;
    pointPositions[pointBase + 1] = workingPosition.y;
    pointPositions[pointBase + 2] = workingPosition.z;

    currentDirection.copy(workingPosition).normalize();
    for (let segment = 0; segment < BEAM_SEGMENTS; segment += 1) {
      const t0 = segment / BEAM_SEGMENTS;
      const t1 = (segment + 1) / BEAM_SEGMENTS;
      const fadeDistance = Math.max(0.001, config.beamFade);
      const fade0 = beamVisible ? Math.pow(smoothstep(0, fadeDistance, t0), 1.8) : 0;
      const fade1 = beamVisible ? Math.pow(smoothstep(0, fadeDistance, t1), 1.8) : 0;
      const vertexBase = (i * BEAM_SEGMENTS + segment) * 6;
      const alphaBase = (i * BEAM_SEGMENTS + segment) * 2;

      linePositions[vertexBase] = currentDirection.x * config.radius * pulse * t0;
      linePositions[vertexBase + 1] = currentDirection.y * config.radius * pulse * t0;
      linePositions[vertexBase + 2] = currentDirection.z * config.radius * pulse * t0;
      linePositions[vertexBase + 3] = currentDirection.x * config.radius * pulse * t1;
      linePositions[vertexBase + 4] = currentDirection.y * config.radius * pulse * t1;
      linePositions[vertexBase + 5] = currentDirection.z * config.radius * pulse * t1;

      lineAlpha[alphaBase] = fade0;
      lineAlpha[alphaBase + 1] = fade1;
    }
  }

  pointGeometry.attributes.position.needsUpdate = true;
  lineGeometry.attributes.position.needsUpdate = true;
  lineGeometry.attributes.aAlpha.needsUpdate = true;
  pointGeometry.computeBoundingSphere();
  lineGeometry.computeBoundingSphere();
}

function rebuild() {
  syncConfig();
  buildGeometry();
}

glyphAmountRange.addEventListener("input", rebuild);
fontStyleSelect.addEventListener("change", rebuild);
radiusRange.addEventListener("input", rebuild);
textScaleRange.addEventListener("input", rebuild);
poleShrinkRange.addEventListener("input", rebuild);
densityRange.addEventListener("input", rebuild);
pointSizeRange.addEventListener("input", () => {
  syncConfig();
  if (pointMaterial) pointMaterial.size = config.pointSize;
});
beamAlphaRange.addEventListener("input", () => {
  syncConfig();
  if (lineMaterial) lineMaterial.uniforms.uOpacity.value = config.beamAlpha;
});
beamDensityRange.addEventListener("input", syncConfig);
beamFadeRange.addEventListener("input", syncConfig);
beamJitterRange.addEventListener("input", rebuild);
pulseRange.addEventListener("input", syncConfig);
morphDurationRange.addEventListener("input", syncConfig);
holdDurationRange.addEventListener("input", syncConfig);
travelModeSelect.addEventListener("change", syncConfig);
rotationSpeedRange.addEventListener("input", syncConfig);
rotationEaseSelect.addEventListener("change", syncConfig);
tiltRange.addEventListener("input", () => {
  syncConfig();
  root.rotation.x = THREE.MathUtils.degToRad(config.tilt);
});
pauseCheck.addEventListener("change", syncConfig);
sequenceInput.addEventListener("change", rebuild);
rebuildBtn.addEventListener("click", rebuild);
nextBtn.addEventListener("click", advanceLetter);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

syncConfig();
buildGeometry();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  pausedRotation = getRotationPhase(clock.elapsedTime) * Math.PI * 2;

  if (!config.paused) {
    stageTime += dt;
    if (!holdMode) {
      morphMix = easeInOutCubic(clamp(stageTime / config.morphDuration, 0, 1));
      if (stageTime >= config.morphDuration) {
        holdMode = true;
        stageTime = 0;
      }
    } else if (stageTime >= config.holdDuration) {
      advanceLetter();
      return;
    }
  }
  root.rotation.y = pausedRotation;
  updateGeometryFrame(clock.elapsedTime);
  controls.update();
  renderer.render(scene, camera);
}

animate();

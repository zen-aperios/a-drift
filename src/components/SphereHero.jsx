import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const config = {
  sequence: "A\nR\nT\nE",
  glyphAmount: 16,
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
};

const BEAM_SEGMENTS = 48;
const MAX_TOTAL_POINTS = 22000;
const HOLD_TO_BURST = 1500;

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
    const key = `${Math.round(point.x / safeSpacing)}:${Math.round(point.y / safeSpacing)}`;
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
    const key = `${Math.round(point.u / safeSpacingU)}:${Math.round(point.v / safeSpacingV)}`;
    if (occupied.has(key)) continue;
    occupied.add(key);
    kept.push(point);
  }

  return kept.length ? kept : points.slice(0, 1);
}

function sanitizeSequence(text) {
  return Array.from(text.toUpperCase().replace(/[^A-Z0-9\n]/g, "\n").replace(/\n+/g, "\n")).filter((char) =>
    /[A-Z0-9]/.test(char)
  );
}

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

export default function SphereHero({ onComplete }) {
  const hostRef = useRef(null);
  const holdStartRef = useRef(0);
  const burstRef = useRef({ active: false, startedAt: 0 });
  const completedRef = useRef(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const stage = host.closest(".sphere-stage");
    const q = (selector) => stage.querySelector(selector);

    document.body.style.overflow = "hidden";
    host.innerHTML = "";

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

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
    const globeGroup = new THREE.Group();
    root.add(globeGroup);
    scene.add(root);

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 220;
    sampleCanvas.height = 220;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    const dotTexture = makeDotTexture();
    const workingPosition = new THREE.Vector3();
    const currentDirection = new THREE.Vector3();
    const clock = new THREE.Clock();

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
    let frameId = 0;

    const sequenceInput = q("#sequenceInput");
    const glyphAmountRange = q("#glyphAmountRange");
    const fontStyleSelect = q("#fontStyleSelect");
    const radiusRange = q("#radiusRange");
    const textScaleRange = q("#textScaleRange");
    const poleShrinkRange = q("#poleShrinkRange");
    const densityRange = q("#densityRange");
    const pointSizeRange = q("#pointSizeRange");
    const beamAlphaRange = q("#beamAlphaRange");
    const beamDensityRange = q("#beamDensityRange");
    const beamFadeRange = q("#beamFadeRange");
    const beamJitterRange = q("#beamJitterRange");
    const pulseRange = q("#pulseRange");
    const morphDurationRange = q("#morphDurationRange");
    const holdDurationRange = q("#holdDurationRange");
    const travelModeSelect = q("#travelModeSelect");
    const rotationSpeedRange = q("#rotationSpeedRange");
    const rotationEaseSelect = q("#rotationEaseSelect");
    const tiltRange = q("#tiltRange");
    const pauseCheck = q("#pauseCheck");
    const rebuildBtn = q("#rebuildBtn");
    const nextBtn = q("#nextBtn");
    const statusText = q("#statusText");
    let paused = false;

    function setText(id, value) {
      const node = q(`#${id}`);
      if (node) node.textContent = value;
    }

    function updateLabels() {
      setText("glyphAmountVal", String(Math.round(config.glyphAmount)));
      setText("beamFadeVal", config.beamFade.toFixed(2));
      setText("radiusVal", config.radius.toFixed(2));
      setText("textScaleVal", config.textScale.toFixed(2));
      setText("poleShrinkVal", config.poleShrink.toFixed(2));
      setText("densityVal", String(Number(config.density.toFixed(2))));
      setText("pointSizeVal", config.pointSize.toFixed(2));
      setText("beamAlphaVal", config.beamAlpha.toFixed(2));
      setText("beamDensityVal", config.beamDensity.toFixed(2));
      setText("beamJitterVal", config.beamJitter.toFixed(2));
      setText("pulseVal", config.pulse.toFixed(2));
      setText("morphDurationVal", `${config.morphDuration.toFixed(1)}s`);
      setText("holdDurationVal", `${config.holdDuration.toFixed(1)}s`);
      setText("rotationSpeedVal", `${config.rotationSpeed.toFixed(1)}s`);
      setText("tiltVal", `${config.tilt.toFixed(0)}deg`);
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
      paused = pauseCheck.checked;
      updateLabels();
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

      if (!points.length) points.push({ x: 0, y: 0 });
      points.sort((a, b) => (Math.abs(a.y - b.y) > 0.0001 ? a.y - b.y : a.x - b.x));
      const spacingFiltered = dedupeBySpacing(points, (step / size) * 1.25);
      const keepCount = Math.max(1, Math.round(spacingFiltered.length * clamp(config.density, 0.1, 1)));
      const densityFiltered = downsampleEvenly(spacingFiltered, keepCount);
      const maxPointsPerGlyph = Math.max(160, Math.floor(MAX_TOTAL_POINTS / Math.max(1, config.glyphAmount)));
      return downsampleEvenly(densityFiltered, maxPointsPerGlyph);
    }

    function getFibonacciAnchor(index, count, poleInset) {
      const safeCount = Math.max(1, count);
      const golden = Math.PI * (3 - Math.sqrt(5));
      const t = (index + 0.5) / safeCount;
      const y = THREE.MathUtils.lerp(1 - poleInset * 2, -1 + poleInset * 2, t);
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
          const pos = new THREE.Vector3()
            .copy(normal)
            .multiplyScalar(config.radius)
            .addScaledVector(tangent, glyphPoint.x * glyphSurfaceScale)
            .addScaledVector(bitangent, -glyphPoint.y * glyphSurfaceScale)
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

      if (!points.length) points.push({ u: 0, v: 0.5, jx: 0, jy: 0, jz: 0 });
      points.sort((a, b) => (Math.abs(a.v - b.v) > 0.0001 ? a.v - b.v : a.u - b.u));
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
      return points[clamp(Math.round(normalized * (points.length - 1)), 0, points.length - 1)];
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

    function rebuildGeometryMeshes() {
      disposeMeshes();
      pointGeometry = new THREE.BufferGeometry();
      pointGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(maxPointCount * 3), 3));
      lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(maxPointCount * BEAM_SEGMENTS * 2 * 3), 3));
      lineGeometry.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(maxPointCount * BEAM_SEGMENTS * 2), 1));

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
        uniforms: { uOpacity: { value: config.beamAlpha } },
        vertexShader: "attribute float aAlpha; varying float vAlpha; void main(){ vAlpha=aAlpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: "uniform float uOpacity; varying float vAlpha; void main(){ gl_FragColor=vec4(vec3(1.0),vAlpha*uOpacity); }",
      });

      pointMesh = new THREE.Points(pointGeometry, pointMaterial);
      lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
      globeGroup.add(lineMesh);
      globeGroup.add(pointMesh);
      stageTime = 0;
      morphMix = 0;
      holdMode = false;
      root.rotation.x = THREE.MathUtils.degToRad(config.tilt);
    }

    function buildGeometry() {
      syncConfig();
      sequenceChars = sanitizeSequence(config.sequence);
      if (!sequenceChars.length) sequenceChars = ["A", "R", "T"];
      currentIndex = 0;
      currentSet = buildSphereGlyphField(sequenceChars[currentIndex]);
      nextSet = buildSphereGlyphField(sequenceChars[(currentIndex + 1) % sequenceChars.length]);
      maxPointCount = Math.max(currentSet.length, nextSet.length);
      rebuildGeometryMeshes();
      if (statusText) {
        const currentChar = sequenceChars[currentIndex] || "A";
        const nextChar = sequenceChars[(currentIndex + 1) % sequenceChars.length] || currentChar;
        statusText.textContent = `Glyphs of "${currentChar}" are spread across the sphere and breaking toward "${nextChar}" while the sphere keeps spinning and every beam pulls back to center.`;
      }
    }

    function advanceLetter() {
      const nextIndex = (currentIndex + 1) % sequenceChars.length;
      if (nextIndex === 0) {
        buildGeometry();
        return;
      }
      currentIndex = nextIndex;
      currentSet = nextSet;
      nextSet = buildSphereGlyphField(sequenceChars[(currentIndex + 1) % sequenceChars.length]);
      maxPointCount = Math.max(currentSet.length, nextSet.length);
      rebuildGeometryMeshes();
    }

    function updateGeometryFrame(time) {
      if (!pointGeometry || !lineGeometry) return;
      const pointPositions = pointGeometry.attributes.position.array;
      const linePositions = lineGeometry.attributes.position.array;
      const lineAlpha = lineGeometry.attributes.aAlpha.array;
      const pulse = 1 + Math.sin(time * 2.4) * 0.05 * config.pulse;
      const useRandomTravel = config.travelMode === "random";
      const holdingMs = holdStartRef.current ? performance.now() - holdStartRef.current : 0;
      const holdShake = clamp(holdingMs / HOLD_TO_BURST, 0, 1);
      const burst = burstRef.current.active ? clamp((performance.now() - burstRef.current.startedAt) / 1450, 0, 1) : 0;

      for (let i = 0; i < maxPointCount; i += 1) {
        const from = pairPoint(currentSet, i, 0.2, useRandomTravel ? "random" : "ordered");
        const to = pairPoint(nextSet, i, 0.8, useRandomTravel ? "random" : "ordered");
        const beamVisible = !burst && hash(i * 2.173 + 19.7) <= config.beamDensity;
        let mixedU = wrapMix(from.u, to.u, morphMix);
        const mixedV = THREE.MathUtils.lerp(from.v, to.v, morphMix);
        mixedU += (hash(i * 0.71) - 0.5) * 0.075 * holdShake * Math.sin(time * 86 + i);
        workingPosition.copy(uvToSphere(mixedU, mixedV));
        workingPosition.x += THREE.MathUtils.lerp(from.jx, to.jx, morphMix);
        workingPosition.y += THREE.MathUtils.lerp(from.jy, to.jy, morphMix);
        workingPosition.z += THREE.MathUtils.lerp(from.jz, to.jz, morphMix);
        workingPosition.normalize().multiplyScalar(config.radius * pulse);
        if (holdShake > 0) {
          const shake = Math.pow(holdShake, 1.35);
          workingPosition.x += (hash(i * 11.17 + time * 31) - 0.5) * shake * 1.25;
          workingPosition.y += (hash(i * 13.37 + time * 29) - 0.5) * shake * 1.25;
          workingPosition.z += (hash(i * 17.71 + time * 23) - 0.5) * shake * 1.25;
        }

        if (burst > 0) {
          const direction = workingPosition.clone().normalize();
          const seeded = hash(i * 9.43);
          const blast = easeInOutCubic(burst) * (6.5 + seeded * 7);
          workingPosition.addScaledVector(direction, blast);
          workingPosition.x += (hash(i * 2.17) - 0.5) * blast * 1.2;
          workingPosition.y += (hash(i * 3.31) - 0.5) * blast * 1.2;
          workingPosition.z += (hash(i * 5.83) - 0.5) * blast * 1.2;
          pointMaterial.opacity = 1 - Math.max(0, burst - 0.58) / 0.42;
          lineMaterial.uniforms.uOpacity.value = config.beamAlpha * (1 - burst);
        }

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

    function resize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    function animate() {
      frameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const rotationPhase = (clock.elapsedTime / Math.max(0.1, config.rotationSpeed)) * Math.PI * 2;
      if (!paused) {
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
      root.rotation.y = rotationPhase;
      updateGeometryFrame(clock.elapsedTime);
      controls.update();
      renderer.render(scene, camera);
    }

    function pointerDown() {
      if (burstRef.current.active) return;
      holdStartRef.current = performance.now();
      setIsHolding(true);
    }

    function pointerUp() {
      if (!burstRef.current.active) {
        holdStartRef.current = 0;
        setHoldProgress(0);
        setIsHolding(false);
      }
    }

    const progressTimer = window.setInterval(() => {
      if (!holdStartRef.current || burstRef.current.active) return;
      const progress = clamp((performance.now() - holdStartRef.current) / HOLD_TO_BURST, 0, 1);
      setHoldProgress(progress);
      if (progress >= 1) {
        burstRef.current = { active: true, startedAt: performance.now() };
        holdStartRef.current = 0;
        setIsHolding(false);
        window.setTimeout(() => {
          if (completedRef.current) return;
          completedRef.current = true;
          onComplete();
        }, 1250);
      }
    }, 33);

    renderer.domElement.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("resize", resize);
    buildGeometry();
    animate();

    const listeners = [
      [glyphAmountRange, "input", buildGeometry],
      [fontStyleSelect, "change", buildGeometry],
      [radiusRange, "input", buildGeometry],
      [textScaleRange, "input", buildGeometry],
      [poleShrinkRange, "input", buildGeometry],
      [densityRange, "input", buildGeometry],
      [pointSizeRange, "input", () => {
        syncConfig();
        if (pointMaterial) pointMaterial.size = config.pointSize;
      }],
      [beamAlphaRange, "input", () => {
        syncConfig();
        if (lineMaterial) lineMaterial.uniforms.uOpacity.value = config.beamAlpha;
      }],
      [beamDensityRange, "input", syncConfig],
      [beamFadeRange, "input", syncConfig],
      [beamJitterRange, "input", buildGeometry],
      [pulseRange, "input", syncConfig],
      [morphDurationRange, "input", syncConfig],
      [holdDurationRange, "input", syncConfig],
      [travelModeSelect, "change", syncConfig],
      [rotationSpeedRange, "input", syncConfig],
      [rotationEaseSelect, "change", syncConfig],
      [tiltRange, "input", () => {
        syncConfig();
        root.rotation.x = THREE.MathUtils.degToRad(config.tilt);
      }],
      [pauseCheck, "change", syncConfig],
      [sequenceInput, "change", buildGeometry],
      [rebuildBtn, "click", buildGeometry],
      [nextBtn, "click", advanceLetter],
    ];
    listeners.forEach(([node, eventName, handler]) => node.addEventListener(eventName, handler));

    return () => {
      window.clearInterval(progressTimer);
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("resize", resize);
      listeners.forEach(([node, eventName, handler]) => node.removeEventListener(eventName, handler));
      disposeMeshes();
      controls.dispose();
      dotTexture.dispose();
      renderer.dispose();
      host.innerHTML = "";
      document.body.style.overflow = "";
    };
  }, [onComplete]);

  return (
    <section className={`sphere-stage ${isHolding ? "is-holding" : ""}`} style={{ "--hold-progress": holdProgress }}>
      <div ref={hostRef} className="sphere-canvas" />
      <div className="hold-meter" aria-hidden="true">
        <span />
      </div>
      <aside className="controls controls--sphere">
        <div className="controls__block">
          <p className="eyebrow">Three.js Beam Study</p>
          <h1>Sphere Row Letter Beams</h1>
          <p className="status" id="statusText">Repeated letter rows wrap a sphere while beam lines pull every point back to the center.</p>
        </div>
        <div className="controls__block">
          <label htmlFor="sequenceInput">Letter Sequence</label>
          <textarea id="sequenceInput" rows="4" defaultValue={"A\nR\nT\nE"} />
          <label htmlFor="glyphAmountRange">Glyph Amount <span id="glyphAmountVal" /></label>
          <input id="glyphAmountRange" type="range" min="1" max="16" step="1" defaultValue="16" />
        </div>
        <div className="controls__block">
          <label htmlFor="fontStyleSelect">Font Style</label>
          <select id="fontStyleSelect" defaultValue="arial-black">
            <option value="arial-black">Arial Black</option>
            <option value="dm-sans">DM Sans Bold</option>
            <option value="georgia">Georgia Bold</option>
            <option value="courier">Courier Bold</option>
          </select>
          <label htmlFor="radiusRange">Sphere Radius <span id="radiusVal" /></label>
          <input id="radiusRange" type="range" min="1.6" max="5.5" step="0.01" defaultValue="3.35" />
          <label htmlFor="textScaleRange">Glyph Scale <span id="textScaleVal" /></label>
          <input id="textScaleRange" type="range" min="8" max="10" step="0.01" defaultValue="8" />
          <label htmlFor="poleShrinkRange">Pole Shrink <span id="poleShrinkVal" /></label>
          <input id="poleShrinkRange" type="range" min="0" max="1" step="0.01" defaultValue="0" />
          <label htmlFor="densityRange">Pixel Density <span id="densityVal" /></label>
          <input id="densityRange" type="range" min="0.1" max="1" step="0.01" defaultValue="1" />
          <label htmlFor="pointSizeRange">Point Size <span id="pointSizeVal" /></label>
          <input id="pointSizeRange" type="range" min="0.002" max="0.1" step="0.001" defaultValue="0.1" />
        </div>
        <div className="controls__block">
          <label htmlFor="beamAlphaRange">Beam Alpha <span id="beamAlphaVal" /></label>
          <input id="beamAlphaRange" type="range" min="0.02" max="0.8" step="0.01" defaultValue="0.14" />
          <label htmlFor="beamDensityRange">Beam Density <span id="beamDensityVal" /></label>
          <input id="beamDensityRange" type="range" min="0.05" max="1" step="0.01" defaultValue="0.35" />
          <label htmlFor="beamFadeRange">Center Fade <span id="beamFadeVal" /></label>
          <input id="beamFadeRange" type="range" min="0" max="0.92" step="0.01" defaultValue="0.9" />
          <label htmlFor="beamJitterRange">Beam Jitter <span id="beamJitterVal" /></label>
          <input id="beamJitterRange" type="range" min="0" max="0.6" step="0.01" defaultValue="0" />
          <label htmlFor="pulseRange">Pulse <span id="pulseVal" /></label>
          <input id="pulseRange" type="range" min="0" max="1.8" step="0.01" defaultValue="0" />
          <label htmlFor="morphDurationRange">Relocation Speed <span id="morphDurationVal" /></label>
          <input id="morphDurationRange" type="range" min="0.6" max="10" step="0.1" defaultValue="6" />
          <label htmlFor="holdDurationRange">Hold Duration <span id="holdDurationVal" /></label>
          <input id="holdDurationRange" type="range" min="0.2" max="4" step="0.1" defaultValue="0.9" />
          <label htmlFor="travelModeSelect">Point Travel</label>
          <select id="travelModeSelect" defaultValue="horizontal">
            <option value="horizontal">Horizontal</option>
            <option value="alternate-horizontal">Alternate Horizontal</option>
            <option value="diagonal">Diagonal</option>
            <option value="alternate-diagonal">Alternate Diagonal</option>
            <option value="random">Random</option>
          </select>
        </div>
        <div className="controls__block">
          <label htmlFor="rotationSpeedRange">Rotation Loop <span id="rotationSpeedVal" /></label>
          <input id="rotationSpeedRange" type="range" min="2" max="40" step="0.1" defaultValue="24" />
          <label htmlFor="rotationEaseSelect">Rotation Smooth</label>
          <select id="rotationEaseSelect" defaultValue="soft">
            <option value="linear">Linear</option>
            <option value="soft">Soft</option>
            <option value="softer">Softer</option>
            <option value="glide">Glide</option>
          </select>
          <label htmlFor="tiltRange">Tilt <span id="tiltVal" /></label>
          <input id="tiltRange" type="range" min="-60" max="60" step="1" defaultValue="-18" />
          <label className="checkline">
            <input id="pauseCheck" type="checkbox" />
            <span>Pause Morph</span>
          </label>
        </div>
        <div className="controls__block controls__actions">
          <button id="rebuildBtn" type="button">Rebuild</button>
          <button id="nextBtn" type="button">Next Letter</button>
        </div>
      </aside>
    </section>
  );
}

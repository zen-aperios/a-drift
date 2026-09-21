import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  THREE,
  createMediaRenderer,
  createNoiseTexture,
  createPortalMaterial,
  createPortalMesh,
  loadPortalImageUrls,
} from "./portalMedia.js";

const LETTERS = "APERIOS".split("");

function hexToRgba(hex, alpha) {
  const safe = hex.replace("#", "");
  const normalized = safe.length === 3 ? safe.split("").map((char) => char + char).join("") : safe;
  const int = parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function fract(value) {
  return value - Math.floor(value);
}

function seededRandom(index, salt = 0) {
  return fract(Math.sin(index * 127.1 + salt * 311.7) * 43758.5453);
}

function cubicPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

export default function TraceDream() {
  const canvasRef = useRef(null);
  const mediaBackCanvasRef = useRef(null);
  const mediaFrontCanvasRef = useRef(null);
  const spacerRef = useRef(null);
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const mediaBackCanvas = mediaBackCanvasRef.current;
    const mediaFrontCanvas = mediaFrontCanvasRef.current;
    const scrollSpacer = spacerRef.current;
    if (!canvas || !mediaBackCanvas || !mediaFrontCanvas || !scrollSpacer) return undefined;

    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";
    window.scrollTo({ top: 0, behavior: "instant" });

    const ctx = canvas.getContext("2d");
    const mediaBackRenderer = createMediaRenderer(mediaBackCanvas);
    const mediaFrontRenderer = createMediaRenderer(mediaFrontCanvas);
    const mediaBackScene = new THREE.Scene();
    const mediaFrontScene = new THREE.Scene();
    const mediaCamera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);
    const mediaLoader = new THREE.TextureLoader();
    const noiseTexture = createNoiseTexture(seededRandom);
    const stage = canvas.closest(".trace-stage");
    const q = (selector) => stage.querySelector(selector);
    const glyphCache = new Map();
    let cancelled = false;
    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      fontSize: 160,
      rowGapVh: 90,
      sampleDistance: 10,
      maxTrail: 1200,
      curvePull: 700,
      scrollEase: 0.93,
      ghostOpacity: 1,
      ghostLineWidth: 1,
      ghostColor: "#8b8b8b",
      fillColor: "#ffffff",
      bgColor: "#000000",
      warpEnabled: true,
      warpAmount: 14,
      warpFrequency: 1.05,
      rotateEnabled: false,
      rotateSpeed: 0.35,
      anchors: [],
      ghosts: [],
      segments: [],
      heroChars: [],
      portalImages: [],
      landedAnchors: [],
      anchorReveals: [],
      totalHeight: 0,
      drawProgress: 0,
      scrollY: 0,
      portalRevealStart: 93,
      portalRevealDistance: 68,
      portalRevealDuration: 1.3,
      portalShaderIntensity: 0.24,
      portalShaderNoiseScale: 0.75,
      portalShaderNoiseX: 0.07,
      portalShaderNoiseY: -0.11,
      portalShaderNoiseSpeed: 5,
      portalShaderSoftness: 0.02,
      portalShaderNoiseAmount: 0.28,
      portalShaderFlowX: 0,
      portalShaderFlowY: 0,
      portalShaderFlowNoiseY: 2,
      portalShaderZoom: 0,
      portalDrift: 90,
      portalParallax: 0.2,
      hasScrolled: false,
      heroDismiss: 0,
      heroWarpPhase: 0,
      heroWarpSpeed: 0.0012,
      lastFrameTime: 0,
    };
    const heroDismissEase = gsap.parseEase("power4.out");

    const lettersInput = q("#lettersInput");
    const fontSizeRange = q("#fontSizeRange");
    const rowGapRange = q("#rowGapRange");
    const sampleDistanceRange = q("#sampleDistanceRange");
    const maxTrailRange = q("#maxTrailRange");
    const curvePullRange = q("#curvePullRange");
    const scrollEaseRange = q("#scrollEaseRange");
    const ghostOpacityRange = q("#ghostOpacityRange");
    const ghostLineWidthRange = q("#ghostLineWidthRange");
    const warpToggle = q("#warpToggle");
    const warpAmountRange = q("#warpAmountRange");
    const warpFrequencyRange = q("#warpFrequencyRange");
    const rotateToggle = q("#rotateToggle");
    const rotateSpeedRange = q("#rotateSpeedRange");
    const fillColorInput = q("#fillColorInput");
    const ghostColorInput = q("#ghostColorInput");
    const bgColorInput = q("#bgColorInput");
    const rebuildBtn = q("#traceRebuildBtn");
    const portalRevealStartRange = q("#portalRevealStartRange");
    const portalRevealDistanceRange = q("#portalRevealDistanceRange");
    const portalRevealDurationRange = q("#portalRevealDurationRange");
    const portalShaderIntensityRange = q("#portalShaderIntensityRange");
    const portalShaderNoiseScaleRange = q("#portalShaderNoiseScaleRange");
    const portalShaderNoiseSpeedRange = q("#portalShaderNoiseSpeedRange");
    const portalShaderSoftnessRange = q("#portalShaderSoftnessRange");
    const portalShaderNoiseAmountRange = q("#portalShaderNoiseAmountRange");
    const portalShaderFlowXRange = q("#portalShaderFlowXRange");
    const portalShaderFlowYRange = q("#portalShaderFlowYRange");
    const portalShaderFlowNoiseYRange = q("#portalShaderFlowNoiseYRange");
    const portalShaderZoomRange = q("#portalShaderZoomRange");
    const portalDriftRange = q("#portalDriftRange");
    const portalParallaxRange = q("#portalParallaxRange");
    let letters = LETTERS.slice();

    function setText(id, value) {
      const node = q(`#${id}`);
      if (node) node.textContent = value;
    }

    function syncLabels() {
      setText("fontSizeVal", `${Math.round(state.fontSize)}px`);
      setText("rowGapVal", `${Math.round(state.rowGapVh)}vh`);
      setText("sampleDistanceVal", `${Math.round(state.sampleDistance)}px`);
      setText("maxTrailVal", `${state.maxTrail}`);
      setText("curvePullVal", `${Math.round(state.curvePull)}px`);
      setText("scrollEaseVal", state.scrollEase.toFixed(2));
      setText("ghostOpacityVal", state.ghostOpacity.toFixed(2));
      setText("ghostLineWidthVal", state.ghostLineWidth.toFixed(1));
      setText("warpAmountVal", `${Math.round(state.warpAmount)}px`);
      setText("warpFrequencyVal", state.warpFrequency.toFixed(2));
      setText("rotateSpeedVal", state.rotateSpeed.toFixed(2));
      setText("portalRevealStartVal", `${Math.round(state.portalRevealStart)}vh`);
      setText("portalRevealDistanceVal", `${Math.round(state.portalRevealDistance)}vh`);
      setText("portalRevealDurationVal", `${state.portalRevealDuration.toFixed(2)}s`);
      setText("portalShaderIntensityVal", state.portalShaderIntensity.toFixed(3));
      setText("portalShaderNoiseScaleVal", state.portalShaderNoiseScale.toFixed(2));
      setText("portalShaderNoiseSpeedVal", state.portalShaderNoiseSpeed.toFixed(2));
      setText("portalShaderSoftnessVal", state.portalShaderSoftness.toFixed(2));
      setText("portalShaderNoiseAmountVal", state.portalShaderNoiseAmount.toFixed(2));
      setText("portalShaderFlowXVal", state.portalShaderFlowX.toFixed(2));
      setText("portalShaderFlowYVal", state.portalShaderFlowY.toFixed(2));
      setText("portalShaderFlowNoiseYVal", state.portalShaderFlowNoiseY.toFixed(2));
      setText("portalShaderZoomVal", state.portalShaderZoom.toFixed(3));
      setText("portalDriftVal", `${Math.round(state.portalDrift)}px`);
      setText("portalParallaxVal", state.portalParallax.toFixed(3));
    }

    function syncControls() {
      const parsed = (lettersInput.value || "APERIOS")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .split("")
        .filter(Boolean);
      letters = parsed.length ? parsed : LETTERS.slice();
      state.fontSize = parseFloat(fontSizeRange.value);
      state.rowGapVh = parseFloat(rowGapRange.value);
      state.sampleDistance = parseFloat(sampleDistanceRange.value);
      state.maxTrail = parseInt(maxTrailRange.value, 10);
      state.curvePull = parseFloat(curvePullRange.value);
      state.scrollEase = parseFloat(scrollEaseRange.value);
      state.ghostOpacity = parseFloat(ghostOpacityRange.value);
      state.ghostLineWidth = parseFloat(ghostLineWidthRange.value);
      state.warpEnabled = warpToggle.checked;
      state.warpAmount = parseFloat(warpAmountRange.value);
      state.warpFrequency = parseFloat(warpFrequencyRange.value);
      state.rotateEnabled = rotateToggle.checked;
      state.rotateSpeed = parseFloat(rotateSpeedRange.value);
      state.fillColor = fillColorInput.value;
      state.ghostColor = ghostColorInput.value;
      state.bgColor = bgColorInput.value;
      state.portalRevealStart = parseFloat(portalRevealStartRange.value);
      state.portalRevealDistance = parseFloat(portalRevealDistanceRange.value);
      state.portalRevealDuration = parseFloat(portalRevealDurationRange.value);
      state.portalShaderIntensity = parseFloat(portalShaderIntensityRange.value);
      state.portalShaderNoiseScale = parseFloat(portalShaderNoiseScaleRange.value);
      state.portalShaderNoiseSpeed = parseFloat(portalShaderNoiseSpeedRange.value);
      state.portalShaderSoftness = parseFloat(portalShaderSoftnessRange.value);
      state.portalShaderNoiseAmount = parseFloat(portalShaderNoiseAmountRange.value);
      state.portalShaderFlowX = parseFloat(portalShaderFlowXRange.value);
      state.portalShaderFlowY = parseFloat(portalShaderFlowYRange.value);
      state.portalShaderFlowNoiseY = parseFloat(portalShaderFlowNoiseYRange.value);
      state.portalShaderZoom = parseFloat(portalShaderZoomRange.value);
      state.portalDrift = parseFloat(portalDriftRange.value);
      state.portalParallax = parseFloat(portalParallaxRange.value);
      document.body.style.background = state.bgColor;
      syncLabels();
    }

    function getLetterMetrics(letter) {
      ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const metrics = ctx.measureText(letter);
      const left = -(metrics.actualBoundingBoxLeft || state.fontSize * 0.28);
      const right = metrics.actualBoundingBoxRight || state.fontSize * 0.28;
      const top = -(metrics.actualBoundingBoxAscent || state.fontSize * 0.5);
      const bottom = metrics.actualBoundingBoxDescent || state.fontSize * 0.18;
      return { left, right, top, bottom };
    }

    function getGlyphCanvas(letter, solid) {
      const key = `${letter}|${solid ? "fill" : "stroke"}|${state.fontSize}|${state.ghostLineWidth}|${
        solid ? state.fillColor : state.ghostColor
      }`;
      if (glyphCache.has(key)) return glyphCache.get(key);

      const metrics = getLetterMetrics(letter);
      const pad = state.fontSize * 0.3;
      const width = Math.ceil(metrics.right - metrics.left + pad * 2);
      const height = Math.ceil(metrics.bottom - metrics.top + pad * 2);
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.max(1, Math.ceil(width * state.dpr));
      offscreen.height = Math.max(1, Math.ceil(height * state.dpr));
      const octx = offscreen.getContext("2d");
      octx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      octx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.lineJoin = "miter";
      octx.lineCap = "square";
      octx.setLineDash([]);

      const drawX = width * 0.5;
      const drawY = height * 0.5;
      if (solid) {
        octx.fillStyle = state.fillColor;
        octx.fillText(letter, drawX, drawY);
      } else {
        octx.strokeStyle = state.ghostColor;
        octx.lineWidth = state.ghostLineWidth;
        octx.strokeText(letter, drawX, drawY);
      }

      const cached = { canvas: offscreen, width, height };
      glyphCache.set(key, cached);
      return cached;
    }

    function getWarpPhase(x, y) {
      return x * 0.004 + y * 0.003;
    }

    function getRotation(x, y) {
      return (x * 0.0008 - y * 0.0006) * Math.max(state.rotateSpeed, 0);
    }

    function createStamp(x, y, letter, solid = false) {
      return {
        x,
        y,
        letter,
        solid,
        warpPhase: getWarpPhase(x, y),
        rotation: state.rotateEnabled ? getRotation(x, y) : 0,
      };
    }

    async function loadPortalImages() {
      const sources = await loadPortalImageUrls(10);
      if (cancelled) return;
      state.portalImages = sources.map((src, index) => {
        const item = {
          src,
          index,
          texture: null,
          mesh: null,
          material: null,
          aspect: 0.76,
          layer: "back",
          x: state.width * 0.5,
          y: 0,
          width: 220,
          height: 290,
          reveal: {
            progress: 0,
            target: 0,
          },
        };
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          item.aspect = (image.naturalWidth || image.width || 1) / Math.max(1, image.naturalHeight || image.height || 1);
          buildPortalLayout();
        };
        image.src = src;
        mediaLoader.load(src, (texture) => {
          if (cancelled) {
            texture.dispose();
            return;
          }
          item.texture = texture;
          item.material = createPortalMaterial(texture, noiseTexture, state);
          item.mesh = createPortalMesh(item.material);
          mediaBackScene.add(item.mesh);
        });
        return item;
      });
      buildPortalLayout();
    }

    function getStampBounds(stamp) {
      const glyph = getGlyphCanvas(stamp.letter, true);
      return {
        minX: stamp.x - glyph.width * 0.5,
        maxX: stamp.x + glyph.width * 0.5,
        minY: stamp.y - glyph.height * 0.5,
        maxY: stamp.y + glyph.height * 0.5,
      };
    }

    function getHeroGhostWrapBounds() {
      const stamps = [state.anchors[0], ...state.heroChars].filter(Boolean);
      const offsets = getTopGhostOffsets();
      const allBounds = [];
      stamps.forEach((stamp) => {
        allBounds.push(getStampBounds(stamp));
        offsets.forEach((offset) => {
          allBounds.push(getStampBounds({ ...stamp, x: stamp.x + offset.x, y: stamp.y + offset.y }));
        });
      });
      if (!allBounds.length) {
        return {
          width: state.width * 0.64,
          height: state.fontSize * 1.4,
        };
      }

      const minX = Math.min(...allBounds.map((bounds) => bounds.minX));
      const maxX = Math.max(...allBounds.map((bounds) => bounds.maxX));
      const minY = Math.min(...allBounds.map((bounds) => bounds.minY));
      const maxY = Math.max(...allBounds.map((bounds) => bounds.maxY));
      return {
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    function buildPortalLayout() {
      if (!state.portalImages.length || !state.anchors.length) return;
      const gap = state.height * (state.rowGapVh / 100);
      const heroWrap = getHeroGhostWrapBounds();
      const targetWidth = clamp(heroWrap.width * 0.42, state.width * 0.22, state.width * 0.44);
      const firstSegment = state.segments[0];
      const firstPoints = firstSegment?.points || [];
      const firstMiddle = firstPoints[Math.floor(firstPoints.length * 0.5)] || state.anchors[1] || state.anchors[0];
      const lowerStart = firstMiddle.y + gap * 0.72;
      const lowerEnd = (state.anchors[state.anchors.length - 1]?.y || lowerStart + gap * 3) - gap * 0.18;
      const remaining = Math.max(1, state.portalImages.length - 1);
      const columns = [-0.7, 0.7, 0, -1.05, 1.05];
      state.portalImages.forEach((item, index) => {
        const forceTrailCenter = index === 5;
        const column = forceTrailCenter ? 0 : columns[index % columns.length];
        const rowT = index === 0 ? 0 : (index - 1) / Math.max(1, remaining - 1);
        const rowY = index === 0 ? firstMiddle.y : lerp(lowerStart, lowerEnd, rowT);
        const pathSegmentIndex = clamp(Math.round(rowT * Math.max(0, state.segments.length - 1)), 0, Math.max(0, state.segments.length - 1));
        const segment = state.segments[forceTrailCenter ? 3 : pathSegmentIndex];
        const points = segment?.points || [];
        const pathPoint =
          index === 0
            ? firstMiddle
            : points[
                Math.floor((forceTrailCenter ? 0.5 : lerp(0.28, 0.72, seededRandom(index, 7))) * Math.max(0, points.length - 1))
              ] ||
              state.anchors[Math.min(index, state.anchors.length - 1)] ||
              state.anchors[0];
        const sideOffset = column * clamp(heroWrap.width * 0.36, 170, state.width * 0.38);
        const jitterX = index === 0 || forceTrailCenter ? 0 : lerp(-0.08, 0.08, seededRandom(index, 8)) * heroWrap.width;
        const jitterY = index === 0 || forceTrailCenter ? 0 : lerp(-0.14, 0.14, seededRandom(index, 9)) * gap;
        item.x = clamp(pathPoint.x + sideOffset + jitterX, state.width * 0.12, state.width * 0.88);
        item.y = forceTrailCenter ? pathPoint.y : rowY + jitterY;
        item.width = targetWidth * lerp(0.86, 1.18, seededRandom(index, 4));
        item.height = item.width / Math.max(0.1, item.aspect);
        item.layer = index === 0 || index % 4 === 2 || index % 5 === 0 ? "front" : "back";
      });
    }

    function buildHeroChars() {
      const firstAnchor = state.anchors[0];
      if (!firstAnchor) return [];
      const phrase = "DREAM";
      ctx.save();
      ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      let cursorX = firstAnchor.x + getHeroLeadAdvance();
      const chars = [];
      Array.from(phrase).forEach((char) => {
        const advance = char === " " ? state.fontSize * 0.42 : ctx.measureText(char).width;
        if (char !== " ") chars.push(createStamp(cursorX + advance * 0.5, firstAnchor.y, char, true));
        cursorX += advance + state.fontSize * 0.015;
      });

      ctx.restore();
      return chars;
    }

    function getHeroLeadAdvance() {
      ctx.save();
      ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      const aAdvance = ctx.measureText("A").width;
      ctx.restore();
      return aAdvance * 0.62 + state.fontSize * 0.42;
    }

    function getCenteredHeroAnchorX() {
      ctx.save();
      ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      const leadAdvance = getHeroLeadAdvance();
      let cursorX = leadAdvance;
      const bounds = [];
      const aGlyph = getGlyphCanvas("A", true);
      bounds.push({ x: 0, width: aGlyph.width + state.warpAmount * 2 });

      "DREAM".split("").forEach((char) => {
        const advance = ctx.measureText(char).width;
        const glyph = getGlyphCanvas(char, true);
        bounds.push({ x: cursorX + advance * 0.5, width: glyph.width + state.warpAmount * 2 });
        cursorX += advance + state.fontSize * 0.015;
      });

      ctx.restore();
      if (!bounds.length) return state.width * 0.5;
      const minX = Math.min(...bounds.map((item) => item.x - item.width * 0.5));
      const maxX = Math.max(...bounds.map((item) => item.x + item.width * 0.5));
      return state.width * 0.5 - (minX + maxX) * 0.5;
    }

    function getTopGhostOffsets() {
      const firstAnchor = state.anchors[0];
      if (!firstAnchor || !state.ghosts.length) {
        return Array.from({ length: 5 }, (_, index) => ({
          x: -state.fontSize * 0.11 * (index + 1),
          y: state.fontSize * 0.015 * (index + 1),
        }));
      }

      return Array.from({ length: 5 }, (_, index) => {
        const ghost = state.ghosts[index] || state.ghosts[state.ghosts.length - 1];
        return { x: ghost.x - firstAnchor.x, y: ghost.y - firstAnchor.y };
      });
    }

    function getTopGhostPoint(offsets, age) {
      const headInset = { x: offsets[0].x * 0.28, y: offsets[0].y * 0.28 };
      const points = [headInset, ...offsets];
      const clampedAge = clamp(age, 0, points.length - 1);
      const fromIndex = Math.floor(clampedAge);
      const toIndex = Math.min(points.length - 1, fromIndex + 1);
      const localT = clampedAge - fromIndex;
      return {
        x: lerp(points[fromIndex].x, points[toIndex].x, localT),
        y: lerp(points[fromIndex].y, points[toIndex].y, localT),
      };
    }

    function buildAnchors() {
      const anchors = [];
      const leftX = state.width * 0.28;
      const rightX = state.width * 0.72;
      const gap = state.height * (state.rowGapVh / 100);
      const topOffset = state.height * 0.32;
      const heroY = state.height * 0.5 - state.height * 0.18;
      const heroAnchorX = getCenteredHeroAnchorX();

      for (let i = 0; i < letters.length; i += 1) {
        anchors.push(createStamp(i === 0 ? heroAnchorX : i % 2 === 0 ? leftX : rightX, i === 0 ? heroY : topOffset + gap * i, letters[i], true));
      }

      state.totalHeight = topOffset * 2 + gap * Math.max(0, letters.length - 1) + state.height * 0.8;
      scrollSpacer.style.minHeight = `${Math.max(state.totalHeight, state.height * 2)}px`;
      return anchors;
    }

    function sampleCurve(start, end, bendIndex) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const sign = bendIndex % 2 === 0 ? 1 : -1;
      const p0 = { x: start.x, y: start.y };
      const p3 = { x: end.x, y: end.y };
      const p1 = { x: start.x + dx * 0.18, y: lerp(start.y, end.y, 0.28) - state.curvePull * sign };
      const p2 = { x: end.x - dx * 0.18, y: lerp(start.y, end.y, 0.72) + state.curvePull * sign };
      const effectiveStep = Math.max(1, state.sampleDistance || 1);
      const approx = Math.max(8, Math.ceil(Math.hypot(dx, dy) / effectiveStep));
      const points = [];
      for (let i = 0; i <= approx; i += 1) points.push(cubicPoint(p0, p1, p2, p3, i / approx));
      return points;
    }

    function updateScrollTargets(immediate = false) {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - state.height);
      const targetScroll = window.scrollY || window.pageYOffset || 0;
      const progress = clamp(targetScroll / maxScroll, 0, 1);
      state.hasScrolled = targetScroll > 2;

      if (immediate) {
        gsap.set(state, {
          scrollY: targetScroll,
          drawProgress: progress,
          heroDismiss: targetScroll > 2 ? 1 : 0,
        });
        return;
      }

      gsap.to(state, {
        scrollY: targetScroll,
        drawProgress: progress,
        duration: lerp(0.08, 1.1, state.scrollEase),
        ease: "power3.out",
        overwrite: true,
      });

      gsap.to(state, {
        heroDismiss: targetScroll > 2 ? 1 : 0,
        duration: 1.8,
        ease: "power4.out",
        overwrite: "auto",
      });
    }

    function rebuildLayout() {
      glyphCache.clear();
      state.anchors = buildAnchors();
      state.heroChars = buildHeroChars();
      state.landedAnchors = state.anchors.map((_, index) => index === 0);
      state.anchorReveals = state.anchors.map((_, index) => ({
        opacity: index === 0 ? 1 : 0,
        depth: index === 0 ? 0 : -1,
        progress: index === 0 ? 1 : 0,
        active: index === 0,
      }));
      const rawSegments = [];
      for (let i = 0; i < state.anchors.length - 1; i += 1) {
        const segment = sampleCurve(state.anchors[i], state.anchors[i + 1], i);
        if (i > 0) segment.shift();
        rawSegments.push({
          fromIndex: i,
          toIndex: i + 1,
          fromLetter: letters[i] || letters[i + 1],
          toLetter: letters[i + 1] || letters[i],
          points: segment,
        });
      }

      const totalPoints = rawSegments.reduce((sum, segment) => sum + segment.points.length, 0);
      const segments = rawSegments.map((segment) => {
        const segmentShare = totalPoints > 0 ? segment.points.length / totalPoints : 0;
        const ghostTotal = clamp(Math.round(state.maxTrail * segmentShare), 1, segment.points.length);
        const ghosts = [];
        for (let i = 0; i < ghostTotal; i += 1) {
          const t = ghostTotal === 1 ? 0 : i / (ghostTotal - 1);
          const point = segment.points[Math.round(t * (segment.points.length - 1))];
          const letter = t >= 0.5 ? segment.toLetter : segment.fromLetter;
          ghosts.push(createStamp(point.x, point.y, letter, false));
        }
        return {
          ...segment,
          ghosts,
        };
      });

      state.segments = segments;
      state.ghosts = segments.flatMap((segment) => segment.ghosts);
      buildPortalLayout();
      updateScrollTargets(true);
    }

    function resize() {
      state.dpr = window.devicePixelRatio || 1;
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      canvas.width = Math.round(state.width * state.dpr);
      canvas.height = Math.round(state.height * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      [mediaBackRenderer, mediaFrontRenderer].forEach((renderer) => {
        renderer.setPixelRatio(state.dpr);
        renderer.setSize(state.width, state.height, false);
      });
      mediaCamera.left = 0;
      mediaCamera.right = state.width;
      mediaCamera.top = state.height;
      mediaCamera.bottom = 0;
      mediaCamera.position.z = 10;
      mediaCamera.updateProjectionMatrix();
      rebuildLayout();
    }

    function drawWarpedGlyph(stamp, solid, index, total, options = {}) {
      const { canvas: glyphCanvas, width, height } = getGlyphCanvas(stamp.letter, solid);
      const fade = total <= 1 ? 1 : 1 - index / Math.max(total - 1, 1);
      const opacity = options.opacity ?? (solid ? 1 : Math.max(0, state.ghostOpacity * (0.22 + fade * 0.78)));
      const warpStrength = options.warpStrength ?? (0.28 + fade * 0.72);
      const warpFrequency = options.warpFrequency ?? state.warpFrequency;
      const stripHeight = 1;
      const basePhase = stamp.warpPhase + state.heroWarpPhase + (options.warpPhaseOffset ?? 0);
      const depth = options.depth ?? 0;
      const depthScale = options.scale ?? (1 + depth * 0.08);
      const depthLift = depth * state.fontSize * 0.12;

      ctx.save();
      ctx.translate(stamp.x, stamp.y - state.scrollY + state.height * 0.18 - depthLift);
      if (state.rotateEnabled) ctx.rotate(stamp.rotation);
      if (depthScale !== 1) ctx.scale(depthScale, depthScale);
      ctx.translate(-width * 0.5, -height * 0.5);
      ctx.globalAlpha = opacity;

      for (let y = 0; y < height; y += stripHeight) {
        const sliceH = Math.min(stripHeight, height - y);
        const yNorm = y / height;
        const bendA = Math.sin(yNorm * Math.PI * 2 * warpFrequency + basePhase);
        const bendB = Math.cos(yNorm * Math.PI * warpFrequency * 0.65 - basePhase * 0.7);
        const bend = (bendA * 0.72 + bendB * 0.28) * state.warpAmount * warpStrength;
        ctx.drawImage(glyphCanvas, 0, y * state.dpr, glyphCanvas.width, sliceH * state.dpr, bend, y, width, sliceH + 2);
      }

      ctx.restore();
    }

    function drawStamp(stamp, solid, index, total, options = {}) {
      const screenY = stamp.y - state.scrollY + state.height * 0.18;
      if (screenY < -state.fontSize * 1.5 || screenY > state.height + state.fontSize * 1.5) return;
      if (state.warpEnabled) {
        drawWarpedGlyph(stamp, solid, index, total, options);
        return;
      }

      ctx.save();
      const depth = options.depth ?? 0;
      const depthScale = options.scale ?? (1 + depth * 0.08);
      const depthLift = depth * state.fontSize * 0.12;
      ctx.translate(stamp.x, screenY - depthLift);
      if (state.rotateEnabled) ctx.rotate(stamp.rotation);
      if (depthScale !== 1) ctx.scale(depthScale, depthScale);
      ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "miter";
      ctx.lineCap = "square";
      ctx.setLineDash([]);
      if (options.opacity !== undefined) ctx.globalAlpha = options.opacity;

      if (solid) {
        ctx.fillStyle = state.fillColor;
        ctx.fillText(stamp.letter, 0, 0);
      } else {
        const fade = total <= 1 ? 1 : 1 - index / Math.max(total - 1, 1);
        ctx.strokeStyle = hexToRgba(state.ghostColor, state.ghostOpacity * (0.22 + fade * 0.78));
        ctx.lineWidth = state.ghostLineWidth;
        ctx.strokeText(stamp.letter, 0, 0);
      }
      ctx.restore();
    }

    function getHeroWarpOptions() {
      return {
        warpFrequency: state.warpFrequency,
      };
    }

    function drawAnimatedGhostStack(stamp, offsets, opacityMultiplier = 1, yLift = 0, options = {}) {
      const phase = (performance.now() * 0.00042 + stamp.x * 0.0002) % 1;
      for (let i = 5; i >= 1; i -= 1) {
        const slot = 5 - i;
        const age = slot + phase;
        const point = getTopGhostPoint(offsets, age);
        const normalizedAge = age / 5;
        drawStamp(
          { ...stamp, x: stamp.x + point.x, y: stamp.y + point.y - yLift, warpPhase: stamp.warpPhase },
          false,
          i - 1,
          5,
          {
            ...options,
            opacity: Math.pow(1 - normalizedAge, 1.35) * opacityMultiplier,
            warpStrength: 1,
          }
        );
      }

      drawStamp({ ...stamp, y: stamp.y - yLift }, true, 0, 1, {
        ...options,
        opacity: opacityMultiplier,
      });
    }

    function setPortalReveal(item, target) {
      target = clamp(target, 0, 1);
      if (Math.abs(item.reveal.target - target) < 0.01) return;
      if (item.reveal.target === target) return;
      item.reveal.target = target;
      gsap.killTweensOf(item.reveal);
      gsap.to(item.reveal, {
        progress: target,
        duration: state.portalRevealDuration,
        ease: "power4.out",
        overwrite: true,
      });
    }

    function drawPortalImages() {
      let hasVisibleBackPortal = false;
      let hasVisibleFrontPortal = false;
      state.portalImages.forEach((item) => {
        if (item.mesh) item.mesh.visible = false;
      });
      state.portalImages.forEach((item) => {
        const rawScreenY = item.y - state.scrollY + state.height * 0.18;
        const revealStartY = state.height * (state.portalRevealStart / 100);
        const revealDistance = state.height * (state.portalRevealDistance / 100);
        const enterProgress = clamp((revealStartY - rawScreenY) / Math.max(1, revealDistance), 0, 1);
        const revealTarget = rawScreenY < -item.height * 1.6 ? 0 : enterProgress;
        setPortalReveal(item, revealTarget);
        const progress = clamp(item.reveal.progress, 0, 1);
        if (progress <= 0.001) return;

        const eased = heroDismissEase(progress);
        const width = item.width;
        const height = item.height;
        const slideY = (1 - eased) * 64;
        const slowScrollDrift = Math.sin(state.scrollY * 0.002 + item.index * 1.37) * state.portalDrift;
        const parallaxDrift = (rawScreenY - state.height * 0.5) * state.portalParallax;
        const screenY = rawScreenY + slowScrollDrift + parallaxDrift;

        if (item.mesh && item.material) {
          const targetScene = item.layer === "front" ? mediaFrontScene : mediaBackScene;
          if (item.mesh.parent !== targetScene) {
            item.mesh.parent?.remove(item.mesh);
            targetScene.add(item.mesh);
          }
          if (item.layer === "front") hasVisibleFrontPortal = true;
          else hasVisibleBackPortal = true;
          item.mesh.visible = true;
          item.mesh.position.set(item.x, state.height - (screenY + slideY), 0);
          item.mesh.scale.set(width, height, 1);
          item.material.uniforms.uProgress.value = eased;
          item.material.uniforms.uIntensity.value = state.portalShaderIntensity;
          item.material.uniforms.uTime.value = state.heroWarpPhase + item.index * 0.35;
          item.material.uniforms.uNoiseScale.value = state.portalShaderNoiseScale;
          item.material.uniforms.uNoiseSpeed.value = state.portalShaderNoiseSpeed;
          item.material.uniforms.uSoftness.value = state.portalShaderSoftness;
          item.material.uniforms.uNoiseAmount.value = state.portalShaderNoiseAmount;
          item.material.uniforms.uFlowX.value = state.portalShaderFlowX;
          item.material.uniforms.uFlowY.value = state.portalShaderFlowY;
          item.material.uniforms.uFlowNoiseY.value = state.portalShaderFlowNoiseY;
          item.material.uniforms.uZoom.value = state.portalShaderZoom;
          item.material.uniforms.uCanvasResolution.value.set(width, height);
          if (item.texture?.image) {
            item.material.uniforms.uImageResolution.value.set(item.texture.image.width || 1, item.texture.image.height || 1);
          }
        }

      });
      if (hasVisibleBackPortal) mediaBackRenderer.render(mediaBackScene, mediaCamera);
      if (hasVisibleFrontPortal) mediaFrontRenderer.render(mediaFrontScene, mediaCamera);
    }

    function triggerAnchorReveal(index) {
      const reveal = state.anchorReveals[index];
      if (!reveal || reveal.active) return;
      reveal.active = true;
      gsap.killTweensOf(reveal);
      gsap.to(reveal, {
        opacity: 1,
        depth: 0,
        progress: 1,
        duration: 0.8,
        ease: "power4.out",
        overwrite: true,
      });
    }

    function render() {
      const now = performance.now();
      if (!state.lastFrameTime) state.lastFrameTime = now;
      const dt = now - state.lastFrameTime;
      state.lastFrameTime = now;
      state.heroWarpPhase += dt * state.heroWarpSpeed;
      mediaBackRenderer.clear();
      mediaFrontRenderer.clear();
      ctx.clearRect(0, 0, state.width, state.height);
      const idleGhostCount = Math.min(4, state.ghosts.length);
      const ghostCount = state.hasScrolled ? Math.floor(state.ghosts.length * clamp(state.drawProgress * 1.15, 0, 1)) : idleGhostCount;

      if (!state.hasScrolled) {
        const topGhostOffsets = getTopGhostOffsets();
        for (let i = 0; i < ghostCount; i += 1) {
          if (state.ghosts[i]?.letter === state.anchors[0]?.letter) continue;
          drawStamp(state.ghosts[i], false, i, Math.max(ghostCount, 1));
        }
        const heroWarpOptions = getHeroWarpOptions();
        if (state.anchors[0]) drawAnimatedGhostStack(state.anchors[0], topGhostOffsets, 1, 0, heroWarpOptions);
        state.heroChars.forEach((stamp) => drawAnimatedGhostStack(stamp, topGhostOffsets, 1, 0, heroWarpOptions));
        return;
      }

      if (state.heroDismiss < 1) {
        const topGhostOffsets = getTopGhostOffsets();
        state.heroChars.forEach((stamp, index) => {
          const staggerOffset = index * 0.07;
          const localProgress = clamp((state.heroDismiss - staggerOffset) / Math.max(0.0001, 1 - staggerOffset), 0, 1);
          const eased = heroDismissEase(localProgress);
          const opacity = 1 - eased;
          if (opacity > 0.001) drawAnimatedGhostStack(stamp, topGhostOffsets, opacity, eased * 28, getHeroWarpOptions());
        });
      }

      const activeGhosts = [];
      state.segments.forEach((segment) => {
        const anchor = state.anchors[segment.toIndex];
        if (!anchor) return;
        const anchorScreenY = anchor.y - state.scrollY + state.height * 0.18;
        const centerY = state.height * 0.5;
        const revealStartY = centerY + state.height * (state.rowGapVh / 100);
        const segmentProgress = clamp((revealStartY - anchorScreenY) / (revealStartY - centerY), 0, 1);
        const segmentGhostCount = Math.floor(segment.ghosts.length * clamp(segmentProgress * 1.15, 0, 1));
        for (let i = 0; i < segmentGhostCount; i += 1) {
          const ghost = segment.ghosts[i];
          activeGhosts.push(ghost);
          drawStamp(ghost, false, i, Math.max(segmentGhostCount, 1));
        }
      });
      drawPortalImages();
      for (let i = 0; i < state.anchors.length; i += 1) {
        const screenY = state.anchors[i].y - state.scrollY + state.height * 0.18;
        const reveal = state.anchorReveals[i] || { opacity: 1, depth: 0, progress: 1 };
        if (i > 0 && !state.landedAnchors[i]) {
          const landingDistance = state.fontSize * 0.9;
          const scrubStartDistance = state.fontSize * 1.7;
          const nearestDistance = activeGhosts.reduce((nearest, ghost) => {
            if (ghost.letter !== state.anchors[i].letter) return nearest;
            return Math.min(nearest, Math.hypot(ghost.x - state.anchors[i].x, ghost.y - state.anchors[i].y));
          }, Infinity);
          const scrubProgress = clamp(
            (scrubStartDistance - nearestDistance) / Math.max(1, scrubStartDistance - landingDistance),
            0,
            1
          );
          if (scrubProgress > reveal.progress) {
            const easedScrub = heroDismissEase(scrubProgress);
            reveal.progress = scrubProgress;
            reveal.opacity = Math.max(reveal.opacity, easedScrub);
            reveal.depth = Math.max(reveal.depth, -1 + easedScrub);
          }
          state.landedAnchors[i] = nearestDistance <= landingDistance || screenY <= state.height * 0.5;
          if (state.landedAnchors[i]) triggerAnchorReveal(i);
        }
        if (i > 0 && !state.landedAnchors[i] && reveal.opacity <= 0.001) continue;
        drawStamp(state.anchors[i], true, i, state.anchors.length, {
          ...(i === 0 ? getHeroWarpOptions() : {}),
          opacity: reveal.opacity,
          depth: reveal.depth,
        });
      }
    }

    function onScroll() {
      updateScrollTargets();
    }

    function rebuildFromControls() {
      syncControls();
      rebuildLayout();
    }

    const inputs = [
      lettersInput,
      fontSizeRange,
      rowGapRange,
      sampleDistanceRange,
      maxTrailRange,
      curvePullRange,
      scrollEaseRange,
      ghostOpacityRange,
      ghostLineWidthRange,
      warpToggle,
      warpAmountRange,
      warpFrequencyRange,
      rotateToggle,
      rotateSpeedRange,
      fillColorInput,
      ghostColorInput,
      bgColorInput,
      portalRevealStartRange,
      portalRevealDistanceRange,
      portalRevealDurationRange,
      portalShaderIntensityRange,
      portalShaderNoiseScaleRange,
      portalShaderNoiseSpeedRange,
      portalShaderSoftnessRange,
      portalShaderNoiseAmountRange,
      portalShaderFlowXRange,
      portalShaderFlowYRange,
      portalShaderFlowNoiseYRange,
      portalShaderZoomRange,
      portalDriftRange,
      portalParallaxRange,
    ];

    inputs.forEach((input) => input.addEventListener("input", rebuildFromControls));
    rebuildBtn.addEventListener("click", rebuildLayout);
    syncControls();
    loadPortalImages();
    gsap.ticker.add(render);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    resize();
    render();

    return () => {
      cancelled = true;
      gsap.ticker.remove(render);
      gsap.killTweensOf(state);
      state.portalImages.forEach((item) => gsap.killTweensOf(item.reveal));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      inputs.forEach((input) => input.removeEventListener("input", rebuildFromControls));
      rebuildBtn.removeEventListener("click", rebuildLayout);
      glyphCache.clear();
      state.portalImages.forEach((item) => {
        item.mesh?.parent?.remove(item.mesh);
        item.mesh?.geometry?.dispose();
        item.material?.dispose();
        item.texture?.dispose();
      });
      noiseTexture.dispose();
      mediaBackRenderer.dispose();
      mediaFrontRenderer.dispose();
      document.body.style.overflowX = "";
      document.body.style.overflowY = "";
    };
  }, []);

  return (
    <section className="trace-stage">
      <canvas ref={mediaBackCanvasRef} className="trace-media-canvas trace-media-canvas--back" />
      <canvas ref={canvasRef} className="trace-canvas" />
      <canvas ref={mediaFrontCanvasRef} className="trace-media-canvas trace-media-canvas--front" />
      <div ref={spacerRef} className="trace-spacer" aria-hidden="true" />
      <button
        className="controls-toggle"
        type="button"
        aria-label={controlsOpen ? "Hide controls" : "Show controls"}
        aria-expanded={controlsOpen}
        onClick={() => setControlsOpen((open) => !open)}
      >
        {controlsOpen ? "‹" : "›"}
      </button>
      <aside className={`controls controls--trace${controlsOpen ? "" : " is-hidden"}`}>
        <div className="controls__block">
          <p className="eyebrow">Pen Reference Build</p>
          <h1>Trace Letters Lines</h1>
          <p className="status">A sparse four-ghost idle trace fades from light to dark, then hands off to the full scroll reveal.</p>
        </div>
        <div className="controls__block">
          <label htmlFor="lettersInput">Letters</label>
          <textarea id="lettersInput" rows="3" defaultValue="APERIOS" />
          <label htmlFor="fontSizeRange">Font Size <span id="fontSizeVal" /></label>
          <input id="fontSizeRange" type="range" min="48" max="160" step="1" defaultValue="160" />
          <label htmlFor="rowGapRange">Row Gap <span id="rowGapVal" /></label>
          <input id="rowGapRange" type="range" min="20" max="120" step="1" defaultValue="90" />
        </div>
        <div className="controls__block">
          <label htmlFor="sampleDistanceRange">Stagger Offset <span id="sampleDistanceVal" /></label>
          <input id="sampleDistanceRange" type="range" min="0" max="120" step="1" defaultValue="10" />
          <label htmlFor="maxTrailRange">Ghost Count <span id="maxTrailVal" /></label>
          <input id="maxTrailRange" type="range" min="4" max="1200" step="1" defaultValue="1200" />
          <label htmlFor="curvePullRange">Curve Pull <span id="curvePullVal" /></label>
          <input id="curvePullRange" type="range" min="0" max="700" step="1" defaultValue="700" />
          <label htmlFor="scrollEaseRange">Scroll Ease <span id="scrollEaseVal" /></label>
          <input id="scrollEaseRange" type="range" min="0.05" max="1" step="0.01" defaultValue="0.93" />
        </div>
        <div className="controls__block">
          <label htmlFor="ghostOpacityRange">Ghost Opacity <span id="ghostOpacityVal" /></label>
          <input id="ghostOpacityRange" type="range" min="0.05" max="1" step="0.01" defaultValue="1" />
          <label htmlFor="ghostLineWidthRange">Ghost Line Width <span id="ghostLineWidthVal" /></label>
          <input id="ghostLineWidthRange" type="range" min="0.4" max="4" step="0.1" defaultValue="1" />
          <label className="toggle-row" htmlFor="warpToggle">
            <span>Warp Letters</span>
            <input id="warpToggle" type="checkbox" defaultChecked />
          </label>
          <label htmlFor="warpAmountRange">Warp Amount <span id="warpAmountVal" /></label>
          <input id="warpAmountRange" type="range" min="0" max="48" step="1" defaultValue="14" />
          <label htmlFor="warpFrequencyRange">Warp Frequency <span id="warpFrequencyVal" /></label>
          <input id="warpFrequencyRange" type="range" min="0.2" max="3" step="0.05" defaultValue="1.05" />
          <label className="toggle-row" htmlFor="rotateToggle">
            <span>Rotate Letters</span>
            <input id="rotateToggle" type="checkbox" />
          </label>
          <label htmlFor="rotateSpeedRange">Rotate Amount <span id="rotateSpeedVal" /></label>
          <input id="rotateSpeedRange" type="range" min="0" max="4" step="0.05" defaultValue="0.35" />
        </div>
        <div className="controls__block">
          <label htmlFor="fillColorInput">Solid Fill</label>
          <input id="fillColorInput" type="color" defaultValue="#ffffff" />
          <label htmlFor="ghostColorInput">Ghost Color</label>
          <input id="ghostColorInput" type="color" defaultValue="#8b8b8b" />
          <label htmlFor="bgColorInput">Background</label>
          <input id="bgColorInput" type="color" defaultValue="#000000" />
        </div>
        <div className="controls__block">
          <button id="traceRebuildBtn" type="button">Rebuild Layout</button>
        </div>
      </aside>
      <aside className={`controls controls--shader${controlsOpen ? "" : " is-hidden"}`}>
        <div className="controls__block">
          <p className="eyebrow">Portal Shader</p>
          <h1>Media Reveal</h1>
          <p className="status">Controls the Three.js reveal layer only.</p>
        </div>
        <div className="controls__block">
          <label htmlFor="portalRevealStartRange">Reveal Start <span id="portalRevealStartVal" /></label>
          <input id="portalRevealStartRange" type="range" min="45" max="115" step="1" defaultValue="93" />
          <label htmlFor="portalRevealDistanceRange">Reveal Distance <span id="portalRevealDistanceVal" /></label>
          <input id="portalRevealDistanceRange" type="range" min="15" max="90" step="1" defaultValue="68" />
          <label htmlFor="portalRevealDurationRange">Reveal Ease <span id="portalRevealDurationVal" /></label>
          <input id="portalRevealDurationRange" type="range" min="0.05" max="2" step="0.05" defaultValue="1.3" />
        </div>
        <div className="controls__block">
          <label htmlFor="portalShaderIntensityRange">Distortion <span id="portalShaderIntensityVal" /></label>
          <input id="portalShaderIntensityRange" type="range" min="0" max="0.35" step="0.005" defaultValue="0.24" />
          <label htmlFor="portalShaderZoomRange">Zoom <span id="portalShaderZoomVal" /></label>
          <input id="portalShaderZoomRange" type="range" min="0" max="0.2" step="0.005" defaultValue="0" />
          <label htmlFor="portalShaderSoftnessRange">Reveal Softness <span id="portalShaderSoftnessVal" /></label>
          <input id="portalShaderSoftnessRange" type="range" min="0.02" max="0.6" step="0.01" defaultValue="0.02" />
          <label htmlFor="portalShaderNoiseAmountRange">Edge Noise <span id="portalShaderNoiseAmountVal" /></label>
          <input id="portalShaderNoiseAmountRange" type="range" min="0" max="0.5" step="0.01" defaultValue="0.28" />
        </div>
        <div className="controls__block">
          <label htmlFor="portalShaderNoiseScaleRange">Noise Scale <span id="portalShaderNoiseScaleVal" /></label>
          <input id="portalShaderNoiseScaleRange" type="range" min="0.1" max="3" step="0.05" defaultValue="0.75" />
          <label htmlFor="portalShaderNoiseSpeedRange">Noise Speed <span id="portalShaderNoiseSpeedVal" /></label>
          <input id="portalShaderNoiseSpeedRange" type="range" min="0" max="5" step="0.05" defaultValue="5" />
          <label htmlFor="portalShaderFlowXRange">Flow X <span id="portalShaderFlowXVal" /></label>
          <input id="portalShaderFlowXRange" type="range" min="-2" max="2" step="0.05" defaultValue="0" />
          <label htmlFor="portalShaderFlowYRange">Flow Y <span id="portalShaderFlowYVal" /></label>
          <input id="portalShaderFlowYRange" type="range" min="-2" max="2" step="0.05" defaultValue="0" />
          <label htmlFor="portalShaderFlowNoiseYRange">Flow Noise Y <span id="portalShaderFlowNoiseYVal" /></label>
          <input id="portalShaderFlowNoiseYRange" type="range" min="-2" max="2" step="0.05" defaultValue="2" />
        </div>
        <div className="controls__block">
          <label htmlFor="portalDriftRange">Scroll Drift <span id="portalDriftVal" /></label>
          <input id="portalDriftRange" type="range" min="0" max="90" step="1" defaultValue="90" />
          <label htmlFor="portalParallaxRange">Parallax <span id="portalParallaxVal" /></label>
          <input id="portalParallaxRange" type="range" min="-0.2" max="0.2" step="0.005" defaultValue="0.2" />
        </div>
      </aside>
    </section>
  );
}

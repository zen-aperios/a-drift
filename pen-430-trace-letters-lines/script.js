const canvas = document.getElementById("trailCanvas");
const ctx = canvas.getContext("2d");
const scrollSpacer = document.getElementById("scrollSpacer");

const lettersInput = document.getElementById("lettersInput");
const fontSizeRange = document.getElementById("fontSizeRange");
const rowGapRange = document.getElementById("rowGapRange");
const sampleDistanceRange = document.getElementById("sampleDistanceRange");
const maxTrailRange = document.getElementById("maxTrailRange");
const curvePullRange = document.getElementById("curvePullRange");
const scrollEaseRange = document.getElementById("scrollEaseRange");
const ghostOpacityRange = document.getElementById("ghostOpacityRange");
const ghostLineWidthRange = document.getElementById("ghostLineWidthRange");
const warpToggle = document.getElementById("warpToggle");
const warpAmountRange = document.getElementById("warpAmountRange");
const warpFrequencyRange = document.getElementById("warpFrequencyRange");
const rotateToggle = document.getElementById("rotateToggle");
const rotateSpeedRange = document.getElementById("rotateSpeedRange");
const fillColorInput = document.getElementById("fillColorInput");
const ghostColorInput = document.getElementById("ghostColorInput");
const bgColorInput = document.getElementById("bgColorInput");
const rebuildBtn = document.getElementById("rebuildBtn");

const fontSizeVal = document.getElementById("fontSizeVal");
const rowGapVal = document.getElementById("rowGapVal");
const sampleDistanceVal = document.getElementById("sampleDistanceVal");
const maxTrailVal = document.getElementById("maxTrailVal");
const curvePullVal = document.getElementById("curvePullVal");
const scrollEaseVal = document.getElementById("scrollEaseVal");
const ghostOpacityVal = document.getElementById("ghostOpacityVal");
const ghostLineWidthVal = document.getElementById("ghostLineWidthVal");
const warpAmountVal = document.getElementById("warpAmountVal");
const warpFrequencyVal = document.getElementById("warpFrequencyVal");
const rotateSpeedVal = document.getElementById("rotateSpeedVal");

let LETTERS = "APERIOS".split("");
const glyphCache = new Map();

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  fontSize: 116,
  rowGapVh: 50,
  sampleDistance: 0,
  maxTrail: 1200,
  curvePull: 120,
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
  heroChars: [],
  totalHeight: 0,
  drawProgress: 0,
  scrollY: 0,
  hasScrolled: false,
  heroDismiss: 0,
};

const heroDismissEase = gsap.parseEase("power4.out");

function hexToRgba(hex, alpha) {
  const safe = hex.replace("#", "");
  const normalized = safe.length === 3
    ? safe.split("").map((char) => char + char).join("")
    : safe;
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

function cubicPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

function syncLabels() {
  fontSizeVal.textContent = `${Math.round(state.fontSize)}px`;
  rowGapVal.textContent = `${Math.round(state.rowGapVh)}vh`;
  sampleDistanceVal.textContent = `${Math.round(state.sampleDistance)}px`;
  maxTrailVal.textContent = `${state.maxTrail}`;
  curvePullVal.textContent = `${Math.round(state.curvePull)}px`;
  scrollEaseVal.textContent = state.scrollEase.toFixed(2);
  ghostOpacityVal.textContent = state.ghostOpacity.toFixed(2);
  ghostLineWidthVal.textContent = state.ghostLineWidth.toFixed(1);
  warpAmountVal.textContent = `${Math.round(state.warpAmount)}px`;
  warpFrequencyVal.textContent = state.warpFrequency.toFixed(2);
  rotateSpeedVal.textContent = state.rotateSpeed.toFixed(2);
}

function parseLetters() {
  const parsed = (lettersInput.value || "APERIOS")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .split("")
    .filter(Boolean);
  LETTERS = parsed.length ? parsed : ["M", "E", "S", "S", "A", "G", "E"];
}

function syncControls() {
  parseLetters();
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
  document.body.style.setProperty("--bg", state.bgColor);
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
  const key = `${letter}|${solid ? "fill" : "stroke"}|${state.fontSize}|${state.ghostLineWidth}|${solid ? state.fillColor : state.ghostColor}`;
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

function buildHeroChars() {
  const firstAnchor = state.anchors[0];
  if (!firstAnchor) return [];

  const text = "DAY DREAM";
  ctx.save();
  ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  let cursorX = firstAnchor.x + state.fontSize * 0.72;
  const chars = [];

  Array.from(text).forEach((char) => {
    const width = ctx.measureText(char).width;
    if (char !== " ") {
      chars.push(createStamp(cursorX + width * 0.5, firstAnchor.y, char, true));
    }
    cursorX += width;
  });

  ctx.restore();
  return chars;
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
    return {
      x: ghost.x - firstAnchor.x,
      y: ghost.y - firstAnchor.y,
    };
  });
}

function getTopGhostPoint(offsets, age) {
  const headInset = {
    x: offsets[0].x * 0.28,
    y: offsets[0].y * 0.28,
  };
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
  const topOffset = state.height * 0.28;

  for (let i = 0; i < LETTERS.length; i += 1) {
    anchors.push(createStamp(
      i % 2 === 0 ? leftX : rightX,
      topOffset + gap * i,
      LETTERS[i],
      true
    ));
  }

  state.totalHeight = topOffset * 2 + gap * Math.max(0, LETTERS.length - 1) + state.height * 0.8;
  scrollSpacer.style.minHeight = `${Math.max(state.totalHeight, state.height * 2)}px`;
  return anchors;
}

function sampleCurve(start, end, bendIndex) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const sign = bendIndex % 2 === 0 ? 1 : -1;
  const p0 = { x: start.x, y: start.y };
  const p3 = { x: end.x, y: end.y };
  const p1 = {
    x: start.x + dx * 0.18,
    y: lerp(start.y, end.y, 0.28) - state.curvePull * sign,
  };
  const p2 = {
    x: end.x - dx * 0.18,
    y: lerp(start.y, end.y, 0.72) + state.curvePull * sign,
  };

  const effectiveStep = Math.max(1, state.sampleDistance || 1);
  const approx = Math.max(8, Math.ceil(Math.hypot(dx, dy) / effectiveStep));
  const points = [];
  for (let i = 0; i <= approx; i += 1) {
    points.push(cubicPoint(p0, p1, p2, p3, i / approx));
  }
  return points;
}

function rebuildLayout() {
  glyphCache.clear();
  state.anchors = buildAnchors();
  state.heroChars = buildHeroChars();

  const chain = [];
  for (let i = 0; i < state.anchors.length - 1; i += 1) {
    const segment = sampleCurve(state.anchors[i], state.anchors[i + 1], i);
    if (i > 0) segment.shift();
    chain.push(...segment);
  }

  const ghosts = [];
  const totalGhosts = clamp(state.maxTrail, 0, chain.length);
  if (totalGhosts > 0 && chain.length > 1) {
    for (let i = 0; i < totalGhosts; i += 1) {
      const t = totalGhosts === 1 ? 0 : i / (totalGhosts - 1);
      const idx = Math.round(t * (chain.length - 1));
      const point = chain[idx];
      const letterIndex = clamp(Math.round(t * (state.anchors.length - 1)), 0, state.anchors.length - 1);
      ghosts.push(createStamp(point.x, point.y, LETTERS[letterIndex], false));
    }
  }

  state.ghosts = ghosts;
  updateScrollTargets(true);
}

function resize() {
  state.dpr = window.devicePixelRatio || 1;
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  rebuildLayout();
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

function drawWarpedGlyph(stamp, solid, index, total, options = {}) {
  const { canvas: glyphCanvas, width, height } = getGlyphCanvas(stamp.letter, solid);
  const fade = total <= 1 ? 1 : 1 - index / Math.max(total - 1, 1);
  const opacity = options.opacity ?? (solid ? 1 : Math.max(0, state.ghostOpacity * (0.22 + fade * 0.78)));
  const warpStrength = options.warpStrength ?? (0.28 + fade * 0.72);
  const stripHeight = 1;
  const basePhase = stamp.warpPhase;

  ctx.save();
  ctx.translate(stamp.x, stamp.y - state.scrollY + state.height * 0.18);
  if (state.rotateEnabled) ctx.rotate(stamp.rotation);
  ctx.translate(-width * 0.5, -height * 0.5);
  ctx.globalAlpha = opacity;

  for (let y = 0; y < height; y += stripHeight) {
    const sliceH = Math.min(stripHeight, height - y);
    const yNorm = y / height;
    const bendA = Math.sin(yNorm * Math.PI * 2 * state.warpFrequency + basePhase);
    const bendB = Math.cos(yNorm * Math.PI * state.warpFrequency * 0.65 - basePhase * 0.7);
    const bend = (bendA * 0.72 + bendB * 0.28) * state.warpAmount * warpStrength;
    ctx.drawImage(
      glyphCanvas,
      0,
      y * state.dpr,
      glyphCanvas.width,
      sliceH * state.dpr,
      bend,
      y,
      width,
      sliceH + 2
    );
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
  ctx.translate(stamp.x, screenY);
  if (state.rotateEnabled) ctx.rotate(stamp.rotation);
  ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "miter";
  ctx.lineCap = "square";
  ctx.setLineDash([]);

  if (options.opacity !== undefined) {
    ctx.globalAlpha = options.opacity;
  }

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

function drawAnimatedGhostStack(stamp, offsets, opacityMultiplier = 1, yLift = 0) {
  const phase = (performance.now() * 0.00042 + stamp.x * 0.0002) % 1;

  for (let i = 5; i >= 1; i -= 1) {
    const slot = 5 - i;
    const age = slot + phase;
    const point = getTopGhostPoint(offsets, age);
    const ghostX = stamp.x + point.x;
    const ghostY = stamp.y + point.y - yLift;
    const normalizedAge = age / 5;
    const ghostOpacity = Math.pow(1 - normalizedAge, 1.35) * opacityMultiplier;

    drawStamp(
      {
        ...stamp,
        x: ghostX,
        y: ghostY,
        warpPhase: stamp.warpPhase,
      },
      false,
      i - 1,
      5,
      {
        opacity: ghostOpacity,
        warpStrength: 1,
      }
    );
  }

  drawStamp(
    {
      ...stamp,
      y: stamp.y - yLift,
    },
    true,
    0,
    1,
    { opacity: opacityMultiplier }
  );
}

function render() {
  ctx.clearRect(0, 0, state.width, state.height);

  const idleGhostCount = Math.min(4, state.ghosts.length);
  const ghostCount = state.hasScrolled
    ? Math.floor(state.ghosts.length * state.drawProgress)
    : idleGhostCount;

  const anchorCount = state.hasScrolled
    ? Math.floor(state.anchors.length * state.drawProgress) + 1
    : 1;

  if (!state.hasScrolled) {
    const topGhostOffsets = getTopGhostOffsets();

    for (let i = 0; i < ghostCount; i += 1) {
      drawStamp(state.ghosts[i], false, i, Math.max(ghostCount, 1));
    }
    for (let i = 0; i < Math.min(anchorCount, state.anchors.length); i += 1) {
      drawStamp(state.anchors[i], true, i, state.anchors.length);
    }

    state.heroChars.forEach((stamp) => {
      drawAnimatedGhostStack(stamp, topGhostOffsets);
    });
    return;
  }

  if (state.heroDismiss < 1) {
    const topGhostOffsets = getTopGhostOffsets();
    state.heroChars.forEach((stamp, index) => {
      const staggerOffset = index * 0.07;
      const localProgress = clamp((state.heroDismiss - staggerOffset) / Math.max(0.0001, 1 - staggerOffset), 0, 1);
      const eased = heroDismissEase(localProgress);
      const opacity = 1 - eased;
      if (opacity <= 0.001) return;

      drawAnimatedGhostStack(stamp, topGhostOffsets, opacity, eased * 28);
    });
  }

  for (let i = 0; i < ghostCount; i += 1) {
    drawStamp(state.ghosts[i], false, i, Math.max(ghostCount, 1));
  }

  for (let i = 0; i < Math.min(anchorCount, state.anchors.length); i += 1) {
    drawStamp(state.anchors[i], true, i, state.anchors.length);
  }
}

gsap.ticker.add(render);

[
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
].forEach((input) => {
  input.addEventListener("input", () => {
    syncControls();
    rebuildLayout();
  });
});

rebuildBtn.addEventListener("click", () => {
  rebuildLayout();
});

window.addEventListener("scroll", () => {
  updateScrollTargets();
}, { passive: true });

window.addEventListener("resize", resize);

syncControls();
resize();
render();

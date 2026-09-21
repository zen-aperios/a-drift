import { clamp, cubicPoint, lerp } from "./traceMath.js";

const CONFIG = {
  text: "IN-CREATIVITY",
  fontSize: 112,
  curvePull: 180,
  ghostOpacity: 0.74,
  ghostLineWidth: 1,
  ghostColor: "#8b8b8b",
  fillColor: "#ffffff",
};

export function createDiagonalGhostRenderer({
  ctx,
  state,
  heroDismissEase,
  getWarpPhase,
}) {
  const glyphCache = new Map();

  function getGlyphCanvas(letter, solid) {
    const color = solid ? CONFIG.fillColor : CONFIG.ghostColor;
    const key = `${letter}|${solid ? "fill" : "stroke"}|${CONFIG.fontSize}|${CONFIG.ghostLineWidth}|${color}`;
    if (glyphCache.has(key)) return glyphCache.get(key);

    ctx.save();
    ctx.font = `900 ${CONFIG.fontSize}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const metrics = ctx.measureText(letter);
    ctx.restore();

    const left = -(metrics.actualBoundingBoxLeft || CONFIG.fontSize * 0.28);
    const right = metrics.actualBoundingBoxRight || CONFIG.fontSize * 0.28;
    const top = -(metrics.actualBoundingBoxAscent || CONFIG.fontSize * 0.5);
    const bottom = metrics.actualBoundingBoxDescent || CONFIG.fontSize * 0.18;
    const pad = CONFIG.fontSize * 0.3;
    const width = Math.ceil(right - left + pad * 2);
    const height = Math.ceil(bottom - top + pad * 2);
    const offscreen = document.createElement("canvas");
    offscreen.width = Math.max(1, Math.ceil(width * state.dpr));
    offscreen.height = Math.max(1, Math.ceil(height * state.dpr));
    const offscreenCtx = offscreen.getContext("2d");
    offscreenCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    offscreenCtx.font = `900 ${CONFIG.fontSize}px Helvetica, Arial, sans-serif`;
    offscreenCtx.textAlign = "center";
    offscreenCtx.textBaseline = "middle";
    offscreenCtx.lineJoin = "miter";
    offscreenCtx.lineCap = "square";

    if (solid) {
      offscreenCtx.fillStyle = color;
      offscreenCtx.fillText(letter, width * 0.5, height * 0.5);
    } else {
      offscreenCtx.strokeStyle = color;
      offscreenCtx.lineWidth = CONFIG.ghostLineWidth;
      offscreenCtx.strokeText(letter, width * 0.5, height * 0.5);
    }

    const cached = { canvas: offscreen, width, height };
    glyphCache.set(key, cached);
    return cached;
  }

  function build() {
    const chars = Array.from(CONFIG.text);
    const sectionTop = state.creativitySectionStart;
    const mapY = (y) => {
      const normalizedY = (y - state.creativitySceneMinY) / Math.max(0.001, state.creativitySceneSpanY);
      return sectionTop + state.creativitySectionHeight * clamp(normalizedY, 0, 1);
    };
    const path = state.creativityPath;
    const start = {
      x: state.width * path.start.x,
      y: mapY(path.start.y),
    };
    const end = {
      x: state.width * path.end.x,
      y: mapY(path.end.y),
    };
    const p1 = {
      x: state.width * path.controlA.x,
      y: mapY(path.controlA.y),
    };
    const p2 = {
      x: state.width * path.controlB.x,
      y: mapY(path.controlB.y),
    };
    const pointAt = (t) => cubicPoint(start, p1, p2, end, t);
    const stamps = [];
    const segments = [];
    const total = Math.max(1, chars.length - 1);

    chars.forEach((letter, index) => {
      const t = total === 0 ? 0 : index / total;
      const override = state.creativityStampOverrides[index];
      const point = override
        ? {
            x: state.width * override.x,
            y: mapY(override.y),
          }
        : pointAt(t);
      stamps.push({
        x: point.x,
        y: point.y,
        letter,
        pathProgress: t,
        scale: 1,
        warpPhase: getWarpPhase(point.x, point.y),
      });
    });

    stamps.forEach((stamp, index) => {
      const previous = stamps[index - 1];
      const next = stamps[index + 1];
      const previousDistance = previous ? Math.hypot(stamp.x - previous.x, stamp.y - previous.y) : Infinity;
      const nextDistance = next ? Math.hypot(stamp.x - next.x, stamp.y - next.y) : Infinity;
      const nearestDistance = Math.min(previousDistance, nextDistance);
      stamp.scale = clamp(nearestDistance / (CONFIG.fontSize * 1.05), 0.42, 1);
    });

    for (let index = 0; index < stamps.length - 1; index += 1) {
      const from = stamps[index];
      const to = stamps[index + 1];
      const segmentPoint = (t) => {
        const globalT = lerp(index / total, (index + 1) / total, t);
        const pathPoint = pointAt(globalT);
        const guidePull = Math.sin(t * Math.PI) * 0.42;
        return {
          x: lerp(lerp(from.x, to.x, t), pathPoint.x, guidePull),
          y: lerp(lerp(from.y, to.y, t), pathPoint.y, guidePull),
        };
      };
      let measuredLength = 0;
      let previousPoint = segmentPoint(0);
      const measureSteps = 24;
      for (let step = 1; step <= measureSteps; step += 1) {
        const point = segmentPoint(step / measureSteps);
        measuredLength += Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
        previousPoint = point;
      }
      const dynamicCap = Math.max(160, Math.round(state.maxTrail / Math.max(1, stamps.length - 1)));
      const ghostCount = clamp(Math.round(measuredLength / Math.max(1, state.sampleDistance)), 24, dynamicCap);
      const ghosts = [];
      for (let ghostIndex = 0; ghostIndex < ghostCount; ghostIndex += 1) {
        const t = ghostCount === 1 ? 0 : ghostIndex / (ghostCount - 1);
        const point = segmentPoint(t);
        ghosts.push({
          x: point.x,
          y: point.y,
          letter: t >= 0.5 ? to.letter : from.letter,
          scale: lerp(from.scale, to.scale, t),
          warpPhase: getWarpPhase(point.x, point.y),
        });
      }
      segments.push({
        toIndex: index + 1,
        ghosts,
      });
    }

    return { stamps, segments };
  }

  function drawGlyph(stamp, screenY, solid, index, total, opacity) {
    const { canvas, width, height } = getGlyphCanvas(stamp.letter, solid);
    const fade = total <= 1 ? 1 : 1 - index / Math.max(total - 1, 1);
    const stripHeight = 1;
    const basePhase = (stamp.warpPhase || 0) + state.heroWarpPhase;
    const warpStrength = solid ? 0.58 : 0.72 + fade * 0.28;

    ctx.save();
    ctx.translate(stamp.x, screenY);
    const scale = stamp.scale ?? 1;
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.translate(-width * 0.5, -height * 0.5);
    ctx.globalAlpha = opacity;

    for (let y = 0; y < height; y += stripHeight) {
      const sliceH = Math.min(stripHeight, height - y);
      const yNorm = y / height;
      const bendA = Math.sin(yNorm * Math.PI * 2 * state.warpFrequency + basePhase);
      const bendB = Math.cos(yNorm * Math.PI * state.warpFrequency * 0.65 - basePhase * 0.7);
      const bend = (bendA * 0.72 + bendB * 0.28) * state.warpAmount * warpStrength;
      ctx.drawImage(canvas, 0, y * state.dpr, canvas.width, sliceH * state.dpr, bend, y, width, sliceH + 2);
    }

    ctx.restore();
  }

  function draw() {
    if (!state.creativitySegments.length || !state.creativityStamps.length) return;

    ctx.save();
    const activeGhosts = [];
    const segmentTotal = Math.max(1, state.creativitySegments.length);
    const chainStartT = (state.creativityPath.start.y - state.creativitySceneMinY) / Math.max(0.001, state.creativitySceneSpanY);
    const chainStartY = state.creativitySectionStart + state.creativitySectionHeight * clamp(chainStartT, 0, 1);
    const chainStartScreenY = chainStartY - state.scrollY + state.height * 0.18;
    const chainDistance = state.height * (state.creativityGapVh / 100) * segmentTotal;
    const chainProgress = clamp((state.height * 0.86 - chainStartScreenY) / Math.max(1, chainDistance), 0, 1);
    state.creativitySegments.forEach((segment, segmentIndex) => {
      const segmentStart = segmentIndex / segmentTotal;
      const segmentEnd = (segmentIndex + 1) / segmentTotal;
      const segmentProgress = clamp((chainProgress - segmentStart) / Math.max(0.0001, segmentEnd - segmentStart), 0, 1);
      const visibleCount = Math.floor(segment.ghosts.length * clamp(segmentProgress * 1.15, 0, 1));
      for (let index = 0; index < visibleCount; index += 1) {
        const ghost = segment.ghosts[index];
        activeGhosts.push(ghost);
        const screenY = ghost.y - state.scrollY + state.height * 0.18;
        const scaledFontSize = CONFIG.fontSize * (ghost.scale ?? 1);
        if (screenY < -scaledFontSize * 1.5 || screenY > state.height + scaledFontSize * 1.5) continue;
        const fade = visibleCount <= 1 ? 1 : 1 - index / Math.max(1, visibleCount - 1);
        drawGlyph(ghost, screenY + state.rawScrollY, false, index, Math.max(visibleCount, 1), CONFIG.ghostOpacity * (0.2 + fade * 0.8));
      }
    });

    state.creativityStamps.forEach((stamp, index) => {
      const screenY = stamp.y - state.scrollY + state.height * 0.18;
      const scaledFontSize = CONFIG.fontSize * (stamp.scale ?? 1);
      if (screenY < -scaledFontSize * 1.5 || screenY > state.height + scaledFontSize * 1.5) return;
      const nearestDistance = activeGhosts.reduce((nearest, ghost) => {
        if (ghost.letter !== stamp.letter) return nearest;
        return Math.min(nearest, Math.hypot(ghost.x - stamp.x, ghost.y - stamp.y));
      }, Infinity);
      const landingDistance = scaledFontSize * 0.9;
      const scrubStartDistance = scaledFontSize * 1.7;
      const scrubProgress = clamp(
        (scrubStartDistance - nearestDistance) / Math.max(1, scrubStartDistance - landingDistance),
        0,
        1
      );
      const orderedProgress = index === 0 ? 1 : clamp((chainProgress - (index - 1) / Math.max(1, state.creativityStamps.length - 1)) * Math.max(1, state.creativityStamps.length - 1), 0, 1);
      const eased = heroDismissEase(Math.max(scrubProgress, orderedProgress));
      if (eased <= 0.001) return;
      drawGlyph(stamp, screenY + state.rawScrollY, false, index, state.creativityStamps.length, eased * CONFIG.ghostOpacity * 0.58);
      drawGlyph(stamp, screenY + state.rawScrollY, true, index, state.creativityStamps.length, eased);
    });
    ctx.restore();
  }

  return {
    build,
    clearCache: () => glyphCache.clear(),
    draw,
  };
}

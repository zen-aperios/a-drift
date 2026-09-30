import { clamp } from "./traceMath.js";

function hexToRgba(hex, alpha) {
  const safe = hex.replace("#", "");
  const normalized = safe.length === 3 ? safe.split("").map((char) => char + char).join("") : safe;
  const value = parseInt(normalized, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

// Owns glyph metrics, offscreen glyph caching, warped slice drawing, and the
// hero ghost stack. The parent supplies state and the current ghost path.
export function createGlyphRenderer({ ctx, state, heroDismissEase, scrollCue, getTopGhostPoint }) {
  const glyphCache = new Map();

  function getLetterMetrics(letter) {
    ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const metrics = ctx.measureText(letter);
    return {
      left: -(metrics.actualBoundingBoxLeft || state.fontSize * 0.28),
      right: metrics.actualBoundingBoxRight || state.fontSize * 0.28,
      top: -(metrics.actualBoundingBoxAscent || state.fontSize * 0.5),
      bottom: metrics.actualBoundingBoxDescent || state.fontSize * 0.18,
    };
  }

  function getGlyphCanvas(letter, solid, overrideColor) {
    const color = overrideColor || (solid ? state.fillColor : state.ghostColor);
    const key = `${letter}|${solid ? "fill" : "stroke"}|${state.fontSize}|${state.ghostLineWidth}|${color}`;
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
    if (solid) {
      octx.fillStyle = color;
      octx.fillText(letter, width * 0.5, height * 0.5);
    } else {
      octx.strokeStyle = color;
      octx.lineWidth = state.ghostLineWidth;
      octx.strokeText(letter, width * 0.5, height * 0.5);
    }
    const cached = { canvas: offscreen, width, height };
    glyphCache.set(key, cached);
    return cached;
  }

  function drawWarpedGlyph(stamp, solid, index, total, options = {}) {
    const { canvas: glyphCanvas, width, height } = getGlyphCanvas(stamp.letter, solid, options.color);
    const fade = total <= 1 ? 1 : 1 - index / Math.max(total - 1, 1);
    const opacity = options.opacity ?? (solid ? 1 : Math.max(0, state.ghostOpacity * (0.22 + fade * 0.78)));
    const warpStrength = options.warpStrength ?? (0.28 + fade * 0.72);
    const warpFrequency = options.warpFrequency ?? state.warpFrequency;
    const basePhase = stamp.warpPhase + state.heroWarpPhase + (options.warpPhaseOffset ?? 0);
    const depth = options.depth ?? 0;
    const depthScale = (options.scale ?? (1 + depth * 0.08)) * (stamp.scale ?? 1);
    const depthLift = depth * state.fontSize * 0.12;
    const documentY = stamp.y + state.height * 0.18;
    ctx.save();
    ctx.translate(stamp.x, documentY - depthLift);
    if (state.rotateEnabled) ctx.rotate(stamp.rotation);
    if (depthScale !== 1) ctx.scale(depthScale, depthScale);
    ctx.translate(-width * 0.5, -height * 0.5);
    ctx.globalAlpha = opacity;
    for (let y = 0; y < height; y += 1) {
      const sliceH = Math.min(1, height - y);
      const yNorm = y / height;
      const bendA = Math.sin(yNorm * Math.PI * 2 * warpFrequency + basePhase);
      const bendB = Math.cos(yNorm * Math.PI * warpFrequency * 0.65 - basePhase * 0.7);
      const bend = (bendA * 0.72 + bendB * 0.28) * state.warpAmount * warpStrength;
      ctx.drawImage(glyphCanvas, 0, y * state.dpr, glyphCanvas.width, sliceH * state.dpr, bend, y, width, sliceH + 2);
    }
    ctx.restore();
  }

  function drawStamp(stamp, solid, index, total, options = {}) {
    const documentY = stamp.y + state.height * 0.18;
    const screenY = documentY - state.rawScrollY;
    if (screenY < -state.fontSize * 1.5 || screenY > state.height + state.fontSize * 1.5) return;
    if (state.warpEnabled) {
      drawWarpedGlyph(stamp, solid, index, total, options);
      return;
    }
    ctx.save();
    const depth = options.depth ?? 0;
    const depthScale = (options.scale ?? (1 + depth * 0.08)) * (stamp.scale ?? 1);
    const depthLift = depth * state.fontSize * 0.12;
    ctx.translate(stamp.x, documentY - depthLift);
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
      ctx.fillStyle = options.color || state.fillColor;
      ctx.fillText(stamp.letter, 0, 0);
    } else {
      const fade = total <= 1 ? 1 : 1 - index / Math.max(total - 1, 1);
      ctx.strokeStyle = options.color ? hexToRgba(options.color, 1) : hexToRgba(state.ghostColor, state.ghostOpacity * (0.22 + fade * 0.78));
      ctx.lineWidth = state.ghostLineWidth;
      ctx.strokeText(stamp.letter, 0, 0);
    }
    ctx.restore();
  }

  function drawAnimatedGhostStack(stamp, offsets, opacityMultiplier = 1, yLift = 0, options = {}) {
    const phase = (performance.now() * 0.00042 + stamp.x * 0.0002) % 1;
    for (let i = 5; i >= 1; i -= 1) {
      const age = 5 - i + phase;
      const point = getTopGhostPoint(offsets, age);
      drawStamp(
        { ...stamp, x: stamp.x + point.x, y: stamp.y + point.y - yLift, warpPhase: stamp.warpPhase },
        false,
        i - 1,
        5,
        { ...options, opacity: Math.pow(1 - age / 5, 1.35) * opacityMultiplier, warpStrength: 1 }
      );
    }
    drawStamp({ ...stamp, y: stamp.y - yLift }, true, 0, 1, { ...options, opacity: opacityMultiplier });
  }

  function drawScrollCue(opacityMultiplier = 1) {
    const opacity = clamp(opacityMultiplier, 0, 1);
    if (opacity <= 0.001) return;
    ctx.save();
    ctx.font = `300 14px "Geist", "Neue Haas Grotesk Text", "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.letterSpacing = "0px";
    ctx.fillStyle = state.fillColor;
    const fade = heroDismissEase(clamp((scrollCue.exit - 0.82) / 0.18, 0, 1));
    ctx.globalAlpha = opacity * (1 - fade) * 0.9;
    ctx.fillText("SCROLL", state.width * 0.5, state.traceCanvasTop + state.height - 16);
    ctx.restore();
  }

  return { getGlyphCanvas, drawStamp, drawAnimatedGhostStack, drawScrollCue, clearCache: () => glyphCache.clear() };
}

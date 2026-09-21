import { clamp, lerp } from "./traceMath.js";

const CONFIG = {
  fontSize: 116,
  curvePull: 84,
  ghostOpacity: 0.58,
  ghostLineWidth: 1,
  ghostColor: "#ffffff",
  fillColor: "#ffffff",
};

export function createBottomGhostRenderer({
  ctx,
  state,
  heroDismissEase,
  getWarpPhase,
  getFrame,
  getProgress,
  getDrawOffsetY = () => 0,
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
    const rows = ["NO-ONE", "SHOTS"];
    const videoWidth = state.width * 0.95;
    const videoAspect = state.bottomVideo?.aspect || 16 / 9;
    const videoHeight = videoWidth / Math.max(0.1, videoAspect);
    const rowGap = videoHeight * 0.35;
    const baseY = state.bottomSectionStart + state.height * 0.54 - rowGap * 0.5;
    const stamps = [];
    const rowStamps = [];

    rows.forEach((row, rowIndex) => {
      const chars = Array.from(row).filter((char) => char !== " ");
      const span = state.width * 0.8;
      const startX = state.width * 0.5 - span * 0.5;
      const currentRow = [];
      chars.forEach((char, index) => {
        const x = chars.length <= 1 ? state.width * 0.5 : startX + (span * index) / (chars.length - 1);
        const y = baseY + rowIndex * rowGap;
        const stamp = {
          x,
          y,
          letter: char,
          rowIndex,
          warpPhase: getWarpPhase(x, y),
        };
        stamps.push(stamp);
        currentRow.push(stamp);
      });
      rowStamps.push(currentRow);
    });

    const segments = [];
    let totalPathLength = 0;
    rowStamps.forEach((row, rowIndex) => {
      const distances = [];
      let rowLength = 0;
      for (let index = 0; index < row.length - 1; index += 1) {
        const distance = Math.hypot(row[index + 1].x - row[index].x, row[index + 1].y - row[index].y);
        distances.push(distance);
        rowLength += distance;
      }

      let rowCursor = 0;
      for (let index = 0; index < row.length - 1; index += 1) {
        const from = row[index];
        const to = row[index + 1];
        const distance = distances[index];
        const ghostCount = clamp(Math.round(distance / Math.max(1, state.sampleDistance)), 24, Math.max(24, state.maxTrail));
        const ghosts = [];
        const direction = index % 2 === 0 ? 1 : -1;
        for (let ghostIndex = 0; ghostIndex < ghostCount; ghostIndex += 1) {
          const t = ghostCount === 1 ? 0 : ghostIndex / (ghostCount - 1);
          const arch = Math.sin(t * Math.PI) * CONFIG.curvePull;
          const x = lerp(from.x, to.x, t);
          const y = lerp(from.y, to.y, t) - arch * direction;
          ghosts.push({
            x,
            y,
            letter: t >= 0.5 ? to.letter : from.letter,
            rowIndex,
            pathProgress: rowLength > 0 ? (rowCursor + distance * t) / rowLength : t,
            warpPhase: getWarpPhase(x, y),
          });
        }
        segments.push({
          from,
          to,
          ghosts,
          rowIndex,
          start: rowLength > 0 ? rowCursor / rowLength : 0,
          end: rowLength > 0 ? (rowCursor + distance) / rowLength : 1,
        });
        rowCursor += distance;
      }

      row.forEach((stamp, index) => {
        if (index === 0 || rowLength <= 0) {
          stamp.pathProgress = 0;
          return;
        }
        const distanceToStamp = distances.slice(0, index).reduce((sum, distance) => sum + distance, 0);
        stamp.pathProgress = distanceToStamp / rowLength;
      });
      totalPathLength += rowLength;
    });

    return { stamps, segments, pathLength: totalPathLength };
  }

  function getRowProgress(trailProgress, rowIndex) {
    if (rowIndex === 0) return trailProgress;
    const delay = clamp(state.bottomLineStagger / 3, 0, 0.45);
    return clamp((trailProgress - delay) / Math.max(0.0001, 1 - delay), 0, 1);
  }

  function getDrawProgress(rowProgress) {
    return clamp(rowProgress / 0.92, 0, 1);
  }

  function drawGlyph(stamp, screenY, solid, index, total, opacity) {
    const { canvas, width, height } = getGlyphCanvas(stamp.letter, solid);
    const fade = total <= 1 ? 1 : 1 - index / Math.max(total - 1, 1);
    const stripHeight = 1;
    const basePhase = (stamp.warpPhase || 0) + state.heroWarpPhase;
    const warpStrength = solid ? 0.55 : 0.72 + fade * 0.28;

    ctx.save();
    ctx.translate(stamp.x, screenY);
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
    if (!state.bottomGhostGrid.length) return;
    const progress = getProgress();
    if (progress <= 0.001) return;

    const trailProgress = clamp(progress, 0, 1);
    const gridWorldCenterY = state.bottomSectionStart + state.height * 0.54;
    const frame = getFrame();
    const textCenterY = frame.y;
    const textDocumentCenterY = frame.documentY ?? frame.y + state.rawScrollY;
    const drawOffsetY = getDrawOffsetY();

    ctx.save();
    state.bottomGhostSegments.forEach((segment) => {
      const rowProgress = getRowProgress(trailProgress, segment.rowIndex);
      const drawProgress = heroDismissEase(getDrawProgress(rowProgress));
      const visibleGhosts = segment.ghosts.filter((ghost) => ghost.pathProgress <= drawProgress);
      const visibleCount = visibleGhosts.length;
      for (let index = 0; index < visibleCount; index += 1) {
        const ghost = visibleGhosts[index];
        const screenY = textCenterY + (ghost.y - gridWorldCenterY);
        if (screenY < -CONFIG.fontSize * 1.5 || screenY > state.height + CONFIG.fontSize * 1.5) continue;
        const fade = visibleCount <= 1 ? 1 : 1 - index / Math.max(1, visibleCount - 1);
        const headDistance = clamp((drawProgress - ghost.pathProgress) / 0.08, 0, 1);
        drawGlyph(
          ghost,
          textDocumentCenterY + (ghost.y - gridWorldCenterY) - drawOffsetY,
          false,
          index,
          Math.max(visibleCount, 1),
          headDistance * CONFIG.ghostOpacity * (0.22 + fade * 0.78)
        );
      }
    });

    state.bottomGhostGrid.forEach((stamp, stampIndex) => {
      const rowProgress = getRowProgress(trailProgress, stamp.rowIndex);
      const drawProgress = heroDismissEase(getDrawProgress(rowProgress));
      const stampRevealStart = Math.max(0, stamp.pathProgress - 0.08);
      const stampReveal = clamp((drawProgress - stampRevealStart) / 0.08, 0, 1);
      if (stampReveal <= 0.001) return;
      const stampEased = heroDismissEase(stampReveal);
      const screenY = textCenterY + (stamp.y - gridWorldCenterY);
      if (screenY < -CONFIG.fontSize * 1.5 || screenY > state.height + CONFIG.fontSize * 1.5) return;
      const y = textDocumentCenterY + (stamp.y - gridWorldCenterY) - drawOffsetY;
      drawGlyph(stamp, y, false, stampIndex, state.bottomGhostGrid.length, stampEased * CONFIG.ghostOpacity * 0.62);
      drawGlyph(stamp, y, true, stampIndex, state.bottomGhostGrid.length, stampEased);
    });

    ctx.restore();
  }

  return {
    build,
    clearCache: () => glyphCache.clear(),
    draw,
  };
}

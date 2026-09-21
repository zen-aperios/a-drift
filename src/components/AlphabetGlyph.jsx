import { useEffect, useRef } from "react";

export function AlphabetGlyph({ letter, index, ghostDirection, warpChaos }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const glyphCache = new Map();
    let frameId = 0;
    let cancelled = false;
    let width = 1;
    let height = 1;
    let dpr = window.devicePixelRatio || 1;

    function getGlyphCanvas(fontSize, solid, color) {
      const key = `${letter}|${solid ? "fill" : "stroke"}|${fontSize}|${color}|${dpr}`;
      if (glyphCache.has(key)) return glyphCache.get(key);

      const measureCanvas = document.createElement("canvas");
      const measureCtx = measureCanvas.getContext("2d");
      measureCtx.font = `900 ${fontSize}px Helvetica, Arial, sans-serif`;
      measureCtx.textAlign = "center";
      measureCtx.textBaseline = "middle";
      const metrics = measureCtx.measureText(letter);
      const left = -(metrics.actualBoundingBoxLeft || fontSize * 0.28);
      const right = metrics.actualBoundingBoxRight || fontSize * 0.28;
      const top = -(metrics.actualBoundingBoxAscent || fontSize * 0.5);
      const bottom = metrics.actualBoundingBoxDescent || fontSize * 0.18;
      const pad = fontSize * 0.3;
      const glyphWidth = Math.ceil(right - left + pad * 2);
      const glyphHeight = Math.ceil(bottom - top + pad * 2);
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.max(1, Math.ceil(glyphWidth * dpr));
      offscreen.height = Math.max(1, Math.ceil(glyphHeight * dpr));
      const offscreenCtx = offscreen.getContext("2d");
      offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offscreenCtx.font = `900 ${fontSize}px Helvetica, Arial, sans-serif`;
      offscreenCtx.textAlign = "center";
      offscreenCtx.textBaseline = "middle";
      offscreenCtx.lineJoin = "miter";
      offscreenCtx.lineCap = "square";

      if (solid) {
        offscreenCtx.fillStyle = color;
        offscreenCtx.fillText(letter, glyphWidth * 0.5, glyphHeight * 0.5);
      } else {
        offscreenCtx.strokeStyle = color;
        offscreenCtx.lineWidth = 1;
        offscreenCtx.strokeText(letter, glyphWidth * 0.5, glyphHeight * 0.5);
      }

      const cached = { canvas: offscreen, width: glyphWidth, height: glyphHeight };
      glyphCache.set(key, cached);
      return cached;
    }

    function drawWarpedGlyph(fontSize, solid, slot, total, x, y, opacity, phaseOffset = 0) {
      const { canvas: glyphCanvas, width: glyphWidth, height: glyphHeight } = getGlyphCanvas(fontSize, solid, solid ? "#ffffff" : "#8b8b8b");
      const fade = total <= 1 ? 1 : 1 - slot / Math.max(total - 1, 1);
      const warpAmount = fontSize * (0.04 + warpChaos * 0.08);
      const warpFrequency = 0.72 + warpChaos * 1.35;
      const stripHeight = 1;
      const phase = performance.now() * (0.00045 + warpChaos * 0.00115) + index * 0.17 + phaseOffset;

      ctx.save();
      ctx.translate(x, y);
      ctx.translate(-glyphWidth * 0.5, -glyphHeight * 0.5);
      ctx.globalAlpha = opacity;

      for (let sliceY = 0; sliceY < glyphHeight; sliceY += stripHeight) {
        const sliceH = Math.min(stripHeight, glyphHeight - sliceY);
        const yNorm = sliceY / glyphHeight;
        const bendA = Math.sin(yNorm * Math.PI * 2 * warpFrequency + phase);
        const bendB = Math.cos(yNorm * Math.PI * warpFrequency * 0.65 - phase * 0.7);
        const bend = (bendA * 0.72 + bendB * 0.28) * warpAmount * (0.28 + fade * 0.72);
        ctx.drawImage(glyphCanvas, 0, sliceY * dpr, glyphCanvas.width, sliceH * dpr, bend, sliceY, glyphWidth, sliceH + 2);
      }

      ctx.restore();
    }

    function draw() {
      if (cancelled) return;
      const fontSize = Math.min(width * 0.608, height * 0.78, 196);
      ctx.clearRect(0, 0, width, height);
      const centerX = width * 0.5;
      const centerY = height * 0.54;
      const ghostCount = 3;
      const angle = (ghostDirection * Math.PI) / 180;
      const ghostStep = fontSize * 0.065;
      const ghostStepX = Math.cos(angle) * ghostStep;
      const ghostStepY = Math.sin(angle) * ghostStep;

      for (let slot = ghostCount; slot >= 1; slot -= 1) {
        const normalized = slot / ghostCount;
        drawWarpedGlyph(
          fontSize,
          false,
          slot - 1,
          ghostCount,
          centerX + slot * ghostStepX,
          centerY + slot * ghostStepY,
          Math.pow(1 - normalized * 0.72, 1.35) * 0.78,
          slot * 0.11
        );
      }

      drawWarpedGlyph(fontSize, true, 0, 1, centerX, centerY, 1, 0);
      frameId = requestAnimationFrame(draw);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glyphCache.clear();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    draw();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      glyphCache.clear();
    };
  }, [letter, index, ghostDirection, warpChaos]);

  return (
    <article className="alphabet-cell" style={{ "--glyph-index": index }}>
      <canvas ref={canvasRef} className="alphabet-cell__canvas" aria-label={letter} />
      <span className="alphabet-cell__index" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
    </article>
  );
}

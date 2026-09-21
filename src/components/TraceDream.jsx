import React, { useEffect, useRef } from "react";
import gsap from "gsap";

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
  const spacerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scrollSpacer = spacerRef.current;
    if (!canvas || !scrollSpacer) return undefined;

    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";
    window.scrollTo({ top: 0, behavior: "instant" });

    const ctx = canvas.getContext("2d");
    const stage = canvas.closest(".trace-stage");
    const q = (selector) => stage.querySelector(selector);
    const glyphCache = new Map();
    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      fontSize: 160,
      rowGapVh: 120,
      sampleDistance: 0,
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
      heroChars: [],
      totalHeight: 0,
      drawProgress: 0,
      scrollY: 0,
      targetScrollY: 0,
      hasScrolled: false,
      heroDismiss: 0,
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
    let letters = LETTERS.slice();
    const depthPushStates = new Map();

    function setText(id, value) {
      const node = q(`#${id}`);
      if (node) node.textContent = value;
    }

    function syncLabels() {
      setText("fontSizeVal", `${Math.round(state.fontSize)}px`);
      setText("rowHeightVal", `${Math.round(state.rowGapVh)}vh`);
      setText("sampleDistanceVal", `${Math.round(state.sampleDistance)}px`);
      setText("maxTrailVal", `${state.maxTrail}`);
      setText("curvePullVal", `${Math.round(state.curvePull)}px`);
      setText("scrollEaseVal", state.scrollEase.toFixed(2));
      setText("ghostOpacityVal", state.ghostOpacity.toFixed(2));
      setText("ghostLineWidthVal", state.ghostLineWidth.toFixed(1));
      setText("warpAmountVal", `${Math.round(state.warpAmount)}px`);
      setText("warpFrequencyVal", state.warpFrequency.toFixed(2));
      setText("rotateSpeedVal", state.rotateSpeed.toFixed(2));
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
      const heroSection = state.height;
      const letterSection = state.height * (state.rowGapVh / 100);
      const centerWorldY = state.height * 0.5 - state.height * 0.18;
      const heroAnchorX = getCenteredHeroAnchorX();

      for (let i = 0; i < letters.length; i += 1) {
        const stationY = i === 0 ? centerWorldY : centerWorldY + heroSection + letterSection * (i - 1);
        anchors.push(createStamp(i === 0 ? heroAnchorX : i % 2 === 0 ? leftX : rightX, stationY, letters[i], true));
      }

      state.totalHeight = heroSection + letterSection * Math.max(0, letters.length - 1) + state.height;
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
      state.targetScrollY = targetScroll;
      state.hasScrolled = targetScroll > 2;

      if (immediate) {
        gsap.set(state, {
          scrollY: targetScroll,
          targetScrollY: targetScroll,
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
        duration: 3.4,
        ease: "power4.out",
        overwrite: "auto",
      });
    }

    function rebuildLayout() {
      glyphCache.clear();
      depthPushStates.clear();
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
          ghosts.push(createStamp(point.x, point.y, letters[letterIndex], false));
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
      if (options.scale !== undefined) ctx.scale(options.scale, options.scale);
      ctx.translate(-width * 0.5, -height * 0.5);
      ctx.globalAlpha = opacity;

      for (let y = 0; y < height; y += stripHeight) {
        const sliceH = Math.min(stripHeight, height - y);
        const yNorm = y / height;
        const bendA = Math.sin(yNorm * Math.PI * 2 * state.warpFrequency + basePhase);
        const bendB = Math.cos(yNorm * Math.PI * state.warpFrequency * 0.65 - basePhase * 0.7);
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
      ctx.translate(stamp.x, screenY);
      if (state.rotateEnabled) ctx.rotate(stamp.rotation);
      if (options.scale !== undefined) ctx.scale(options.scale, options.scale);
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

    function drawAnimatedGhostStack(stamp, offsets, opacityMultiplier = 1, yLift = 0) {
      const phase = (performance.now() * 0.00018 + stamp.x * 0.0002) % 1;
      const pushProgress = getDepthPush(stamp, phase);
      const pushScale = 1 + pushProgress * 0.075;
      const pushOpacity = opacityMultiplier * (0.78 + pushProgress * 0.22);
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
          { opacity: Math.pow(1 - normalizedAge, 1.35) * opacityMultiplier, warpStrength: 1 }
        );
      }

      drawStamp({ ...stamp, y: stamp.y - yLift }, true, 0, 1, {
        opacity: pushOpacity,
        scale: pushScale,
      });
    }

    function getDepthPush(stamp, phase) {
      const key = `${stamp.letter}:${Math.round(stamp.x)}:${Math.round(stamp.y)}`;
      let push = depthPushStates.get(key);
      if (!push) {
        push = { value: 0, lastPhase: phase, active: false };
        depthPushStates.set(key, push);
      }

      const triggerPhase = 0.86;
      const crossedTrigger = push.lastPhase < triggerPhase && phase >= triggerPhase;
      if (crossedTrigger && !push.active) {
        push.active = true;
        gsap.killTweensOf(push);
        gsap.timeline({
          onComplete: () => {
            push.active = false;
          },
        })
          .set(push, { value: 0 })
          .to(push, { value: 1, duration: 0.8, ease: "power4.out" })
          .to(push, { value: 0, duration: 0.55, ease: "power4.out" }, ">-0.08");
      }

      push.lastPhase = phase;
      return push.value;
    }

    function render() {
      ctx.clearRect(0, 0, state.width, state.height);
      const idleGhostCount = Math.min(4, state.ghosts.length);
      const ghostCount = state.hasScrolled ? state.ghosts.length : idleGhostCount;

      if (!state.hasScrolled) {
        const topGhostOffsets = getTopGhostOffsets();
        for (let i = 0; i < ghostCount; i += 1) {
          if (state.ghosts[i]?.letter === state.anchors[0]?.letter) continue;
          drawStamp(state.ghosts[i], false, i, Math.max(ghostCount, 1));
        }
        if (state.anchors[0]) drawAnimatedGhostStack(state.anchors[0], topGhostOffsets);
        state.heroChars.forEach((stamp) => drawAnimatedGhostStack(stamp, topGhostOffsets));
        return;
      }

      if (state.heroDismiss < 1) {
        const topGhostOffsets = getTopGhostOffsets();
        state.heroChars.forEach((stamp, index) => {
          const staggerOffset = index * 0.07;
          const localProgress = clamp((state.heroDismiss - staggerOffset) / Math.max(0.0001, 1 - staggerOffset), 0, 1);
          const eased = heroDismissEase(localProgress);
          const opacity = 1 - eased;
          if (opacity > 0.001) drawAnimatedGhostStack(stamp, topGhostOffsets, opacity, eased * 28);
        });
      }

      const centerY = state.height * 0.5;
      const ghostLeadY = state.height * (state.rowGapVh / 100) * 0.28;
      const visibleGhosts = state.ghosts.filter((ghost) => {
        const ghostScreenY = ghost.y - state.targetScrollY + state.height * 0.18;
        return ghostScreenY <= centerY + ghostLeadY;
      });
      visibleGhosts.forEach((ghost, index) => {
        drawStamp(ghost, false, index, Math.max(visibleGhosts.length, 1));
      });
      for (let i = 0; i < state.anchors.length; i += 1) {
        const anchorScreenY = state.anchors[i].y - state.targetScrollY + state.height * 0.18;
        const revealStartY = centerY + (i === 0 ? state.height : state.height * (state.rowGapVh / 100));
        const localProgress = i === 0 ? 1 : clamp((revealStartY - anchorScreenY) / (revealStartY - centerY), 0, 1);
        const eased = heroDismissEase(localProgress);
        if (eased <= 0.001) continue;
        drawStamp(state.anchors[i], true, i, state.anchors.length, {
          opacity: eased,
          scale: 0.94 + eased * 0.06,
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
    ];

    inputs.forEach((input) => input.addEventListener("input", rebuildFromControls));
    rebuildBtn.addEventListener("click", rebuildLayout);
    syncControls();
    gsap.ticker.add(render);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    resize();
    render();

    return () => {
      gsap.ticker.remove(render);
      gsap.killTweensOf(state);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      inputs.forEach((input) => input.removeEventListener("input", rebuildFromControls));
      rebuildBtn.removeEventListener("click", rebuildLayout);
      glyphCache.clear();
      document.body.style.overflowX = "";
      document.body.style.overflowY = "";
    };
  }, []);

  return (
    <section className="trace-stage">
      <canvas ref={canvasRef} className="trace-canvas" />
      <div ref={spacerRef} className="trace-spacer" aria-hidden="true" />
      <aside className="controls controls--trace">
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
          <label htmlFor="rowGapRange">Row Height <span id="rowHeightVal" /></label>
          <input id="rowGapRange" type="range" min="20" max="160" step="1" defaultValue="120" />
        </div>
        <div className="controls__block">
          <label htmlFor="sampleDistanceRange">Stagger Offset <span id="sampleDistanceVal" /></label>
          <input id="sampleDistanceRange" type="range" min="0" max="120" step="1" defaultValue="0" />
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
    </section>
  );
}

export function createHeroLayoutController({ state, ctx, glyphRenderer, getLetters, syncCreativitySceneMetrics }) {
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
    const aGlyph = glyphRenderer.getGlyphCanvas("A", true);
    bounds.push({ x: 0, width: aGlyph.width + state.warpAmount * 2 });
    "DREAM".split("").forEach((char) => {
      const advance = ctx.measureText(char).width;
      const glyph = glyphRenderer.getGlyphCanvas(char, true);
      bounds.push({ x: cursorX + advance * 0.5, width: glyph.width + state.warpAmount * 2 });
      cursorX += advance + state.fontSize * 0.015;
    });
    ctx.restore();
    if (!bounds.length) return state.width * 0.5;
    const minX = Math.min(...bounds.map((item) => item.x - item.width * 0.5));
    const maxX = Math.max(...bounds.map((item) => item.x + item.width * 0.5));
    return state.width * 0.5 - (minX + maxX) * 0.5;
  }

  function buildHeroChars() {
    const firstAnchor = state.anchors[0];
    if (!firstAnchor) return [];
    ctx.save();
    ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let cursorX = firstAnchor.x + getHeroLeadAdvance();
    const chars = [];
    Array.from("DREAM").forEach((char) => {
      const advance = ctx.measureText(char).width;
      chars.push(createStamp(cursorX + advance * 0.5, firstAnchor.y, char, true));
      cursorX += advance + state.fontSize * 0.015;
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
      return { x: ghost.x - firstAnchor.x, y: ghost.y - firstAnchor.y };
    });
  }

  function getTopGhostPoint(offsets, age) {
    const headInset = { x: offsets[0].x * 0.28, y: offsets[0].y * 0.28 };
    const points = [headInset, ...offsets];
    const clampedAge = Math.max(0, Math.min(age, points.length - 1));
    const fromIndex = Math.floor(clampedAge);
    const toIndex = Math.min(points.length - 1, fromIndex + 1);
    const localT = clampedAge - fromIndex;
    return {
      x: points[fromIndex].x + (points[toIndex].x - points[fromIndex].x) * localT,
      y: points[fromIndex].y + (points[toIndex].y - points[fromIndex].y) * localT,
    };
  }

  function buildAnchors() {
    const letters = getLetters();
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

    const lastAnchorY = anchors[anchors.length - 1]?.y || topOffset + gap * Math.max(0, letters.length - 1);
    state.bottomSectionStart = lastAnchorY + 120;
    const bottomVideoHeight = (state.width * 0.95) / (state.bottomVideo?.aspect || 16 / 9);
    const bottomMargin = 48;
    const creativityGap = 192;
    state.bottomSectionHeight = Math.max(state.height * 1.05, bottomVideoHeight + state.height * 0.35 + bottomMargin);
    const bottomVideoBottom = state.bottomSectionStart + state.height * 0.54 + bottomVideoHeight * 0.5;
    syncCreativitySceneMetrics(bottomVideoBottom + creativityGap);
    state.totalHeight = state.creativitySectionStart + state.creativitySectionHeight + bottomMargin;
    return anchors;
  }

  return {
    getWarpPhase,
    getRotation,
    createStamp,
    buildHeroChars,
    buildAnchors,
    getTopGhostOffsets,
    getTopGhostPoint,
  };
}

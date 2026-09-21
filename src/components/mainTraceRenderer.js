import { clamp } from "./traceMath.js";

// Owns the hero, APERIOS ghost trail, and stamp landing pass. The parent keeps
// scroll state, canvas clearing, and the other section renderers coordinated.
export function createMainTraceRenderer({
  state,
  gsap,
  heroDismissEase,
  getTopGhostOffsets,
  getHeroWarpOptions,
  drawStamp,
  drawAnimatedGhostStack,
  drawScrollCue,
  triggerAnchorReveal,
  drawBetweenGhostsAndStamps,
}) {
  const ghostIndexCache = new WeakMap();

  function getVisibleGhosts(segment, maxIndex) {
    const ghosts = segment.ghosts;
    if (!ghosts.length || maxIndex <= 0) return [];
    let sorted = ghostIndexCache.get(segment);
    if (!sorted) {
      sorted = ghosts
        .map((ghost, index) => ({ ghost, index, y: ghost.y }))
        .sort((a, b) => a.y - b.y);
      ghostIndexCache.set(segment, sorted);
    }

    const padding = state.fontSize * 1.5;
    const minY = state.rawScrollY - state.height * 0.18 - padding;
    const maxY = state.rawScrollY + state.height * 0.82 + padding;
    let low = 0;
    let high = sorted.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (sorted[middle].y < minY) low = middle + 1;
      else high = middle;
    }
    const start = low;
    low = start;
    high = sorted.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (sorted[middle].y <= maxY) low = middle + 1;
      else high = middle;
    }

    const visible = [];
    for (let index = start; index < low; index += 1) {
      const entry = sorted[index];
      if (entry.index < maxIndex) visible.push(entry);
    }
    visible.sort((a, b) => a.index - b.index);
    return visible;
  }

  function draw() {
    const idleGhostCount = Math.min(4, state.ghosts.length);
    const ghostCount = state.hasScrolled
      ? Math.floor(state.ghosts.length * clamp(state.drawProgress * 1.15, 0, 1))
      : idleGhostCount;

    if (!state.hasScrolled && state.heroDismiss <= 0.001) {
      const topGhostOffsets = getTopGhostOffsets();
      for (let i = 0; i < ghostCount; i += 1) {
        if (state.ghosts[i]?.letter === state.anchors[0]?.letter) continue;
        drawStamp(state.ghosts[i], false, i, Math.max(ghostCount, 1));
      }
      const heroWarpOptions = getHeroWarpOptions();
      if (state.anchors[0]) drawAnimatedGhostStack(state.anchors[0], topGhostOffsets, 1, 0, heroWarpOptions);
      state.heroChars.forEach((stamp) => drawAnimatedGhostStack(stamp, topGhostOffsets, 1, 0, heroWarpOptions));
      drawScrollCue(1);
      return false;
    }

    if (state.heroDismiss < 1) {
      const topGhostOffsets = getTopGhostOffsets();
      const heroReturnOpacity = 1 - heroDismissEase(state.heroDismiss);
      if (heroReturnOpacity > 0.001) {
        const heroWarpOptions = getHeroWarpOptions();
        if (state.anchors[0]) drawAnimatedGhostStack(state.anchors[0], topGhostOffsets, heroReturnOpacity, 0, heroWarpOptions);
        drawScrollCue(heroReturnOpacity);
      }
      const heroWordEased = heroDismissEase(state.heroDismiss);
      state.heroChars.forEach((stamp) => {
        const opacity = 1 - heroWordEased;
        if (opacity > 0.001) drawAnimatedGhostStack(stamp, topGhostOffsets, opacity, 0, getHeroWarpOptions());
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
      const visibleGhosts = getVisibleGhosts(segment, segmentGhostCount);
      visibleGhosts.forEach((entry) => {
        activeGhosts.push(entry.ghost);
        drawStamp(entry.ghost, false, entry.index, Math.max(segmentGhostCount, 1));
      });
    });
    drawBetweenGhostsAndStamps();

    state.anchors.forEach((anchor, index) => {
      const screenY = anchor.y - state.scrollY + state.height * 0.18;
      const reveal = state.anchorReveals[index] || { opacity: 1, depth: 0, progress: 1 };
      if (index > 0) {
        const centerY = state.height * 0.5;
        const landingDistance = state.fontSize * 0.9;
        const scrubStartDistance = state.fontSize * 1.7;
        const nearestDistance = activeGhosts.reduce((nearest, ghost) => {
          if (ghost.letter !== anchor.letter) return nearest;
          return Math.min(nearest, Math.hypot(ghost.x - anchor.x, ghost.y - anchor.y));
        }, Infinity);
        const scrubProgress = clamp(
          (scrubStartDistance - nearestDistance) / Math.max(1, scrubStartDistance - landingDistance),
          0,
          1
        );
        const centerProgress = clamp((centerY + scrubStartDistance - screenY) / Math.max(1, scrubStartDistance), 0, 1);
        const targetProgress = Math.max(scrubProgress, centerProgress);

        if (targetProgress >= 1) {
          state.landedAnchors[index] = true;
          triggerAnchorReveal(index);
        } else {
          if (reveal.active) gsap.killTweensOf(reveal);
          reveal.active = false;
          state.landedAnchors[index] = false;
          reveal.progress += (targetProgress - reveal.progress) * 0.28;
          const easedTarget = heroDismissEase(reveal.progress);
          reveal.opacity = easedTarget;
          reveal.depth = -1 + easedTarget;
        }
      }
      if (index > 0 && !state.landedAnchors[index] && reveal.opacity <= 0.001) return;
      drawStamp(anchor, true, index, state.anchors.length, {
        ...(index === 0 ? getHeroWarpOptions() : {}),
        opacity: reveal.opacity,
        depth: reveal.depth,
      });
    });

    return true;
  }

  return { draw };
}

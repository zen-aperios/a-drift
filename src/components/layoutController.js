import { clamp, cubicPoint, lerp } from "./traceMath.js";

// Owns the geometry rebuild that feeds the main trace, bottom ghost, and
// creativity renderers.
export function createLayoutController({
  state,
  getLetters,
  createStamp,
  buildAnchors,
  buildHeroChars,
  glyphRenderer,
  bottomGhostRenderer,
  diagonalGhostRenderer,
  rebuildCreativityPath,
  buildPortalLayout,
  updateScrollTargets,
}) {
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

  function rebuildLayout() {
    glyphRenderer.clearCache();
    bottomGhostRenderer.clearCache();
    diagonalGhostRenderer.clearCache();
    state.anchors = buildAnchors();
    state.heroChars = buildHeroChars();
    const bottomGrid = bottomGhostRenderer.build();
    state.bottomGhostGrid = bottomGrid.stamps;
    state.bottomGhostSegments = bottomGrid.segments;
    state.bottomGhostPathLength = bottomGrid.pathLength;
    rebuildCreativityPath();
    state.landedAnchors = state.anchors.map((_, index) => index === 0);
    state.anchorReveals = state.anchors.map((_, index) => ({
      opacity: index === 0 ? 1 : 0,
      depth: index === 0 ? 0 : -1,
      progress: index === 0 ? 1 : 0,
      active: index === 0,
    }));

    const letters = getLetters();
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
    state.segments = rawSegments.map((segment) => {
      const segmentShare = totalPoints > 0 ? segment.points.length / totalPoints : 0;
      const ghostTotal = clamp(Math.round(state.maxTrail * segmentShare), 1, segment.points.length);
      const ghosts = [];
      for (let i = 0; i < ghostTotal; i += 1) {
        const t = ghostTotal === 1 ? 0 : i / (ghostTotal - 1);
        const point = segment.points[Math.round(t * (segment.points.length - 1))];
        const ghost = createStamp(point.x, point.y, t >= 0.5 ? segment.toLetter : segment.fromLetter, false);
        const fromScale = state.anchors[segment.fromIndex]?.scale ?? 1;
        const toScale = state.anchors[segment.toIndex]?.scale ?? 1;
        ghost.scale = lerp(fromScale, toScale, t);
        ghosts.push(ghost);
      }
      return { ...segment, ghosts };
    });
    state.ghosts = state.segments.flatMap((segment) => segment.ghosts);
    buildPortalLayout();
    updateScrollTargets(true);
  }

  return { sampleCurve, rebuildLayout };
}

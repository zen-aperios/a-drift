export function createTraceCompositionController() {
  let surfaceController;
  let scrollController;
  let layoutController;
  let heroLayoutController;
  let creativityPathController;

  function setControllers(controllers) {
    surfaceController = controllers.surfaceController;
    scrollController = controllers.scrollController;
    layoutController = controllers.layoutController;
    heroLayoutController = controllers.heroLayoutController;
    creativityPathController = controllers.creativityPathController;
  }

  return {
    setControllers,
    syncRenderSurfaces: () => surfaceController?.syncRenderSurfaces(),
    syncTraceSpacerHeight: () => surfaceController?.syncTraceSpacerHeight(),
    updateScrollTargets: (immediate = false) => scrollController?.updateTargets(immediate),
    onScroll: () => scrollController?.onScroll(),
    rebuildLayout: () => layoutController?.rebuildLayout(),
    sampleCurve: (start, end, bendIndex) => layoutController?.sampleCurve(start, end, bendIndex) || [],
    syncCreativitySceneMetrics: (nextStart) => creativityPathController?.syncSceneMetrics(nextStart),
    rebuildCreativityPath: () => creativityPathController?.rebuildPath(),
    queueCreativityPathRebuild: (updateEditor = false) => creativityPathController?.queuePathRebuild(updateEditor),
    getCreativityWorldY: (y) => creativityPathController?.getWorldY(y) || 0,
    getCreativityRawY: (worldY) => creativityPathController?.getRawY(worldY) || 0.02,
    getWarpPhase: (x, y) => heroLayoutController?.getWarpPhase(x, y) || 0,
    getRotation: (x, y) => heroLayoutController?.getRotation(x, y) || 0,
    createStamp: (x, y, letter, solid = false) => heroLayoutController?.createStamp(x, y, letter, solid),
    buildHeroChars: () => heroLayoutController?.buildHeroChars() || [],
    buildAnchors: () => heroLayoutController?.buildAnchors() || [],
    getTopGhostOffsets: () => heroLayoutController?.getTopGhostOffsets() || [],
    getTopGhostPoint: (offsets, age) => heroLayoutController?.getTopGhostPoint(offsets, age) || { x: 0, y: 0 },
  };
}

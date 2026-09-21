import { clamp } from "./traceMath.js";

// Owns IN-CREATIVITY geometry metrics, path rebuilding, and queued editor updates.
export function createCreativityPathController({
  state,
  diagonalGhostRenderer,
  pathEditorController,
  syncTraceSpacerHeight,
  isCancelled,
}) {
  let pendingRebuild = 0;
  let pendingEditorUpdate = false;

  function getNodeYBounds() {
    const values = [
      state.creativityPath.start.y,
      state.creativityPath.controlA.y,
      state.creativityPath.controlB.y,
      state.creativityPath.end.y,
      ...state.creativityStampOverrides.filter(Boolean).map((point) => point.y),
    ];
    const min = clamp(Math.min(...values), 0.02, 0.98);
    const max = clamp(Math.max(...values), 0.02, 0.98);
    return { min, span: Math.max(0.08, max - min) };
  }

  function syncSceneMetrics(nextStart = state.creativitySectionStart) {
    const nodeBounds = getNodeYBounds();
    const baseHeight = state.height * (state.creativityGapVh / 100) * Math.max(1, "IN-CREATIVITY".length - 1) + state.height * 0.72;
    state.creativityBaseHeight = baseHeight;
    state.creativitySceneMinY = nodeBounds.min;
    state.creativitySceneSpanY = nodeBounds.span;
    state.creativitySectionStart = nextStart;
    state.creativitySectionHeight = Math.max(state.height * 0.38, baseHeight * nodeBounds.span + state.height * 0.24);
  }

  function getWorldY(y) {
    const normalizedY = (y - state.creativitySceneMinY) / Math.max(0.001, state.creativitySceneSpanY);
    return state.creativitySectionStart + state.creativitySectionHeight * clamp(normalizedY, 0, 1);
  }

  function getRawY(worldY) {
    return clamp((worldY - state.creativitySectionStart) / Math.max(1, state.creativityBaseHeight), 0.02, 0.98);
  }

  function rebuildPath() {
    syncSceneMetrics();
    diagonalGhostRenderer.clearCache();
    const creativityGrid = diagonalGhostRenderer.build();
    state.creativityStamps = creativityGrid.stamps;
    state.creativitySegments = creativityGrid.segments;
    syncTraceSpacerHeight();
    pathEditorController.syncExport();
  }

  function queuePathRebuild(updateEditor = false) {
    pendingEditorUpdate = pendingEditorUpdate || updateEditor;
    if (pendingRebuild) return;
    pendingRebuild = requestAnimationFrame(() => {
      pendingRebuild = 0;
      if (isCancelled()) return;
      rebuildPath();
      if (pendingEditorUpdate) pathEditorController.update();
      pendingEditorUpdate = false;
    });
  }

  function cancelPendingRebuild() {
    if (pendingRebuild) cancelAnimationFrame(pendingRebuild);
    pendingRebuild = 0;
    pendingEditorUpdate = false;
  }

  return {
    syncSceneMetrics,
    rebuildPath,
    queuePathRebuild,
    getWorldY,
    getRawY,
    cancelPendingRebuild,
  };
}

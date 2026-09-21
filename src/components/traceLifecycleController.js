export function createTraceLifecycleController({
  traceScheduler,
  portalAssetController,
  syncPortalConfigExport,
  onScroll,
  resize,
  traceViewport,
  portalInteraction,
  pathEditor,
  pathEditorController,
  pathGuidesToggle,
  pathExportBtn,
  pathPresetButtons,
  renderInitialFrame,
}) {
  function start() {
    syncPortalConfigExport();
    portalAssetController.loadPortalImages();
    portalAssetController.loadBottomVideo();
    traceScheduler.start();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    traceViewport?.addEventListener("pointerdown", portalInteraction.onPointerDown);
    window.addEventListener("pointermove", portalInteraction.onPointerMove);
    window.addEventListener("pointerup", portalInteraction.onPointerUp);
    pathEditor?.addEventListener("pointerdown", pathEditorController.onPointerDown);
    window.addEventListener("pointermove", pathEditorController.onPointerMove);
    window.addEventListener("pointerup", pathEditorController.onPointerUp);
    pathGuidesToggle?.addEventListener("input", pathEditorController.update);
    pathExportBtn?.addEventListener("click", pathEditorController.syncExport);
    pathPresetButtons.forEach((button) => button.addEventListener("click", pathEditorController.onPresetClick));
    resize();
    renderInitialFrame();
  }

  function cleanup() {
    traceScheduler.stop();
    traceViewport?.removeEventListener("pointerdown", portalInteraction.onPointerDown);
    window.removeEventListener("pointermove", portalInteraction.onPointerMove);
    window.removeEventListener("pointerup", portalInteraction.onPointerUp);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", resize);
    pathEditor?.removeEventListener("pointerdown", pathEditorController.onPointerDown);
    window.removeEventListener("pointermove", pathEditorController.onPointerMove);
    window.removeEventListener("pointerup", pathEditorController.onPointerUp);
    pathGuidesToggle?.removeEventListener("input", pathEditorController.update);
    pathExportBtn?.removeEventListener("click", pathEditorController.syncExport);
    pathPresetButtons.forEach((button) => button.removeEventListener("click", pathEditorController.onPresetClick));
  }

  return { start, cleanup };
}

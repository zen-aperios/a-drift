export function createTraceRuntimeController({
  state,
  ctx,
  bottomCtx,
  bottomGhostCtx,
  mediaBackRenderer,
  mediaFrontRenderer,
  bottomSectionController,
  portalInteractionState,
  pathEditorController,
  mainTraceRenderer,
  bottomGhostRenderer,
  diagonalGhostRenderer,
  drawPortalResizeHandles,
}) {
  function render(dt) {
    state.heroWarpPhase += dt * state.heroWarpSpeed;
    bottomSectionController.update();
    mediaBackRenderer.clear();
    mediaFrontRenderer.clear();
    const clearY = Math.max(0, state.rawScrollY - state.height * 0.75);
    const clearHeight = state.height * 2.5;
    ctx.clearRect(0, clearY, state.width, clearHeight);

    // Editor-only canvas work is disabled while its panel/grid is hidden.
    const editorIsActive = !state.hidePlacementGrid || Boolean(
      portalInteractionState.activePortalDrag ||
      portalInteractionState.hoveredPortalCorner ||
      portalInteractionState.selectedPortalItem
    );
    if (editorIsActive || state.editorWasVisible) {
      bottomCtx.clearRect(0, clearY, state.width, clearHeight);
    }
    state.editorWasVisible = editorIsActive;

    const bottomGhostScreenTop = state.bottomGhostCanvasTop - state.rawScrollY;
    const bottomGhostScreenBottom = bottomGhostScreenTop + (state.bottomGhostCanvasHeight || state.height);
    const bottomGhostIsNear = bottomGhostScreenBottom > -state.height * 1.5 && bottomGhostScreenTop < state.height * 2.5;
    // The bottom ghost canvas is local to its section, so it need not clear
    // or redraw while that section is far outside the viewport.
    if (bottomGhostIsNear) {
      bottomGhostCtx.clearRect(0, 0, state.width, state.bottomGhostCanvasHeight || state.height);
    }

    pathEditorController.update();
    if (!mainTraceRenderer.draw()) return;
    if (bottomGhostIsNear) bottomGhostRenderer.draw();

    const creativityScreenTop = state.creativitySectionStart - state.scrollY + state.height * 0.18;
    const creativityScreenBottom = creativityScreenTop + state.creativitySectionHeight;
    const creativityIsNear = creativityScreenBottom > -state.height && creativityScreenTop < state.height * 2;
    // IN-CREATIVITY keeps its exact draw behavior whenever it is nearby,
    // but contributes no per-frame work while it is far offscreen.
    if (creativityIsNear) diagonalGhostRenderer.draw();
    drawPortalResizeHandles();
  }

  return { render };
}

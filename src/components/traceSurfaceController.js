export function createTraceSurfaceController({
  state,
  canvas,
  bottomCanvas,
  bottomGhostCanvas,
  ctx,
  bottomCtx,
  bottomGhostCtx,
  mediaBackRenderer,
  mediaFrontRenderer,
  mediaCamera,
  pathEditor,
  traceViewport,
  getCreativityWorldY,
}) {
  function getCreativityContentBottom() {
    const worldYs = [];
    const pathPoints = [
      state.creativityPath.start,
      state.creativityPath.controlA,
      state.creativityPath.controlB,
      state.creativityPath.end,
      ...state.creativityStampOverrides.filter(Boolean),
    ];
    pathPoints.forEach((point) => {
      if (point) worldYs.push(getCreativityWorldY(point.y));
    });
    state.creativityStamps.forEach((stamp) => worldYs.push(stamp.y));
    state.creativitySegments.forEach((segment) => segment.ghosts.forEach((ghost) => worldYs.push(ghost.y)));
    if (!worldYs.length) return state.creativitySectionStart + state.creativitySectionHeight;
    return Math.max(...worldYs) + Math.max(160, state.height * 0.16);
  }

  function syncRenderSurfaces() {
    const renderHeight = Math.max(state.renderHeight || state.totalHeight || state.height, state.height);
    const canvasWidth = Math.round(state.width * state.dpr);
    const canvasHeight = Math.round(renderHeight * state.dpr);

    [canvas, bottomCanvas].forEach((targetCanvas) => {
      if (targetCanvas.width !== canvasWidth) targetCanvas.width = canvasWidth;
      if (targetCanvas.height !== canvasHeight) targetCanvas.height = canvasHeight;
      targetCanvas.style.height = `${renderHeight}px`;
    });
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    bottomCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    const bottomGhostTop = Math.max(0, state.bottomSectionStart - state.height * 0.35);
    const bottomGhostHeight = Math.max(state.height * 1.2, state.bottomSectionHeight + state.height * 0.35);
    state.bottomGhostCanvasTop = bottomGhostTop;
    state.bottomGhostCanvasHeight = bottomGhostHeight;
    if (bottomGhostCanvas.width !== canvasWidth) bottomGhostCanvas.width = canvasWidth;
    if (bottomGhostCanvas.height !== Math.round(bottomGhostHeight * state.dpr)) bottomGhostCanvas.height = Math.round(bottomGhostHeight * state.dpr);
    bottomGhostCanvas.style.top = `${bottomGhostTop}px`;
    bottomGhostCanvas.style.height = `${bottomGhostHeight}px`;
    bottomGhostCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    [mediaBackRenderer, mediaFrontRenderer].forEach((renderer) => {
      renderer.setPixelRatio(Math.min(state.dpr, 1.25));
      renderer.setSize(state.width, renderHeight, false);
      renderer.domElement.style.height = `${renderHeight}px`;
    });
    mediaCamera.left = 0;
    mediaCamera.right = state.width;
    mediaCamera.top = renderHeight;
    mediaCamera.bottom = 0;
    mediaCamera.position.z = 10;
    mediaCamera.updateProjectionMatrix();

    if (pathEditor) {
      pathEditor.style.height = `${renderHeight}px`;
      pathEditor.setAttribute("viewBox", `0 0 ${state.width} ${renderHeight}`);
    }
    if (traceViewport) traceViewport.style.height = `${renderHeight}px`;
  }

  function syncTraceSpacerHeight() {
    state.totalHeight = getCreativityContentBottom() + 48;
    state.renderHeight = Math.max(state.totalHeight, state.height * 2);
    syncRenderSurfaces();
  }

  return { syncRenderSurfaces, syncTraceSpacerHeight };
}

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

  function syncTraceCanvasWindow() {
    const renderHeight = Math.max(state.renderHeight || state.totalHeight || state.height, state.height);
    const traceCanvasHeight = state.traceCanvasHeight || Math.max(state.height * 2, 1);
    const nextTop = Math.min(
      Math.max(0, renderHeight - traceCanvasHeight),
      Math.max(0, state.rawScrollY - state.height * 0.5)
    );
    state.traceCanvasTop = nextTop;
    state.mediaCanvasTop = nextTop;
    state.mediaCanvasHeight = traceCanvasHeight;
    canvas.style.top = `${nextTop}px`;
    mediaBackRenderer.domElement.style.top = `${nextTop}px`;
    mediaFrontRenderer.domElement.style.top = `${nextTop}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, state.width, state.traceCanvasHeight);
    ctx.translate(0, -nextTop);
  }

  function syncEditorCanvasWindow() {
    const renderHeight = Math.max(state.renderHeight || state.totalHeight || state.height, state.height);
    const canvasHeight = state.traceCanvasHeight || Math.max(state.height * 2, 1);
    const nextTop = Math.min(
      Math.max(0, renderHeight - canvasHeight),
      Math.max(0, state.rawScrollY - state.height * 0.5)
    );
    bottomCanvas.style.top = `${nextTop}px`;
    bottomCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    bottomCtx.clearRect(0, 0, state.width, canvasHeight);
    bottomCtx.translate(0, -nextTop);
  }

  function syncRenderSurfaces() {
    const renderHeight = Math.max(state.renderHeight || state.totalHeight || state.height, state.height);
    const canvasWidth = Math.round(state.width * state.dpr);
    const traceCanvasHeight = Math.max(state.height * 2, 1);
    const maxTraceCanvasTop = Math.max(0, renderHeight - traceCanvasHeight);
    const traceCanvasTop = Math.min(
      maxTraceCanvasTop,
      Math.max(0, state.rawScrollY - state.height * 0.5)
    );
    state.traceCanvasTop = traceCanvasTop;
    state.traceCanvasHeight = traceCanvasHeight;
    state.mediaCanvasTop = traceCanvasTop;
    state.mediaCanvasHeight = traceCanvasHeight;

    if (canvas.width !== canvasWidth) canvas.width = canvasWidth;
    if (canvas.height !== Math.round(traceCanvasHeight * state.dpr)) canvas.height = Math.round(traceCanvasHeight * state.dpr);
    canvas.style.top = `${traceCanvasTop}px`;
    canvas.style.height = `${traceCanvasHeight}px`;

    if (bottomCanvas.width !== canvasWidth) bottomCanvas.width = canvasWidth;
    if (bottomCanvas.height !== Math.round(traceCanvasHeight * state.dpr)) bottomCanvas.height = Math.round(traceCanvasHeight * state.dpr);
    bottomCanvas.style.top = `${traceCanvasTop}px`;
    bottomCanvas.style.height = `${traceCanvasHeight}px`;

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
      renderer.setSize(state.width, traceCanvasHeight, false);
      renderer.domElement.style.top = `${traceCanvasTop}px`;
      renderer.domElement.style.height = `${traceCanvasHeight}px`;
    });
    mediaCamera.left = 0;
    mediaCamera.right = state.width;
    mediaCamera.top = traceCanvasHeight;
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

  return { syncRenderSurfaces, syncTraceSpacerHeight, syncTraceCanvasWindow, syncEditorCanvasWindow };
}

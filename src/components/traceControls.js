// Owns control-panel DOM reads and value labels. Rebuild and render callbacks
// remain in TraceDream so changing a slider keeps its existing side effects.
export function createTraceControls({ root, state, lettersFallback }) {
  const q = (selector) => root.querySelector(selector);
  const elements = {
    lettersInput: q("#lettersInput"),
    fontSizeRange: q("#fontSizeRange"),
    rowGapRange: q("#rowGapRange"),
    sampleDistanceRange: q("#sampleDistanceRange"),
    maxTrailRange: q("#maxTrailRange"),
    curvePullRange: q("#curvePullRange"),
    ghostOpacityRange: q("#ghostOpacityRange"),
    ghostLineWidthRange: q("#ghostLineWidthRange"),
    warpToggle: q("#warpToggle"),
    warpAmountRange: q("#warpAmountRange"),
    warpFrequencyRange: q("#warpFrequencyRange"),
    rotateToggle: q("#rotateToggle"),
    rotateSpeedRange: q("#rotateSpeedRange"),
    fillColorInput: q("#fillColorInput"),
    ghostColorInput: q("#ghostColorInput"),
    bgColorInput: q("#bgColorInput"),
    rebuildBtn: q("#traceRebuildBtn"),
    portalRevealStartRange: q("#portalRevealStartRange"),
    portalRevealDistanceRange: q("#portalRevealDistanceRange"),
    portalRevealDurationRange: q("#portalRevealDurationRange"),
    portalShaderIntensityRange: q("#portalShaderIntensityRange"),
    portalShaderNoiseScaleRange: q("#portalShaderNoiseScaleRange"),
    portalShaderNoiseSpeedRange: q("#portalShaderNoiseSpeedRange"),
    portalShaderSoftnessRange: q("#portalShaderSoftnessRange"),
    portalShaderNoiseAmountRange: q("#portalShaderNoiseAmountRange"),
    portalShaderFlowXRange: q("#portalShaderFlowXRange"),
    portalShaderFlowYRange: q("#portalShaderFlowYRange"),
    portalShaderFlowNoiseYRange: q("#portalShaderFlowNoiseYRange"),
    portalShaderZoomRange: q("#portalShaderZoomRange"),
    portalDriftRange: q("#portalDriftRange"),
    portalParallaxRange: q("#portalParallaxRange"),
    bottomLineStaggerRange: q("#bottomLineStaggerRange"),
    hidePlacementGridToggle: q("#hidePlacementGridToggle"),
    portalConfigExportBtn: q("#portalConfigExportBtn"),
    portalConfigExport: q("#portalConfigExport"),
  };

  function setText(id, value) {
    const node = q(`#${id}`);
    if (node) node.textContent = value;
  }

  function syncLabels() {
    setText("fontSizeVal", `${Math.round(state.fontSize)}px`);
    setText("rowGapVal", `${Math.round(state.rowGapVh)}vh`);
    setText("sampleDistanceVal", `${Math.round(state.sampleDistance)}px`);
    setText("maxTrailVal", `${state.maxTrail}`);
    setText("curvePullVal", `${Math.round(state.curvePull)}px`);
    setText("ghostOpacityVal", state.ghostOpacity.toFixed(2));
    setText("ghostLineWidthVal", state.ghostLineWidth.toFixed(1));
    setText("warpAmountVal", `${Math.round(state.warpAmount)}px`);
    setText("warpFrequencyVal", state.warpFrequency.toFixed(2));
    setText("rotateSpeedVal", state.rotateSpeed.toFixed(2));
    setText("portalRevealStartVal", `${Math.round(state.portalRevealStart)}vh`);
    setText("portalRevealDistanceVal", `${Math.round(state.portalRevealDistance)}vh`);
    setText("portalRevealDurationVal", `${state.portalRevealDuration.toFixed(2)}s`);
    setText("portalShaderIntensityVal", state.portalShaderIntensity.toFixed(3));
    setText("portalShaderNoiseScaleVal", state.portalShaderNoiseScale.toFixed(2));
    setText("portalShaderNoiseSpeedVal", state.portalShaderNoiseSpeed.toFixed(2));
    setText("portalShaderSoftnessVal", state.portalShaderSoftness.toFixed(2));
    setText("portalShaderNoiseAmountVal", state.portalShaderNoiseAmount.toFixed(2));
    setText("portalShaderFlowXVal", state.portalShaderFlowX.toFixed(2));
    setText("portalShaderFlowYVal", state.portalShaderFlowY.toFixed(2));
    setText("portalShaderFlowNoiseYVal", state.portalShaderFlowNoiseY.toFixed(2));
    setText("portalShaderZoomVal", state.portalShaderZoom.toFixed(3));
    setText("portalDriftVal", `${Math.round(state.portalDrift)}px`);
    setText("portalParallaxVal", state.portalParallax.toFixed(3));
    setText("bottomLineStaggerVal", `${state.bottomLineStagger.toFixed(2)}s`);
    setText("creativityGapVal", `${Math.round(state.creativityGapVh)}vh`);
  }

  function syncControls() {
    const parsed = (elements.lettersInput.value || "APERIOS")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .split("")
      .filter(Boolean);
    state.fontSize = parseFloat(elements.fontSizeRange.value);
    state.rowGapVh = parseFloat(elements.rowGapRange.value);
    state.sampleDistance = parseFloat(elements.sampleDistanceRange.value);
    state.maxTrail = parseInt(elements.maxTrailRange.value, 10);
    state.curvePull = parseFloat(elements.curvePullRange.value);
    state.ghostOpacity = parseFloat(elements.ghostOpacityRange.value);
    state.ghostLineWidth = parseFloat(elements.ghostLineWidthRange.value);
    state.warpEnabled = elements.warpToggle.checked;
    state.warpAmount = parseFloat(elements.warpAmountRange.value);
    state.warpFrequency = parseFloat(elements.warpFrequencyRange.value);
    state.rotateEnabled = elements.rotateToggle.checked;
    state.rotateSpeed = parseFloat(elements.rotateSpeedRange.value);
    state.fillColor = elements.fillColorInput.value;
    state.ghostColor = elements.ghostColorInput.value;
    state.bgColor = elements.bgColorInput.value;
    state.portalRevealStart = parseFloat(elements.portalRevealStartRange.value);
    state.portalRevealDistance = parseFloat(elements.portalRevealDistanceRange.value);
    state.portalRevealDuration = parseFloat(elements.portalRevealDurationRange.value);
    state.portalShaderIntensity = parseFloat(elements.portalShaderIntensityRange.value);
    state.portalShaderNoiseScale = parseFloat(elements.portalShaderNoiseScaleRange.value);
    state.portalShaderNoiseSpeed = parseFloat(elements.portalShaderNoiseSpeedRange.value);
    state.portalShaderSoftness = parseFloat(elements.portalShaderSoftnessRange.value);
    state.portalShaderNoiseAmount = parseFloat(elements.portalShaderNoiseAmountRange.value);
    state.portalShaderFlowX = parseFloat(elements.portalShaderFlowXRange.value);
    state.portalShaderFlowY = parseFloat(elements.portalShaderFlowYRange.value);
    state.portalShaderFlowNoiseY = parseFloat(elements.portalShaderFlowNoiseYRange.value);
    state.portalShaderZoom = parseFloat(elements.portalShaderZoomRange.value);
    state.portalDrift = parseFloat(elements.portalDriftRange.value);
    state.portalParallax = parseFloat(elements.portalParallaxRange.value);
    state.bottomLineStagger = parseFloat(elements.bottomLineStaggerRange.value);
    state.hidePlacementGrid = Boolean(elements.hidePlacementGridToggle?.checked);
    document.body.style.background = state.bgColor;
    syncLabels();
    return parsed.length ? parsed : lettersFallback.slice();
  }

  const inputs = Object.values(elements).filter(
    (element) => element && element !== elements.portalConfigExport && element.matches?.("input, textarea")
  );
  return { elements, inputs, syncControls, syncLabels };
}

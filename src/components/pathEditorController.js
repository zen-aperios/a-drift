import { clamp, cubicPoint } from "./traceMath.js";

// Owns the IN-CREATIVITY editor UI, presets, normalized export, and pointer
// snapping. The parent supplies path rebuild callbacks and owns canvas state.
export function createPathEditorController({
  state,
  pathEditor,
  pathGuidesToggle,
  pathExportOutput,
  pathControlsOpen,
  getCreativityWorldY,
  getCreativityRawY,
  rebuildLayout,
  queueCreativityPathRebuild,
}) {
  let activePathPoint = null;

  function getCreativityPointScreen(key) {
    const point = state.creativityPath[key];
    return {
      x: state.width * point.x,
      y: getCreativityWorldY(point.y) - state.scrollY + state.height * 0.18,
    };
  }

  function syncExport() {
    if (!pathExportOutput) return;
    pathExportOutput.value = JSON.stringify({
      text: "IN-CREATIVITY",
      rowGapVh: state.creativityGapVh,
      sectionHeightVh: Number(((state.creativitySectionHeight / Math.max(1, state.height)) * 100).toFixed(2)),
      points: state.creativityPath,
      stampPoints: state.creativityStampOverrides,
    }, null, 2);
  }

  function applyPreset(name) {
    const stampCount = "IN-CREATIVITY".length;
    const circlePoints = Array.from({ length: stampCount }, (_, index) => {
      const angle = -Math.PI * 0.64 + (Math.PI * 2 * index) / Math.max(1, stampCount - 1);
      return { x: 0.5 + Math.cos(angle) * 0.38, y: 0.5 + Math.sin(angle) * 0.29 };
    });
    const spiralPoints = Array.from({ length: stampCount }, (_, index) => {
      const t = index / Math.max(1, stampCount - 1);
      const angle = -Math.PI * 0.85 + Math.PI * 3.15 * t;
      return { x: 0.5 + Math.cos(angle) * (0.4 - t * 0.22), y: 0.5 + Math.sin(angle) * (0.31 - t * 0.16) };
    });
    const presets = {
      c: { points: { start: { x: 0.1, y: 0.088 }, controlA: { x: 0.76, y: 0.2 }, controlB: { x: 0.76, y: 0.8 }, end: { x: 0.1, y: 0.912 } } },
      s: { points: { start: { x: 0.1, y: 0.088 }, controlA: { x: 0.9, y: 0.22 }, controlB: { x: 0.1, y: 0.78 }, end: { x: 0.9, y: 0.912 } } },
      diagonal: { points: { start: { x: 0.1, y: 0.088 }, controlA: { x: 0.42, y: 0.3 }, controlB: { x: 0.58, y: 0.7 }, end: { x: 0.9, y: 0.912 } } },
      straight: { points: { start: { x: 0.5, y: 0.088 }, controlA: { x: 0.5, y: 0.32 }, controlB: { x: 0.5, y: 0.68 }, end: { x: 0.5, y: 0.912 } } },
      circle: { points: { start: circlePoints[0], controlA: { x: 0.9, y: 0.18 }, controlB: { x: 0.1, y: 0.82 }, end: circlePoints[circlePoints.length - 1] }, stampOverrides: circlePoints },
      spiral: { points: { start: spiralPoints[0], controlA: { x: 0.95, y: 0.18 }, controlB: { x: 0.12, y: 0.84 }, end: spiralPoints[spiralPoints.length - 1] }, stampOverrides: spiralPoints },
    };
    const preset = presets[name];
    if (!preset) return;
    state.creativityPath = JSON.parse(JSON.stringify(preset.points));
    state.creativityStampOverrides = JSON.parse(JSON.stringify(preset.stampOverrides || []));
    rebuildLayout();
    update();
  }

  function update() {
    if (!pathEditor) return;
    const shouldShowEditor = pathControlsOpen() || Boolean(activePathPoint);
    pathEditor.classList.toggle("is-hidden", !shouldShowEditor);
    if (!shouldShowEditor) return;
    pathEditor.classList.toggle("is-guides-hidden", !(pathGuidesToggle?.checked ?? true));
    pathEditor.setAttribute("viewBox", `0 0 ${state.width} ${Math.max(state.renderHeight, state.height)}`);
    const documentOffsetY = state.rawScrollY;
    const toDocumentPoint = (point) => ({ x: point.x, y: point.y + documentOffsetY });
    const points = Object.fromEntries(["start", "controlA", "controlB", "end"].map((key) => [key, toDocumentPoint(getCreativityPointScreen(key))]));
    const path = pathEditor.querySelector("[data-path-line]");
    const handleA = pathEditor.querySelector("[data-handle-a]");
    const handleB = pathEditor.querySelector("[data-handle-b]");
    if (path) path.setAttribute("d", `M ${points.start.x} ${points.start.y} C ${points.controlA.x} ${points.controlA.y}, ${points.controlB.x} ${points.controlB.y}, ${points.end.x} ${points.end.y}`);
    if (handleA) {
      handleA.setAttribute("x1", points.start.x); handleA.setAttribute("y1", points.start.y);
      handleA.setAttribute("x2", points.controlA.x); handleA.setAttribute("y2", points.controlA.y);
    }
    if (handleB) {
      handleB.setAttribute("x1", points.end.x); handleB.setAttribute("y1", points.end.y);
      handleB.setAttribute("x2", points.controlB.x); handleB.setAttribute("y2", points.controlB.y);
    }
    Object.entries(points).forEach(([key, point]) => {
      const node = pathEditor.querySelector(`[data-path-point="${key}"]`);
      if (node) { node.setAttribute("cx", point.x); node.setAttribute("cy", point.y); }
    });
    const stampsLayer = pathEditor.querySelector("[data-stamp-points]");
    if (stampsLayer) {
      stampsLayer.replaceChildren();
      state.creativityStamps.forEach((stamp, index) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("data-stamp-index", `${index}`);
        circle.setAttribute("class", "path-editor__stamp-point");
        circle.setAttribute("cx", stamp.x);
        circle.setAttribute("cy", stamp.y - state.scrollY + state.height * 0.18 + documentOffsetY);
        circle.setAttribute("r", "5");
        stampsLayer.appendChild(circle);
      });
    }
  }

  function onPointerDown(event) {
    const target = event.target.closest?.("[data-path-point], [data-stamp-index]");
    if (!target) return;
    activePathPoint = target.dataset.pathPoint
      ? { type: "path", key: target.dataset.pathPoint }
      : { type: "stamp", index: parseInt(target.dataset.stampIndex, 10) };
    target.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!activePathPoint) return;
    const worldY = event.clientY + state.scrollY - state.height * 0.18;
    const rawX = clamp(event.clientX / Math.max(1, state.width), 0.02, 0.98);
    const snapColumns = [0.1, 0.5, 0.9];
    const snappedX = snapColumns.reduce((nearest, value) => Math.abs(value - rawX) < Math.abs(nearest - rawX) ? value : nearest, snapColumns[0]);
    const rawY = getCreativityRawY(worldY);
    const rowGap = (state.height * (state.creativityGapVh / 100)) / Math.max(1, state.creativityBaseHeight);
    const rowBase = state.creativityPath.start.y;
    const snappedRow = Math.round((rawY - rowBase) / Math.max(0.001, rowGap));
    const snappedY = clamp(rowBase + snappedRow * rowGap, 0.02, 0.98);
    if (activePathPoint.type === "path") {
      state.creativityPath[activePathPoint.key] = { x: snappedX, y: activePathPoint.key === "controlA" || activePathPoint.key === "controlB" ? rawY : snappedY };
    } else {
      const t = activePathPoint.index / Math.max(1, "IN-CREATIVITY".length - 1);
      const path = state.creativityPath;
      const basePoint = cubicPoint(path.start, path.controlA, path.controlB, path.end, t);
      const snapBackDistance = Math.hypot((rawX - basePoint.x) * state.width, (rawY - basePoint.y) * state.creativityBaseHeight);
      if (snapBackDistance < 56) delete state.creativityStampOverrides[activePathPoint.index];
      else state.creativityStampOverrides[activePathPoint.index] = { x: rawX, y: rawY };
    }
    queueCreativityPathRebuild(true);
    event.preventDefault();
  }

  function onPointerUp() { activePathPoint = null; }
  function onPresetClick(event) { applyPreset(event.currentTarget.dataset.pathPreset); }

  return { update, syncExport, onPointerDown, onPointerMove, onPointerUp, onPresetClick, hasActivePoint: () => Boolean(activePathPoint) };
}

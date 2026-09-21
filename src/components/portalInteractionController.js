import { clamp } from "./traceMath.js";

// Owns portal editor hit-testing and pointer interactions. Layout and export
// callbacks stay injected so snapping remains governed by the existing grid.
export function createPortalInteractionController({
  state,
  traceViewport,
  interaction,
  placementColumns,
  placementRows,
  getPortalItemDocumentFrame,
  getPortalVisibleFrame,
  getNearestAvailablePlacementBlock,
  getNearestPlacementCellInGap,
  getPlacementGridCells,
  getPlacementBlock,
  getPortalFrameForBlock,
  blockIsAvailable,
  getPlacedPortalFrames,
  syncPortalConfigExport,
}) {
  function getPortalItemInteractiveFrame(item) {
    return item.visibleRenderFrame || getPortalVisibleFrame(getPortalItemDocumentFrame(item), item);
  }

  function getPortalFrameCorners(frame) {
    const left = frame.x - frame.width * 0.5;
    const right = frame.x + frame.width * 0.5;
    const top = frame.y - frame.height * 0.5;
    const bottom = frame.y + frame.height * 0.5;
    return [
      { corner: "top-left", x: left, y: top },
      { corner: "top-right", x: right, y: top },
      { corner: "bottom-right", x: right, y: bottom },
      { corner: "bottom-left", x: left, y: bottom },
    ];
  }

  function getPortalLayerToggleRect(frame) {
    return { x: frame.x, y: frame.y + frame.height * 0.5 + 18, width: 58, height: 20 };
  }

  function findPortalLayerToggleAt(clientX, clientY) {
    if (state.hidePlacementGrid) return null;
    const documentY = clientY + state.rawScrollY;
    const targetItems = [
      ...(interaction.selectedPortalItem ? [interaction.selectedPortalItem] : []),
      ...state.portalImages.filter((item) => item !== interaction.selectedPortalItem).reverse(),
    ];
    for (const item of targetItems) {
      if (!item?.mesh || (item.reveal?.progress ?? 0) <= 0.02) continue;
      const button = getPortalLayerToggleRect(getPortalItemInteractiveFrame(item));
      const inside =
        clientX >= button.x - button.width * 0.5 &&
        clientX <= button.x + button.width * 0.5 &&
        documentY >= button.y - button.height * 0.5 &&
        documentY <= button.y + button.height * 0.5;
      if (inside) return item;
    }
    return null;
  }

  function togglePortalItemLayer(item) {
    item.layer = item.layer === "front" ? "back" : "front";
    if (item.manualPlacement) item.manualPlacement.layer = item.layer;
    interaction.selectedPortalItem = item;
    syncPortalConfigExport();
  }

  function findPortalItemAt(clientX, clientY) {
    if (state.hidePlacementGrid) return null;
    const documentY = clientY + state.rawScrollY;
    return [...state.portalImages].reverse().find((item) => {
      if (!item.mesh || (item.reveal?.progress ?? 0) <= 0.02) return false;
      const frame = getPortalItemInteractiveFrame(item);
      return clientX >= frame.x - frame.width * 0.5 && clientX <= frame.x + frame.width * 0.5 &&
        documentY >= frame.y - frame.height * 0.5 && documentY <= frame.y + frame.height * 0.5;
    });
  }

  function findPortalResizeHandleAt(clientX, clientY) {
    if (state.hidePlacementGrid) return null;
    const documentY = clientY + state.rawScrollY;
    for (const item of [...state.portalImages].reverse()) {
      if (!item.mesh || (item.reveal?.progress ?? 0) <= 0.02) continue;
      const frame = getPortalItemInteractiveFrame(item);
      const corners = getPortalFrameCorners(frame);
      const directCorner = corners.find((point) => Math.hypot(clientX - point.x, documentY - point.y) <= 22);
      if (directCorner) return { item, corner: directCorner.corner };
      const inside = clientX >= frame.x - frame.width * 0.5 && clientX <= frame.x + frame.width * 0.5 &&
        documentY >= frame.y - frame.height * 0.5 && documentY <= frame.y + frame.height * 0.5;
      if (inside) {
        const nearest = corners.reduce((best, point) => {
          const distance = Math.hypot(clientX - point.x, documentY - point.y);
          if (!best || distance < best.distance) return { point, distance };
          return best;
        }, null)?.point;
        if (nearest) return { item, corner: nearest.corner, hoverOnly: true };
      }
    }
    return null;
  }

  function snapPortalItemToEvent(item, event) {
    const currentSpan = item.manualPlacement?.span || (item.index === 0 ? { columns: 1, rows: 1 } : { columns: 2, rows: 2 });
    const span = event.altKey ? { columns: 1, rows: 1 } : event.shiftKey ? { columns: 2, rows: 2 } : currentSpan;
    const block = getNearestAvailablePlacementBlock(event.clientX, event.clientY + state.rawScrollY, span, item);
    if (!block) return;
    const frame = getPortalFrameForBlock(block, item, item.manualPlacement?.stretched);
    item.width = frame.width;
    item.height = frame.height;
    item.manualPlacement = {
      x: block.cx, y: block.cy - state.height * 0.18, layer: item.layer,
      span: block.span, stretched: Boolean(item.manualPlacement?.stretched),
      cell: { gapIndex: block.gapIndex, column: block.column, row: block.row, label: block.label },
    };
    item.x = item.manualPlacement.x;
    item.y = item.manualPlacement.y;
    item.layoutBlock = block;
    item.layoutFrame = frame;
    syncPortalConfigExport();
  }

  function resizePortalItemToEvent(item, event, corner = "bottom-left") {
    const currentBlock = item.layoutBlock;
    if (!currentBlock) return;
    const targetCell = getNearestPlacementCellInGap(event.clientX, event.clientY + state.rawScrollY, currentBlock.gapIndex);
    if (!targetCell) return;
    const currentLeft = currentBlock.column;
    const currentRight = currentBlock.column + currentBlock.span.columns - 1;
    const currentTop = currentBlock.row;
    const currentBottom = currentBlock.row + currentBlock.span.rows - 1;
    const nextLeft = corner.includes("left") ? clamp(Math.min(targetCell.column, currentRight), 0, currentRight) : currentLeft;
    const nextRight = corner.includes("right") ? clamp(Math.max(targetCell.column, currentLeft), currentLeft, placementColumns - 1) : currentRight;
    const nextTop = corner.includes("top") ? clamp(Math.min(targetCell.row, currentBottom), 0, currentBottom) : currentTop;
    const nextBottom = corner.includes("bottom") ? clamp(Math.max(targetCell.row, currentTop), currentTop, placementRows - 1) : currentBottom;
    const span = { columns: clamp(nextRight - nextLeft + 1, 1, placementColumns), rows: clamp(nextBottom - nextTop + 1, 1, placementRows) };
    const originCell = getPlacementGridCells().find((cell) => cell.gapIndex === currentBlock.gapIndex && cell.column === nextLeft && cell.row === nextTop);
    if (!originCell) return;
    const block = getPlacementBlock(originCell, span);
    if (!block || !blockIsAvailable(item, block, getPlacedPortalFrames(item))) return;
    const frame = getPortalFrameForBlock(block, item, true);
    item.width = frame.width;
    item.height = frame.height;
    item.x = block.cx;
    item.y = block.cy - state.height * 0.18;
    item.layoutBlock = block;
    item.layoutFrame = frame;
    item.manualPlacement = {
      x: item.x, y: item.y, layer: item.layer, span: block.span, stretched: true,
      cell: { gapIndex: block.gapIndex, column: block.column, row: block.row, label: block.label },
    };
    syncPortalConfigExport();
  }

  function onPointerDown(event) {
    if (event.target.closest?.(".controls, .controls-toggle, .path-controls-toggle, .path-editor")) return;
    if (state.hidePlacementGrid) return;
    const layerToggleItem = findPortalLayerToggleAt(event.clientX, event.clientY);
    if (layerToggleItem) {
      togglePortalItemLayer(layerToggleItem);
      event.preventDefault();
      return;
    }
    const resizeHandle = findPortalResizeHandleAt(event.clientX, event.clientY);
    if (resizeHandle && !resizeHandle.hoverOnly) {
      interaction.selectedPortalItem = resizeHandle.item;
      interaction.activePortalDrag = { item: resizeHandle.item, corner: resizeHandle.corner, mode: "resize" };
      traceViewport?.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    const item = findPortalItemAt(event.clientX, event.clientY);
    if (!item) return;
    interaction.selectedPortalItem = item;
    interaction.activePortalDrag = { item, mode: "move" };
    snapPortalItemToEvent(item, event);
    traceViewport?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!interaction.activePortalDrag) {
      if (state.hidePlacementGrid) {
        interaction.hoveredPortalCorner = null;
        traceViewport.style.cursor = "";
        return;
      }
      interaction.hoveredPortalCorner = findPortalResizeHandleAt(event.clientX, event.clientY);
      const layerToggleItem = findPortalLayerToggleAt(event.clientX, event.clientY);
      traceViewport.style.cursor = layerToggleItem
        ? "pointer"
        : interaction.hoveredPortalCorner
          ? (interaction.hoveredPortalCorner.corner.includes("left") === interaction.hoveredPortalCorner.corner.includes("top") ? "nwse-resize" : "nesw-resize")
          : "";
      return;
    }
    if (interaction.activePortalDrag.mode === "resize") resizePortalItemToEvent(interaction.activePortalDrag.item, event, interaction.activePortalDrag.corner);
    else snapPortalItemToEvent(interaction.activePortalDrag.item, event);
    event.preventDefault();
  }

  function onPointerUp() {
    interaction.activePortalDrag = null;
    interaction.hoveredPortalCorner = null;
    traceViewport.style.cursor = "";
  }

  return {
    getPortalItemInteractiveFrame,
    getPortalFrameCorners,
    getPortalLayerToggleRect,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}

import { PLACEMENT_GRID_COLUMNS, PLACEMENT_GRID_ROWS, PORTAL_NARROW_LAYOUT_MAX } from "./traceConfig.js";

// Owns portal editor guides, resize handles, layer toggle drawing, and config export.
export function createPortalEditorController({
  state,
  ctx,
  bottomCtx,
  interaction,
  getPortalItemInteractiveFrame,
  getPortalFrameCorners,
  getPortalLayerToggleRect,
  portalConfigExport,
}) {
  function getConfig() {
    return {
      grid: { columns: PLACEMENT_GRID_COLUMNS, rows: PLACEMENT_GRID_ROWS },
      images: state.portalImages.map((item) => ({
        index: item.index,
        src: item.src?.split("/").pop() || item.src,
        layer: item.layer,
        x: Number(item.x.toFixed(2)),
        y: Number(item.y.toFixed(2)),
        documentY: Number((item.y + state.height * 0.18).toFixed(2)),
        width: Number(item.width.toFixed(2)),
        height: Number(item.height.toFixed(2)),
        aspect: Number((item.aspect || 1).toFixed(4)),
        cell: item.layoutBlock
          ? {
              gapIndex: item.layoutBlock.gapIndex,
              column: item.layoutBlock.column,
              row: item.layoutBlock.row,
              label: item.layoutBlock.label,
            }
          : item.manualPlacement?.cell || null,
        span: item.layoutBlock?.span || item.manualPlacement?.span || null,
        stretched: Boolean(item.manualPlacement?.stretched),
      })),
    };
  }

  function syncConfigExport() {
    if (!portalConfigExport) return;
    portalConfigExport.value = JSON.stringify(getConfig(), null, 2);
  }

  async function copyConfig() {
    syncConfigExport();
    const text = portalConfigExport?.value || "";
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      portalConfigExport?.select?.();
    }
  }

  function drawPlacementGrid() {
    if (state.hidePlacementGrid || !state.anchors.length) return;
    const mobile = state.width <= PORTAL_NARROW_LAYOUT_MAX;
    const columns = mobile ? 1 : PLACEMENT_GRID_COLUMNS;
    const rows = mobile ? 10 : PLACEMENT_GRID_ROWS;
    const left = mobile ? 10 : state.width * 0.08;
    const width = mobile ? Math.max(1, state.width - 20) : state.width * 0.84;
    const padY = state.fontSize * 0.55;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.font = "500 10px Geist, Helvetica, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    for (let index = 0; index < state.anchors.length - 1; index += 1) {
      const from = state.anchors[index];
      const to = state.anchors[index + 1];
      const top = Math.min(from.y, to.y) + state.height * 0.18 + padY;
      const bottom = Math.max(from.y, to.y) + state.height * 0.18 - padY;
      const height = bottom - top;
      if (height <= 40) continue;
      const screenTop = top - state.rawScrollY;
      const screenBottom = bottom - state.rawScrollY;
      if (screenBottom < -80 || screenTop > state.height + 80) continue;

      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(left, top, width, height);
      ctx.globalAlpha = 0.14;
      for (let column = 1; column < columns; column += 1) {
        const x = left + (width * column) / columns;
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
      }
      for (let row = 1; row < rows; row += 1) {
        const y = top + (height * row) / rows;
        ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + width, y); ctx.stroke();
      }
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${from.letter}-${to.letter}`, left + 8, top + 8);
    }
    ctx.restore();
  }

  function drawLayerToggle(item, frame) {
    const button = getPortalLayerToggleRect(frame);
    const screenY = button.y - state.rawScrollY;
    if (screenY < -32 || screenY > state.height + 32) return;
    const isFront = item.layer === "front";
    bottomCtx.save();
    bottomCtx.globalAlpha = 0.9;
    bottomCtx.fillStyle = isFront ? "#ffffff" : "#d8d7d2";
    bottomCtx.strokeStyle = "#000000";
    bottomCtx.lineWidth = 1.5;
    bottomCtx.fillRect(button.x - button.width * 0.5, button.y - button.height * 0.5, button.width, button.height);
    bottomCtx.strokeRect(button.x - button.width * 0.5, button.y - button.height * 0.5, button.width, button.height);
    bottomCtx.fillStyle = "#000000";
    bottomCtx.font = "700 9px Geist, Helvetica, Arial, sans-serif";
    bottomCtx.textAlign = "center";
    bottomCtx.textBaseline = "middle";
    bottomCtx.fillText(isFront ? "BACK" : "FRONT", button.x, button.y + 0.5);
    bottomCtx.restore();
  }

  function drawResizeHandles() {
    if (state.hidePlacementGrid) return;
    bottomCtx.save();
    bottomCtx.setLineDash([]);
    const activeResize = interaction.activePortalDrag?.mode === "resize" ? interaction.activePortalDrag : null;
    const handleTarget = activeResize || interaction.hoveredPortalCorner || (interaction.selectedPortalItem ? { item: interaction.selectedPortalItem } : null);
    if (handleTarget?.item?.mesh && (handleTarget.item.reveal?.progress ?? 0) > 0.02) {
      const frame = getPortalItemInteractiveFrame(handleTarget.item);
      getPortalFrameCorners(frame).forEach((corner) => {
        const screenY = corner.y - state.rawScrollY;
        if (screenY < -24 || screenY > state.height + 24) return;
        const isActive = corner.corner === handleTarget.corner;
        bottomCtx.globalAlpha = isActive ? 0.96 : 0.62;
        bottomCtx.fillStyle = isActive ? "#ffffff" : "#d8d7d2";
        bottomCtx.strokeStyle = "#000000";
        bottomCtx.lineWidth = isActive ? 2.5 : 1.5;
        bottomCtx.beginPath(); bottomCtx.arc(corner.x, corner.y, 7, 0, Math.PI * 2); bottomCtx.fill(); bottomCtx.stroke();
      });
      drawLayerToggle(handleTarget.item, frame);
    }
    bottomCtx.restore();
  }

  return { getConfig, syncConfigExport, copyConfig, drawPlacementGrid, drawResizeHandles };
}

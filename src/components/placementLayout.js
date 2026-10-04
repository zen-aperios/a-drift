import { clamp } from "./traceMath.js";
import { PORTAL_NARROW_LAYOUT_MAX, TRACE_NARROW_LAYOUT_MAX } from "./traceConfig.js";

// Owns placement-grid geometry, spans, and collision checks for portal media.
// It has no DOM or rendering work; callers provide the current state snapshot.
export function createPlacementLayout({ state, columns, rows, getPortalItemDocumentFrame }) {
  function getGridSize() {
    const mobile = state.width <= PORTAL_NARROW_LAYOUT_MAX;
    return {
      columns: mobile ? 1 : columns,
      rows: mobile ? 10 : rows,
    };
  }

  function getPlacementGridCells() {
    if (!state.anchors.length) return [];
    const mobile = state.width <= PORTAL_NARROW_LAYOUT_MAX;
    const left = mobile ? 10 : state.width * 0.08;
    const width = mobile ? Math.max(1, state.width - 20) : state.width * 0.84;
    const padY = state.fontSize * 0.55;
    const grid = getGridSize();
    const cells = [];

    for (let gapIndex = 0; gapIndex < state.anchors.length - 1; gapIndex += 1) {
      const from = state.anchors[gapIndex];
      const to = state.anchors[gapIndex + 1];
      const top = Math.min(from.y, to.y) + state.height * 0.18 + padY;
      const bottom = Math.max(from.y, to.y) + state.height * 0.18 - padY;
      const height = bottom - top;
      if (height <= 40) continue;

      for (let row = 0; row < grid.rows; row += 1) {
        for (let column = 0; column < grid.columns; column += 1) {
          const x1 = left + (width * column) / grid.columns;
          const x2 = left + (width * (column + 1)) / grid.columns;
          const y1 = top + (height * row) / grid.rows;
          const y2 = top + (height * (row + 1)) / grid.rows;
          cells.push({
            gapIndex, column, row, label: `${from.letter}-${to.letter}`,
            x1, x2, y1, y2, cx: (x1 + x2) * 0.5, cy: (y1 + y2) * 0.5,
          });
        }
      }
    }
    return cells;
  }

  function getNearestPlacementCell(x, documentY) {
    return getPlacementGridCells().reduce((nearest, cell) => {
      const distance = Math.hypot(cell.cx - x, cell.cy - documentY);
      return !nearest || distance < nearest.distance ? { cell, distance } : nearest;
    }, null)?.cell || null;
  }

  function getNearestPlacementCellInGap(x, documentY, gapIndex) {
    return getPlacementGridCells()
      .filter((cell) => cell.gapIndex === gapIndex)
      .reduce((nearest, cell) => {
        const distance = Math.hypot(cell.cx - x, cell.cy - documentY);
        return !nearest || distance < nearest.distance ? { cell, distance } : nearest;
      }, null)?.cell || null;
  }

  function getPlacementBlock(originCell, span = { columns: 1, rows: 1 }) {
    const grid = getGridSize();
    const colSpan = clamp(Math.round(span.columns || 1), 1, grid.columns);
    const rowSpan = clamp(Math.round(span.rows || 1), 1, grid.rows);
    const originColumn = clamp(originCell.column, 0, grid.columns - colSpan);
    const originRow = clamp(originCell.row, 0, grid.rows - rowSpan);
    const cells = getPlacementGridCells();
    const endCell = cells.find((cell) => cell.gapIndex === originCell.gapIndex && cell.column === originColumn + colSpan - 1 && cell.row === originRow + rowSpan - 1);
    const startCell = cells.find((cell) => cell.gapIndex === originCell.gapIndex && cell.column === originColumn && cell.row === originRow);
    if (!startCell || !endCell) return null;
    return {
      gapIndex: originCell.gapIndex, column: originColumn, row: originRow, label: originCell.label,
      span: { columns: colSpan, rows: rowSpan },
      x1: startCell.x1, y1: startCell.y1, x2: endCell.x2, y2: endCell.y2,
      width: endCell.x2 - startCell.x1, height: endCell.y2 - startCell.y1,
      cx: (startCell.x1 + endCell.x2) * 0.5, cy: (startCell.y1 + endCell.y2) * 0.5,
    };
  }

  function getNearestPlacementBlock(x, documentY, span) {
    return getPlacementGridCells().reduce((nearest, cell) => {
      const block = getPlacementBlock(cell, span);
      if (!block) return nearest;
      const distance = Math.hypot(block.cx - x, block.cy - documentY);
      return !nearest || distance < nearest.distance ? { block, distance } : nearest;
    }, null)?.block || null;
  }

  function getPortalFrameForBlock(block, item = null, stretched = false, autoHeight = false) {
    const aspect = Math.max(0.1, item?.aspect || 1);
    const responsive = state.width <= TRACE_NARROW_LAYOUT_MAX;
    const topAligned = autoHeight || state.width <= PORTAL_NARROW_LAYOUT_MAX;
    const width = responsive
      ? block.width
      : stretched || autoHeight
      ? block.width
      : Math.min(block.width, block.height * aspect);
    const height = responsive || autoHeight ? width / aspect : stretched ? block.height : width / aspect;
    const x = block.cx;
    const y = topAligned ? block.y1 + height * 0.5 : block.cy;
    return {
      x, y, width: responsive ? width : Math.max(40, width), height: responsive ? height : Math.max(40, height),
      left: x - width * 0.5, right: x + width * 0.5,
      top: y - height * 0.5, bottom: y + height * 0.5,
    };
  }

  function framesOverlap(a, b, gap = 50) {
    return !(a.right + gap < b.left || a.left > b.right + gap || a.bottom + gap < b.top || a.top > b.bottom + gap);
  }

  function getPlacedPortalFrames(exceptItem = null) {
    return state.portalImages
      .filter((item) => item !== exceptItem && item.width > 0 && item.height > 0)
      .map((item) => {
        const frame = getPortalItemDocumentFrame(item);
        return { left: frame.x - frame.width * 0.5, right: frame.x + frame.width * 0.5, top: frame.y - frame.height * 0.5, bottom: frame.y + frame.height * 0.5 };
      });
  }

  function blockIsAvailable(item, block, placedFrames) {
    const frame = getPortalFrameForBlock(block, item, item.manualPlacement?.stretched);
    return !placedFrames.some((placedFrame) => framesOverlap(frame, placedFrame));
  }

  function getNearestAvailablePlacementBlock(x, documentY, span, item, placedFrames = getPlacedPortalFrames(item)) {
    return getPlacementGridCells().reduce((nearest, cell) => {
      const block = getPlacementBlock(cell, span);
      if (!block || !blockIsAvailable(item, block, placedFrames)) return nearest;
      const distance = Math.hypot(block.cx - x, block.cy - documentY);
      return !nearest || distance < nearest.distance ? { block, distance } : nearest;
    }, null)?.block || null;
  }

  return {
    getPlacementGridCells,
    getNearestPlacementCell,
    getNearestPlacementCellInGap,
    getPlacementBlock,
    getNearestPlacementBlock,
    getPortalFrameForBlock,
    framesOverlap,
    getPlacedPortalFrames,
    blockIsAvailable,
    getNearestAvailablePlacementBlock,
  };
}

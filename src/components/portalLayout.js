import { clamp, lerp, seededRandom } from "./traceMath.js";

export function applyPortalLayout({ portalImages, anchors, segments, height, width, rowGapVh, heroWrap }) {
  if (!portalImages.length || !anchors.length) return;
  const targetWidth = clamp(heroWrap.width * 0.42, width * 0.22, width * 0.44);
  const padY = 160 * 0.55;
  const gapCount = Math.max(1, anchors.length - 1);
  const columns = [2, 0, 4, 1, 3];
  const rows = [1, 0, 2];
  const gridLeft = width * 0.08;
  const gridWidth = width * 0.84;
  const columnCount = 5;
  const rowCount = 3;

  portalImages.forEach((item, index) => {
    const gapIndex = index % gapCount;
    const from = anchors[gapIndex];
    const to = anchors[gapIndex + 1] || anchors[gapIndex];
    const gapTop = Math.min(from.y, to.y) + padY;
    const gapBottom = Math.max(from.y, to.y) - padY;
    const gapHeight = Math.max(80, gapBottom - gapTop);
    const column = columns[index % columns.length];
    const row = rows[Math.floor(index / gapCount) % rows.length];
    const cellX1 = gridLeft + (gridWidth * column) / columnCount;
    const cellX2 = gridLeft + (gridWidth * (column + 1)) / columnCount;
    const cellY1 = gapTop + (gapHeight * row) / rowCount;
    const cellY2 = gapTop + (gapHeight * (row + 1)) / rowCount;
    item.x = clamp((cellX1 + cellX2) * 0.5, width * 0.12, width * 0.88);
    item.y = (cellY1 + cellY2) * 0.5;
    const featuredScale = index === 0 ? 1.2 : index === 1 ? 1.1 : 1;
    const cellWidth = cellX2 - cellX1;
    const cellHeight = cellY2 - cellY1;
    const randomWidth = targetWidth * lerp(0.86, 1.18, seededRandom(index, 4)) * featuredScale;
    const maxCellWidth = cellWidth * 0.88;
    const maxCellHeightWidth = cellHeight * Math.max(0.1, item.aspect) * 0.88;
    item.width = Math.min(randomWidth, maxCellWidth, maxCellHeightWidth);
    item.height = item.width / Math.max(0.1, item.aspect);
    item.layer = index === 0 || index % 4 === 2 || index % 5 === 0 ? "front" : "back";

    if (item.manualPlacement) {
      item.x = item.manualPlacement.x;
      item.y = item.manualPlacement.y;
      item.layer = item.manualPlacement.layer || item.layer;
    }
  });
}

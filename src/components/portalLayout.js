import { clamp, lerp, seededRandom } from "./traceMath.js";

export function applyPortalLayout({ portalImages, anchors, segments, height, width, rowGapVh, heroWrap }) {
  if (!portalImages.length || !anchors.length) return;
  const gap = height * (rowGapVh / 100);
  const targetWidth = clamp(heroWrap.width * 0.42, width * 0.22, width * 0.44);
  const firstSegment = segments[0];
  const firstPoints = firstSegment?.points || [];
  const firstMiddle = firstPoints[Math.floor(firstPoints.length * 0.5)] || anchors[1] || anchors[0];
  const lowerStart = firstMiddle.y + gap * 0.72;
  const lowerEnd = (anchors[anchors.length - 1]?.y || lowerStart + gap * 3) - gap * 0.18;
  const remaining = Math.max(1, portalImages.length - 1);
  const columns = [-0.7, 0.7, 0, -1.05, 1.05];

  portalImages.forEach((item, index) => {
    const forceTrailCenter = index === 5;
    const column = forceTrailCenter ? 0 : columns[index % columns.length];
    const rowT = index === 0 ? 0 : (index - 1) / Math.max(1, remaining - 1);
    const rowY = index === 0 ? firstMiddle.y : lerp(lowerStart, lowerEnd, rowT);
    const pathSegmentIndex = clamp(Math.round(rowT * Math.max(0, segments.length - 1)), 0, Math.max(0, segments.length - 1));
    const segment = segments[forceTrailCenter ? 3 : pathSegmentIndex];
    const points = segment?.points || [];
    const pathPoint =
      index === 0
        ? firstMiddle
        : points[Math.floor((forceTrailCenter ? 0.5 : lerp(0.28, 0.72, seededRandom(index, 7))) * Math.max(0, points.length - 1))] ||
          anchors[Math.min(index, anchors.length - 1)] ||
          anchors[0];
    const sideOffset = column * clamp(heroWrap.width * 0.36, 170, width * 0.38);
    const jitterX = index === 0 || forceTrailCenter ? 0 : lerp(-0.08, 0.08, seededRandom(index, 8)) * heroWrap.width;
    const jitterY = index === 0 || forceTrailCenter ? 0 : lerp(-0.14, 0.14, seededRandom(index, 9)) * gap;

    item.x = clamp(pathPoint.x + sideOffset + jitterX, width * 0.12, width * 0.88);
    item.y = forceTrailCenter ? pathPoint.y : rowY + jitterY;
    item.width = targetWidth * lerp(0.86, 1.18, seededRandom(index, 4));
    item.height = item.width / Math.max(0.1, item.aspect);
    item.layer = index === 0 || index % 4 === 2 || index % 5 === 0 ? "front" : "back";
  });
}

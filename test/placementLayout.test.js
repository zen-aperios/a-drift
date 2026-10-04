import test from "node:test";
import assert from "node:assert/strict";
import { createPlacementLayout } from "../src/components/placementLayout.js";

const block = { width: 600, height: 900, cx: 400, cy: 650, y1: 200 };

function layout(width) {
  return createPlacementLayout({ state: { width }, columns: 6, rows: 5 });
}

test("responsive portal images fill their width and derive height from aspect ratio", () => {
  for (const viewport of [501, 820]) {
    for (const aspect of [0.25, 0.75, 1, 2]) {
      const frame = layout(viewport).getPortalFrameForBlock(block, { aspect }, true);
      assert.equal(frame.width, block.width);
      assert.equal(frame.height, block.width / aspect);
      assert.equal(frame.width / frame.height, aspect);
      assert.equal(frame.x, block.cx);
      assert.equal(frame.y, viewport <= 500 ? block.y1 + frame.height / 2 : block.cy);
      assert.equal(frame.right - frame.left, frame.width);
      assert.equal(frame.bottom - frame.top, frame.height);
    }
  }
});

test("images at 500px and below cap height at 450px without stretching", () => {
  for (const viewport of [320, 500]) {
    for (const aspect of [0.25, 0.75, 1, 2]) {
      const frame = layout(viewport).getPortalFrameForBlock(block, { aspect }, true);
      assert.equal(frame.width, Math.min(block.width, 450 * aspect));
      assert.equal(frame.height, frame.width / aspect);
      assert.ok(frame.height <= 450);
      assert.equal(frame.x, block.cx);
      assert.equal(frame.top, block.y1);
    }
  }
});

test("mobile collision checks use the same frame as final auto-height placement", () => {
  const placement = layout(390);
  assert.deepEqual(
    placement.getPortalFrameForBlock(block, { aspect: 0.75 }, true),
    placement.getPortalFrameForBlock(block, { aspect: 0.75 }, false, true),
  );
});

test("desktop stretched portal frames retain their configured dimensions", () => {
  const frame = layout(821).getPortalFrameForBlock(block, { aspect: 0.75 }, true);
  assert.equal(frame.width, block.width);
  assert.equal(frame.height, block.height);
  assert.equal(frame.y, block.cy);
});

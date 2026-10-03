export const LETTERS = "APERIOS".split("");
export const BOTTOM_VIDEO_URL = new URL("../assets/video/logofolio-web.mp4", import.meta.url).href;
export const PLACEMENT_GRID_COLUMNS = 6;
export const PLACEMENT_GRID_ROWS = 5;
export const TRACE_NARROW_LAYOUT_MAX = 820;
export const PORTAL_NARROW_LAYOUT_MAX = 500;
export const APERIOS_WIDE_LAYOUT_MAX = 1220;
export const ALPHABET_LETTERS = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  ...Array.from({ length: 10 }, (_, index) => `${index + 1}`),
];

export const INITIAL_PORTAL_IMAGE_LAYOUT = [
  { layer: "back", cell: { gapIndex: 0, column: 3, row: 1, label: "A-P" }, span: { columns: 3, rows: 3 }, stretched: true },
  { layer: "back", cell: { gapIndex: 1, column: 0, row: 0, label: "P-E" }, span: { columns: 3, rows: 3 }, stretched: true },
  { layer: "back", cell: { gapIndex: 1, column: 5, row: 1, label: "P-E" }, span: { columns: 1, rows: 4 }, stretched: true },
  { layer: "back", cell: { gapIndex: 2, column: 0, row: 2, label: "E-R" }, span: { columns: 2, rows: 3 }, stretched: true },
  { layer: "back", cell: { gapIndex: 2, column: 3, row: 0, label: "E-R" }, span: { columns: 3, rows: 3 }, stretched: true },
  { layer: "front", cell: { gapIndex: 3, column: 0, row: 0, label: "R-I" }, span: { columns: 3, rows: 3 }, stretched: true },
  { layer: "back", cell: { gapIndex: 3, column: 4, row: 1, label: "R-I" }, span: { columns: 2, rows: 4 }, stretched: true },
  { layer: "back", cell: { gapIndex: 5, column: 0, row: 0, label: "O-S" }, span: { columns: 3, rows: 3 }, stretched: true },
  { layer: "back", cell: { gapIndex: 4, column: 2, row: 0, label: "I-O" }, span: { columns: 3, rows: 3 }, stretched: true },
  { layer: "back", cell: { gapIndex: 5, column: 4, row: 1, label: "O-S" }, span: { columns: 2, rows: 4 }, stretched: true },
];

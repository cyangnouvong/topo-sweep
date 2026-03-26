// Goal - given a 2D grid of height values [0, 1], find the line segments that trace out the contour at a given iso-level (height threshold).
// Algorithm processes the grid one 2x2 cell at a time.
// For each square, look at the four corner heights and determine which corners are above the iso-level threshold and which are below
// 1 for above and 0 for below (16 possible combinations, 2^4). Each combination tells you a different way the contour line could pass through the cell.

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Each entry maps a corner bitmask (1–14) to one or two pairs of edge indices.
// Edge indices: 0 = top, 1 = right, 2 = bottom, 3 = left
// (Cases 0 and 15 are skipped — all corners below or all above the iso-level.)
const MS_TABLE: Record<number, [number, number][]> = {
  1: [[3, 2]],
  2: [[2, 1]],
  3: [[3, 1]],
  4: [[1, 0]],
  5: [
    [3, 0],
    [1, 2],
  ], // saddle case
  6: [[2, 0]],
  7: [[3, 0]],
  8: [[0, 3]],
  9: [[0, 2]],
  10: [
    [0, 1],
    [3, 2],
  ], // saddle case
  11: [[0, 1]],
  12: [[1, 3]],
  13: [[1, 2]],
  14: [[2, 3]],
};

// Linear interpolation: finds where the iso-level crosses between two height values
const lerp = (iso: number, a: number, b: number): number =>
  Math.abs(b - a) < 1e-8 ? 0 : (iso - a) / (b - a);

/**
 * Runs Marching Squares on a flat Float32Array heightmap and returns all line
 * segments that lie on the given iso-level contour.
 *
 * @param map       Flat [gridSize × gridSize] heightmap, values in [0, 1]
 * @param gridSize  Width/height of the grid
 * @param isoLevel  The height threshold to trace (0–1)
 */
export function marchingSquares(
  map: Float32Array,
  gridSize: number,
  isoLevel: number
): Segment[] {
  const segments: Segment[] = [];

  for (let y = 0; y < gridSize - 1; y++) {
    for (let x = 0; x < gridSize - 1; x++) {
      const tl = map[y * gridSize + x];
      const tr = map[y * gridSize + (x + 1)];
      const br = map[(y + 1) * gridSize + (x + 1)];
      const bl = map[(y + 1) * gridSize + x];

      // Build a 4-bit index: one bit per corner, set if the corner is above the iso-level
      const idx =
        (tl >= isoLevel ? 8 : 0) |
        (tr >= isoLevel ? 4 : 0) |
        (br >= isoLevel ? 2 : 0) |
        (bl >= isoLevel ? 1 : 0);

      if (idx === 0 || idx === 15) continue; // fully below or fully above — no crossing

      // Interpolated crossing points on each edge
      const edgePoints = [
        { x: x + lerp(isoLevel, tl, tr), y: y }, // top
        { x: x + 1, y: y + lerp(isoLevel, tr, br) }, // right
        { x: x + lerp(isoLevel, bl, br), y: y + 1 }, // bottom
        { x: x, y: y + lerp(isoLevel, tl, bl) }, // left
      ];

      for (const [a, b] of MS_TABLE[idx] ?? []) {
        const pa = edgePoints[a];
        const pb = edgePoints[b];
        segments.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y });
      }
    }
  }

  return segments;
}

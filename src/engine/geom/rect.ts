import type { MultiPolygon, Ring, Vec2 } from "../types";

export interface LargestRectOptions {
  cell?: number;
  minSide?: number;
  maxDepth?: number;
  maxLength?: number;
}

export interface LargestRectResult {
  ring: Ring;
  width: number;
  depth: number;
  area: number;
}

function segmentIntersectsBox(
  ua: number,
  va: number,
  ub: number,
  vb: number,
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number
): boolean {
  const du = ub - ua;
  const dv = vb - va;

  let tu0 = 0;
  let tu1 = 1;
  if (Math.abs(du) < 1e-12) {
    if (ua < xMin || ua > xMax) return false;
  } else {
    const invDu = 1 / du;
    const t1 = (xMin - ua) * invDu;
    const t2 = (xMax - ua) * invDu;
    tu0 = t1 < t2 ? t1 : t2;
    tu1 = t1 < t2 ? t2 : t1;
  }

  let tv0 = 0;
  let tv1 = 1;
  if (Math.abs(dv) < 1e-12) {
    if (va < yMin || va > yMax) return false;
  } else {
    const invDv = 1 / dv;
    const t1 = (yMin - va) * invDv;
    const t2 = (yMax - va) * invDv;
    tv0 = t1 < t2 ? t1 : t2;
    tv1 = t1 < t2 ? t2 : t1;
  }

  const tEnter = Math.max(0, tu0, tv0);
  const tExit = Math.min(1, tu1, tv1);
  return tEnter <= tExit;
}

/**
 * Find the largest inscribed rectangle oriented at `angleRad` inside `mp`.
 * "length" (`width` in output) is along `angleRad`; "depth" is perpendicular.
 */
export function largestRect(
  mp: MultiPolygon,
  angleRad: number,
  opts: LargestRectOptions = {}
): LargestRectResult | null {
  if (!mp || mp.length === 0) return null;

  const cell = opts.cell !== undefined && opts.cell > 0 ? opts.cell : 0.5;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Rotate vertices by -angleRad: u = x*cos + y*sin, v = -x*sin + y*cos
  let uMin = Infinity;
  let vMin = Infinity;
  let uMax = -Infinity;
  let vMax = -Infinity;

  // Flat edge array [ua, va, ub, vb, ...]
  const edges: number[] = [];

  for (let pIdx = 0; pIdx < mp.length; pIdx++) {
    const poly = mp[pIdx];
    for (let rIdx = 0; rIdx < poly.length; rIdx++) {
      const ring = poly[rIdx];
      const n = ring.length;
      if (n < 3) continue;

      let prevU = ring[n - 1][0] * cos + ring[n - 1][1] * sin;
      let prevV = -ring[n - 1][0] * sin + ring[n - 1][1] * cos;

      for (let i = 0; i < n; i++) {
        const x = ring[i][0];
        const y = ring[i][1];
        const u = x * cos + y * sin;
        const v = -x * sin + y * cos;

        if (u < uMin) uMin = u;
        if (u > uMax) uMax = u;
        if (v < vMin) vMin = v;
        if (v > vMax) vMax = v;

        edges.push(prevU, prevV, u, v);
        prevU = u;
        prevV = v;
      }
    }
  }

  if (!Number.isFinite(uMin) || edges.length === 0) return null;

  const cols = Math.floor((uMax - uMin + 1e-7) / cell);
  const rows = Math.floor((vMax - vMin + 1e-7) / cell);
  if (cols <= 0 || rows <= 0) return null;

  const minCols = opts.minSide !== undefined ? Math.ceil((opts.minSide - 1e-7) / cell) : 1;
  const minRows = opts.minSide !== undefined ? Math.ceil((opts.minSide - 1e-7) / cell) : 1;
  const maxCols =
    opts.maxLength !== undefined ? Math.min(cols, Math.floor((opts.maxLength + 1e-7) / cell)) : cols;
  const maxRows =
    opts.maxDepth !== undefined ? Math.min(rows, Math.floor((opts.maxDepth + 1e-7) / cell)) : rows;

  if (maxCols < minCols || maxRows < minRows || maxCols <= 0 || maxRows <= 0) {
    return null;
  }

  const grid = new Uint8Array(rows * cols);
  const invCell = 1 / cell;
  const numEdges = edges.length;

  // Phase 1: Horizontal scanline fill at each row center
  const uInts: number[] = [];
  for (let r = 0; r < rows; r++) {
    const vc = vMin + (r + 0.5) * cell;
    uInts.length = 0;

    for (let e = 0; e < numEdges; e += 4) {
      const ua = edges[e];
      const va = edges[e + 1];
      const ub = edges[e + 2];
      const vb = edges[e + 3];

      if ((va <= vc && vb > vc) || (vb <= vc && va > vc)) {
        const uInt = ua + ((vc - va) / (vb - va)) * (ub - ua);
        uInts.push(uInt);
      }
    }

    if (uInts.length < 2) continue;
    uInts.sort((a, b) => a - b);

    const rowOffset = r * cols;
    for (let k = 0; k + 1 < uInts.length; k += 2) {
      const uLeft = uInts[k];
      const uRight = uInts[k + 1];
      const cStart = Math.max(0, Math.ceil((uLeft - uMin) * invCell - 0.5));
      const cEnd = Math.min(cols - 1, Math.floor((uRight - uMin) * invCell - 0.5));
      for (let c = cStart; c <= cEnd; c++) {
        grid[rowOffset + c] = 1;
      }
    }
  }

  // Phase 2: Clear any cell whose open interior is crossed by a polygon edge
  const eps = 1e-5 * cell;
  for (let e = 0; e < numEdges; e += 4) {
    const ua = edges[e];
    const va = edges[e + 1];
    const ub = edges[e + 2];
    const vb = edges[e + 3];

    const segUMin = ua < ub ? ua : ub;
    const segUMax = ua < ub ? ub : ua;
    const segVMin = va < vb ? va : vb;
    const segVMax = va < vb ? vb : va;

    const cMin = Math.max(0, Math.floor((segUMin - uMin + eps) * invCell));
    const cMax = Math.min(cols - 1, Math.floor((segUMax - uMin - eps) * invCell));
    const rMin = Math.max(0, Math.floor((segVMin - vMin + eps) * invCell));
    const rMax = Math.min(rows - 1, Math.floor((segVMax - vMin - eps) * invCell));

    for (let r = rMin; r <= rMax; r++) {
      const rowOffset = r * cols;
      const cellV0 = vMin + r * cell + eps;
      const cellV1 = cellV0 + cell - 2 * eps;
      for (let c = cMin; c <= cMax; c++) {
        if (grid[rowOffset + c] === 0) continue;
        const cellU0 = uMin + c * cell + eps;
        const cellU1 = cellU0 + cell - 2 * eps;
        if (segmentIntersectsBox(ua, va, ub, vb, cellU0, cellV0, cellU1, cellV1)) {
          grid[rowOffset + c] = 0;
        }
      }
    }
  }

  // Phase 3: Constrained maximal rectangle via histogram monotonic stack
  const heights = new Int32Array(cols);
  const stackCol = new Int32Array(cols + 1);
  const stackH = new Int32Array(cols + 1);

  let bestAreaCells = 0;
  let bestW = 0;
  let bestH = 0;
  let bestCol0 = 0;
  let bestRow0 = 0;

  for (let r = 0; r < rows; r++) {
    const rowOffset = r * cols;
    let top = 0;

    for (let c = 0; c <= cols; c++) {
      const h = c < cols ? (grid[rowOffset + c] ? (heights[c] += 1) : (heights[c] = 0)) : 0;
      let startCol = c;

      while (top > 0 && stackH[top - 1] > h) {
        top--;
        const poppedCol = stackCol[top];
        const poppedH = stackH[top];
        startCol = poppedCol;

        const availW = c - poppedCol;
        const availH = poppedH;
        const clampedW = availW < maxCols ? availW : maxCols;
        const clampedH = availH < maxRows ? availH : maxRows;

        if (clampedW >= minCols && clampedH >= minRows) {
          const areaCells = clampedW * clampedH;
          if (areaCells > bestAreaCells) {
            bestAreaCells = areaCells;
            bestW = clampedW;
            bestH = clampedH;
            bestCol0 = poppedCol + ((availW - clampedW) >> 1);
            bestRow0 = r - availH + 1 + ((availH - clampedH) >> 1);
          }
        }
      }

      if (h > 0 && (top === 0 || stackH[top - 1] < h)) {
        stackCol[top] = startCol;
        stackH[top] = h;
        top++;
      }
    }
  }

  if (bestAreaCells <= 0) return null;

  const u0 = uMin + bestCol0 * cell;
  const v0 = vMin + bestRow0 * cell;
  const width = bestW * cell;
  const depth = bestH * cell;
  const u1 = u0 + width;
  const v1 = v0 + depth;

  const toWorld = (u: number, v: number): Vec2 => {
    const x = u * cos - v * sin;
    const y = u * sin + v * cos;
    return [x === 0 ? 0 : x, y === 0 ? 0 : y];
  };

  const ring: Ring = [
    toWorld(u0, v0),
    toWorld(u1, v0),
    toWorld(u1, v1),
    toWorld(u0, v1),
  ];

  return {
    ring,
    width,
    depth,
    area: width * depth,
  };
}

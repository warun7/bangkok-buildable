import type { MultiPolygon, Polygon, Ring, Vec2 } from "../types";

const DUP_TOL = 1e-3; // 1 mm
const COLLINEAR_SIN_TOL = 1e-4; // sin(angle) tolerance for collinearity
const COLLINEAR_DIST_TOL = 1e-4; // 0.1 mm perpendicular offset tolerance

/**
 * Signed area of a ring via the shoelace formula (CCW > 0, CW < 0).
 */
export function ringArea(ring: Ring): number {
  const n = ring.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return 0.5 * sum;
}

/**
 * Area of a polygon (outer ring minus holes, always non-negative).
 */
export function polygonArea(p: Polygon): number {
  if (p.length === 0) return 0;
  let area = Math.abs(ringArea(p[0]));
  for (let i = 1; i < p.length; i++) {
    area -= Math.abs(ringArea(p[i]));
  }
  return Math.max(0, area);
}

/**
 * Total area of a MultiPolygon.
 */
export function multiArea(mp: MultiPolygon): number {
  let total = 0;
  for (let i = 0; i < mp.length; i++) {
    total += polygonArea(mp[i]);
  }
  return total;
}

function dist2D(a: Vec2, b: Vec2): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function isCollinear(prev: Vec2, curr: Vec2, next: Vec2): boolean {
  const ux = curr[0] - prev[0];
  const uy = curr[1] - prev[1];
  const vx = next[0] - curr[0];
  const vy = next[1] - curr[1];
  const lenU = Math.hypot(ux, uy);
  const lenV = Math.hypot(vx, vy);
  if (lenU < DUP_TOL || lenV < DUP_TOL) return true;

  const cross = Math.abs(ux * vy - uy * vx);
  if (cross <= 1e-9) return true;

  const sinTheta = cross / (lenU * lenV);
  if (sinTheta > COLLINEAR_SIN_TOL) return false;

  const wx = next[0] - prev[0];
  const wy = next[1] - prev[1];
  const lenW = Math.hypot(wx, wy);
  const perpDist = lenW > DUP_TOL ? cross / lenW : cross / Math.max(lenU, lenV);
  return perpDist <= COLLINEAR_DIST_TOL || sinTheta <= COLLINEAR_SIN_TOL;
}

/**
 * Normalise a ring:
 * - drop closing duplicate
 * - drop consecutive duplicates (< 1 mm)
 * - drop collinear vertices (within cross-product tolerance)
 * - enforce CCW orientation
 * Returns `{ ring, sourceEdge }` where `sourceEdge[i]` is the index of the
 * original edge in `ring` that normalised edge `i` lies on.
 */
export function normalizeRing(ring: Ring): { ring: Ring; sourceEdge: number[] } {
  if (ring.length === 0) {
    return { ring: [], sourceEdge: [] };
  }

  // 1. Strip closing duplicate(s) if the ring was explicitly closed
  let rawEnd = ring.length;
  while (rawEnd > 1 && dist2D(ring[0], ring[rawEnd - 1]) < DUP_TOL) {
    rawEnd--;
  }

  // Tag each vertex with the original edge index starting at that vertex
  let items: { pt: Vec2; edge: number }[] = [];
  for (let i = 0; i < rawEnd; i++) {
    items.push({ pt: [ring[i][0], ring[i][1]], edge: i });
  }

  // 2. Iteratively drop consecutive duplicates (< 1 mm) and collinear vertices
  let changed = true;
  while (changed && items.length >= 2) {
    changed = false;

    // Remove consecutive duplicates
    const deduped: { pt: Vec2; edge: number }[] = [items[0]];
    for (let i = 1; i < items.length; i++) {
      const prev = deduped[deduped.length - 1];
      const curr = items[i];
      if (dist2D(prev.pt, curr.pt) < DUP_TOL) {
        // The tiny edge `prev -> curr` vanishes; `prev` inherits `curr`'s outgoing edge
        prev.edge = curr.edge;
        changed = true;
      } else {
        deduped.push(curr);
      }
    }
    while (
      deduped.length > 1 &&
      dist2D(deduped[0].pt, deduped[deduped.length - 1].pt) < DUP_TOL
    ) {
      deduped.pop();
      changed = true;
    }
    items = deduped;

    if (items.length < 3) break;

    // Remove collinear vertices
    for (let i = 0; i < items.length; i++) {
      if (items.length < 3) break;
      const n = items.length;
      const prev = items[(i - 1 + n) % n];
      const curr = items[i];
      const next = items[(i + 1) % n];
      if (isCollinear(prev.pt, curr.pt, next.pt)) {
        items.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  if (items.length < 3) {
    return {
      ring: items.map((it) => it.pt),
      sourceEdge: items.map((it) => it.edge),
    };
  }

  const pts = items.map((it) => it.pt);
  const area = ringArea(pts);

  if (area < 0) {
    // Reverse to CCW while keeping vertex 0 at index 0
    const k = items.length;
    const ccwRing: Ring = [items[0].pt];
    for (let i = 1; i < k; i++) {
      ccwRing.push(items[k - i].pt);
    }
    const sourceEdge: number[] = [];
    for (let i = 0; i < k; i++) {
      sourceEdge.push(items[k - 1 - i].edge);
    }
    return { ring: ccwRing, sourceEdge };
  }

  return {
    ring: pts,
    sourceEdge: items.map((it) => it.edge),
  };
}

function pointToSegmentDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist2D(p, a);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
  const projX = a[0] + t * dx;
  const projY = a[1] + t * dy;
  return Math.hypot(p[0] - projX, p[1] - projY);
}

function orient2D(a: Vec2, b: Vec2, c: Vec2): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsIntersectOrTouch(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
  const eps = 1e-6;
  if (
    Math.max(a1[0], a2[0]) < Math.min(b1[0], b2[0]) - eps ||
    Math.max(b1[0], b2[0]) < Math.min(a1[0], a2[0]) - eps ||
    Math.max(a1[1], a2[1]) < Math.min(b1[1], b2[1]) - eps ||
    Math.max(b1[1], b2[1]) < Math.min(a1[1], a2[1]) - eps
  ) {
    return false;
  }

  if (
    pointToSegmentDist(a1, b1, b2) <= eps ||
    pointToSegmentDist(a2, b1, b2) <= eps ||
    pointToSegmentDist(b1, a1, a2) <= eps ||
    pointToSegmentDist(b2, a1, a2) <= eps
  ) {
    return true;
  }

  const d1 = orient2D(a1, a2, b1);
  const d2 = orient2D(a1, a2, b2);
  const d3 = orient2D(b1, b2, a1);
  const d4 = orient2D(b1, b2, a2);

  return d1 * d2 < 0 && d3 * d4 < 0;
}

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

/**
 * Validate a drawn plot ring.
 * Checks for:
 * - `too-few-points` (< 3 after normalising)
 * - `self-intersecting` (any two non-adjacent edges intersect or touch)
 * - `too-small` (< 50 m²)
 * - `too-large` (> 200,000 m²)
 * - `sliver` (area / perimeter² < 0.005)
 */
export function validatePlot(ring: Ring): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { ring: norm } = normalizeRing(ring);

  if (norm.length < 3) {
    issues.push({
      code: "too-few-points",
      message: "The plot needs at least 3 distinct corners to form a valid site.",
    });
    return { ok: false, issues };
  }

  const n = norm.length;
  let selfIntersecting = false;
  for (let i = 0; i < n && !selfIntersecting; i++) {
    const a1 = norm[i];
    const a2 = norm[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // adjacent across wrap-around
      const b1 = norm[j];
      const b2 = norm[(j + 1) % n];
      if (segmentsIntersectOrTouch(a1, a2, b1, b2)) {
        selfIntersecting = true;
        break;
      }
    }
  }

  if (selfIntersecting) {
    issues.push({
      code: "self-intersecting",
      message:
        "The plot boundary crosses or touches itself. Adjust the corners so the outline forms a single non-overlapping loop.",
    });
    return { ok: false, issues };
  }

  const area = Math.abs(ringArea(norm));
  let perimeter = 0;
  for (let i = 0; i < n; i++) {
    perimeter += edgeLength(norm, i);
  }

  if (area < 50) {
    issues.push({
      code: "too-small",
      message: `The plot area (${area.toFixed(1)} m²) is smaller than the 50 m² minimum buildable site size.`,
    });
  }

  if (area > 200_000) {
    issues.push({
      code: "too-large",
      message: `The plot area (${Math.round(area).toLocaleString()} m²) exceeds the 200,000 m² maximum single-site limit.`,
    });
  }

  if (perimeter > 0 && area / (perimeter * perimeter) < 0.005) {
    issues.push({
      code: "sliver",
      message:
        "The plot is extremely narrow or sliver-shaped (area / perimeter² < 0.005) and cannot accommodate a viable building footprint.",
    });
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

/**
 * Length of edge `i` in `ring` (from `ring[i]` to `ring[(i + 1) % ring.length]`),
 * or distance between two points `a` and `b`.
 */
export function edgeLength(ring: Ring, i: number): number;
export function edgeLength(a: Vec2, b: Vec2): number;
export function edgeLength(ringOrA: Ring | Vec2, iOrB: number | Vec2): number {
  if (typeof iOrB === "number") {
    const ring = ringOrA as Ring;
    const n = ring.length;
    if (n === 0) return 0;
    const idx = ((iOrB % n) + n) % n;
    const a = ring[idx];
    const b = ring[(idx + 1) % n];
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const a = ringOrA as Vec2;
  const b = iOrB as Vec2;
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/**
 * Unit normal pointing into the interior of a CCW ring for edge `i`.
 */
export function edgeNormalInward(ring: Ring, i: number): Vec2 {
  const n = ring.length;
  if (n < 2) return [0, 0];
  const idx = ((i % n) + n) % n;
  const a = ring[idx];
  const b = ring[(idx + 1) % n];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return [0, 0];
  const nx = -dy / len;
  const ny = dx / len;
  return [nx === 0 ? 0 : nx, ny === 0 ? 0 : ny];
}

/**
 * Area-weighted centroid of a MultiPolygon.
 */
export function centroid(mp: MultiPolygon): Vec2 {
  let totalWeight = 0;
  let sumX = 0;
  let sumY = 0;

  let fallbackCount = 0;
  let fallbackX = 0;
  let fallbackY = 0;

  for (let pIdx = 0; pIdx < mp.length; pIdx++) {
    const poly = mp[pIdx];
    for (let rIdx = 0; rIdx < poly.length; rIdx++) {
      const ring = poly[rIdx];
      const n = ring.length;
      if (n === 0) continue;

      let twiceArea = 0;
      let cx = 0;
      let cy = 0;
      for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        const cross = a[0] * b[1] - b[0] * a[1];
        twiceArea += cross;
        cx += (a[0] + b[0]) * cross;
        cy += (a[1] + b[1]) * cross;

        fallbackX += a[0];
        fallbackY += a[1];
        fallbackCount++;
      }

      if (Math.abs(twiceArea) > 1e-12) {
        const sign = rIdx === 0 ? Math.sign(twiceArea) : -Math.sign(twiceArea);
        totalWeight += sign * (0.5 * twiceArea);
        sumX += sign * (cx / 6);
        sumY += sign * (cy / 6);
      }
    }
  }

  if (Math.abs(totalWeight) > 1e-9) {
    return [sumX / totalWeight, sumY / totalWeight];
  }
  if (fallbackCount > 0) {
    return [fallbackX / fallbackCount, fallbackY / fallbackCount];
  }
  return [0, 0];
}

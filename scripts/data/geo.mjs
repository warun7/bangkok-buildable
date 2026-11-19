// Small planar-geometry helpers. Coordinates are projected to local metres (x east, y north)
// around a fixed origin; accuracy is more than enough for a city-block scale overlay.
export const LAT0 = 13.74;
export const LON0 = 100.57;
const KY = 110540;
const KX = 111320 * Math.cos((LAT0 * Math.PI) / 180);

export const toXY = ([lon, lat]) => [(lon - LON0) * KX, (lat - LAT0) * KY];
export const toLL = ([x, y]) => [round(LON0 + x / KX, 7), round(LAT0 + y / KY, 7)];
export const round = (v, n) => Number(v.toFixed(n));

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const mul = (a, s) => [a[0] * s, a[1] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
export const len = (a) => Math.hypot(a[0], a[1]);
export const unit = (a) => mul(a, 1 / len(a));
export const dist = (a, b) => len(sub(a, b));

// Offset an open polyline by d metres toward `side` (an xy vector roughly perpendicular to the line).
export function offsetPolyline(pts, d, side) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const t = unit(sub(b, a));
    let n = [-t[1], t[0]];
    if (dot(n, side) < 0) n = mul(n, -1);
    return add(p, mul(n, d));
  });
}

// Average each point with its neighbours within `win` metres along the sort key (smooths paired carriageways).
export function smoothByKey(pts, key, win) {
  const out = [];
  for (const p of pts) {
    const near = pts.filter((q) => Math.abs(q[key] - p[key]) <= win);
    const m = [near.reduce((s, q) => s + q[0], 0) / near.length, near.reduce((s, q) => s + q[1], 0) / near.length];
    if (!out.length || dist(out.at(-1), m) > 0.5) out.push(m);
  }
  return out;
}

// Remove near-duplicate points (< eps metres) and sort by key (0 = x, 1 = y).
export function dedupeSort(pts, key, eps = 0.5) {
  const s = [...pts].sort((a, b) => a[key] - b[key]);
  const out = [];
  for (const p of s) if (!out.length || dist(out.at(-1), p) > eps) out.push(p);
  return out;
}

export function segInt(p, p2, q, q2) {
  const r = sub(p2, p);
  const s = sub(q2, q);
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-12) return null;
  const qp = sub(q, p);
  const t = (qp[0] * s[1] - qp[1] * s[0]) / den;
  const u = (qp[0] * r[1] - qp[1] * r[0]) / den;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { t, u, pt: add(p, mul(r, t)) };
  return null;
}

export function polyIntersections(A, B) {
  const out = [];
  for (let i = 0; i < A.length - 1; i++)
    for (let j = 0; j < B.length - 1; j++) {
      const x = segInt(A[i], A[i + 1], B[j], B[j + 1]);
      if (x) out.push({ i, j, pt: x.pt });
    }
  return out;
}

// Nearest segment index and projected point of p on an open polyline.
export function locate(poly, p) {
  let best = { d: Infinity, i: 0 };
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const ab = sub(poly[i + 1], a);
    const L2 = dot(ab, ab);
    let t = L2 ? dot(sub(p, a), ab) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = dist(add(a, mul(ab, t)), p);
    if (d < best.d) best = { d, i };
  }
  return best;
}

// Vertices of an open polyline from point p to point q (both on the line), following the line order.
export function subpath(poly, p, q) {
  const P = locate(poly, p);
  const Q = locate(poly, q);
  if (P.i <= Q.i) return [p, ...poly.slice(P.i + 1, Q.i + 1), q];
  return [p, ...poly.slice(Q.i + 1, P.i + 1).reverse(), q];
}

// Vertices of a closed ring (no repeated last point) from p to q, going forward or backward.
export function ringSubpath(ring, p, q, forward) {
  const n = ring.length;
  const closed = [...ring, ring[0]];
  const P = locate(closed, p);
  const Q = locate(closed, q);
  const out = [p];
  if (forward) {
    for (let k = P.i + 1; ; k++) {
      out.push(ring[k % n]);
      if (k % n === Q.i) break;
    }
  } else {
    for (let k = P.i; ; k--) {
      const idx = ((k % n) + n) % n;
      out.push(ring[idx]);
      if (idx === (Q.i + 1) % n) break;
    }
  }
  out.push(q);
  return out;
}

const perpDist = (p, a, b) => {
  const ab = sub(b, a);
  const L2 = dot(ab, ab);
  if (!L2) return dist(p, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / L2));
  return dist(p, add(a, mul(ab, t)));
};

// Douglas-Peucker simplification of an open polyline, tolerance in metres.
export function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let max = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(pts[i], pts[s], pts[e]);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > tol) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

export function signedArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

// Self-intersections of a closed ring (non-adjacent edges only). Returns the list of crossing edge pairs.
export function selfIntersections(ring) {
  const n = ring.length;
  const bad = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const x = segInt(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n]);
      if (x) bad.push([i, j]);
    }
  return bad;
}

export function pointInRing(ring, p) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Buffer an open polyline into a polygon (ring) of half-width d, using offsets on both sides.
export function bufferLine(pts, d) {
  const dir = unit(sub(pts.at(-1), pts[0]));
  const n = [-dir[1], dir[0]];
  const a = offsetPolyline(pts, d, n);
  const b = offsetPolyline(pts, d, mul(n, -1));
  return [...a, ...[...b].reverse()];
}

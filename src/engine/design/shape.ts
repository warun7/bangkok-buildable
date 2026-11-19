import type { MultiPolygon, Ring } from "../types";
import { difference } from "../geom/boolean";
import { multiArea } from "../geom/polygon";
import { capsule } from "../geom/setback";

// Fast, approximate shaping for concept massing. These shapes only decide where the architect would
// like a plate to be; every plate is then clipped to the exact legal allowed space (stack() in
// generate.ts), and the checks recompute from that exact geometry. So approximation here can cost a
// little floor area, never compliance.

function perpDist(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  if (l < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / l;
}

function dp(pts: Ring, tol: number): Ring {
  if (pts.length <= 2) return pts;
  let idx = -1;
  let max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  const left = dp(pts.slice(0, idx + 1), tol);
  const right = dp(pts.slice(idx), tol);
  return [...left.slice(0, -1), ...right];
}

/** Douglas–Peucker on a closed ring (not closed in storage). */
export function simplifyRing(ring: Ring, tol = 0.2): Ring {
  if (ring.length <= 4) return ring;
  // Split at the vertex farthest from vertex 0 so both halves are open polylines.
  let far = 0;
  let fd = -1;
  for (let i = 1; i < ring.length; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (d > fd) {
      fd = d;
      far = i;
    }
  }
  const a = dp(ring.slice(0, far + 1), tol);
  const b = dp([...ring.slice(far), ring[0]], tol);
  const out = [...a.slice(0, -1), ...b.slice(0, -1)];
  return out.length >= 3 ? out : ring;
}

export function simplify(mp: MultiPolygon, tol = 0.2): MultiPolygon {
  return mp.map((poly) => poly.map((r) => simplifyRing(r, tol)));
}

/** Approximate uniform inset (coarse capsules on a simplified outline). */
export function fastInset(mp: MultiPolygon, d: number): MultiPolygon {
  if (!mp.length || d <= 0) return mp;
  const s = simplify(mp);
  const caps: MultiPolygon[] = [];
  for (const poly of s)
    for (const ring of poly)
      for (let i = 0; i < ring.length; i++) {
        const c = capsule(ring[i], ring[(i + 1) % ring.length], d, 4);
        if (c.length >= 3) caps.push([[c]]);
      }
  return caps.length ? difference(mp, ...caps) : mp;
}

/** Inset until the area is at most `target` (within ~1.5%), by bisection on the inset distance. */
export function fastInsetToArea(mp: MultiPolygon, target: number): MultiPolygon {
  const area = multiArea(mp);
  if (target >= area) return mp;
  if (target <= 0) return [];
  let lo = 0;
  // Area shrinks at least as fast as perimeter × d, so this bound always overshoots.
  let hi = Math.sqrt(area);
  let best: MultiPolygon = [];
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const s = fastInset(mp, mid);
    const a = multiArea(s);
    if (a > target) lo = mid;
    else {
      hi = mid;
      best = s;
      if (target - a <= 0.015 * target) break;
    }
  }
  return best;
}

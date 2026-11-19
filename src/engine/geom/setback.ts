import type { MultiPolygon, Ring, Vec2 } from "../types";
import { difference } from "./boolean";
import { multiArea, ringArea } from "./polygon";

/**
 * Stadium (capsule) around segment `a -> b` with radius `r` in CCW winding order,
 * using `segments` subdivisions per semicircle.
 */
export function capsule(a: Vec2, b: Vec2, r: number, segments = 12): Ring {
  if (r <= 0) return [];
  const segs = Math.max(2, Math.floor(segments));
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);

  const ring: Ring = [];
  if (len < 1e-9) {
    const total = segs * 2;
    for (let i = 0; i < total; i++) {
      const ang = (i / total) * Math.PI * 2;
      ring.push([a[0] + r * Math.cos(ang), a[1] + r * Math.sin(ang)]);
    }
    return ring;
  }

  const theta = Math.atan2(dy, dx);
  const halfPi = Math.PI / 2;

  // Semicircle around b from theta - pi/2 to theta + pi/2
  for (let i = 0; i <= segs; i++) {
    const ang = theta - halfPi + (i / segs) * Math.PI;
    ring.push([b[0] + r * Math.cos(ang), b[1] + r * Math.sin(ang)]);
  }

  // Semicircle around a from theta + pi/2 to theta + 3*pi/2
  for (let i = 0; i <= segs; i++) {
    const ang = theta + halfPi + (i / segs) * Math.PI;
    ring.push([a[0] + r * Math.cos(ang), a[1] + r * Math.sin(ang)]);
  }

  return ring;
}

/**
 * Set of points inside `ring` whose Euclidean distance to edge `i` is >= `distances[i]`,
 * computed as `plot - union(capsule(edge_i, distances[i]))` for `distances[i] > 0`.
 */
export function perEdgeSetback(ring: Ring, distances: number[]): MultiPolygon {
  const n = ring.length;
  if (n < 3) return [];

  const capsules: MultiPolygon[] = [];
  for (let i = 0; i < n; i++) {
    const d = distances[i] ?? 0;
    if (d > 0) {
      const a = ring[i];
      const b = ring[(i + 1) % n];
      const cap = capsule(a, b, d);
      if (cap.length >= 3) {
        capsules.push([[cap]]);
      }
    }
  }

  const plotRing: Ring = ringArea(ring) < 0 ? [...ring].reverse() : [...ring];
  if (Math.abs(ringArea(plotRing)) < 0.01) return [];
  if (capsules.length === 0) return [[plotRing]];

  return difference([[plotRing]], ...capsules);
}

/**
 * Uniform inset of a MultiPolygon by distance `d` from every edge of every ring.
 */
export function uniformInset(mp: MultiPolygon, d: number): MultiPolygon {
  if (mp.length === 0) return [];
  if (d <= 0) return mp;

  const capsules: MultiPolygon[] = [];
  for (let pIdx = 0; pIdx < mp.length; pIdx++) {
    const poly = mp[pIdx];
    for (let rIdx = 0; rIdx < poly.length; rIdx++) {
      const ring = poly[rIdx];
      const n = ring.length;
      for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        const cap = capsule(a, b, d);
        if (cap.length >= 3) {
          capsules.push([[cap]]);
        }
      }
    }
  }

  if (capsules.length === 0) return mp;
  return difference(mp, ...capsules);
}

export interface InsetToAreaOptions {
  maxIterations?: number;
  tolerance?: number;
}

function estimateInradiusUpperBound(mp: MultiPolygon): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let pIdx = 0; pIdx < mp.length; pIdx++) {
    const poly = mp[pIdx];
    if (poly.length === 0) continue;
    const outer = poly[0];
    for (let i = 0; i < outer.length; i++) {
      const [x, y] = outer[i];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX)) return 0;
  return 0.5 * Math.min(maxX - minX, maxY - minY) + 1e-3;
}

/**
 * Binary search on uniform inset distance `d` in `[0, inradius]` so that
 * `multiArea(shape) <= targetArea`, within 0.5% or 20 iterations.
 */
export function insetToArea(
  mp: MultiPolygon,
  targetArea: number,
  opts?: InsetToAreaOptions
): { shape: MultiPolygon; d: number } {
  const initialArea = multiArea(mp);
  if (initialArea <= 0 || targetArea >= initialArea) {
    return { shape: mp, d: 0 };
  }

  const maxIterations = opts?.maxIterations ?? 20;
  const tolerance = opts?.tolerance ?? 0.005;

  let lo = 0;
  let hi = estimateInradiusUpperBound(mp);
  if (hi <= 0) {
    return { shape: [], d: 0 };
  }

  if (targetArea <= 0) {
    return { shape: [], d: hi };
  }

  let bestShape: MultiPolygon = [];
  let bestD = hi;

  for (let iter = 0; iter < maxIterations; iter++) {
    const mid = 0.5 * (lo + hi);
    const shape = uniformInset(mp, mid);
    const area = multiArea(shape);

    if (area > targetArea) {
      lo = mid;
    } else {
      hi = mid;
      bestShape = shape;
      bestD = mid;
      if (targetArea - area <= tolerance * targetArea) {
        break;
      }
    }
  }

  return { shape: bestShape, d: bestD };
}

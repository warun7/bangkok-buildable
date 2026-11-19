import type { EnvelopeSpec, MultiPolygon, Ring, Vec2 } from "../types";
import { intersection } from "../geom/boolean";

// The region a floor may occupy when its top is at height t, independent of the mesh code:
// footprint ∩ { d_i(x, y) ≥ t / slope_i − W_i for every governing sky plane }.

const BIG = 5000;

export function halfPlane(ring: Ring, edgeIndex: number, offset: number): MultiPolygon {
  const a = ring[edgeIndex];
  const b = ring[(edgeIndex + 1) % ring.length];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u: Vec2 = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  // CCW ring: interior is on the left of a->b.
  const n: Vec2 = [-u[1], u[0]];
  const o: Vec2 = [a[0] + n[0] * offset, a[1] + n[1] * offset];
  const p0: Vec2 = [o[0] - u[0] * BIG, o[1] - u[1] * BIG];
  const p1: Vec2 = [o[0] + u[0] * BIG, o[1] + u[1] * BIG];
  const p2: Vec2 = [p1[0] + n[0] * BIG, p1[1] + n[1] * BIG];
  const p3: Vec2 = [p0[0] + n[0] * BIG, p0[1] + n[1] * BIG];
  return [[[p0, p1, p2, p3]]];
}

export function makeAllowed(ring: Ring, spec: EnvelopeSpec, footprint: MultiPolygon) {
  const cache = new Map<number, MultiPolygon>();
  return (t: number): MultiPolygon => {
    const key = Math.round(t * 1000);
    const hit = cache.get(key);
    if (hit) return hit;
    let region: MultiPolygon = t > spec.maxHeight + 1e-6 ? [] : footprint;
    for (const sp of spec.skyPlanes) {
      if (!region.length) break;
      const need = t / sp.slope - sp.roadWidth;
      if (need < -BIG / 2) continue;
      region = intersection(region, halfPlane(ring, sp.edgeIndex, need));
    }
    cache.set(key, region);
    return region;
  };
}

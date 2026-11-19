import earcut, { flatten } from "earcut";
import type {
  Envelope,
  EnvelopeMesh,
  EnvelopeSpec,
  Level,
  MultiPolygon,
  Polygon,
  Ring,
  Vec2,
} from "./types";
import { intersection } from "./geom/boolean";
import { edgeNormalInward, multiArea, polygonArea, ringArea } from "./geom/polygon";
import { perEdgeSetback } from "./geom/setback";

interface Plane3D {
  /** f(x, y) = a*x + b*y + c */
  a: number;
  b: number;
  c: number;
  /** Outward unit normal (-a, -b, 1) / sqrt(a^2 + b^2 + 1) */
  nx: number;
  ny: number;
  nz: number;
}

/**
 * Compute the allowed ground footprint after applying the maximum of per-edge setbacks
 * and optional uniform clearance.
 */
export function computeFootprint(ring: Ring, spec: EnvelopeSpec): MultiPolygon {
  const n = ring.length;
  if (n < 3) return [];

  const baseDist =
    spec.uniformClearance && spec.uniformClearance.distance > 0
      ? spec.uniformClearance.distance
      : 0;
  const distances = new Array<number>(n).fill(baseDist);

  for (let i = 0; i < spec.setbacks.length; i++) {
    const sb = spec.setbacks[i];
    if (sb.edgeIndex >= 0 && sb.edgeIndex < n && sb.distance > distances[sb.edgeIndex]) {
      distances[sb.edgeIndex] = sb.distance;
    }
  }

  return perEdgeSetback(ring, distances);
}

function getFootprintBounds(mp: MultiPolygon): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let p = 0; p < mp.length; p++) {
    const poly = mp[p];
    for (let r = 0; r < poly.length; r++) {
      const ring = poly[r];
      for (let i = 0; i < ring.length; i++) {
        const [x, y] = ring[i];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Build a large CCW convex quad representing the half-plane
 * `{ (x, y) : (x - ax)*nx + (y - ay)*ny >= dMin }`.
 */
function buildHalfPlaneQuad(
  ax: number,
  ay: number,
  nx: number,
  ny: number,
  dMin: number,
  extent: number
): MultiPolygon {
  const p0x = ax + dMin * nx;
  const p0y = ay + dMin * ny;
  // Tangent t = (ny, -nx) so that t x n = ny^2 + nx^2 = +1 (CCW)
  const tx = ny;
  const ty = -nx;
  const M = extent;

  const ring: Ring = [
    [p0x - M * tx, p0y - M * ty],
    [p0x + M * tx, p0y + M * ty],
    [p0x + M * tx + 2 * M * nx, p0y + M * ty + 2 * M * ny],
    [p0x - M * tx + 2 * M * nx, p0y - M * ty + 2 * M * ny],
  ];
  return [[ring]];
}

/**
 * Slice horizontal floor plates stacked from z = 0 using `levelHeights`.
 * The plate for a level with top `t = z + h` is
 * `footprint ∩ { d_i >= t / slope_i - W_i for all i }`, and empty if `t > maxHeight`.
 * Stops at the first empty level.
 */
export function sliceLevels(
  ring: Ring,
  spec: EnvelopeSpec,
  footprint: MultiPolygon,
  levelHeights: number[]
): Level[] {
  if (footprint.length === 0 || levelHeights.length === 0 || spec.maxHeight <= 0) {
    return [];
  }

  const baseArea = multiArea(footprint);
  if (baseArea < 0.01) return [];

  const bounds = getFootprintBounds(footprint);
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 100);
  const extent = span * 20;

  interface SkyPlaneInfo {
    ax: number;
    ay: number;
    nx: number;
    ny: number;
    roadWidth: number;
    slope: number;
    minD: number;
    maxD: number;
  }

  const activePlanes: SkyPlaneInfo[] = [];
  for (let i = 0; i < spec.skyPlanes.length; i++) {
    const sp = spec.skyPlanes[i];
    if (sp.edgeIndex < 0 || sp.edgeIndex >= ring.length || sp.slope <= 0) continue;
    const a = ring[sp.edgeIndex];
    const n = edgeNormalInward(ring, sp.edgeIndex);
    if (n[0] === 0 && n[1] === 0) continue;

    let minD = Infinity;
    let maxD = -Infinity;
    for (let p = 0; p < footprint.length; p++) {
      const poly = footprint[p];
      for (let r = 0; r < poly.length; r++) {
        const fRing = poly[r];
        for (let v = 0; v < fRing.length; v++) {
          const pt = fRing[v];
          const d = (pt[0] - a[0]) * n[0] + (pt[1] - a[1]) * n[1];
          if (d < minD) minD = d;
          if (d > maxD) maxD = d;
        }
      }
    }

    activePlanes.push({
      ax: a[0],
      ay: a[1],
      nx: n[0],
      ny: n[1],
      roadWidth: sp.roadWidth,
      slope: sp.slope,
      minD,
      maxD,
    });
  }

  const levels: Level[] = [];
  let z = 0;

  for (let i = 0; i < levelHeights.length; i++) {
    const h = levelHeights[i];
    if (h <= 0) continue;
    const t = z + h;
    if (t > spec.maxHeight + 1e-7) {
      break;
    }

    const halfPlanes: MultiPolygon[] = [];
    let clippedOut = false;

    for (let p = 0; p < activePlanes.length; p++) {
      const sp = activePlanes[p];
      const dReq = t / sp.slope - sp.roadWidth;
      if (dReq >= sp.maxD - 1e-6) {
        clippedOut = true;
        break;
      }
      if (dReq > sp.minD + 1e-7) {
        halfPlanes.push(buildHalfPlaneQuad(sp.ax, sp.ay, sp.nx, sp.ny, dReq, extent));
      }
    }

    if (clippedOut) break;

    const plate = halfPlanes.length === 0 ? footprint : intersection(footprint, ...halfPlanes);
    const area = halfPlanes.length === 0 ? baseArea : multiArea(plate);
    if (plate.length === 0 || area < 0.01) {
      break;
    }

    levels.push({
      index: levels.length,
      z,
      h,
      plate,
      area,
    });

    z = t;
  }

  return levels;
}

/**
 * Exact Sutherland-Hodgman clipping of a polygon ring against the half-plane
 * `A*x + B*y + C >= 0`. Uses canonical endpoint ordering so adjacent regions
 * compute identical intersection coordinates.
 */
function clipRingByHalfPlane(ring: Ring, A: number, B: number, C: number): Ring {
  const n = ring.length;
  if (n < 3) return [];

  const norm = Math.hypot(A, B);
  if (norm < 1e-12) {
    return C >= -1e-9 ? ring : [];
  }

  const a = A / norm;
  const b = B / norm;
  const c = C / norm;
  const eps = 1e-9;

  const vals = new Float64Array(n);
  let allIn = true;
  let allOut = true;
  for (let i = 0; i < n; i++) {
    const v = a * ring[i][0] + b * ring[i][1] + c;
    vals[i] = v;
    if (v < -eps) allIn = false;
    if (v > eps) allOut = false;
  }

  if (allIn) return ring;
  if (allOut) return [];

  const out: Ring = [];
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const p1 = ring[i];
    const p2 = ring[next];
    const v1 = vals[i];
    const v2 = vals[next];

    const in1 = v1 >= -eps;
    const in2 = v2 >= -eps;

    if (in1) {
      out.push(p1);
    }

    if ((v1 > eps && v2 < -eps) || (v1 < -eps && v2 > eps)) {
      // Order endpoints canonically for deterministic floating-point intersection
      const swap = p1[0] > p2[0] || (p1[0] === p2[0] && p1[1] > p2[1]);
      const qa = swap ? p2 : p1;
      const qb = swap ? p1 : p2;
      const va = swap ? v2 : v1;
      const vb = swap ? v1 : v2;
      const t = -va / (vb - va);
      const ix = qa[0] + t * (qb[0] - qa[0]);
      const iy = qa[1] + t * (qb[1] - qa[1]);
      out.push([ix, iy]);
    } else if (!in1 && in2) {
      // Handled when p2 is visited
    }
  }

  // Deduplicate near-coincident consecutive vertices
  const cleaned: Ring = [];
  for (let i = 0; i < out.length; i++) {
    const pt = out[i];
    if (
      cleaned.length === 0 ||
      Math.hypot(pt[0] - cleaned[cleaned.length - 1][0], pt[1] - cleaned[cleaned.length - 1][1]) >
        1e-7
    ) {
      cleaned.push(pt);
    }
  }
  while (
    cleaned.length > 1 &&
    Math.hypot(
      cleaned[0][0] - cleaned[cleaned.length - 1][0],
      cleaned[0][1] - cleaned[cleaned.length - 1][1]
    ) <= 1e-7
  ) {
    cleaned.pop();
  }

  return cleaned.length >= 3 ? cleaned : [];
}

function isSingleConvexPolygon(mp: MultiPolygon): boolean {
  if (mp.length !== 1 || mp[0].length !== 1) return false;
  const ring = mp[0][0];
  const n = ring.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    const c = ring[(i + 2) % n];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cross < -1e-7) return false;
  }
  return true;
}

function buildPlanes(ring: Ring, spec: EnvelopeSpec): Plane3D[] {
  const planes: Plane3D[] = [
    {
      a: 0,
      b: 0,
      c: spec.maxHeight,
      nx: 0,
      ny: 0,
      nz: 1,
    },
  ];

  for (let i = 0; i < spec.skyPlanes.length; i++) {
    const sp = spec.skyPlanes[i];
    if (sp.edgeIndex < 0 || sp.edgeIndex >= ring.length || sp.slope <= 0) continue;
    const origin = ring[sp.edgeIndex];
    const n = edgeNormalInward(ring, sp.edgeIndex);
    if (n[0] === 0 && n[1] === 0) continue;

    const a = sp.slope * n[0];
    const b = sp.slope * n[1];
    const c = sp.slope * (sp.roadWidth - (origin[0] * n[0] + origin[1] * n[1]));
    const len = Math.hypot(a, b, 1);
    const candidate: Plane3D = {
      a,
      b,
      c,
      nx: -a / len,
      ny: -b / len,
      nz: 1 / len,
    };

    // Deduplicate parallel identical/higher planes
    let duplicateIdx = -1;
    for (let j = 0; j < planes.length; j++) {
      if (Math.abs(planes[j].a - a) < 1e-7 && Math.abs(planes[j].b - b) < 1e-7) {
        duplicateIdx = j;
        break;
      }
    }
    if (duplicateIdx >= 0) {
      if (c < planes[duplicateIdx].c) {
        planes[duplicateIdx] = candidate;
      }
    } else {
      planes.push(candidate);
    }
  }

  return planes;
}

function pointToSegmentDist2D(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-16) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function isMidpointOnPolygonBoundary(a: Vec2, b: Vec2, poly: Polygon, tol = 1e-3): boolean {
  const mx = 0.5 * (a[0] + b[0]);
  const my = 0.5 * (a[1] + b[1]);
  for (let r = 0; r < poly.length; r++) {
    const ring = poly[r];
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const p1 = ring[i];
      const p2 = ring[(i + 1) % n];
      if (pointToSegmentDist2D(mx, my, p1[0], p1[1], p2[0], p2[1]) <= tol) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Build a closed, outward-facing 3D triangle mesh of the solid
 * `{ (x, y) ∈ footprint, 0 <= z <= H(x, y) }`.
 */
export function buildEnvelopeMesh(
  ring: Ring,
  spec: EnvelopeSpec,
  footprint: MultiPolygon
): EnvelopeMesh {
  if (footprint.length === 0 || spec.maxHeight <= 0 || multiArea(footprint) < 0.01) {
    return {
      positions: new Float32Array(0),
      normals: new Float32Array(0),
      indices: new Uint32Array(0),
      edges: new Float32Array(0),
    };
  }

  const planes = buildPlanes(ring, spec);
  const evalH = (x: number, y: number): number => {
    let h = spec.maxHeight;
    for (let i = 0; i < planes.length; i++) {
      const p = planes[i];
      const v = p.a * x + p.b * y + p.c;
      if (v < h) h = v;
    }
    return h > 0 ? h : 0;
  };

  const bounds = getFootprintBounds(footprint);
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 100);
  const M = span * 4;
  const bboxRing: Ring = [
    [bounds.minX - M, bounds.minY - M],
    [bounds.maxX + M, bounds.minY - M],
    [bounds.maxX + M, bounds.maxY + M],
    [bounds.minX - M, bounds.maxY + M],
  ];

  const singleConvex = isSingleConvexPolygon(footprint);

  // 1. Compute top region_j = footprint ∩ { f_j <= f_k for all k }
  const topRegions: { plane: Plane3D; planeIdx: number; mp: MultiPolygon }[] = [];
  for (let j = 0; j < planes.length; j++) {
    const pj = planes[j];
    let cell: Ring = singleConvex ? footprint[0][0] : bboxRing;
    for (let k = 0; k < planes.length; k++) {
      if (k === j) continue;
      const pk = planes[k];
      // f_j <= f_k  <=>  (a_k - a_j)*x + (b_k - b_j)*y + (c_k - c_j) >= 0
      cell = clipRingByHalfPlane(cell, pk.a - pj.a, pk.b - pj.b, pk.c - pj.c);
      if (cell.length < 3) break;
    }
    if (cell.length < 3 || Math.abs(ringArea(cell)) < 1e-4) continue;

    const regionMp: MultiPolygon = singleConvex ? [[cell]] : intersection(footprint, [[cell]]);
    if (regionMp.length > 0 && multiArea(regionMp) >= 1e-4) {
      topRegions.push({ plane: pj, planeIdx: j, mp: regionMp });
    }
  }

  // 2. Canonical 2D vertex pool so top regions, walls, and bottom share exact 3D vertices
  const WELD_TOL = 5e-4; // 0.5 mm
  const canonicalPts: Vec2[] = [];
  const getCanonicalId = (pt: Vec2): number => {
    const x = pt[0] === 0 ? 0 : pt[0];
    const y = pt[1] === 0 ? 0 : pt[1];
    for (let i = 0; i < canonicalPts.length; i++) {
      const c = canonicalPts[i];
      if (Math.hypot(c[0] - x, c[1] - y) <= WELD_TOL) {
        return i;
      }
    }
    canonicalPts.push([x, y]);
    return canonicalPts.length - 1;
  };

  // Register footprint vertices
  for (let p = 0; p < footprint.length; p++) {
    const poly = footprint[p];
    for (let r = 0; r < poly.length; r++) {
      const fRing = poly[r];
      for (let i = 0; i < fRing.length; i++) {
        getCanonicalId(fRing[i]);
      }
    }
  }

  // Compute and register 1-D lower envelope breakpoints along every footprint edge
  for (let p = 0; p < footprint.length; p++) {
    const poly = footprint[p];
    for (let r = 0; r < poly.length; r++) {
      const fRing = poly[r];
      const n = fRing.length;
      for (let i = 0; i < n; i++) {
        const va = fRing[i];
        const vb = fRing[(i + 1) % n];
        const dx = vb[0] - va[0];
        const dy = vb[1] - va[1];

        // g_j(s) = alpha_j + beta_j * s for s in [0, 1]
        const alphas = planes.map((pl) => pl.a * va[0] + pl.b * va[1] + pl.c);
        const betas = planes.map((pl) => pl.a * dx + pl.b * dy);

        const candS: number[] = [0, 1];
        for (let j = 0; j < planes.length; j++) {
          for (let k = j + 1; k < planes.length; k++) {
            const dBeta = betas[j] - betas[k];
            if (Math.abs(dBeta) > 1e-9) {
              const s = (alphas[k] - alphas[j]) / dBeta;
              if (s > 1e-5 && s < 1 - 1e-5) {
                candS.push(s);
              }
            }
          }
        }
        candS.sort((a, b) => a - b);

        // Filter unique s values and check where active lowest plane changes
        const uniqueS: number[] = [candS[0]];
        for (let idx = 1; idx < candS.length; idx++) {
          if (candS[idx] - uniqueS[uniqueS.length - 1] > 1e-5) {
            uniqueS.push(candS[idx]);
          }
        }

        const bestPlaneAt = (s: number): number => {
          let bestIdx = 0;
          let bestVal = alphas[0] + betas[0] * s;
          for (let j = 1; j < planes.length; j++) {
            const val = alphas[j] + betas[j] * s;
            if (val < bestVal - 1e-9) {
              bestVal = val;
              bestIdx = j;
            }
          }
          return bestIdx;
        };

        for (let idx = 1; idx < uniqueS.length - 1; idx++) {
          const prevMid = 0.5 * (uniqueS[idx - 1] + uniqueS[idx]);
          const nextMid = 0.5 * (uniqueS[idx] + uniqueS[idx + 1]);
          if (bestPlaneAt(prevMid) !== bestPlaneAt(nextMid)) {
            const s = uniqueS[idx];
            getCanonicalId([va[0] + s * dx, va[1] + s * dy]);
          }
        }
      }
    }
  }

  // Register top region vertices
  for (let tr = 0; tr < topRegions.length; tr++) {
    const mp = topRegions[tr].mp;
    for (let p = 0; p < mp.length; p++) {
      const poly = mp[p];
      for (let r = 0; r < poly.length; r++) {
        const tRing = poly[r];
        for (let i = 0; i < tRing.length; i++) {
          getCanonicalId(tRing[i]);
        }
      }
    }
  }

  const numCanonical = canonicalPts.length;
  const zTop = new Float64Array(numCanonical);
  for (let i = 0; i < numCanonical; i++) {
    zTop[i] = evalH(canonicalPts[i][0], canonicalPts[i][1]);
  }

  // Find all canonical vertices lying on segment idA -> idB, sorted from idA to idB
  const splitSegmentWithCanonical = (idA: number, idB: number): number[] => {
    const a = canonicalPts[idA];
    const b = canonicalPts[idB];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    const len = Math.sqrt(lenSq);
    if (len < 1e-6) return [idA, idB];

    const mids: { id: number; t: number }[] = [];
    for (let id = 0; id < numCanonical; id++) {
      if (id === idA || id === idB) continue;
      const p = canonicalPts[id];
      const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
      if (t <= 1e-4 || t >= 1 - 1e-4) continue;
      const perp = Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len;
      if (perp <= 1e-3) {
        mids.push({ id, t });
      }
    }

    if (mids.length === 0) return [idA, idB];
    mids.sort((u, v) => u.t - v.t);
    const chain: number[] = [idA];
    for (let i = 0; i < mids.length; i++) {
      if (mids[i].id !== chain[chain.length - 1]) {
        chain.push(mids[i].id);
      }
    }
    if (chain[chain.length - 1] !== idB) {
      chain.push(idB);
    }
    return chain;
  };

  // Triangulate a 2D polygon with earcut and split any boundary triangle edges at collinear canonical points
  const triangulatePolygonCanonical = (poly: Polygon): [number, number, number][] => {
    if (poly.length === 0 || polygonArea(poly) < 1e-5) return [];

    // Replace each ring's vertices with their canonical coordinates and strip consecutive duplicates
    const canonicalPoly: Polygon = [];
    const canonicalIdsFlat: number[] = [];

    for (let r = 0; r < poly.length; r++) {
      const ringIn = poly[r];
      const ids: number[] = [];
      for (let i = 0; i < ringIn.length; i++) {
        const id = getCanonicalId(ringIn[i]);
        if (ids.length === 0 || ids[ids.length - 1] !== id) {
          ids.push(id);
        }
      }
      while (ids.length > 1 && ids[0] === ids[ids.length - 1]) {
        ids.pop();
      }
      if (r === 0 && ids.length < 3) return [];
      if (ids.length < 3) continue;

      const cRing: Ring = ids.map((id) => canonicalPts[id]);
      canonicalPoly.push(cRing);
      for (let i = 0; i < ids.length; i++) {
        canonicalIdsFlat.push(ids[i]);
      }
    }

    if (canonicalPoly.length === 0) return [];

    const { vertices, holes, dimensions } = flatten(canonicalPoly);
    const rawTris = earcut(vertices, holes.length > 0 ? holes : null, dimensions);

    const queue: [number, number, number][] = [];
    for (let i = 0; i + 2 < rawTris.length; i += 3) {
      const id0 = canonicalIdsFlat[rawTris[i]];
      const id1 = canonicalIdsFlat[rawTris[i + 1]];
      const id2 = canonicalIdsFlat[rawTris[i + 2]];
      if (id0 === id1 || id1 === id2 || id2 === id0) continue;

      // Ensure CCW in 2D
      const p0 = canonicalPts[id0];
      const p1 = canonicalPts[id1];
      const p2 = canonicalPts[id2];
      const area2 = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
      if (Math.abs(area2) <= 1e-9) continue;
      if (area2 > 0) {
        queue.push([id0, id1, id2]);
      } else {
        queue.push([id0, id2, id1]);
      }
    }

    // Subdivide any triangle edge that lies on `canonicalPoly`'s boundary and contains intermediate canonical points
    const outTris: [number, number, number][] = [];
    while (queue.length > 0) {
      const [a, b, c] = queue.pop()!;
      const pa = canonicalPts[a];
      const pb = canonicalPts[b];
      const pc = canonicalPts[c];

      if (isMidpointOnPolygonBoundary(pa, pb, canonicalPoly)) {
        const chainAB = splitSegmentWithCanonical(a, b);
        if (chainAB.length > 2) {
          for (let k = chainAB.length - 2; k >= 0; k--) {
            queue.push([chainAB[k], chainAB[k + 1], c]);
          }
          continue;
        }
      }

      if (isMidpointOnPolygonBoundary(pb, pc, canonicalPoly)) {
        const chainBC = splitSegmentWithCanonical(b, c);
        if (chainBC.length > 2) {
          for (let k = chainBC.length - 2; k >= 0; k--) {
            queue.push([a, chainBC[k], chainBC[k + 1]]);
          }
          continue;
        }
      }

      if (isMidpointOnPolygonBoundary(pc, pa, canonicalPoly)) {
        const chainCA = splitSegmentWithCanonical(c, a);
        if (chainCA.length > 2) {
          for (let k = chainCA.length - 2; k >= 0; k--) {
            queue.push([chainCA[k + 1], b, chainCA[k]]);
          }
          continue;
        }
      }

      const area2 = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
      if (area2 > 1e-8) {
        outTris.push([a, b, c]);
      }
    }

    return outTris;
  };

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const edgeLines: number[] = [];

  const emitTriangle = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    nx: number,
    ny: number,
    nz: number
  ) => {
    const baseIdx = positions.length / 3;
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
  };

  // Track footprint boundary edges so we can distinguish interior top creases from wall top edges
  const footprintBoundarySubEdges = new Set<string>();
  const edgeKey = (u: number, v: number): string => (u < v ? `${u}:${v}` : `${v}:${u}`);

  // 3. Emit walls and record footprint outline + wall top outline + vertical edges
  for (let p = 0; p < footprint.length; p++) {
    const poly = footprint[p];
    for (let r = 0; r < poly.length; r++) {
      const fRing = poly[r];
      const n = fRing.length;
      for (let i = 0; i < n; i++) {
        const idA = getCanonicalId(fRing[i]);
        const idB = getCanonicalId(fRing[(i + 1) % n]);
        if (idA === idB) continue;

        const va = canonicalPts[idA];
        const vb = canonicalPts[idB];

        // Footprint outline at z = 0
        edgeLines.push(va[0], va[1], 0, vb[0], vb[1], 0);
        // Vertical line at footprint vertex
        edgeLines.push(va[0], va[1], 0, va[0], va[1], zTop[idA]);

        const chain = splitSegmentWithCanonical(idA, idB);
        for (let k = 0; k < chain.length - 1; k++) {
          const u = chain[k];
          const v = chain[k + 1];
          if (u === v) continue;
          footprintBoundarySubEdges.add(edgeKey(u, v));

          const pu = canonicalPts[u];
          const pv = canonicalPts[v];
          const hu = zTop[u];
          const hv = zTop[v];

          // Top outline along wall piece
          edgeLines.push(pu[0], pu[1], hu, pv[0], pv[1], hv);

          const dx = pv[0] - pu[0];
          const dy = pv[1] - pu[1];
          const len = Math.hypot(dx, dy);
          if (len < 1e-7) continue;
          // Outward wall normal (to the right of directed CCW outer / CW hole edge)
          const wnx = dy / len;
          const wny = -dx / len;

          // Quad from z = 0 up to H: B0=(pu,0), B1=(pv,0), T1=(pv,hv), T0=(pu,hu)
          emitTriangle(pu[0], pu[1], 0, pv[0], pv[1], 0, pv[0], pv[1], hv, wnx, wny, 0);
          emitTriangle(pu[0], pu[1], 0, pv[0], pv[1], hv, pu[0], pu[1], hu, wnx, wny, 0);
        }
      }
    }
  }

  // 4. Emit Top faces and collect crease edges between top regions
  const emittedCreaseEdges = new Set<string>();
  for (let tr = 0; tr < topRegions.length; tr++) {
    const { plane, mp } = topRegions[tr];
    for (let p = 0; p < mp.length; p++) {
      const poly = mp[p];
      const tris = triangulatePolygonCanonical(poly);
      for (let t = 0; t < tris.length; t++) {
        const [i0, i1, i2] = tris[t];
        const p0 = canonicalPts[i0];
        const p1 = canonicalPts[i1];
        const p2 = canonicalPts[i2];
        emitTriangle(
          p0[0],
          p0[1],
          zTop[i0],
          p1[0],
          p1[1],
          zTop[i1],
          p2[0],
          p2[1],
          zTop[i2],
          plane.nx,
          plane.ny,
          plane.nz
        );
      }

      // Collect crease lines along region boundary that are not on the footprint boundary
      for (let r = 0; r < poly.length; r++) {
        const tRing = poly[r];
        const n = tRing.length;
        for (let i = 0; i < n; i++) {
          const idA = getCanonicalId(tRing[i]);
          const idB = getCanonicalId(tRing[(i + 1) % n]);
          if (idA === idB) continue;
          const chain = splitSegmentWithCanonical(idA, idB);
          for (let k = 0; k < chain.length - 1; k++) {
            const u = chain[k];
            const v = chain[k + 1];
            const key = edgeKey(u, v);
            if (!footprintBoundarySubEdges.has(key) && !emittedCreaseEdges.has(key)) {
              emittedCreaseEdges.add(key);
              const pu = canonicalPts[u];
              const pv = canonicalPts[v];
              edgeLines.push(pu[0], pu[1], zTop[u], pv[0], pv[1], zTop[v]);
            }
          }
        }
      }
    }
  }

  // 5. Emit Bottom face at z = 0 (outward normal = (0, 0, -1), CW when viewed from +z)
  for (let p = 0; p < footprint.length; p++) {
    const poly = footprint[p];
    const tris = triangulatePolygonCanonical(poly);
    for (let t = 0; t < tris.length; t++) {
      const [i0, i1, i2] = tris[t];
      const p0 = canonicalPts[i0];
      const p1 = canonicalPts[i1];
      const p2 = canonicalPts[i2];
      // Reverse winding (i0, i2, i1) so normal points to -z
      emitTriangle(p0[0], p0[1], 0, p2[0], p2[1], 0, p1[0], p1[1], 0, 0, 0, -1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    edges: new Float32Array(edgeLines),
  };
}

/**
 * Compute full 3D envelope: footprint, reference floor slices, geometric capacity,
 * maximum height, and closed 3D triangle mesh.
 */
export function computeEnvelope(
  ring: Ring,
  spec: EnvelopeSpec,
  refFloorHeight = 3
): Envelope {
  const footprint = computeFootprint(ring, spec);
  const footprintArea = multiArea(footprint);

  const floorH = refFloorHeight > 0 ? refFloorHeight : 3;
  const maxLevels = spec.maxHeight > 0 ? Math.floor((spec.maxHeight + 1e-7) / floorH) : 0;
  const levelHeights = new Array<number>(maxLevels).fill(floorH);

  const levels = sliceLevels(ring, spec, footprint, levelHeights);
  let geometricCapacity = 0;
  for (let i = 0; i < levels.length; i++) {
    geometricCapacity += levels[i].area;
  }

  const mesh = buildEnvelopeMesh(ring, spec, footprint);

  // Max H over footprint vertices and region vertices (all stored in mesh.positions)
  let height = 0;
  for (let i = 2; i < mesh.positions.length; i += 3) {
    if (mesh.positions[i] > height) {
      height = mesh.positions[i];
    }
  }

  return {
    spec,
    footprint,
    footprintArea,
    levels,
    geometricCapacity,
    height,
    mesh,
  };
}

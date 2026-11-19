// Small, self-contained geodesy helpers for the map/UI layer.
// The engine has its own geometry; these exist so the UI can draw edges, labels and road
// frontage lines straight from the drawn [lng, lat] plot without waiting for an analysis.

import type { LngLat, Vec2 } from "../engine/types";

const RAD = Math.PI / 180;

/**
 * Metres per degree of longitude/latitude at a given latitude, from the WGS84 meridional (M) and
 * prime-vertical (N) radii. Same formula as the engine's `createFrame`, so UI and engine agree.
 */
export function metresPerDegree(lat: number): { kx: number; ky: number } {
  const p = lat * RAD;
  const s = Math.sin(p);
  const w = 1 - 0.00669437999014 * s * s;
  const M = (6378137 * (1 - 0.00669437999014)) / Math.pow(w, 1.5);
  const N = 6378137 / Math.sqrt(w);
  return { kx: RAD * N * Math.cos(p), ky: RAD * M };
}

export interface Projector {
  origin: LngLat;
  toLocal(p: LngLat): Vec2;
  toLngLat(p: Vec2): LngLat;
}

/** Equirectangular tangent-plane projector around `origin` (x east, y north, metres). */
export function makeProjector(origin: LngLat): Projector {
  const { kx, ky } = metresPerDegree(origin[1]);
  return {
    origin,
    toLocal: ([lng, lat]) => [(lng - origin[0]) * kx, (lat - origin[1]) * ky],
    toLngLat: ([x, y]) => [origin[0] + x / kx, origin[1] + y / ky],
  };
}

/**
 * deck.gl's METER_OFFSETS uses a spherical scale (earth circumference / 360 per degree).
 * Engine geometry is in true metres (ellipsoid). This 4x4 column-major matrix rescales local
 * metres so deck draws them exactly where the drawn [lng, lat] plot is. If the engine ever uses
 * deck's spherical scale itself, replace this with the identity.
 */
export function localToDeckMatrix(originLat: number): Float32Array {
  const { kx, ky } = metresPerDegree(originLat);
  const deckDeg = 40075016.686 / 360;
  const sx = (deckDeg * Math.cos(originLat * RAD)) / kx;
  const sy = deckDeg / ky;
  return new Float32Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function centroidLngLat(plot: LngLat[]): LngLat {
  let x = 0;
  let y = 0;
  for (const p of plot) {
    x += p[0];
    y += p[1];
  }
  return [x / plot.length, y / plot.length];
}

/** Signed area of a ring (positive = counter-clockwise). */
export function signedArea(ring: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** Distance from p to segment ab, plus the closest point. */
export function pointSegment(p: Vec2, a: Vec2, b: Vec2): { d: number; t: number; q: Vec2 } {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const len2 = vx * vx + vy * vy;
  let t = len2 > 0 ? ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const q: Vec2 = [a[0] + t * vx, a[1] + t * vy];
  return { d: dist(p, q), t, q };
}

export function pointInRing(p: Vec2, ring: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export interface EdgeGeom {
  index: number;
  a: LngLat;
  b: LngLat;
  /** Local metres in the plot projector frame. */
  la: Vec2;
  lb: Vec2;
  length: number;
  mid: LngLat;
  /** Unit normal pointing out of the plot, in local metres. */
  outward: Vec2;
}

/** Plot geometry for the UI: per-edge lengths, outward normals and the plot area. */
export function plotGeometry(plot: LngLat[]): { projector: Projector; edges: EdgeGeom[]; area: number; perimeter: number } {
  const projector = makeProjector(plot.length ? centroidLngLat(plot) : [0, 0]);
  const local = plot.map(projector.toLocal);
  const sa = signedArea(local);
  const ccw = sa >= 0;
  const edges: EdgeGeom[] = [];
  let perimeter = 0;
  for (let i = 0; i < plot.length; i++) {
    const j = (i + 1) % plot.length;
    const la = local[i];
    const lb = local[j];
    const len = dist(la, lb);
    perimeter += len;
    const ux = len > 0 ? (lb[0] - la[0]) / len : 1;
    const uy = len > 0 ? (lb[1] - la[1]) / len : 0;
    // For a CCW ring the interior is on the left, so the outward normal is on the right.
    const outward: Vec2 = ccw ? [uy, -ux] : [-uy, ux];
    edges.push({
      index: i,
      a: plot[i],
      b: plot[j],
      la,
      lb,
      length: len,
      mid: [(plot[i][0] + plot[j][0]) / 2, (plot[i][1] + plot[j][1]) / 2],
      outward,
    });
  }
  return { projector, edges, area: Math.abs(sa), perimeter };
}

export function edgeLetter(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export function boundsOf(plot: LngLat[]): [LngLat, LngLat] {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [x, y] of plot) {
    w = Math.min(w, x);
    e = Math.max(e, x);
    s = Math.min(s, y);
    n = Math.max(n, y);
  }
  return [
    [w, s],
    [e, n],
  ];
}

/** Split a local segment into dash segments (for dashed lines without the extensions package). */
export function dashSegments(a: Vec2, b: Vec2, dash = 1.6, gap = 1.1): [Vec2, Vec2][] {
  const len = dist(a, b);
  if (len === 0) return [];
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  const out: [Vec2, Vec2][] = [];
  for (let s = 0; s < len; s += dash + gap) {
    const e = Math.min(len, s + dash);
    out.push([
      [a[0] + ux * s, a[1] + uy * s],
      [a[0] + ux * e, a[1] + uy * e],
    ]);
  }
  return out;
}

import * as pcNs from "polygon-clipping";
import type { MultiPolygon, Polygon, Ring, Vec2 } from "../types";
import { polygonArea, ringArea } from "./polygon";

type PolygonClippingModule = typeof pcNs;
const pc: PolygonClippingModule =
  (pcNs as unknown as { default?: PolygonClippingModule }).default ?? pcNs;

const SNAP_PRIMARY = 1e-4; // 0.1 mm
const SNAP_RETRY = 1e-3; // 1 mm
const MIN_POLY_AREA = 0.01; // 0.01 m²

function snapCoord(v: number, grid: number): number {
  const s = Math.round(v / grid) * grid;
  return s === 0 ? 0 : s;
}

function snapRing(ring: Ring, grid: number): Ring {
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) {
    const pt: Vec2 = [snapCoord(ring[i][0], grid), snapCoord(ring[i][1], grid)];
    if (out.length > 0) {
      const prev = out[out.length - 1];
      if (prev[0] === pt[0] && prev[1] === pt[1]) continue;
    }
    out.push(pt);
  }
  while (
    out.length > 1 &&
    out[0][0] === out[out.length - 1][0] &&
    out[0][1] === out[out.length - 1][1]
  ) {
    out.pop();
  }
  return out;
}

function snapMultiPolygon(mp: MultiPolygon, grid: number): MultiPolygon {
  const out: MultiPolygon = [];
  for (let i = 0; i < mp.length; i++) {
    const poly = mp[i];
    if (poly.length === 0) continue;
    const outer = snapRing(poly[0], grid);
    if (outer.length < 3) continue;
    const snappedPoly: Polygon = [outer];
    for (let j = 1; j < poly.length; j++) {
      const hole = snapRing(poly[j], grid);
      if (hole.length >= 3) {
        snappedPoly.push(hole);
      }
    }
    out.push(snappedPoly);
  }
  return out;
}

function cleanOutputRing(raw: Ring, wantCCW: boolean): Ring {
  const out: Ring = [];
  for (let i = 0; i < raw.length; i++) {
    const pt: Vec2 = [
      raw[i][0] === 0 ? 0 : raw[i][0],
      raw[i][1] === 0 ? 0 : raw[i][1],
    ];
    if (out.length > 0) {
      const prev = out[out.length - 1];
      if (Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) < 1e-7) continue;
    }
    out.push(pt);
  }
  while (
    out.length > 1 &&
    Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-7
  ) {
    out.pop();
  }
  if (out.length < 3) return [];
  const area = ringArea(out);
  if ((wantCCW && area < 0) || (!wantCCW && area > 0)) {
    out.reverse();
  }
  return out;
}

function cleanOutput(raw: MultiPolygon): MultiPolygon {
  const out: MultiPolygon = [];
  for (let i = 0; i < raw.length; i++) {
    const poly = raw[i];
    if (!poly || poly.length === 0) continue;
    const outer = cleanOutputRing(poly[0], true);
    if (outer.length < 3) continue;
    const cleanedPoly: Polygon = [outer];
    for (let j = 1; j < poly.length; j++) {
      const hole = cleanOutputRing(poly[j], false);
      if (hole.length >= 3 && Math.abs(ringArea(hole)) >= 1e-4) {
        cleanedPoly.push(hole);
      }
    }
    if (polygonArea(cleanedPoly) >= MIN_POLY_AREA) {
      out.push(cleanedPoly);
    }
  }
  return out;
}

/**
 * Boolean union of one or more MultiPolygons.
 */
export function union(...mps: MultiPolygon[]): MultiPolygon {
  const nonEmpty = mps.filter((mp) => mp && mp.length > 0);
  if (nonEmpty.length === 0) return [];

  try {
    const snapped = nonEmpty.map((mp) => snapMultiPolygon(mp, SNAP_PRIMARY)).filter((mp) => mp.length > 0);
    if (snapped.length === 0) return [];
    const [first, ...rest] = snapped;
    const res = pc.union(first, ...rest);
    return cleanOutput(res as unknown as MultiPolygon);
  } catch {
    try {
      const snapped = nonEmpty.map((mp) => snapMultiPolygon(mp, SNAP_RETRY)).filter((mp) => mp.length > 0);
      if (snapped.length === 0) return [];
      const [first, ...rest] = snapped;
      const res = pc.union(first, ...rest);
      return cleanOutput(res as unknown as MultiPolygon);
    } catch (err) {
      console.warn("polygon-clipping union failed after retry; using safe fallback", err);
      return cleanOutput(nonEmpty[0]);
    }
  }
}

/**
 * Boolean intersection of two or more MultiPolygons.
 */
export function intersection(a: MultiPolygon, ...rest: MultiPolygon[]): MultiPolygon {
  const all = [a, ...rest];
  for (let i = 0; i < all.length; i++) {
    if (!all[i] || all[i].length === 0) return [];
  }

  try {
    const snapped = all.map((mp) => snapMultiPolygon(mp, SNAP_PRIMARY));
    for (let i = 0; i < snapped.length; i++) {
      if (snapped[i].length === 0) return [];
    }
    const [first, ...others] = snapped;
    const res = pc.intersection(first, ...others);
    return cleanOutput(res as unknown as MultiPolygon);
  } catch {
    try {
      const snapped = all.map((mp) => snapMultiPolygon(mp, SNAP_RETRY));
      for (let i = 0; i < snapped.length; i++) {
        if (snapped[i].length === 0) return [];
      }
      const [first, ...others] = snapped;
      const res = pc.intersection(first, ...others);
      return cleanOutput(res as unknown as MultiPolygon);
    } catch (err) {
      console.warn("polygon-clipping intersection failed after retry; returning empty", err);
      return [];
    }
  }
}

/**
 * Boolean difference: `subject` minus all `clips`.
 */
export function difference(subject: MultiPolygon, ...clips: MultiPolygon[]): MultiPolygon {
  if (!subject || subject.length === 0) return [];
  const activeClips = clips.filter((c) => c && c.length > 0);
  if (activeClips.length === 0) return cleanOutput(subject);

  try {
    const snappedSubject = snapMultiPolygon(subject, SNAP_PRIMARY);
    if (snappedSubject.length === 0) return [];
    const snappedClips = activeClips
      .map((c) => snapMultiPolygon(c, SNAP_PRIMARY))
      .filter((c) => c.length > 0);
    if (snappedClips.length === 0) return cleanOutput(snappedSubject);
    const res = pc.difference(snappedSubject, ...snappedClips);
    return cleanOutput(res as unknown as MultiPolygon);
  } catch {
    try {
      const snappedSubject = snapMultiPolygon(subject, SNAP_RETRY);
      if (snappedSubject.length === 0) return [];
      const snappedClips = activeClips
        .map((c) => snapMultiPolygon(c, SNAP_RETRY))
        .filter((c) => c.length > 0);
      if (snappedClips.length === 0) return cleanOutput(snappedSubject);
      const res = pc.difference(snappedSubject, ...snappedClips);
      return cleanOutput(res as unknown as MultiPolygon);
    } catch (err) {
      console.warn("polygon-clipping difference failed after retry; returning minuend", err);
      return cleanOutput(subject);
    }
  }
}

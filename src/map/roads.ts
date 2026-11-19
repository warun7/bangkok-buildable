// Road frontage detection from the OpenMapTiles vector tiles already loaded in the map.
import type { Map as MlMap, GeoJSONFeature } from "maplibre-gl";
import type { FrontageCandidate, LngLat, Vec2 } from "../engine/types";
import { centroidLngLat, makeProjector, plotGeometry, pointSegment } from "./geo";

/**
 * Suggested right-of-way width (เขตทาง, boundary to boundary) by OpenMapTiles road class, in metres.
 * These are ESTIMATES for typical Bangkok roads of each class, used only as a starting value
 * when no surveyed width is known. The user should always confirm the real width.
 */
export const ROAD_WIDTH_BY_CLASS: Readonly<Record<string, number>> = {
  motorway: 40,
  trunk: 40,
  primary: 30,
  secondary: 20,
  tertiary: 14,
  minor: 8,
  residential: 8,
  service: 8,
  track: 4,
  path: 4,
};

export const DEFAULT_ROAD_WIDTH = 8;

export function suggestedWidthFor(roadClass?: string): number {
  return (roadClass && ROAD_WIDTH_BY_CLASS[roadClass]) || DEFAULT_ROAD_WIDTH;
}

/** Search radius from the edge midpoint to the road centreline, metres. */
const MAX_DISTANCE = 20;
/** Max angle between edge and road, degrees. */
const MAX_ANGLE = 30;
const COS_MAX = Math.cos((MAX_ANGLE * Math.PI) / 180);

const IGNORED_CLASSES = new Set(["rail", "transit", "ferry", "pier", "bridge", "aerialway", "cable_car", "busway_area"]);

/** Higher = preferred when two roads are about equally close. */
const CLASS_RANK: Record<string, number> = {
  motorway: 6,
  trunk: 6,
  primary: 5,
  secondary: 4,
  tertiary: 3,
  minor: 2,
  residential: 2,
  service: 1,
  track: 0,
  path: 0,
};

interface Seg {
  a: Vec2;
  b: Vec2;
  cls?: string;
  name?: string;
}

function lines(f: GeoJSONFeature): LngLat[][] {
  const g = f.geometry;
  if (g.type === "LineString") return [g.coordinates as LngLat[]];
  if (g.type === "MultiLineString") return g.coordinates as LngLat[][];
  return [];
}

function nameOf(p: Record<string, unknown>): string | undefined {
  const n = (p["name:en"] ?? p["name_en"] ?? p["name"]) as string | undefined;
  return n && String(n).trim() ? String(n) : undefined;
}

function collect(
  map: MlMap,
  sourceLayer: string,
  toLocal: (p: LngLat) => Vec2,
  box: [number, number, number, number],
  withName: boolean,
): Seg[] {
  if (!map.getSource("openmaptiles")) return [];
  const feats = map.querySourceFeatures("openmaptiles", { sourceLayer });
  const segs: Seg[] = [];
  const [x0, y0, x1, y1] = box;
  for (const f of feats) {
    const p = f.properties as Record<string, unknown>;
    const cls = p.class as string | undefined;
    if (cls && IGNORED_CLASSES.has(cls)) continue;
    if (p.brunnel === "tunnel") continue;
    // Elevated expressways (motorway on a bridge) do not give a plot frontage.
    if (p.brunnel === "bridge" && (cls === "motorway" || cls === "trunk")) continue;
    if (p.indoor) continue;
    const name = withName ? nameOf(p) : undefined;
    if (withName && !name) continue;
    for (const line of lines(f)) {
      let prev: Vec2 | null = null;
      for (const c of line) {
        const q = toLocal(c);
        if (prev) {
          const minx = Math.min(prev[0], q[0]);
          const maxx = Math.max(prev[0], q[0]);
          const miny = Math.min(prev[1], q[1]);
          const maxy = Math.max(prev[1], q[1]);
          if (maxx >= x0 && minx <= x1 && maxy >= y0 && miny <= y1) segs.push({ a: prev, b: q, cls, name });
        }
        prev = q;
      }
    }
  }
  return segs;
}

interface Match {
  seg: Seg;
  d: number;
}

function bestMatch(mid: Vec2, u: Vec2, outward: Vec2, segs: Seg[], maxD: number): Match | null {
  let best: Match | null = null;
  let bestScore = Infinity;
  for (const s of segs) {
    const vx = s.b[0] - s.a[0];
    const vy = s.b[1] - s.a[1];
    const len = Math.hypot(vx, vy);
    if (len < 0.5) continue;
    const cos = Math.abs((vx * u[0] + vy * u[1]) / len);
    if (cos < COS_MAX) continue;
    const { d, q } = pointSegment(mid, s.a, s.b);
    if (d > maxD) continue;
    // The road must lie outside the plot (on the outward side of the edge), allowing a little slack.
    const side = (q[0] - mid[0]) * outward[0] + (q[1] - mid[1]) * outward[1];
    if (side < -1.5) continue;
    const score = d - 0.75 * (CLASS_RANK[s.cls ?? ""] ?? 0);
    if (score < bestScore) {
      bestScore = score;
      best = { seg: s, d };
    }
  }
  return best;
}

/**
 * For each plot edge, find a road line within ~20 m of the edge midpoint that runs roughly parallel
 * (within 30°) and lies outside the plot. Only uses tiles already loaded in the map, so call it once
 * the map is idle over the plot. Edges without a nearby road are omitted.
 */
export function detectFrontages(map: MlMap, plot: LngLat[]): FrontageCandidate[] {
  if (plot.length < 3) return [];
  const projector = makeProjector(centroidLngLat(plot));
  const { edges } = plotGeometry(plot);
  // Re-express edges in this projector (same origin as plotGeometry; kept explicit for clarity).
  const local = plot.map(projector.toLocal);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of local) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const pad = MAX_DISTANCE + 15;
  const box: [number, number, number, number] = [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
  const roads = collect(map, "transportation", projector.toLocal, box, false);
  const named = collect(map, "transportation_name", projector.toLocal, box, true);

  const out: FrontageCandidate[] = [];
  for (const e of edges) {
    if (e.length < 1) continue;
    const a = local[e.index];
    const b = local[(e.index + 1) % local.length];
    const mid: Vec2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const u: Vec2 = [(b[0] - a[0]) / e.length, (b[1] - a[1]) / e.length];
    const m = bestMatch(mid, u, e.outward, roads, MAX_DISTANCE);
    if (!m) continue;
    // Names live on the separate transportation_name layer (merged lines); match the same way, a bit looser.
    const sameClass = named.filter((s) => s.cls === m.seg.cls);
    const n = bestMatch(mid, u, e.outward, sameClass.length ? sameClass : named, MAX_DISTANCE + 8) ?? bestMatch(mid, u, e.outward, named, MAX_DISTANCE + 8);
    out.push({
      edgeIndex: e.index,
      roadClass: m.seg.cls,
      roadName: n?.seg.name,
      distance: Math.round(m.d * 10) / 10,
      suggestedWidth: suggestedWidthFor(m.seg.cls),
    });
  }
  return out;
}

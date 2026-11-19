import type { Analysis, Envelope, EnvelopeSpec, LngLat, PlotIssue, Ring, SiteInput, Vec2 } from "./types";
import { createFrame } from "./geom/frame";
import { multiArea, normalizeRing, ringArea, validatePlot } from "./geom/polygon";
import { computeEnvelope } from "./envelope";
import { evaluateRules, type FrontageCtx } from "./rules/apply";
import { BUILDING_TYPES } from "./rules/buildingTypes";
import { ZONE_Y10 } from "./rules/zone";
import { generateDesigns } from "./design/generate";

// The one entry point the UI calls. Pure and synchronous: same input, same output, no network.

export interface Station {
  name: string;
  /** Platform outlines, or a single point when no platform is mapped. */
  rings: LngLat[][];
}

export interface SiteData {
  /** Mass-transit stations (platform positions where known). */
  stations?: Station[];
  /** Outline of the zone patch the rules are for (outer rings), lng/lat. */
  zone?: LngLat[][];
}

function emptyEnvelope(spec: EnvelopeSpec): Envelope {
  return {
    spec,
    footprint: [],
    footprintArea: 0,
    levels: [],
    geometricCapacity: 0,
    height: 0,
    mesh: { positions: new Float32Array(0), normals: new Float32Array(0), indices: new Uint32Array(0), edges: new Float32Array(0) },
  };
}

function pointInRing(p: Vec2, ring: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function distToRing(p: Vec2, ring: Ring): number {
  if (pointInRing(p, ring)) return 0;
  let d = Infinity;
  for (let i = 0; i < ring.length; i++) d = Math.min(d, distToSegment(p, ring[i], ring[(i + 1) % ring.length]));
  return d;
}

/** Shortest distance between a plot and a station's platforms (0 if they overlap). */
function plotToStation(plot: Ring, rings: Vec2[][]): number {
  let d = Infinity;
  for (const r of rings) {
    for (const p of r) d = Math.min(d, distToRing(p, plot));
    if (r.length >= 3) for (const p of plot) d = Math.min(d, distToRing(p, r));
  }
  return d;
}

export function analyze(input: SiteInput, data: SiteData = {}): Analysis {
  const t0 = performance.now();
  const type = BUILDING_TYPES[input.buildingType];
  const issues: PlotIssue[] = [];

  if (input.plot.length < 3) {
    // Nothing to measure yet (the user is still drawing).
    const ev = evaluateRules({ plotArea: 0, localEdgeCount: 0, frontages: [], buildingType: input.buildingType, stationDistance: null, disabled: new Set() });
    return {
      input,
      origin: input.plot[0] ?? [0, 0],
      plotLocal: [],
      sourceEdge: [],
      plotArea: 0,
      issues: [{ code: "too-few-points", message: "Draw the plot: click each corner, then click the first corner again.", severity: "error" }],
      zone: ZONE_Y10,
      rules: ev.rules,
      envelopes: { lowrise: emptyEnvelope(ev.lowrise), highrise: null },
      highriseBlockedReason: ev.highriseBlockedReason,
      maxGfa: 0,
      designs: [],
      computeMs: performance.now() - t0,
    };
  }
  const frame = createFrame(input.plot);
  const drawn: Ring = input.plot.map((p) => frame.toLocal(p));
  const { ring, sourceEdge } = normalizeRing(drawn);
  const validation = validatePlot(drawn);
  for (const v of validation.issues) issues.push({ code: v.code, message: v.message, severity: v.code === "sliver" ? "warning" : "error" });
  const blocking = issues.some((i) => i.severity === "error");
  const plotArea = ring.length >= 3 ? Math.abs(ringArea(ring)) : 0;

  // Frontages are given on drawn edges; one drawn edge can become several local edges or vanish.
  const seen = new Set<number>();
  const frontages: FrontageCtx[] = [];
  for (const f of input.frontages) {
    if (seen.has(f.edgeIndex)) continue;
    seen.add(f.edgeIndex);
    const localEdges = sourceEdge.map((s, i) => (s === f.edgeIndex ? i : -1)).filter((i) => i >= 0);
    if (!localEdges.length || !(f.roadWidth > 0)) continue;
    const length = localEdges.reduce((s, e) => {
      const a = ring[e];
      const b = ring[(e + 1) % ring.length];
      return s + Math.hypot(b[0] - a[0], b[1] - a[1]);
    }, 0);
    frontages.push({ localEdges, roadWidth: f.roadWidth, roadName: f.roadName, length });
  }
  if (!frontages.length && !blocking)
    issues.push({ code: "no-frontage", message: "Mark the plot side that faces a public road and set its width.", severity: "warning" });

  // Nearest station, measured to the plot boundary.
  let stationDistance: number | null = null;
  let stationName: string | undefined;
  if (data.stations?.length && ring.length >= 3) {
    for (const s of data.stations) {
      const d = plotToStation(ring, s.rings.map((r) => r.map((p) => frame.toLocal(p))));
      if (stationDistance === null || d < stationDistance) {
        stationDistance = d;
        stationName = s.name;
      }
    }
  }

  // Zone patch containment: the rules are only for ย.10-4.
  if (data.zone?.length && ring.length >= 3) {
    const zoneRings = data.zone.map((r) => r.map((p) => frame.toLocal(p)));
    const outside = ring.filter((p) => !zoneRings.some((z) => pointInRing(p, z))).length;
    if (outside === ring.length)
      issues.push({ code: "outside-zone", message: `This plot is outside zone ${ZONE_Y10.code}-4. The figures below apply ${ZONE_Y10.code} rules and would be wrong here.`, severity: "warning" });
    else if (outside > 0)
      issues.push({ code: "straddles-zone", message: `Part of this plot is outside zone ${ZONE_Y10.code}-4. A plot across a zone line is assessed per part; this tool applies ${ZONE_Y10.code} to all of it.`, severity: "warning" });
  }

  const ev = evaluateRules({
    plotArea,
    localEdgeCount: ring.length,
    frontages,
    buildingType: input.buildingType,
    stationDistance,
    stationName,
    disabled: new Set(input.disabledRules ?? []),
  });

  let lowrise = emptyEnvelope(ev.lowrise);
  let highrise: Envelope | null = null;
  let designs: Analysis["designs"] = [];
  if (!blocking && ring.length >= 3) {
    lowrise = computeEnvelope(ring, ev.lowrise, type.typicalFloorHeight);
    highrise = ev.highrise ? computeEnvelope(ring, ev.highrise, type.typicalFloorHeight) : null;
    if (frontages.length) {
      // Orient plates to the widest road's longest edge; it is the address and the view.
      const widest = frontages.reduce((a, f) => (f.roadWidth > a.roadWidth ? f : a));
      let bestEdge = widest.localEdges[0];
      let bestLen = -1;
      for (const e of widest.localEdges) {
        const a = ring[e];
        const b = ring[(e + 1) % ring.length];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (l > bestLen) {
          bestLen = l;
          bestEdge = e;
        }
      }
      const a = ring[bestEdge];
      const b = ring[(bestEdge + 1) % ring.length];
      const mainAngle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      designs = generateDesigns({
        ring,
        plotArea,
        type,
        ev,
        lowFootprint: lowrise.footprint,
        highFootprint: highrise && multiArea(highrise.footprint) > 0 ? highrise.footprint : null,
        mainAngle,
      });
    }
  }

  return {
    input,
    origin: frame.origin,
    plotLocal: ring,
    sourceEdge,
    plotArea,
    issues,
    zone: ZONE_Y10,
    rules: ev.rules,
    envelopes: { lowrise, highrise },
    highriseBlockedReason: ev.highriseBlockedReason,
    maxGfa: ev.caps.maxGfa,
    designs,
    computeMs: performance.now() - t0,
  };
}

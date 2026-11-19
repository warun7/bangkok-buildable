import type { Design, EnvelopeSpec, Floor, FloorUse, MultiPolygon, Regime, Ring } from "../types";
import type { BuildingTypeSpec } from "../rules/buildingTypes";
import type { RuleEvaluation } from "../rules/apply";
import { EXTRA_LARGE_AREA, HIGHRISE_HEIGHT } from "../rules/apply";
import { ZONE_Y10 } from "../rules/zone";
import { difference, intersection, union } from "../geom/boolean";
import { multiArea } from "../geom/polygon";
import { fastInset, fastInsetToArea } from "./shape";
import { largestRect } from "../geom/rect";
import { makeAllowed } from "./allowed";
import { metricsFor, parkingRequired } from "./metrics";
import { needsHighriseRules, runChecks } from "./checks";

// Concept massing generator. Each strategy is a simple, explainable idea a Bangkok developer would
// recognise; the geometry follows the real allowed space floor by floor, and every option is checked
// afterwards by runChecks, which never trusts the generator.

export interface DesignInput {
  ring: Ring;
  plotArea: number;
  type: BuildingTypeSpec;
  ev: RuleEvaluation;
  lowFootprint: MultiPolygon;
  highFootprint: MultiPolygon | null;
  /** Direction of the main frontage edge, radians. */
  mainAngle: number;
}

interface Slot {
  use: FloorUse;
  h: number;
  shape: MultiPolygon;
}

interface StackResult {
  floors: Floor[];
  gfa: number;
  height: number;
}

const ROOF_MARGIN = 0.01;
/** Thinnest plate depth worth building around a courtyard, metres. */
const MIN_COURTYARD_DEPTH = 10;

type Allowed = (t: number) => MultiPolygon;
type PlateFn = (shape: MultiPolygon, top: number) => { plate: MultiPolygon; area: number };

// Strategies try many stacks on the same few shapes; clipping is the expensive part, so each
// (shape, floor-top height) plate is computed once per allowed-space function.
const plateCaches = new WeakMap<Allowed, PlateFn>();
function plateFn(allowed: Allowed): PlateFn {
  let fn = plateCaches.get(allowed);
  if (fn) return fn;
  const byShape = new Map<MultiPolygon, Map<number, { plate: MultiPolygon; area: number }>>();
  fn = (shape, top) => {
    let m = byShape.get(shape);
    if (!m) byShape.set(shape, (m = new Map()));
    const key = Math.round(top * 1000);
    let hit = m.get(key);
    if (!hit) {
      const plate = intersection(shape, allowed(top));
      hit = { plate, area: multiArea(plate) };
      m.set(key, hit);
    }
    return hit;
  };
  plateCaches.set(allowed, fn);
  return fn;
}

/** Places slots bottom-up, clipping each to the allowed region at its top. Stops at the first empty plate. */
function stack(slots: Slot[], allowed: Allowed, gfaCap: number, minPlate = 60): StackResult {
  const plateAt = plateFn(allowed);
  const floors: Floor[] = [];
  let z = 0;
  let gfa = 0;
  for (const s of slots) {
    const top = z + s.h;
    const { plate, area } = plateAt(s.shape, top);
    if (area < minPlate) break;
    if (gfa + area > gfaCap + 1e-6) break;
    floors.push({ index: floors.length, z, h: s.h, use: s.use, polygons: plate, area });
    gfa += area;
    z = top;
  }
  return { floors, gfa, height: z };
}

function storeysUnder(limit: number, ground: number, typical: number): number {
  if (limit < ground) return 0;
  return 1 + Math.floor((limit - ground) / typical + 1e-9);
}

function useCapGfa(input: DesignInput): number {
  const { type, ev } = input;
  if (type.id === "hotel" && Number.isFinite(ev.caps.hotelRooms) && type.avgUnitSize) {
    // Rooms × room size ÷ efficiency gives hotel floor area; lobby and parking come on top.
    return (ev.caps.hotelRooms * type.avgUnitSize) / type.efficiency;
  }
  if (type.id === "office" && Number.isFinite(ev.caps.officeArea)) return ev.caps.officeArea;
  return Infinity;
}

/**
 * Builds lobby + parking + main floors on given shapes, choosing the fewest parking floors that meet the
 * requirement. `mainShape` may differ from `baseShape` (tower on podium).
 */
function buildWithParking(
  input: DesignInput,
  allowed: (t: number) => MultiPolygon,
  baseShape: MultiPolygon,
  mainShape: MultiPolygon,
  opts: { maxStoreys: number; gfaCap: number; mainUseCap: number },
): StackResult & { parkingFloors: number } {
  const { type } = input;
  let best: (StackResult & { parkingFloors: number }) | null = null;
  for (let p = 0; p <= 12; p++) {
    const slots: Slot[] = [{ use: "lobby", h: type.groundFloorHeight, shape: baseShape }];
    for (let i = 0; i < p; i++) slots.push({ use: "parking", h: type.parkingFloorHeight, shape: baseShape });
    for (let i = slots.length; i < opts.maxStoreys; i++) slots.push({ use: type.use, h: type.typicalFloorHeight, shape: mainShape });
    const res = stack(slots, allowed, opts.gfaCap);
    // Respect a cap on the main use (hotel rooms / office area) by dropping top floors. Stacking is
    // prefix-stable, so removing the top floor gives the same result as stacking one slot fewer.
    let mainTotal = res.floors.filter((f) => f.use === type.use).reduce((s, f) => s + f.area, 0);
    while (res.floors.length > 1 + p && mainTotal > opts.mainUseCap + 1e-6) {
      const top = res.floors.pop()!;
      if (top.use === type.use) mainTotal -= top.area;
      res.gfa -= top.area;
      res.height = top.z;
    }
    const parkingFloorsBuilt = res.floors.filter((f) => f.use === "parking").length;
    const nonParking = res.gfa - res.floors.filter((f) => f.use === "parking").reduce((s, f) => s + f.area, 0);
    const mainArea = res.floors.filter((f) => f.use === type.use).reduce((s, f) => s + f.area, 0);
    const units = type.avgUnitSize ? Math.floor((mainArea * type.efficiency) / type.avgUnitSize) : 0;
    const largestFloor = res.floors.reduce((s, f) => Math.max(s, f.area), 0);
    const required = parkingRequired(type, { nonParkingGfa: nonParking, mainArea, units, height: res.height, gfa: res.gfa, largestFloor });
    const provided = Math.floor(
      res.floors.filter((f) => f.use === "parking").reduce((s, f) => s + f.area, 0) / type.grossAreaPerCar,
    );
    const candidate = { ...res, parkingFloors: parkingFloorsBuilt };
    if (res.floors.length <= 1 + p && p > 0) {
      // Parking ate the whole building: stop, keep the previous best.
      break;
    }
    best = candidate;
    if (provided >= required) break;
  }
  return best ?? { floors: [], gfa: 0, height: 0, parkingFloors: 0 };
}

function finish(
  input: DesignInput,
  base: { id: string; name: string; strategy: string; summary: string; regime: Regime; spec: EnvelopeSpec; footprint: MultiPolygon },
  res: StackResult,
): Design {
  const mx = metricsFor(input, res.floors);
  const { largestFloor: _lf, coverage: _cv, nonParkingGfa: _np, ...metrics } = mx;
  void _lf;
  void _cv;
  void _np;
  const design: Design = {
    id: base.id,
    name: base.name,
    strategy: base.strategy,
    summary: base.summary,
    regime: needsHighriseRules(mx) ? "highrise" : base.regime,
    floors: res.floors,
    metrics,
    checks: [],
  };
  design.checks = runChecks(input, design, mx);
  return design;
}

/** Largest ground coverage that still leaves the open space both laws ask for, given an estimated floor area. */
function coverageLimit(input: DesignInput, estGfa: number, largestFloorFactor: number): number {
  const ratio = input.type.use === "residential" ? 0.3 : 0.1;
  const byOsr = input.plotArea - (ZONE_Y10.minOsr / 100) * estGfa;
  // open ≥ ratio × largest floor; largest floor ≈ coverage × largestFloorFactor
  const byMr55 = input.plotArea / (1 + ratio * largestFloorFactor);
  return Math.max(0, Math.min(byOsr, byMr55));
}

// ---------------------------------------------------------------------------------------------------

function lowriseCourtyard(input: DesignInput): Design | null {
  const { ev, type } = input;
  const variants: { spec: EnvelopeSpec; footprint: MultiPolygon; cap: number; note: string }[] = [
    { spec: ev.lowrise, footprint: input.lowFootprint, cap: EXTRA_LARGE_AREA - 1, note: "under 10,000 m², so ordinary side distances apply" },
  ];
  if (ev.highrise && input.highFootprint)
    variants.push({ spec: { ...ev.highrise, maxHeight: ev.lowrise.maxHeight }, footprint: input.highFootprint, cap: ev.caps.extraLargeGfa, note: "over 10,000 m², so it keeps 6 m clear all round like a high-rise" });

  let best: { d: Design; note: string; courtyard: boolean } | null = null;
  for (const v of variants) {
    if (multiArea(v.footprint) < 100) continue;
    const allowed = makeAllowed(input.ring, v.spec, v.footprint);
    const maxStoreys = storeysUnder(HIGHRISE_HEIGHT - ROOF_MARGIN, type.groundFloorHeight, type.typicalFloorHeight);
    const gfaCap = Math.min(ev.caps.maxGfa, v.cap);
    const ratio = type.use === "residential" ? 0.3 : 0.1;
    const n = maxStoreys;
    const fpArea = multiArea(v.footprint);
    // With n equal floors on ground coverage A, open space is plot − A and the rules need
    // plot − A ≥ max(4% × n·A, ratio × A), so A ≤ plot / (1 + max(0.04·n, ratio)). Floors come in whole
    // plates, so the plate that fills the cap exactly is cap ÷ n; a bigger one hits the cap a floor early.
    let target = Math.min(fpArea, (gfaCap - 1) / n, input.plotArea / (1 + Math.max((ZONE_Y10.minOsr / 100) * n, ratio)));

    // Perimeter block where the plot allows: a ring of plates no deeper than daylight allows (thinner if
    // the open-space target needs it) around an open courtyard. Sized by depth, which is one inset of the
    // plain footprint per step; insetting the ring itself is far slower.
    const ringAt = (depth: number) => {
      const core = fastInset(v.footprint, depth);
      return multiArea(core) > 150 ? difference2(v.footprint, core) : null;
    };
    let shape: MultiPolygon | null = null;
    let courtyard = false;
    const deep = ringAt(type.maxPlateDepth);
    if (deep && multiArea(deep) <= target) {
      shape = deep;
      courtyard = true;
    } else if (deep) {
      const thin = ringAt(MIN_COURTYARD_DEPTH);
      if (thin && multiArea(thin) <= target) {
        let lo = MIN_COURTYARD_DEPTH;
        let hi = type.maxPlateDepth;
        shape = thin;
        for (let i = 0; i < 7; i++) {
          const mid = (lo + hi) / 2;
          const r = ringAt(mid);
          if (r && multiArea(r) <= target) {
            shape = r;
            lo = mid;
          } else hi = mid;
        }
        courtyard = true;
      }
    }
    if (!shape) shape = target >= fpArea - 1 ? v.footprint : fastInsetToArea(v.footprint, target);
    let res = buildWithParking(input, allowed, shape, shape, { maxStoreys, gfaCap, mainUseCap: useCapGfa(input) });
    // Safety net for inset tolerance: shrink slightly until the open space really passes.
    for (let iter = 0; iter < 4; iter++) {
      const metrics = metricsFor(input, res.floors);
      if (metrics.openSpace + 0.5 >= requiredOpen(input, metrics)) break;
      target *= 0.95;
      shape = fastInsetToArea(v.footprint, target);
      courtyard = false;
      res = buildWithParking(input, allowed, shape, shape, { maxStoreys, gfaCap, mainUseCap: useCapGfa(input) });
    }
    if (!res || !res.floors.length) continue;
    // The 6 m-clearance variant only makes sense if it really goes over 10,000 m².
    if (v.cap > EXTRA_LARGE_AREA && res.gfa < EXTRA_LARGE_AREA) continue;
    const d = finish(
      input,
      {
        id: "courtyard",
        name: "Low-rise perimeter block",
        strategy: "Stay under 23 m",
        summary: "",
        regime: "lowrise",
        spec: v.spec,
        footprint: v.footprint,
      },
      res,
    );
    if (!best || d.metrics.gfa > best.d.metrics.gfa) best = { d, note: v.note, courtyard };
  }
  if (!best) return null;
  best.d.name = best.courtyard ? "Low-rise courtyard block" : "Low-rise block";
  best.d.summary = `${best.d.metrics.storeys} storeys, ${best.d.metrics.height.toFixed(1)} m, just under the 23 m high-rise line. ${
    best.courtyard
      ? `Plates wrap the plot edge no deeper than ${type.maxPlateDepth} m, leaving a central courtyard`
      : "One plate per floor, sized so the open-space rules are met"
  }; ${best.note}.`;
  return best.d;
}

function difference2(a: MultiPolygon, b: MultiPolygon): MultiPolygon | null {
  const r = difference(a, b);
  return multiArea(r) > 50 ? r : null;
}

function requiredOpen(input: DesignInput, m: { gfa: number; largestFloor: number }): number {
  const ratio = input.type.use === "residential" ? 0.3 : 0.1;
  return Math.max((ZONE_Y10.minOsr / 100) * m.gfa, ratio * m.largestFloor);
}

function lowriseSlab(input: DesignInput): Design | null {
  const { ev, type } = input;
  const footprint = input.lowFootprint;
  if (multiArea(footprint) < 100) return null;
  const allowed = makeAllowed(input.ring, ev.lowrise, footprint);
  const maxStoreys = storeysUnder(HIGHRISE_HEIGHT - ROOF_MARGIN, type.groundFloorHeight, type.typicalFloorHeight);
  const gfaCap = Math.min(ev.caps.maxGfa, EXTRA_LARGE_AREA - 1);
  // Fit the bar where the upper floors are allowed, so it rises straight instead of stepping.
  const topRegion = allowed(HIGHRISE_HEIGHT - ROOF_MARGIN);
  const fitIn = multiArea(topRegion) > 150 ? topRegion : footprint;
  let maxLen = 120;
  let res: (StackResult & { parkingFloors: number }) | null = null;
  let rectInfo: ReturnType<typeof largestRect> = null;
  for (let iter = 0; iter < 8; iter++) {
    rectInfo = largestRect(fitIn, input.mainAngle, { cell: 0.5, maxDepth: type.maxPlateDepth, maxLength: maxLen, minSide: 8 });
    if (!rectInfo) return null;
    const shape: MultiPolygon = [[rectInfo.ring]];
    res = buildWithParking(input, allowed, shape, shape, { maxStoreys, gfaCap, mainUseCap: useCapGfa(input) });
    const metrics = metricsFor(input, res.floors);
    if (metrics.openSpace + 0.5 >= requiredOpen(input, metrics)) break;
    maxLen = Math.max(10, rectInfo.width * 0.9);
  }
  if (!res || !res.floors.length || !rectInfo) return null;
  const d = finish(
    input,
    { id: "slab", name: "Linear slab", strategy: "One efficient bar", summary: "", regime: "lowrise", spec: ev.lowrise, footprint },
    res,
  );
  d.summary = `A single ${rectInfo.depth.toFixed(0)} m-deep bar along the main road with a double-loaded corridor: the cheapest structure to build, with the most garden left over. ${d.metrics.storeys} storeys, under 23 m.`;
  return d;
}

function towerOnPodium(input: DesignInput): Design | null {
  const { ev, type } = input;
  if (!ev.highrise || !input.highFootprint || multiArea(input.highFootprint) < 200) return null;
  const spec = ev.highrise;
  const footprint = input.highFootprint;
  const allowed = makeAllowed(input.ring, spec, footprint);
  const gfaCap = Math.min(ev.caps.maxGfa, ev.caps.extraLargeGfa);
  // Fit the tower where it can rise to a useful height, so the sky plane trims as few floors as possible.
  let fitIn = footprint;
  for (const h of [90, 60, 40]) {
    const r = allowed(h);
    if (multiArea(r) > 400) {
      fitIn = r;
      break;
    }
  }
  const depthMax = type.maxPlateDepth + 4;
  let rect = largestRect(fitIn, input.mainAngle, { cell: 0.5, maxDepth: depthMax, maxLength: 60, minSide: 12 });
  if (!rect) return null;
  if (rect.area > type.maxTowerPlate) {
    rect = largestRect(fitIn, input.mainAngle, { cell: 0.5, maxDepth: depthMax, maxLength: Math.max(12, type.maxTowerPlate / rect.depth), minSide: 12 }) ?? rect;
  }
  const tower: MultiPolygon = [[rect.ring]];

  let podiumTarget = coverageLimit(input, gfaCap, 1);
  let res: (StackResult & { parkingFloors: number }) | null = null;
  for (let iter = 0; iter < 8; iter++) {
    const fa = multiArea(footprint);
    const inset = podiumTarget >= fa - 1 ? footprint : fastInsetToArea(footprint, Math.max(podiumTarget, rect.area));
    const podium = union(inset, tower);
    res = buildWithParking(input, allowed, podium, tower, { maxStoreys: 120, gfaCap, mainUseCap: useCapGfa(input) });
    const metrics = metricsFor(input, res.floors);
    if (metrics.openSpace + 0.5 >= requiredOpen(input, metrics)) break;
    podiumTarget *= 0.92;
  }
  if (!res || !res.floors.length) return null;
  const d = finish(
    input,
    { id: "tower", name: "Tower on podium", strategy: "Use the full FAR", summary: "", regime: "highrise", spec, footprint },
    res,
  );
  if (d.metrics.height < HIGHRISE_HEIGHT) return null; // not really a tower on this site
  const podiumFloors = d.floors.filter((f) => f.use === "lobby" || f.use === "parking").length;
  d.summary = `A ${rect.width.toFixed(0)} × ${rect.depth.toFixed(0)} m tower on a ${podiumFloors}-storey parking podium, 6 m clear of every boundary. It goes as high as the floor area cap allows${d.metrics.height > 0 ? ` (${d.metrics.height.toFixed(0)} m)` : ""}; the 2 : 1 plane trims any floor that would cross it.`;
  return d;
}

export function generateDesigns(input: DesignInput): Design[] {
  const out: Design[] = [];
  const t = towerOnPodium(input);
  if (t) out.push(t);
  const c = lowriseCourtyard(input);
  if (c) out.push(c);
  const s = lowriseSlab(input);
  if (s) out.push(s);
  return out;
}

export type { StackResult };

import type { Check, Design, MultiPolygon } from "../types";
import type { DesignInput } from "./generate";
import type { DesignMetricsX } from "./metrics";
import { EXTRA_LARGE_AREA, HIGHRISE_HEIGHT, HR_MIN_FRONTAGE, HR_MIN_ROAD, HR_MIN_ROAD_OVER_30K, RULE } from "../rules/apply";
import { Y10_MIN_PERMEABLE_SHARE, ZONE_Y10 } from "../rules/zone";
import { difference } from "../geom/boolean";
import { multiArea } from "../geom/polygon";
import { makeAllowed } from "./allowed";

// Every check is recomputed here from the floors and the rules. Nothing the generator believed about
// its own design is trusted, so a bug in a strategy shows up as a failed check, not a wrong "pass".

const m2 = (n: number) => `${Math.round(n).toLocaleString("en-US")} m²`;
const m = (n: number, d = 1) => `${n.toLocaleString("en-US", { maximumFractionDigits: d })} m`;
const pct = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;

/** Tolerance for "inside the envelope", m² per floor (polygon clipping noise). */
const ENVELOPE_TOL = 0.5;
/** Largest building length along the narrower road at a corner (MR 55 cl. 46). */
const NARROW_ROAD_LENGTH = 60;

export function needsHighriseRules(mx: { height: number; gfa: number }): boolean {
  return mx.height >= HIGHRISE_HEIGHT || mx.gfa >= EXTRA_LARGE_AREA;
}

function extentAlong(mp: MultiPolygon, ux: number, uy: number): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (const poly of mp)
    for (const p of poly[0] ?? []) {
      const s = p[0] * ux + p[1] * uy;
      lo = Math.min(lo, s);
      hi = Math.max(hi, s);
    }
  return Number.isFinite(lo) ? hi - lo : 0;
}

export function runChecks(input: DesignInput, design: Design, mx: DesignMetricsX): Check[] {
  const { ev, type, plotArea, ring } = input;
  const checks: Check[] = [];
  const high = needsHighriseRules(mx);

  // 1. FAR
  checks.push({
    id: "far",
    label: "Total floor area (FAR)",
    required: `≤ ${m2(ev.caps.maxGfa)} (FAR ${ZONE_Y10.maxFar})`,
    actual: `${m2(mx.gfa)} (FAR ${mx.far.toFixed(2)})`,
    status: mx.gfa <= ev.caps.maxGfa + 0.5 ? "pass" : "fail",
    ruleId: RULE.FAR,
  });

  // 2. OSR (zone)
  const osrNeed = (ZONE_Y10.minOsr / 100) * mx.gfa;
  checks.push({
    id: "osr",
    label: "Open space ratio (OSR)",
    required: `≥ ${pct(ZONE_Y10.minOsr)} of floor area = ${m2(osrNeed)}`,
    actual: `${m2(mx.openSpace)} (${pct(mx.osr)})`,
    status: mx.openSpace + 0.5 >= osrNeed ? "pass" : "fail",
    ruleId: RULE.OSR,
  });

  // 3. Open space (building control)
  const ratio = type.use === "residential" ? 0.3 : 0.1;
  const openNeed = ratio * mx.largestFloor;
  checks.push({
    id: "open",
    label: "Open space vs largest floor",
    required: `≥ ${ratio * 100}% of largest floor (${m2(mx.largestFloor)}) = ${m2(openNeed)}`,
    actual: m2(mx.openSpace),
    status: mx.openSpace + 0.5 >= openNeed ? "pass" : "fail",
    ruleId: RULE.OPEN,
  });

  // 4. Permeable ground: a landscape requirement we report, not geometry we draw.
  const permNeed = Y10_MIN_PERMEABLE_SHARE * Math.max(mx.openSpace, osrNeed);
  checks.push({
    id: "permeable",
    label: "Permeable planted ground",
    required: `≥ ${Y10_MIN_PERMEABLE_SHARE * 100}% of open space = ${m2(permNeed)}`,
    actual: `${m2(mx.openSpace)} uncovered; landscape design must plant at least ${m2(permNeed)}`,
    status: mx.openSpace >= permNeed ? "info" : "fail",
    ruleId: RULE.PERM,
  });

  // 5. Every floor inside the allowed space of the regime it actually falls under.
  const spec = high ? ev.highrise : ev.lowrise;
  if (!spec) {
    checks.push({
      id: "envelope",
      label: "Inside the allowed space",
      required: "a site that can take a high-rise or extra-large building",
      actual: `${m(mx.height)} tall, ${m2(mx.gfa)}: high-rise rules apply but the site does not qualify`,
      status: "fail",
      ruleId: RULE.HR_ACCESS,
    });
  } else {
    const fp = high ? input.highFootprint : input.lowFootprint;
    const allowed = makeAllowed(ring, spec, fp ?? []);
    let worst = 0;
    let worstFloor = -1;
    for (const f of design.floors) {
      const outside = multiArea(difference(f.polygons, allowed(f.z + f.h)));
      if (outside > worst) {
        worst = outside;
        worstFloor = f.index;
      }
    }
    checks.push({
      id: "envelope",
      label: high ? "Inside the high-rise allowed space" : "Inside the low-rise allowed space",
      required: high ? "every floor within setbacks, 6 m clearance and the 2 : 1 plane" : "every floor within setbacks, side distances, the 2 : 1 plane and under 23 m",
      actual: worst <= ENVELOPE_TOL ? `all ${design.floors.length} floors inside` : `floor ${worstFloor + 1} is ${m2(worst)} outside`,
      status: worst <= ENVELOPE_TOL ? "pass" : "fail",
      ruleId: RULE.SKY,
    });
  }

  // 6. High-rise / extra-large road access
  checks.push({
    id: "hr-access",
    label: "Road access for high-rise",
    required: high ? `plot side ≥ ${HR_MIN_FRONTAGE} m on a road ≥ ${HR_MIN_ROAD} m` : "not needed (under 23 m and under 10,000 m²)",
    actual: ev.bestRoad.width > 0 ? `${m(ev.bestRoad.length, 0)} on a ${m(ev.bestRoad.width)} road` : "no road side of 12 m or more",
    status: !high ? "info" : ev.caps.highriseAccess ? "pass" : "fail",
    ruleId: RULE.HR_ACCESS,
  });
  if (high && mx.gfa > 30000) {
    checks.push({
      id: "hr-30k",
      label: "Road width for over 30,000 m²",
      required: `road ≥ ${HR_MIN_ROAD_OVER_30K} m`,
      actual: `${m(ev.bestRoad.width)} road`,
      status: mx.gfa <= ev.caps.extraLargeGfa ? "pass" : "fail",
      ruleId: RULE.HR_ACCESS,
    });
  }

  // 7. Use permitted in the zone
  if (type.id === "hotel") {
    const rooms = mx.rooms ?? 0;
    checks.push({
      id: "use",
      label: "Hotel size permitted in ย.10",
      required: Number.isFinite(ev.caps.hotelRooms) ? `≤ ${ev.caps.hotelRooms} rooms` : "any size (12 m road or station nearby)",
      actual: `${rooms} rooms`,
      status: rooms <= ev.caps.hotelRooms ? "pass" : "fail",
      ruleId: RULE.USE,
    });
  } else if (type.id === "office") {
    const area = mx.gfaByUse.office ?? 0;
    checks.push({
      id: "use",
      label: "Office size permitted in ย.10",
      required: Number.isFinite(ev.caps.officeArea) ? `≤ ${m2(ev.caps.officeArea)} office area` : "any size (12 m road or station nearby)",
      actual: `${m2(area)} office area`,
      status: area <= ev.caps.officeArea + 0.5 ? "pass" : "fail",
      ruleId: RULE.USE,
    });
  } else {
    checks.push({ id: "use", label: "Condominium permitted in ย.10", required: "permitted", actual: "condominium", status: "pass", ruleId: RULE.USE });
  }

  // 8. Parking
  checks.push({
    id: "parking",
    label: "Car parking",
    required: `${mx.parkingRequired.toLocaleString("en-US")} cars`,
    actual: `${mx.parkingProvided.toLocaleString("en-US")} cars on ${design.floors.filter((f) => f.use === "parking").length} parking floors`,
    status: mx.parkingProvided >= mx.parkingRequired ? "pass" : "fail",
    ruleId: RULE.PARK,
  });

  // 9. Corner of unequal roads: length along the narrower road (cl. 46)
  for (const f of ev.narrowerFrontages) {
    const e = f.localEdges[0];
    const a = ring[e];
    const b = ring[(e + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const along = extentAlong(mx.coverage, (b[0] - a[0]) / len, (b[1] - a[1]) / len);
    checks.push({
      id: `narrow-${e}`,
      label: `Length along ${f.roadName ?? "the narrower road"}`,
      required: `≤ ${NARROW_ROAD_LENGTH} m (wider road sets the height)`,
      actual: m(along),
      status: along <= NARROW_ROAD_LENGTH + 0.05 ? "pass" : "fail",
      ruleId: RULE.SKY,
    });
  }

  // 10. EIA: thresholds not verified from primary text, so this is a warning at most.
  const eiaLikely =
    (type.id === "condo" && ((mx.units ?? 0) >= 80 || mx.gfa >= 4000)) || (type.id === "hotel" && (mx.rooms ?? 0) >= 80);
  checks.push({
    id: "eia",
    label: "Environmental impact assessment",
    required: "commonly cited: 80 units or rooms, or 4,000 m²",
    actual: eiaLikely ? "likely required before the permit" : "probably not required",
    status: eiaLikely ? "warn" : "info",
    ruleId: RULE.EIA,
  });

  void plotArea;
  return checks;
}

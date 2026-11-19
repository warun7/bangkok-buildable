import type { AppliedRule, BuildingTypeId, EdgeSetback, EnvelopeSpec, SkyPlane } from "../types";
import { BKK2544, MR33, MR55, MR7, PLAN, PLAN_AMEND, cite } from "./sources";
import {
  Y10_EXEMPT_FRONTAGE,
  Y10_EXEMPT_ROAD_WIDTH,
  Y10_HOTEL_ROOM_LIMIT,
  Y10_MIN_PERMEABLE_SHARE,
  Y10_OFFICE_AREA_LIMIT,
  Y10_STATION_RADIUS,
  ZONE_Y10,
} from "./zone";
import { roadSetback, roadSetbackRule } from "./roads";
import { BUILDING_TYPES } from "./buildingTypes";

// Thresholds from MR 33 / MR 55 / MR 7 (see research/RULES.md).
export const HIGHRISE_HEIGHT = 23;
export const EXTRA_LARGE_AREA = 10000;
export const HR_MIN_ROAD = 10;
export const HR_MIN_ROAD_OVER_30K = 18;
export const HR_MIN_FRONTAGE = 12;
export const HR_CLEARANCE = 6;
export const SIDE_OVER_9M = 3;
export const SKY_SLOPE = 2;
/** Not a legal limit: ย.10 has no plan height limit. Keeps the geometry finite. */
export const TECHNICAL_MAX_HEIGHT = 300;

export const RULE = {
  FAR: "Z-FAR",
  OSR: "Z-OSR",
  PERM: "Z-PERM",
  USE: "Z-USE",
  BONUS: "Z-BONUS",
  L2: "Z-L2",
  ROAD: "B-SETBACK-ROAD",
  SKY: "B-SKY",
  SIDE: "B-SIDE",
  OPEN: "B-OPEN",
  HR_ACCESS: "B-HR-ACCESS",
  HR_CLEAR: "B-HR-CLEAR",
  LOWRISE_CAP: "B-HR-DEF",
  PARK: "B-PARK",
  LARGE: "B-LARGE",
  EIA: "X-EIA",
} as const;

/** Rules the user may switch off to see what they do to the envelope. */
export const TOGGLEABLE = new Set<string>([RULE.ROAD, RULE.SKY, RULE.SIDE, RULE.HR_CLEAR]);

export interface FrontageCtx {
  /** Local edge indices that make up this frontage. */
  localEdges: number[];
  roadWidth: number;
  roadName?: string;
  /** Total length of the frontage along the plot, metres. */
  length: number;
}

export interface SiteContext {
  plotArea: number;
  localEdgeCount: number;
  frontages: FrontageCtx[];
  buildingType: BuildingTypeId;
  /** Metres from the plot to the nearest mass-transit platform, if known. */
  stationDistance: number | null;
  stationName?: string;
  disabled: Set<string>;
}

export interface Caps {
  maxGfa: number;
  /** Most rooms a hotel may have here (Infinity if unrestricted). */
  hotelRooms: number;
  /** Most office operating area here (Infinity if unrestricted). */
  officeArea: number;
  /** Largest total floor area a high-rise/extra-large building may have given its road. */
  extraLargeGfa: number;
  /** True if the site may host a building >= 23 m or >= 10,000 m². */
  highriseAccess: boolean;
}

export interface RuleEvaluation {
  rules: AppliedRule[];
  lowrise: EnvelopeSpec;
  highrise: EnvelopeSpec | null;
  highriseBlockedReason?: string;
  caps: Caps;
  /** Widest qualifying road (frontage >= 12 m), 0 if none. */
  bestRoad: { width: number; length: number; name?: string };
  nearStation: boolean;
  /** Frontages governed by the wider-road rule (cl. 45-46), for the 60 m check. */
  narrowerFrontages: FrontageCtx[];
}

const m = (n: number, d = 1) => `${n.toLocaleString("en-US", { maximumFractionDigits: d })} m`;
const m2 = (n: number) => `${Math.round(n).toLocaleString("en-US")} m²`;

export function evaluateRules(ctx: SiteContext): RuleEvaluation {
  const { disabled } = ctx;
  const type = BUILDING_TYPES[ctx.buildingType];
  const rules: AppliedRule[] = [];

  // --- access facts -------------------------------------------------------
  const qualifying = ctx.frontages.filter((f) => f.length >= HR_MIN_FRONTAGE);
  const best = qualifying.reduce<FrontageCtx | null>((a, f) => (!a || f.roadWidth > a.roadWidth ? f : a), null);
  const bestRoad = { width: best?.roadWidth ?? 0, length: best?.length ?? 0, name: best?.roadName };
  const nearStation = ctx.stationDistance !== null && ctx.stationDistance <= Y10_STATION_RADIUS;
  const on12mRoad = ctx.frontages.some((f) => f.length >= Y10_EXEMPT_FRONTAGE && f.roadWidth >= Y10_EXEMPT_ROAD_WIDTH);
  const useExempt = on12mRoad || nearStation;
  const highriseAccess = bestRoad.width >= HR_MIN_ROAD;
  const extraLargeGfa = !highriseAccess ? EXTRA_LARGE_AREA - 1 : bestRoad.width >= HR_MIN_ROAD_OVER_30K ? Infinity : 30000;

  const maxGfa = ZONE_Y10.maxFar * ctx.plotArea;
  const caps: Caps = {
    maxGfa,
    hotelRooms: useExempt ? Infinity : Y10_HOTEL_ROOM_LIMIT,
    officeArea: useExempt ? Infinity : Y10_OFFICE_AREA_LIMIT,
    extraLargeGfa,
    highriseAccess,
  };

  // --- zone rules -----------------------------------------------------------
  rules.push({
    id: RULE.FAR,
    title: "Floor area ratio (FAR)",
    titleTh: "อัตราส่วนพื้นที่อาคารรวมต่อพื้นที่ดิน",
    value: `max ${ZONE_Y10.maxFar} : 1 → ${m2(maxGfa)} total floor area, parking included`,
    kind: "cap",
    citation: cite(PLAN, "cl. 17 para 3 (1); definition cl. 4"),
    applies: true,
  });
  rules.push({
    id: RULE.OSR,
    title: "Open space ratio (OSR)",
    titleTh: "อัตราส่วนของที่ว่างต่อพื้นที่อาคารรวม",
    value: `uncovered open space ≥ ${ZONE_Y10.minOsr}% of total floor area`,
    kind: "check",
    citation: cite(PLAN, "cl. 17 para 3 (2); definition cl. 4"),
    applies: true,
    note: "Bangkok measures OSR against total floor area, not plot area: the taller you build, the more open ground you must keep.",
  });
  rules.push({
    id: RULE.PERM,
    title: "Permeable planted ground",
    titleTh: "พื้นที่น้ำซึมผ่านได้",
    value: `≥ ${Y10_MIN_PERMEABLE_SHARE * 100}% of the open space`,
    kind: "check",
    citation: cite(PLAN, "cl. 17 para 3 (2)"),
    applies: true,
  });

  const useRule = (): AppliedRule => {
    const why = useExempt
      ? on12mRoad
        ? `allowed without limit: plot has ≥ ${Y10_EXEMPT_FRONTAGE} m on a road with ROW ≥ ${Y10_EXEMPT_ROAD_WIDTH} m`
        : `allowed without limit: within ${Y10_STATION_RADIUS} m of ${ctx.stationName ?? "a mass-transit station"}`
      : null;
    if (ctx.buildingType === "condo")
      return {
        id: RULE.USE,
        title: "Use permitted: condominium",
        titleTh: "อาคารชุดพักอาศัย",
        value: "permitted in ย.10, no size or road condition",
        kind: "check",
        citation: cite(PLAN, "cl. 17 para 2 (not in the prohibited list)"),
        applies: true,
      };
    if (ctx.buildingType === "hotel")
      return {
        id: RULE.USE,
        title: "Use permitted: hotel",
        titleTh: "โรงแรม",
        value: why ?? `max ${Y10_HOTEL_ROOM_LIMIT} rooms (needs ROW ≥ ${Y10_EXEMPT_ROAD_WIDTH} m or a station within ${Y10_STATION_RADIUS} m for more)`,
        kind: "cap",
        citation: cite(PLAN, "cl. 17 para 2 (8); cl. 36–37"),
        applies: true,
      };
    return {
      id: RULE.USE,
      title: "Use permitted: office",
      titleTh: "สำนักงาน",
      value: why ?? `max ${m2(Y10_OFFICE_AREA_LIMIT)} operating area (needs ROW ≥ ${Y10_EXEMPT_ROAD_WIDTH} m or a station within ${Y10_STATION_RADIUS} m for more)`,
      kind: "cap",
      citation: cite(PLAN, "cl. 17 para 2 (10); cl. 36–37"),
      applies: true,
    };
  };
  rules.push(useRule());

  // --- envelope rules -------------------------------------------------------
  const roadEdges = new Map<number, FrontageCtx>();
  for (const f of ctx.frontages) for (const e of f.localEdges) roadEdges.set(e, f);

  const widths = [...new Set(ctx.frontages.map((f) => Math.round(f.roadWidth * 100) / 100))];
  const unequal = widths.length > 1;
  const maxW = Math.max(0, ...ctx.frontages.map((f) => f.roadWidth));
  const governing = unequal ? ctx.frontages.filter((f) => f.roadWidth === maxW) : ctx.frontages;
  const narrowerFrontages = unequal ? ctx.frontages.filter((f) => f.roadWidth < maxW) : [];

  const roadSetbackOn = !disabled.has(RULE.ROAD);
  const skyOn = !disabled.has(RULE.SKY);
  const sideOn = !disabled.has(RULE.SIDE);
  const clearOn = !disabled.has(RULE.HR_CLEAR);

  rules.push({
    id: RULE.ROAD,
    title: "Building line from the road",
    titleTh: "ระยะร่นอาคารจากถนนสาธารณะ",
    value: ctx.frontages.length
      ? ctx.frontages.map((f) => `${f.roadName ?? "road"} (${m(f.roadWidth)}): ${roadSetbackRule(f.roadWidth)}`).join("; ")
      : "no road frontage set",
    kind: "envelope",
    citation: cite(MR55, "cl. 41 (also Bangkok Ordinance 2544 cl. 50)"),
    applies: ctx.frontages.length > 0,
  });
  rules.push({
    id: RULE.SKY,
    title: "Height vs road width (2 : 1 plane)",
    titleTh: "ความสูงไม่เกิน 2 เท่าของระยะราบถึงแนวเขตถนนด้านตรงข้าม",
    value: unequal
      ? `height ≤ 2 × distance to the far side of the wider road (${m(maxW)}); building length along the narrower road ≤ 60 m`
      : "height at any point ≤ 2 × the perpendicular distance to the far side of the nearest road",
    kind: "envelope",
    citation: cite(MR55, unequal ? "cl. 44, 45–46 (wider road governs)" : "cl. 44 (also BKK Ordinance cl. 49)"),
    applies: ctx.frontages.length > 0,
  });
  rules.push({
    id: RULE.SIDE,
    title: "Distance from neighbouring plots",
    titleTh: "ระยะผนังที่มีช่องเปิดห่างจากเขตที่ดิน",
    value: `${SIDE_OVER_9M} m for walls with windows on buildings over 9 m and under 23 m (2 m if ≤ 9 m)`,
    kind: "envelope",
    citation: cite(MR55, "cl. 50"),
    applies: true,
    note: "Assumes windows on every façade. Blank party walls could sit closer (≥ 0.5 m, or on the line up to 15 m with the neighbour's consent).",
  });
  rules.push({
    id: RULE.LOWRISE_CAP,
    title: "High-rise threshold",
    titleTh: "อาคารสูง",
    value: `${HIGHRISE_HEIGHT} m to the roof deck; ${m2(EXTRA_LARGE_AREA)} total makes a building "extra-large" with the same duties`,
    kind: "info",
    citation: cite(MR33, "cl. 1 (definitions)"),
    applies: true,
  });
  rules.push({
    id: RULE.HR_ACCESS,
    title: "Road access for high-rise / extra-large",
    titleTh: "ที่ดินติดถนนสาธารณะสำหรับอาคารสูง/อาคารขนาดใหญ่พิเศษ",
    value: highriseAccess
      ? `met: ${m(bestRoad.length, 0)} frontage on a ${m(bestRoad.width)} road${extraLargeGfa === 30000 ? " (≤ 30,000 m² total; > 30,000 m² needs ROW ≥ 18 m)" : ""}`
      : `not met: needs a plot side ≥ ${HR_MIN_FRONTAGE} m on a road with ROW ≥ ${HR_MIN_ROAD} m${best ? ` (widest qualifying road is ${m(bestRoad.width)})` : ""}`,
    kind: "cap",
    citation: cite(MR33, "cl. 2"),
    applies: true,
  });
  rules.push({
    id: RULE.HR_CLEAR,
    title: "6 m clear around high-rise / extra-large",
    titleTh: "ระยะห่าง 6 เมตร และถนนรถดับเพลิงโดยรอบ",
    value: `outer edge ≥ ${HR_CLEARANCE} m from neighbouring land and public roads; unroofed fire-truck road ≥ 6 m around the building`,
    kind: "envelope",
    citation: cite(MR33, "cl. 3–4"),
    applies: highriseAccess,
    note: highriseAccess ? undefined : "Only relevant if the site can take a high-rise.",
  });
  rules.push({
    id: RULE.OPEN,
    title: "Open space (building control)",
    titleTh: "ที่ว่างอันปราศจากสิ่งปกคลุม",
    value: type.use === "residential" ? "≥ 30% of the largest single floor" : "≥ 10% of the largest single floor",
    kind: "check",
    citation: cite(MR55, "cl. 33"),
    applies: true,
  });
  rules.push({
    id: RULE.PARK,
    title: "Car parking (Bangkok)",
    titleTh: "ที่จอดรถยนต์",
    value:
      ctx.buildingType === "condo"
        ? "1 per unit of ≥ 60 m²; large buildings at least 1 per 120 m² of floor area"
        : ctx.buildingType === "office"
          ? "1 per 60 m² of office floor area"
          : "1 per 10 m² of hall + 1 per 20 m² of commercial space; large buildings at least 1 per 120 m²",
    kind: "check",
    citation: cite(MR7, "cl. 2–3 (1)"),
    applies: true,
  });
  rules.push({
    id: RULE.BONUS,
    title: "FAR bonus",
    titleTh: "มาตรการเพิ่มอัตราส่วนพื้นที่อาคารรวม",
    value: "up to +20% for affordable housing, public open space, park-and-ride near stations, rainwater retention or certified green buildings",
    kind: "info",
    citation: cite(PLAN, "cl. 51–57"),
    applies: false,
    note: "Not applied: each bonus needs a specific commitment from the developer.",
  });
  rules.push({
    id: RULE.L2,
    title: "Roadside planting strip (ล.2)",
    titleTh: "ที่โล่งริมถนน ล.2",
    value: "2 m planting strip from the right-of-way on the 40 listed roads",
    kind: "envelope",
    citation: cite(PLAN, "cl. 40 (1), open-space annex"),
    applies: false,
    note: "None of the listed roads runs through zone ย.10-4.",
  });
  rules.push({
    id: RULE.EIA,
    title: "Environmental impact assessment",
    titleTh: "รายงาน EIA",
    value: "large condominiums and hotels need an EIA approved before the building permit",
    kind: "info",
    citation: { doc: "Ministry of Natural Resources & Environment notification (ONEP)", clause: "thresholds not verified from primary text" },
    applies: true,
    note: "Commonly cited thresholds: 80 units/rooms or 4,000 m². Shown as a warning only.",
  });
  rules.push({
    id: "Z-PLAN",
    title: "Plan in force",
    value: "Ministerial Regulation B.E. 2556; the B.E. 2569 amendment changes only factory exemptions",
    kind: "info",
    citation: cite(PLAN_AMEND, "cl. 3–28 (factory items only)"),
    applies: true,
  });
  void BKK2544;

  // --- envelope specs ---------------------------------------------------------
  const setbacksFor = (regime: "lowrise" | "highrise"): EdgeSetback[] => {
    const out: EdgeSetback[] = [];
    for (let e = 0; e < ctx.localEdgeCount; e++) {
      const f = roadEdges.get(e);
      if (f) {
        if (roadSetbackOn) out.push({ edgeIndex: e, distance: roadSetback(f.roadWidth), ruleId: RULE.ROAD });
      } else if (sideOn) {
        out.push({ edgeIndex: e, distance: SIDE_OVER_9M, ruleId: RULE.SIDE });
      }
    }
    void regime;
    return out;
  };
  const skyPlanes: SkyPlane[] = skyOn
    ? governing.flatMap((f) => f.localEdges.map((e) => ({ edgeIndex: e, roadWidth: f.roadWidth, slope: SKY_SLOPE, ruleId: RULE.SKY })))
    : [];

  const lowrise: EnvelopeSpec = {
    regime: "lowrise",
    setbacks: setbacksFor("lowrise"),
    skyPlanes,
    maxHeight: HIGHRISE_HEIGHT - 0.01,
    maxHeightRuleId: RULE.LOWRISE_CAP,
  };

  let highrise: EnvelopeSpec | null = null;
  let highriseBlockedReason: string | undefined;
  if (highriseAccess) {
    highrise = {
      regime: "highrise",
      setbacks: setbacksFor("highrise"),
      uniformClearance: clearOn ? { distance: HR_CLEARANCE, ruleId: RULE.HR_CLEAR } : undefined,
      skyPlanes,
      maxHeight: TECHNICAL_MAX_HEIGHT,
      maxHeightRuleId: "none",
    };
  } else if (ctx.frontages.length === 0) {
    highriseBlockedReason = "Mark at least one plot edge as facing a public road. Without road access nothing can be permitted.";
  } else {
    highriseBlockedReason = best
      ? `A building of 23 m or more (or 10,000 m² or more) needs a plot side of at least 12 m on a public road at least 10 m wide (MR 33 cl. 2). The widest road here is ${m(bestRoad.width)}, so the building must stay under 23 m and under 10,000 m².`
      : `A building of 23 m or more needs a plot side of at least 12 m on a public road at least 10 m wide (MR 33 cl. 2). No frontage here is 12 m long, so the building must stay under 23 m and under 10,000 m².`;
  }

  return { rules, lowrise, highrise, highriseBlockedReason, caps, bestRoad, nearStation, narrowerFrontages };
}

// Road right-of-way knowledge.
//
// 1. Building line from a public road (MR 55 cl. 41; Bangkok Ordinance 2544 cl. 50) for buildings over
//    2 storeys or 8 m: road < 10 m -> 6 m from the road centreline; 10-20 m -> 1/10 of the width from the
//    road boundary; > 20 m -> 2 m from the road boundary.
// 2. The plan annex (lists 11-14) names the public roads with right-of-way >= 10 / 12 / 16 / 30 m. We use
//    it as an official minimum for roads around zone ย.10-4. A surveyed width always wins.

/** Distance from the plot's road edge (taken as the road boundary) to the building line, metres. */
export function roadSetback(roadWidth: number): number {
  if (roadWidth < 10) return Math.max(0, 6 - roadWidth / 2);
  if (roadWidth <= 20) return roadWidth / 10;
  return 2;
}

export function roadSetbackRule(roadWidth: number): string {
  if (roadWidth < 10) return `road under 10 m: 6 m from the centreline (${fmt(Math.max(0, 6 - roadWidth / 2))} m from the plot edge)`;
  if (roadWidth <= 20) return `road 10–20 m: 1/10 of the width (${fmt(roadWidth / 10)} m) from the road boundary`;
  return "road over 20 m: 2 m from the road boundary";
}

function fmt(n: number) {
  return (Math.round(n * 100) / 100).toString();
}

export interface KnownRoad {
  /** Lower-case fragments matched against OSM names (English or Thai). */
  match: string[];
  label: string;
  labelTh: string;
  /** Minimum legal right-of-way from the plan annex list, metres. */
  listedMin: number;
  list: string;
  /** Width we suggest by default (the listed minimum; the true width may be larger). */
  suggested: number;
}

export const KNOWN_ROADS: KnownRoad[] = [
  { match: ["sukhumvit road", "ถนนสุขุมวิท", "thanon sukhumvit"], label: "Sukhumvit Road", labelTh: "ถนนสุขุมวิท", listedMin: 30, list: "Plan annex list 14 (ROW ≥ 30 m)", suggested: 30 },
  { match: ["phetchaburi", "เพชรบุรี"], label: "Phetchaburi Road", labelTh: "ถนนเพชรบุรี", listedMin: 30, list: "Plan annex list 14 (ROW ≥ 30 m)", suggested: 30 },
  { match: ["asok montri", "asoke montri", "อโศกมนตรี", "sukhumvit 21", "สุขุมวิท 21"], label: "Soi Sukhumvit 21 (Asok Montri)", labelTh: "ซอยสุขุมวิท 21 (ถนนอโศกมนตรี)", listedMin: 16, list: "Plan annex list 13 (ROW ≥ 16 m)", suggested: 16 },
  { match: ["sukhumvit 39", "สุขุมวิท 39", "phrom phong", "prompong", "พร้อมพงษ์"], label: "Soi Sukhumvit 39 (Phrom Phong)", labelTh: "ซอยสุขุมวิท 39 (ซอยพร้อมพงษ์)", listedMin: 16, list: "Plan annex list 13 (ROW ≥ 16 m)", suggested: 16 },
  { match: ["sukhumvit 55", "สุขุมวิท 55", "thong lo", "thonglor", "ทองหล่อ"], label: "Soi Sukhumvit 55 (Thong Lo)", labelTh: "ซอยสุขุมวิท 55 (ซอยทองหล่อ)", listedMin: 16, list: "Plan annex list 13 (ROW ≥ 16 m)", suggested: 16 },
  { match: ["sukhumvit 63", "สุขุมวิท 63", "ekkamai", "เอกมัย"], label: "Soi Sukhumvit 63 (Ekkamai)", labelTh: "ซอยสุขุมวิท 63 (ถนนเอกมัย)", listedMin: 16, list: "Plan annex list 13 (ROW ≥ 16 m)", suggested: 16 },
  { match: ["rama iv", "rama 4", "พระรามที่ 4", "พระราม 4"], label: "Rama IV Road", labelTh: "ถนนพระรามที่ 4", listedMin: 16, list: "Plan annex list 13 (ROW ≥ 16 m)", suggested: 16 },
];

export function matchKnownRoad(name: string | undefined): KnownRoad | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase().replace(/\s+/g, " ");
  // Order matters: check specific sois before the generic "sukhumvit road".
  const specific = KNOWN_ROADS.filter((r) => r.label !== "Sukhumvit Road");
  const hit = specific.find((r) => r.match.some((m) => n.includes(m)));
  if (hit) return hit;
  const isSoi = /\bsoi\b|ซอย/.test(n);
  if (!isSoi) return KNOWN_ROADS.find((r) => r.label === "Sukhumvit Road" && r.match.some((m) => n.includes(m)));
  return undefined;
}

/** Right-of-way estimate by OSM class when the road is not in the plan annex. Clearly an estimate. */
export const CLASS_WIDTH_ESTIMATE: Record<string, number> = {
  motorway: 40,
  trunk: 40,
  primary: 30,
  secondary: 20,
  tertiary: 12,
  minor: 8,
  residential: 8,
  service: 6,
  track: 4,
  path: 4,
};

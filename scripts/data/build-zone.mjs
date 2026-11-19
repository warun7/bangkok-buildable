// Builds src/data/zone-y10-4.geojson: Bangkok Comprehensive Plan B.E. 2556 zone patch ย.10-4,
// traced from the written boundary using OSM geometry (see research/R4-site-data.md).
// Usage: node scripts/data/build-zone.mjs <raw zone.json> [out.geojson]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as G from "./geo.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const rawPath = process.argv[2];
const outPath = process.argv[3] ?? resolve(here, "../../src/data/zone-y10-4.geojson");
if (!rawPath) throw new Error("usage: build-zone.mjs <raw zone.json> [out]");
const els = JSON.parse(readFileSync(rawPath, "utf8")).elements;

// Offsets in metres (approximate half widths, see research notes).
const SUKH_HALF_ROW_TO_NORTH_EDGE = 15; // Sukhumvit Road: centreline to north edge
const SOI_HALF_WIDTH = 4; // sois: centreline to side
const CANAL_HALF_WIDTH = 5; // Khlong Saen Saep: centreline to south bank
const ASOK_HALF_ROW = 10; // Asok Montri (Soi 21) right-of-way half width
const SETBACK_FROM_ASOK = 200; // legal: line 200 m east of the Asok Montri ROW east edge

// Points (xy) of ways matching `pred` that lie inside the lon/lat box [w,e,s,n].
function collect(pred, [w, e, s, n]) {
  const out = [];
  for (const el of els) {
    if (!el.geometry || !pred(el.tags || {})) continue;
    for (const g of el.geometry) if (g.lon >= w && g.lon <= e && g.lat >= s && g.lat <= n) out.push(G.toXY([g.lon, g.lat]));
  }
  return out;
}

// ---- centrelines -------------------------------------------------------------------------
// Sukhumvit Road: mapped as paired carriageways, so sort by x and smooth over 15 m.
const SUK = G.smoothByKey(
  G.dedupeSort(collect((t) => t.name === "ถนนสุขุมวิท" && t.highway === "primary", [100.56, 100.583, 13.7225, 13.74]), 0),
  0,
  SUKH_HALF_ROW_TO_NORTH_EDGE,
);
// Asok Montri Road (Soi Sukhumvit 21), N-S, same treatment on y.
const ASOK = G.smoothByKey(
  G.dedupeSort(collect((t) => t.name === "ถนนอโศกมนตรี", [100.56, 100.57, 13.7355, 13.752]), 1),
  1,
  30,
);
// Soi Sukhumvit 55 (Soi Thong Lo), south of the planned link.
const S55 = G.smoothByKey(
  G.dedupeSort(collect((t) => t.name === "ซอยสุขุมวิท 55", [100.578, 100.584, 13.7225, 13.735]), 1),
  1,
  15,
);
// Soi Sukhumvit 49, from the 49/4 junction northwards to the canal.
const S49 = G.smoothByKey(
  G.dedupeSort(collect((t) => t.name === "ซอยสุขุมวิท 49", [100.5755, 100.579, 13.734, 13.746]), 1),
  1,
  15,
);
// Soi Sukhumvit 49/4: east-west, the south side of ข 41.
const S494 = G.dedupeSort(collect((t) => t.name === "ซอยสุขุมวิท 49/4", [100.576, 100.581, 13.733, 13.736]), 0);
// Khlong Saen Saep (canal), E-W.
const CANAL = G.dedupeSort(collect((t) => t.waterway === "canal", [100.56, 100.58, 13.743, 13.75]), 0);
// Campus outline (Srinakharinwirot Prasarnmit), closed way.
const campusEl = els.find((el) => el.type === "way" && el.id === 329745926);
const CAMPUS = campusEl.geometry.slice(0, -1).map((g) => G.toXY([g.lon, g.lat]));

// Remove carriageway zigzags (a few metres) before offsetting, or the offset folds over itself.
const clean = (line) => G.simplify(line, 3);
// ---- offset lines -----------------------------------------------------------------------
const SU_N = G.offsetPolyline(clean(SUK), SUKH_HALF_ROW_TO_NORTH_EDGE, [0, 1]);
const S55W = G.offsetPolyline(clean(S55), SOI_HALF_WIDTH, [-1, 0]);
// Soi 49 is not mapped all the way to the canal (gap of ~60 m), so extend its west side northwards.
const S49W0 = G.offsetPolyline(clean(S49), SOI_HALF_WIDTH, [-1, 0]);
const S49W = [...S49W0, G.add(S49W0.at(-1), G.mul(G.unit(G.sub(S49W0.at(-1), S49W0.at(-2))), 250))];
const L41S = G.offsetPolyline(S494, SOI_HALF_WIDTH, [0, -1]);
const CAN_S = G.offsetPolyline(CANAL, CANAL_HALF_WIDTH, [0, -1]);
const WL0 = G.offsetPolyline(clean(ASOK), ASOK_HALF_ROW + SETBACK_FROM_ASOK, [1, 0]);

const show = (p) => G.toLL(p).map((v) => v.toFixed(5)).join(",");
const nearest = (list, hint) => list.reduce((b, c) => (G.dist(c.pt, hint) < G.dist(b.pt, hint) ? c : b));
const hint = (ll) => G.toXY(ll);
// Extend a polyline by d metres at both ends (the west line must reach Sukhumvit Road in the south).
const extendBoth = (line, d) => {
  const a = line[0], b = line.at(-1);
  return [G.add(a, G.mul(G.unit(G.sub(a, line[1])), d)), ...line, G.add(b, G.mul(G.unit(G.sub(b, line.at(-2))), d))];
};
const WL = extendBoth(WL0, 400);

// Link: extend the 49/4 south side east and west so it meets Soi 55 and Soi 49 (the planned road ข 41).
const ext = (line, d) => {
  const a = line[0];
  const b = line.at(-1);
  const e = G.add(b, G.mul(G.unit(G.sub(b, line.at(-2))), d));
  const st = G.add(a, G.mul(G.unit(G.sub(a, line[1])), d));
  return [st, ...line, e];
};
const LINK = ext(L41S, 400);

const V1 = nearest(G.polyIntersections(WL, SU_N), hint([100.5637, 13.7348]));
const V2 = nearest(G.polyIntersections(S55W, SU_N), hint([100.5795, 13.7245]));
const V3 = nearest(G.polyIntersections(LINK, S55W), hint([100.582, 13.734]));
const V4 = nearest(G.polyIntersections(LINK, S49W), hint([100.5771, 13.7347]));
const V5 = nearest(G.polyIntersections(S49W, CAN_S), hint([100.5772, 13.7455]));

// Diagnostics for the intersections that define the ring.
console.log("V1 west line x Sukhumvit north edge", show(V1.pt));
console.log("V2 Soi 55 west x Sukhumvit north edge", show(V2.pt));
console.log("V3 planned link x Soi 55 west", show(V3.pt));
console.log("V4 planned link x Soi 49 west", show(V4.pt));
console.log("V5 Soi 49 west x canal south bank", show(V5.pt));

// Campus: the zone boundary runs along the campus edge (campus is not in the zone).
// Entry: the lower crossing of the west line with the campus outline. Exit: the campus vertex furthest east (NE corner on the canal).
const campusCross = G.polyIntersections(WL, [...CAMPUS, CAMPUS[0]]);
const V7 = campusCross.reduce((b, c) => (c.pt[1] < b.pt[1] ? c : b)).pt;
const NE = CAMPUS.reduce((b, p) => (p[0] > b[0] ? p : b));
console.log("V7 west line x campus", show(V7), " campus NE", show(NE));

// Which way round the campus outline? The one that stays east of the west line.
const xAtY = (line, y) => {
  for (let i = 0; i < line.length - 1; i++) {
    const [a, b] = [line[i], line[i + 1]];
    if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) return a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
  }
  return NaN;
};
const westCount = (path) => path.slice(1, -1).filter((p) => p[0] < xAtY(WL, p[1])).length;
const fwd = G.ringSubpath(CAMPUS, V7, NE, true);
const bwd = G.ringSubpath(CAMPUS, V7, NE, false);
const campusPath = westCount(fwd) <= westCount(bwd) ? fwd : bwd;
console.log("campus path vertices", campusPath.length, "west-of-line vertices", Math.min(westCount(fwd), westCount(bwd)));

const ring0 = [
  ...G.subpath(WL, V1.pt, V7),
  ...campusPath,
  ...G.subpath(CAN_S, NE, V5.pt),
  ...G.subpath(S49W, V5.pt, V4.pt),
  ...G.subpath(LINK, V4.pt, V3.pt),
  ...G.subpath(S55W, V3.pt, V2.pt),
  ...G.subpath(SU_N, V2.pt, V1.pt),
];
// Drop consecutive duplicates (junction points appear twice).
const dedup = [];
for (const p of ring0) if (!dedup.length || G.dist(dedup.at(-1), p) > 0.2) dedup.push(p);
if (G.dist(dedup[0], dedup.at(-1)) <= 0.2) dedup.pop();
// Simplify (metres) and orient counter-clockwise (RFC 7946 exterior ring).
let ring = G.simplify([...dedup, dedup[0]], 0.5);
ring.pop();
if (G.signedArea(ring) < 0) ring.reverse();

// ---- validation -----------------------------------------------------------------------------
const llRing = ring.map(G.toLL);
const area = G.signedArea(ring) / 1e6; // km^2
const crossings = G.selfIntersections([...ring]);
const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok, detail });
check("vertices < 400", ring.length < 400, `${ring.length} vertices`);
check("valid (no self-intersection)", crossings.length === 0, crossings.length ? `crossing edges ${JSON.stringify(crossings.slice(0, 5))}` : "");
check("area plausible (2-4 km2)", area >= 2 && area <= 4, `${area.toFixed(3)} km2`);
const inside = [
  ["Sukhumvit Soi 31", [100.5665, 13.735]],
  ["Sukhumvit Soi 39 near Phrom Phong", [100.57, 13.733]],
];
const outside = [
  ["Asok intersection", [100.5603, 13.737]],
  ["Benjasiri Park south of Sukhumvit", [100.5675, 13.73]],
  ["Thong Lo east of Soi 55", [100.585, 13.73]],
];
for (const [n, ll] of inside) check(`INSIDE: ${n} ${ll}`, G.pointInRing(ring, G.toXY(ll)));
for (const [n, ll] of outside) check(`OUTSIDE: ${n} ${ll}`, !G.pointInRing(ring, G.toXY(ll)));
for (const c of checks) console.log(c.ok ? "PASS" : "FAIL", c.name, c.detail);
if (checks.some((c) => !c.ok)) {
  console.error("Validation failed; not writing", outPath);
  process.exit(1);
}

const feature = {
  type: "Feature",
  properties: {
    code: "ย.10-4",
    zone: "ย.10",
    name_en: "High-density residential (brown)",
    source:
      "Traced from the written boundary in the Bangkok Comprehensive Plan B.E. 2556 annex (p. 71) using OSM geometry; approximate ±15 m",
  },
  geometry: { type: "Polygon", coordinates: [[...llRing, llRing[0]]] },
};
writeFileSync(outPath, JSON.stringify({ type: "FeatureCollection", features: [feature] }, null, 2) + "\n");
console.log("wrote", outPath, "vertices", ring.length, "area km2", area.toFixed(3));

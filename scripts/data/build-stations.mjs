// Builds src/data/stations.geojson: mass-transit stations whose 500 m radius (from the platform boundary)
// can touch Sukhumvit Road or Sukhumvit sois 1-63. Platforms from OSM become the geometry.
// Usage: node scripts/data/build-stations.mjs <raw dir with stations.json and zone.json> [out.geojson]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import * as G from "./geo.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const rawDir = process.argv[2];
const outPath = process.argv[3] ?? resolve(here, "../../src/data/stations.geojson");
if (!rawDir) throw new Error("usage: build-stations.mjs <raw dir> [out]");
const st = JSON.parse(readFileSync(join(rawDir, "stations.json"), "utf8")).elements;
const roads = JSON.parse(readFileSync(join(rawDir, "zone.json"), "utf8")).elements;

const RANGE_M = 500;
const PLATFORM_MATCH_M = 200;
const PLATFORM_HALF_WIDTH_M = 3; // a line-only platform becomes a 6 m wide polygon

// Candidate stations: rail stations with a Bangkok network code (BTS E/N/S, MRT BL, Airport Rail Link A).
const isCode = (ref) => /^(E|N|S)\d+$|^BL\d+$|^A\d+$/.test(ref ?? "");
const candidates = st.filter((e) => e.type === "node" && e.tags?.railway === "station" && isCode(e.tags.ref));

// Road centrelines the 500 m test is measured to: Sukhumvit Road and sois 1-63.
const soiNo = (name) => {
  const m = /^(?:ซอยสุขุมวิท|Soi Sukhumvit) (\d+)/.exec(name ?? "");
  return m ? Number(m[1]) : null;
};
// Sukhumvit Road is cut at the Soi 63 junction (lon 100.5846): east of it lie sois 65+, outside the rule.
// Asok Montri Road is Sukhumvit Soi 21.
const roadPts = [];
for (const e of roads) {
  if (!e.geometry || !e.tags?.highway) continue;
  const n = e.tags.name ?? "";
  const soi = soiNo(n);
  const isMain = n === "ถนนสุขุมวิท" || n === "Sukhumvit Road";
  const isSoi21 = n === "ถนนอโศกมนตรี" || n === "Asok Montri Road";
  if (!isMain && !isSoi21 && !(soi !== null && soi >= 1 && soi <= 63)) continue;
  for (const g of e.geometry) {
    if (isMain && g.lon > 100.5846) continue;
    roadPts.push(G.toXY([g.lon, g.lat]));
  }
}

const centroid = (e) => {
  if (e.type === "node") return [e.lon, e.lat];
  const g = e.geometry;
  return [g.reduce((s, p) => s + p.lon, 0) / g.length, g.reduce((s, p) => s + p.lat, 0) / g.length];
};
const minDist = (pts, ref) => Math.min(...pts.map((p) => Math.min(...ref.map((r) => G.dist(p, r)))));

const platforms = st.filter(
  (e) => e.type === "way" && e.geometry && (e.tags?.railway === "platform" || e.tags?.public_transport === "platform"),
);

const stationGeom = (c) => {
  if (c.type === "node") return [G.toXY([c.lon, c.lat])];
  return c.geometry.map((p) => G.toXY([p.lon, p.lat]));
};

// Which candidates are inside the 500 m rule? Measure from the platform outline when there is one, else the station point.
const included = [];
for (const c of candidates) {
  const near = platforms.filter((p) => {
    const cen = centroid(p);
    return G.dist(G.toXY(cen), G.toXY([c.lon, c.lat])) <= PLATFORM_MATCH_M && nearestStation(p) === c;
  });
  const pts = near.length ? near.flatMap((p) => p.geometry.map((g) => G.toXY([g.lon, g.lat]))) : [G.toXY([c.lon, c.lat])];
  const d = minDist(pts, roadPts);
  console.log(d <= RANGE_M ? "IN " : "out", String(Math.round(d)).padStart(5), c.tags.ref, c.tags["name:en"] ?? c.tags.name, `platforms=${near.length}`);
  if (d <= RANGE_M) included.push(c);
}

// Each platform belongs to its nearest candidate station (of all candidates, not only included ones).
function nearestStation(p) {
  const cen = G.toXY(centroid(p));
  let best = null;
  let bd = Infinity;
  for (const c of candidates) {
    const d = G.dist(G.toXY([c.lon, c.lat]), cen);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return bd <= PLATFORM_MATCH_M ? best : null;
}

const lineOf = (ref) => {
  if (/^BL/.test(ref)) return "MRT Blue line";
  if (/^A/.test(ref)) return "Airport Rail Link";
  if (/^S/.test(ref)) return "BTS Silom line";
  return "BTS Sukhumvit line";
};
const ll = (xy) => G.toLL(xy);

const features = [];
for (const c of included.sort((a, b) => a.tags.ref.localeCompare(b.tags.ref, "en", { numeric: true }))) {
  const plats = platforms.filter((p) => nearestStation(p) === c);
  const polys = [];
  for (const p of plats) {
    const xy = p.geometry.map((g) => G.toXY([g.lon, g.lat]));
    const closed = p.geometry.length >= 4 && p.geometry[0].lon === p.geometry.at(-1).lon && p.geometry[0].lat === p.geometry.at(-1).lat;
    const ring = closed ? xy.slice(0, -1) : G.bufferLine(xy, PLATFORM_HALF_WIDTH_M);
    polys.push([[...ring.map(ll), ll(ring[0])]]);
  }
  const geometry = polys.length
    ? polys.length === 1
      ? { type: "Polygon", coordinates: polys[0] }
      : { type: "MultiPolygon", coordinates: polys }
    : { type: "Point", coordinates: [c.lon, c.lat] };
  const plSrc = plats.map((p) => `way/${p.id}`);
  features.push({
    type: "Feature",
    properties: {
      name_en: c.tags["name:en"] ?? c.tags.name,
      name_th: c.tags.name,
      line: lineOf(c.tags.ref),
      code: c.tags.ref,
      source: `OSM node/${c.id}` + (plSrc.length ? ` (platforms ${plSrc.join(", ")})` : " (no platform mapped; station point)"),
    },
    geometry,
  });
}

writeFileSync(outPath, JSON.stringify({ type: "FeatureCollection", features }, null, 2) + "\n");
const kinds = features.reduce((m, f) => ((m[f.geometry.type] = (m[f.geometry.type] ?? 0) + 1), m), {});
console.log("wrote", outPath, features.length, "features", kinds);

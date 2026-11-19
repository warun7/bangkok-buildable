import type { LngLat } from "./types";
import type { SiteData, Station } from "./analyze";
import stationsRaw from "../data/stations.geojson?raw";
import zoneRaw from "../data/zone-y10-4.geojson?raw";

// Bundled site data for zone ย.10-4 (see research/R4-site-data.md for how it was built).

interface Feature {
  properties: Record<string, string>;
  geometry: { type: "Point" | "Polygon" | "MultiPolygon"; coordinates: unknown };
}

function outerRings(g: Feature["geometry"]): LngLat[][] {
  if (g.type === "Point") return [[g.coordinates as LngLat]];
  if (g.type === "Polygon") return [(g.coordinates as LngLat[][])[0]];
  return (g.coordinates as LngLat[][][]).map((p) => p[0]);
}

const stationFeatures = (JSON.parse(stationsRaw) as { features: Feature[] }).features;
const zoneFeatures = (JSON.parse(zoneRaw) as { features: Feature[] }).features;

export const STATIONS: (Station & { line: string; code: string; nameTh: string })[] = stationFeatures.map((f) => ({
  name: `${f.properties.line.replace(/ line$/i, "")} ${f.properties.name_en}`,
  nameTh: f.properties.name_th,
  line: f.properties.line,
  code: f.properties.code,
  rings: outerRings(f.geometry),
}));

export const ZONE_OUTLINE: LngLat[][] = zoneFeatures.flatMap((f) => outerRings(f.geometry));

export const SITE_DATA: SiteData = { stations: STATIONS, zone: ZONE_OUTLINE };

/** Raw GeoJSON for map layers. */
export const ZONE_GEOJSON = JSON.parse(zoneRaw);
export const STATIONS_GEOJSON = JSON.parse(stationsRaw);

// Basemap: OpenFreeMap "liberty", restyled into a calm, architectural palette.
import type { StyleSpecification, LayerSpecification } from "maplibre-gl";

export const LIBERTY_URL = "https://tiles.openfreemap.org/styles/liberty";

export const INITIAL_VIEW = {
  // Middle of zone ย.10-4 (Soi Sukhumvit 39–49), wide enough to show the zone outline.
  center: [100.5725, 13.7352] as [number, number],
  zoom: 15.4,
  pitch: 55,
  bearing: -18,
};

export const SATELLITE_SOURCE = "esri-world-imagery";
export const SATELLITE_LAYER = "satellite";

/** Symbol layers we keep: road names and place names. Everything else (POIs, shields, house numbers) goes. */
const KEEP_SYMBOLS = new Set([
  "highway-name-path",
  "highway-name-minor",
  "highway-name-major",
  "label_other",
  "label_village",
  "label_town",
  "label_city",
  "label_city_capital",
]);

const DROP = new Set(["natural_earth", "park_outline", "boundary_3", "boundary_2", "boundary_disputed"]);

const C = {
  background: "#f2f1ee",
  land: "#eeede9",
  green: "#e2e7dc",
  water: "#c8d9e6",
  waterway: "#b8cddd",
  casing: "#dcdad5",
  road: "#ffffff",
  path: "#e4e2dd",
  rail: "#c9c7c1",
  building: "#e3e1dc",
  buildingOutline: "#d3d0ca",
  building3d: "#d9d7d2",
  roadLabel: "#6f737a",
  placeLabel: "#3e434b",
};

type AnyLayer = LayerSpecification & { "source-layer"?: string; paint?: Record<string, unknown>; layout?: Record<string, unknown> };

function restyleLayer(l: AnyLayer): AnyLayer | null {
  if (DROP.has(l.id)) return null;
  const sl = l["source-layer"];
  const paint = { ...(l.paint ?? {}) } as Record<string, unknown>;
  const out = { ...l, paint } as AnyLayer;

  if (l.type === "symbol") {
    if (!KEEP_SYMBOLS.has(l.id)) return null;
    const isRoad = l.id.startsWith("highway-name");
    paint["text-color"] = isRoad ? C.roadLabel : C.placeLabel;
    paint["text-halo-color"] = "rgba(255,255,255,0.9)";
    paint["text-halo-width"] = 1.2;
    paint["text-halo-blur"] = 0;
    return out;
  }
  if (l.type === "background") {
    paint["background-color"] = C.background;
    return out;
  }
  if (sl === "park" || (sl === "landcover" && /wood|grass|wetland/.test(l.id))) {
    delete paint["fill-pattern"];
    paint["fill-color"] = C.green;
    paint["fill-opacity"] = 0.8;
    delete paint["fill-outline-color"];
    return out;
  }
  if (sl === "landuse" || sl === "landcover" || sl === "aeroway") {
    if (l.type === "fill") {
      delete paint["fill-pattern"];
      paint["fill-color"] = C.land;
      paint["fill-opacity"] = 0.7;
      delete paint["fill-outline-color"];
    } else if (l.type === "line") {
      paint["line-color"] = C.casing;
    }
    return out;
  }
  if (sl === "water") {
    paint["fill-color"] = C.water;
    return out;
  }
  if (sl === "waterway") {
    paint["line-color"] = C.waterway;
    return out;
  }
  if (sl === "transportation") {
    if (l.type === "fill") {
      delete paint["fill-pattern"];
      paint["fill-color"] = "#f7f6f3";
      return out;
    }
    if (l.type !== "line") return out;
    const id = l.id;
    if (/rail|transit/.test(id)) paint["line-color"] = C.rail;
    else if (/casing/.test(id)) paint["line-color"] = C.casing;
    else if (/path|pedestrian/.test(id)) paint["line-color"] = C.path;
    else paint["line-color"] = C.road;
    if (id.startsWith("tunnel")) paint["line-opacity"] = 0.45;
    return out;
  }
  if (sl === "building") {
    if (l.type === "fill") {
      paint["fill-color"] = C.building;
      paint["fill-outline-color"] = C.buildingOutline;
    } else if (l.type === "fill-extrusion") {
      paint["fill-extrusion-color"] = C.building3d;
      paint["fill-extrusion-opacity"] = 0.86;
    }
    return out;
  }
  return out;
}

/** Apply the architectural palette and add the (hidden) satellite raster below the roads. */
export function transformLiberty(style: StyleSpecification): StyleSpecification {
  const layers: LayerSpecification[] = [];
  let satelliteInserted = false;
  for (const raw of style.layers as AnyLayer[]) {
    const l = restyleLayer(raw);
    if (!l) continue;
    if (!satelliteInserted && l["source-layer"] === "transportation") {
      layers.push({
        id: SATELLITE_LAYER,
        type: "raster",
        source: SATELLITE_SOURCE,
        layout: { visibility: "none" },
        paint: { "raster-opacity": 1, "raster-saturation": -0.25, "raster-contrast": -0.05 },
      });
      satelliteInserted = true;
    }
    layers.push(l as LayerSpecification);
  }
  return {
    ...style,
    sources: {
      ...style.sources,
      [SATELLITE_SOURCE]: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Esri, Maxar, Earthstar Geographics",
      },
    },
    layers,
  };
}

export async function loadBasemapStyle(signal?: AbortSignal): Promise<StyleSpecification> {
  const res = await fetch(LIBERTY_URL, { signal });
  if (!res.ok) throw new Error(`Basemap style failed to load (${res.status})`);
  return transformLiberty((await res.json()) as StyleSpecification);
}

/** Road layers dim a little over imagery so the photo reads first. */
export function setSatellite(map: import("maplibre-gl").Map, on: boolean): void {
  if (!map.getLayer(SATELLITE_LAYER)) return;
  map.setLayoutProperty(SATELLITE_LAYER, "visibility", on ? "visible" : "none");
  for (const l of map.getStyle().layers) {
    const sl = (l as AnyLayer)["source-layer"];
    if (l.type === "line" && sl === "transportation" && !l.id.startsWith("tunnel")) {
      map.setPaintProperty(l.id, "line-opacity", on ? 0.35 : 1);
    }
    if (l.type === "fill-extrusion") map.setPaintProperty(l.id, "fill-extrusion-opacity", on ? 0.7 : 0.86);
  }
}

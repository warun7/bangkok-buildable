// Hide the existing OSM buildings that stand on the plot, so the proposal is not buried inside them.
// OpenFreeMap building features carry stable feature ids (OSM-derived), so we filter the
// `building-3d` and `building` layers by id. A building is "on the plot" when its centroid is
// inside the plot or at least half of its vertices are.
import type { Map as MlMap, FilterSpecification, MapGeoJSONFeature } from "maplibre-gl";
import type { LngLat, Vec2 } from "../engine/types";
import { centroidLngLat, makeProjector, pointInRing } from "./geo";

const LAYERS = ["building-3d", "building"] as const;
const baseFilters = new WeakMap<MlMap, Record<string, FilterSpecification | undefined>>();
const lastKey = new WeakMap<MlMap, string>();

function outerRings(g: MapGeoJSONFeature["geometry"]): LngLat[][] {
  if (g.type === "Polygon") return [g.coordinates[0] as LngLat[]];
  if (g.type === "MultiPolygon") return g.coordinates.map((p) => p[0] as LngLat[]);
  return [];
}

export function buildingsOnPlot(map: MlMap, plot: LngLat[]): (string | number)[] {
  if (plot.length < 3 || !map.getSource("openmaptiles")) return [];
  const pr = makeProjector(centroidLngLat(plot));
  const ring: Vec2[] = plot.map(pr.toLocal);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of ring) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const ids = new Set<string | number>();
  for (const f of map.querySourceFeatures("openmaptiles", { sourceLayer: "building" })) {
    if (f.id === undefined || f.id === null) continue;
    for (const r of outerRings(f.geometry)) {
      const pts = r.map(pr.toLocal);
      if (!pts.length) continue;
      let cx = 0, cy = 0, inside = 0, near = false;
      for (const p of pts) {
        cx += p[0]; cy += p[1];
        if (p[0] >= x0 - 1 && p[0] <= x1 + 1 && p[1] >= y0 - 1 && p[1] <= y1 + 1) near = true;
      }
      if (!near) continue;
      for (const p of pts) if (pointInRing(p, ring)) inside++;
      const c: Vec2 = [cx / pts.length, cy / pts.length];
      if (pointInRing(c, ring) || inside / pts.length >= 0.5) {
        ids.add(f.id);
        break;
      }
    }
  }
  return [...ids];
}

/** Update layer filters; cheap when the set of hidden ids has not changed. */
export function hideBuildingsOnPlot(map: MlMap, plot: LngLat[] | null): number {
  if (!map.isStyleLoaded() && !map.getLayer("building-3d")) return 0;
  let base = baseFilters.get(map);
  if (!base) {
    base = {};
    for (const id of LAYERS) if (map.getLayer(id)) base[id] = map.getFilter(id) as FilterSpecification | undefined;
    baseFilters.set(map, base);
  }
  const ids = plot ? buildingsOnPlot(map, plot) : [];
  const key = ids.map(String).sort().join(",");
  if (lastKey.get(map) === key) return ids.length;
  lastKey.set(map, key);
  for (const id of LAYERS) {
    if (!map.getLayer(id)) continue;
    const b = base[id];
    if (!ids.length) {
      map.setFilter(id, b ?? null);
      continue;
    }
    const hide = ["!", ["in", ["id"], ["literal", ids]]] as unknown as FilterSpecification;
    map.setFilter(id, (b ? ["all", b, hide] : hide) as FilterSpecification);
  }
  return ids.length;
}

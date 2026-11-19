// TerraDraw controller for drawing and editing a single plot polygon on a MapLibre map.
import type { Map as MlMap } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { LngLat } from "../engine/types";

type FeatureId = string | number;

export type DrawToolMode = "view" | "draw" | "edit";

export interface PlotChangeMeta {
  /** True when a new polygon was just finished or a sample plot was loaded. */
  finished: boolean;
  /** True when the change was an edit to an existing polygon (vertex drag, insert, delete). */
  edited: boolean;
}

export interface DrawControllerOptions {
  map: MlMap;
  onPlotChange: (plot: LngLat[], meta: PlotChangeMeta) => void;
  onModeChange: (mode: DrawToolMode) => void;
}

export interface DrawController {
  startDraw(): void;
  setEditMode(on: boolean): void;
  clear(): void;
  loadPlot(plot: LngLat[], enterEdit?: boolean): void;
  getMode(): DrawToolMode;
  destroy(): void;
}

function roundCoord([lng, lat]: LngLat): [number, number] {
  return [Number(lng.toFixed(8)), Number(lat.toFixed(8))];
}

function extractOpenRing(coords: number[][]): LngLat[] {
  if (!coords || coords.length < 3) return [];
  const pts: LngLat[] = [];
  const limit =
    coords.length > 1 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1]
      ? coords.length - 1
      : coords.length;
  for (let i = 0; i < limit; i++) {
    const c = coords[i];
    const prev = pts[pts.length - 1];
    if (prev && Math.abs(prev[0] - c[0]) < 1e-9 && Math.abs(prev[1] - c[1]) < 1e-9) continue;
    pts.push([c[0], c[1]]);
  }
  return pts;
}

export function createDrawController(opts: DrawControllerOptions): DrawController {
  const { map, onPlotChange, onModeChange } = opts;

  const adapter = new TerraDrawMapLibreGLAdapter({
    map,
    coordinatePrecision: 8,
  });

  const polygonMode = new TerraDrawPolygonMode({
    pointerDistance: 24,
    editable: true,
    styles: {
      fillColor: "#2554d6",
      fillOpacity: 0.08,
      outlineColor: "#2554d6",
      outlineOpacity: 0.9,
      outlineWidth: 2,
      closingPointColor: "#ffffff",
      closingPointWidth: 7,
      closingPointOpacity: 1,
      closingPointOutlineColor: "#2554d6",
      closingPointOutlineWidth: 2,
      closingPointOutlineOpacity: 1,
      coordinatePointColor: "#ffffff",
      coordinatePointWidth: 5,
      coordinatePointOpacity: 1,
      coordinatePointOutlineColor: "#1c2230",
      coordinatePointOutlineWidth: 1.5,
      coordinatePointOutlineOpacity: 1,
    },
  });

  const selectMode = new TerraDrawSelectMode({
    pointerDistance: 24,
    dragEventThrottle: 0,
    allowManualDeselection: false,
    flags: {
      polygon: {
        feature: {
          draggable: false,
          rotateable: false,
          scaleable: false,
          selfIntersectable: false,
          coordinates: {
            midpoints: { draggable: true },
            draggable: true,
            deletable: true,
          },
        },
      },
    },
    styles: {
      selectedPolygonColor: "#2554d6",
      selectedPolygonFillOpacity: 0.05,
      selectedPolygonOutlineColor: "#2554d6",
      selectedPolygonOutlineOpacity: 0.85,
      selectedPolygonOutlineWidth: 2,
      selectionPointColor: "#ffffff",
      selectionPointWidth: 7,
      selectionPointOpacity: 1,
      selectionPointOutlineColor: "#1c2230",
      selectionPointOutlineWidth: 2,
      selectionPointOutlineOpacity: 1,
      midPointColor: "#2554d6",
      midPointWidth: 5,
      midPointOpacity: 0.95,
      midPointOutlineColor: "#ffffff",
      midPointOutlineWidth: 1.5,
      midPointOutlineOpacity: 1,
    },
  });

  const draw = new TerraDraw({
    adapter,
    modes: [polygonMode, selectMode],
  });

  draw.start();

  let activeFeatureId: FeatureId | null = null;
  let currentMode: DrawToolMode = "view";
  let suppressEvents = false;
  let rafId: number | null = null;
  let pendingPlot: LngLat[] | null = null;

  function setUiMode(m: DrawToolMode) {
    currentMode = m;
    onModeChange(m);
  }

  function flushPending() {
    rafId = null;
    if (pendingPlot) {
      const p = pendingPlot;
      pendingPlot = null;
      onPlotChange(p, { finished: false, edited: true });
    }
  }

  function scheduleLiveUpdate(plot: LngLat[]) {
    pendingPlot = plot;
    if (rafId === null) {
      rafId = requestAnimationFrame(flushPending);
    }
  }

  function getActivePolygonFeature(): GeoJSONStoreFeatures | undefined {
    const snap = draw.getSnapshot();
    if (activeFeatureId) {
      const found = snap.find((f) => f.id === activeFeatureId && f.geometry.type === "Polygon");
      if (found) return found;
    }
    return snap.find(
      (f) =>
        f.geometry.type === "Polygon" &&
        f.properties?.mode === "polygon" &&
        !f.properties?.currentlyDrawing,
    );
  }

  draw.on("finish", (id, context) => {
    if (suppressEvents) return;
    if (context.mode === "polygon" && context.action === "draw") {
      // Keep only the newly finished polygon
      const snap = draw.getSnapshot();
      const stale = snap
        .filter((f) => f.id !== id && f.geometry.type === "Polygon" && f.properties?.mode === "polygon")
        .map((f) => f.id as FeatureId);
      if (stale.length) {
        suppressEvents = true;
        try {
          draw.removeFeatures(stale);
        } finally {
          suppressEvents = false;
        }
      }
      activeFeatureId = id;
      const feat = draw.getSnapshotFeature(id);
      if (feat && feat.geometry.type === "Polygon") {
        const ring = extractOpenRing(feat.geometry.coordinates[0] as number[][]);
        if (ring.length >= 3) {
          onPlotChange(ring, { finished: true, edited: false });
        }
      }
      // Switch to select mode so vertices and midpoints are immediately editable
      suppressEvents = true;
      try {
        draw.setMode("select");
        draw.selectFeature(id);
      } finally {
        suppressEvents = false;
      }
      setUiMode("edit");
    }
  });

  draw.on("change", (_ids, type) => {
    if (suppressEvents) return;
    if (currentMode !== "edit" && draw.getMode() !== "select") return;
    if (type !== "update" && type !== "create" && type !== "delete") return;
    const feat = getActivePolygonFeature();
    if (!feat || feat.geometry.type !== "Polygon") return;
    const ring = extractOpenRing(feat.geometry.coordinates[0] as number[][]);
    if (ring.length >= 3) {
      scheduleLiveUpdate(ring);
    }
  });

  return {
    startDraw() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        pendingPlot = null;
      }
      suppressEvents = true;
      try {
        draw.clear();
        activeFeatureId = null;
        draw.setMode("polygon");
      } finally {
        suppressEvents = false;
      }
      setUiMode("draw");
    },

    setEditMode(on: boolean) {
      const feat = getActivePolygonFeature();
      if (!feat) return;
      activeFeatureId = feat.id as FeatureId;
      suppressEvents = true;
      try {
        if (on) {
          draw.setMode("select");
          draw.selectFeature(activeFeatureId);
          setUiMode("edit");
        } else {
          if (draw.getMode() === "select" && activeFeatureId) {
            try {
              draw.deselectFeature(activeFeatureId);
            } catch {
              // ignore if not selected
            }
          }
          draw.setMode("static");
          setUiMode("view");
        }
      } finally {
        suppressEvents = false;
      }
    },

    clear() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        pendingPlot = null;
      }
      suppressEvents = true;
      try {
        draw.clear();
        activeFeatureId = null;
        draw.setMode("static");
      } finally {
        suppressEvents = false;
      }
      setUiMode("view");
    },

    loadPlot(plot: LngLat[], enterEdit = true) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        pendingPlot = null;
      }
      suppressEvents = true;
      try {
        draw.clear();
        activeFeatureId = null;
        if (plot.length >= 3) {
          const closed = [...plot.map(roundCoord), roundCoord(plot[0])];
          const id = draw.getFeatureId();
          const res = draw.addFeatures([
            {
              type: "Feature",
              id,
              properties: { mode: "polygon" },
              geometry: {
                type: "Polygon",
                coordinates: [closed],
              },
            },
          ]);
          if (res.length && res[0].valid) {
            activeFeatureId = id;
            if (enterEdit) {
              draw.setMode("select");
              draw.selectFeature(id);
              setUiMode("edit");
            } else {
              draw.setMode("static");
              setUiMode("view");
            }
          }
        } else {
          draw.setMode("static");
          setUiMode("view");
        }
      } finally {
        suppressEvents = false;
      }
    },

    getMode() {
      return currentMode;
    },

    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      try {
        draw.stop();
      } catch {
        // ignore if map already removed
      }
    },
  };
}

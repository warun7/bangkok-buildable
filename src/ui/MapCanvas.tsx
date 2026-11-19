import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type {
  Analysis,
  Design,
  Envelope,
  FrontageCandidate,
  LngLat,
} from "../engine/types";
import { INITIAL_VIEW, LIBERTY_URL, loadBasemapStyle, setSatellite } from "../map/style";
import { buildLayers, floorTooltip, type EdgeView } from "../map/layers";
import { createDrawController, type DrawController, type DrawToolMode, type PlotChangeMeta } from "../map/draw";
import { detectFrontages } from "../map/roads";
import { hideBuildingsOnPlot } from "../map/buildings";
import { boundsOf } from "../map/geo";

export interface MapCanvasHandle {
  startDraw(): void;
  setEditMode(on: boolean): void;
  clearPlot(): void;
  loadPlot(plot: LngLat[], opts?: { fit?: boolean; enterEdit?: boolean }): void;
  detectRoads(plot?: LngLat[]): FrontageCandidate[];
  fitToPlot(plot?: LngLat[]): void;
  resetCamera(): void;
}

export interface MapCanvasProps {
  plot: LngLat[];
  edges: EdgeView[];
  analysis: Analysis | null;
  envelope: Envelope | null;
  design: Design | null;
  showEnvelope: boolean;
  showDesign: boolean;
  satellite: boolean;
  drawMode: DrawToolMode;
  onPlotChange: (plot: LngLat[], meta: PlotChangeMeta, detected: FrontageCandidate[]) => void;
  onCandidatesChange: (candidates: FrontageCandidate[]) => void;
  onDrawModeChange: (mode: DrawToolMode) => void;
  onEdgeClick: (edgeIndex: number) => void;
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const drawRef = useRef<DrawController | null>(null);
  const readyRef = useRef(false);
  const pendingLoadRef = useRef<{ plot: LngLat[]; fit: boolean; enterEdit: boolean } | null>(null);

  // Keep latest callbacks/props in refs for event listeners
  const latestRef = useRef(props);
  latestRef.current = props;

  function fitPlotOnMap(map: maplibregl.Map, plot: LngLat[]) {
    if (plot.length < 3) return;
    const [sw, ne] = boundsOf(plot);
    const w = containerRef.current?.clientWidth ?? window.innerWidth;
    const wide = w >= 1100;
    map.fitBounds([sw, ne], {
      padding: {
        top: 84,
        bottom: 72,
        left: wide ? 410 : 48,
        right: wide ? 450 : 48,
      },
      maxZoom: 17.1,
      pitch: 55,
      bearing: map.getBearing(),
      duration: 650,
    });
  }

  useImperativeHandle(ref, () => ({
    startDraw() {
      drawRef.current?.startDraw();
      if (mapRef.current) hideBuildingsOnPlot(mapRef.current, null);
    },
    setEditMode(on: boolean) {
      drawRef.current?.setEditMode(on);
    },
    clearPlot() {
      drawRef.current?.clear();
      if (mapRef.current) hideBuildingsOnPlot(mapRef.current, null);
    },
    loadPlot(plot: LngLat[], opts?: { fit?: boolean; enterEdit?: boolean }) {
      const fit = opts?.fit ?? true;
      const enterEdit = opts?.enterEdit ?? true;
      const map = mapRef.current;
      if (!map || !readyRef.current || !drawRef.current) {
        pendingLoadRef.current = { plot, fit, enterEdit };
        return;
      }
      drawRef.current.loadPlot(plot, enterEdit);
      hideBuildingsOnPlot(map, plot);
      if (fit && plot.length >= 3) {
        fitPlotOnMap(map, plot);
      }
      const cands = detectFrontages(map, plot);
      latestRef.current.onCandidatesChange(cands);
      map.once("idle", () => {
        if (!mapRef.current) return;
        hideBuildingsOnPlot(map, latestRef.current.plot);
        const updated = detectFrontages(map, latestRef.current.plot);
        if (updated.length) latestRef.current.onCandidatesChange(updated);
      });
    },
    detectRoads(plotOverride?: LngLat[]) {
      const map = mapRef.current;
      const target = plotOverride ?? latestRef.current.plot;
      if (!map || !readyRef.current || target.length < 3) return [];
      const cands = detectFrontages(map, target);
      latestRef.current.onCandidatesChange(cands);
      return cands;
    },
    fitToPlot(plotOverride?: LngLat[]) {
      const map = mapRef.current;
      const target = plotOverride ?? latestRef.current.plot;
      if (map && target.length >= 3) fitPlotOnMap(map, target);
    },
    resetCamera() {
      const map = mapRef.current;
      if (!map) return;
      const target = latestRef.current.plot;
      if (target.length >= 3) {
        fitPlotOnMap(map, target);
      } else {
        map.easeTo({ ...INITIAL_VIEW, duration: 600 });
      }
    },
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ac = new AbortController();
    let disposed = false;

    const map = new maplibregl.Map({
      container: el,
      style: { version: 8, sources: {}, layers: [] },
      center: INITIAL_VIEW.center,
      zoom: INITIAL_VIEW.zoom,
      pitch: INITIAL_VIEW.pitch,
      bearing: INITIAL_VIEW.bearing,
      maxPitch: 75,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    const overlay = new MapboxOverlay({
      interleaved: true,
      getTooltip: (info) => floorTooltip(info),
      layers: [],
    });
    overlayRef.current = overlay;
    map.addControl(overlay);
    if (import.meta.env.DEV) Object.assign(window, { __map: map, __overlay: overlay });

    // Prevent browser context menu on the canvas so right-click vertex deletion in terra-draw is clean
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    el.addEventListener("contextmenu", onContextMenu);

    loadBasemapStyle(ac.signal)
      .catch(() => LIBERTY_URL)
      .then((style) => {
        if (disposed) return;
        map.setStyle(style as maplibregl.StyleSpecification, { diff: false });
      });

    map.on("style.load", () => {
      if (disposed) return;
      readyRef.current = true;
      setSatellite(map, latestRef.current.satellite);

      if (!drawRef.current) {
        drawRef.current = createDrawController({
          map,
          onPlotChange(newPlot, meta) {
            hideBuildingsOnPlot(map, newPlot);
            const detected = meta.finished ? detectFrontages(map, newPlot) : [];
            latestRef.current.onPlotChange(newPlot, meta, detected);
          },
          onModeChange(mode) {
            latestRef.current.onDrawModeChange(mode);
          },
        });
      }

      const initialPlot = pendingLoadRef.current?.plot ?? latestRef.current.plot;
      // First load fits the camera to the plot (the default sample), unless a load asked otherwise.
      const shouldFit = pendingLoadRef.current?.fit ?? true;
      const enterEdit = pendingLoadRef.current?.enterEdit ?? true;
      pendingLoadRef.current = null;

      if (initialPlot.length >= 3) {
        drawRef.current.loadPlot(initialPlot, enterEdit);
        hideBuildingsOnPlot(map, initialPlot);
        if (shouldFit) fitPlotOnMap(map, initialPlot);
      }

      map.once("idle", () => {
        if (disposed) return;
        const p = latestRef.current.plot;
        if (p.length >= 3) {
          hideBuildingsOnPlot(map, p);
          const cands = detectFrontages(map, p);
          if (cands.length) latestRef.current.onCandidatesChange(cands);
        }
      });
    });

    // Re-apply building filter when new vector tiles stream in
    map.on("idle", () => {
      if (disposed || !readyRef.current) return;
      const p = latestRef.current.plot;
      if (p.length >= 3) {
        hideBuildingsOnPlot(map, p);
      }
    });

    return () => {
      disposed = true;
      ac.abort();
      el.removeEventListener("contextmenu", onContextMenu);
      drawRef.current?.destroy();
      drawRef.current = null;
      overlayRef.current = null;
      mapRef.current = null;
      readyRef.current = false;
      map.remove();
    };
  }, []);

  // Update satellite visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    setSatellite(map, props.satellite);
  }, [props.satellite]);

  // Update deck.gl layers and OSM building mask whenever inputs/analysis change
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const layers = buildLayers({
      analysis: props.analysis,
      plot: props.plot,
      edges: props.edges,
      envelope: props.envelope,
      design: props.design,
      showEnvelope: props.showEnvelope,
      showDesign: props.showDesign,
      edgesInteractive: props.drawMode !== "draw",
      isEditing: props.drawMode === "edit",
      onEdgeClick: (edgeIdx) => latestRef.current.onEdgeClick(edgeIdx),
    });
    overlay.setProps({ layers });

    const map = mapRef.current;
    if (map && readyRef.current) {
      hideBuildingsOnPlot(map, props.plot.length >= 3 ? props.plot : null);
    }
  }, [
    props.analysis,
    props.plot,
    props.edges,
    props.envelope,
    props.design,
    props.showEnvelope,
    props.showDesign,
    props.drawMode,
  ]);

  return <div ref={containerRef} className="map-canvas" />;
});

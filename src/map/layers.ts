// deck.gl layers for the plot, road frontages, envelope and the selected design.
// Engine geometry (local metres) is drawn with METER_OFFSETS from analysis.origin; geometry the UI
// derives from the drawn plot (frontage lines, labels) is drawn in LNGLAT so it sits exactly on
// the terra-draw polygon.
import { COORDINATE_SYSTEM, type Layer, type PickingInfo } from "@deck.gl/core";
import { LineLayer, PathLayer, SolidPolygonLayer, TextLayer } from "@deck.gl/layers";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import type { Analysis, Design, Envelope, Floor, FloorUse, LngLat, Vec2 } from "../engine/types";
import { dashSegments, edgeLetter, localToDeckMatrix, plotGeometry } from "./geo";
import { ZONE_OUTLINE } from "../engine/siteData";

// Zone ย.10-4 outline: where the rules in this tool apply.
const ZONE_PATHS = ZONE_OUTLINE.map((r) => ({ path: [...r, r[0]] }));

type RGBA = [number, number, number, number];

export const COLORS = {
  ink: [28, 34, 48, 255] as RGBA,
  accent: [37, 84, 214, 255] as RGBA,
  frontage: [214, 104, 37, 255] as RGBA,
  envelopeFill: [37, 84, 214, 34] as RGBA,
  envelopeEdge: [37, 84, 214, 200] as RGBA,
  setback: [37, 84, 214, 170] as RGBA,
  plotFill: [37, 84, 214, 22] as RGBA,
};

export const FLOOR_COLORS: Record<FloorUse, RGBA> = {
  parking: [168, 170, 174, 255],
  lobby: [222, 205, 172, 255],
  amenity: [222, 205, 172, 255],
  residential: [248, 244, 236, 255],
  office: [246, 243, 237, 255],
  hotel: [249, 243, 233, 255],
};

export interface EdgeView {
  faces: boolean;
  width: number;
}

export interface LayerInput {
  analysis: Analysis | null;
  plot: LngLat[];
  edges: EdgeView[];
  envelope: Envelope | null;
  design: Design | null;
  showEnvelope: boolean;
  showDesign: boolean;
  /** When false (drawing), edges are not clickable so terra-draw gets the pointer. */
  edgesInteractive: boolean;
  /** True when terra-draw select mode is active (vertices + midpoints shown). */
  isEditing?: boolean;
  onEdgeClick?: (edgeIndex: number) => void;
}

export interface FloorDatum {
  polygon: [number, number, number][][];
  elevation: number;
  floor: Floor;
}

interface SegDatum {
  s: number[];
  t: number[];
}

interface EdgeDatum {
  index: number;
  path: LngLat[];
}

function localProps(analysis: Analysis) {
  return {
    coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
    coordinateOrigin: [analysis.origin[0], analysis.origin[1], 0] as [number, number, number],
    modelMatrix: localToDeckMatrix(analysis.origin[1]),
  };
}

function floorData(design: Design): FloorDatum[] {
  const out: FloorDatum[] = [];
  for (const f of design.floors) {
    for (const poly of f.polygons) {
      out.push({
        polygon: poly.map((ring) => ring.map(([x, y]): [number, number, number] => [x, y, f.z])),
        elevation: Math.max(0.05, f.h - 0.15),
        floor: f,
      });
    }
  }
  return out;
}

function edgeSegments(edges: Float32Array): SegDatum[] {
  const out: SegDatum[] = [];
  for (let i = 0; i + 5 < edges.length; i += 6) {
    out.push({ s: [edges[i], edges[i + 1], edges[i + 2]], t: [edges[i + 3], edges[i + 4], edges[i + 5]] });
  }
  return out;
}

function footprintDashes(env: Envelope): SegDatum[] {
  const out: SegDatum[] = [];
  for (const poly of env.footprint) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length; i++) {
        for (const [a, b] of dashSegments(ring[i], ring[(i + 1) % ring.length], 1.2, 0.9)) {
          out.push({ s: [a[0], a[1], 0.08], t: [b[0], b[1], 0.08] });
        }
      }
    }
  }
  return out;
}

// Memoise heavy derived data on object identity so dragging only rebuilds what changed.
const meshCache = new WeakMap<Envelope, { mesh: object; edges: SegDatum[]; dashes: SegDatum[] }>();
function envelopeData(env: Envelope) {
  let c = meshCache.get(env);
  if (!c) {
    c = {
      mesh: {
        attributes: {
          positions: { value: env.mesh.positions, size: 3 },
          normals: { value: env.mesh.normals, size: 3 },
        },
        indices: { value: env.mesh.indices, size: 1 },
      },
      edges: edgeSegments(env.mesh.edges),
      dashes: footprintDashes(env),
    };
    meshCache.set(env, c);
  }
  return c;
}
const floorCache = new WeakMap<Design, FloorDatum[]>();
function floorsOf(d: Design) {
  let c = floorCache.get(d);
  if (!c) floorCache.set(d, (c = floorData(d)));
  return c;
}

export function buildLayers(p: LayerInput): Layer[] {
  const layers: Layer[] = [];
  const { analysis, plot } = p;
  const hasPlot = plot.length >= 3;

  layers.push(
    new PathLayer<{ path: LngLat[] }>({
      id: "zone-outline",
      data: ZONE_PATHS,
      getPath: (d) => d.path,
      getColor: [139, 90, 43, 210],
      getWidth: 3,
      widthUnits: "pixels",
      widthMinPixels: 2,
    }),
  );

  // --- Road frontages (from the drawn plot, LNGLAT) -------------------------------------------
  if (hasPlot) {
    const g = plotGeometry(plot);
    const bands: { polygon: LngLat[] }[] = [];
    const highlights: EdgeDatum[] = [];
    const farDashes: SegDatum[] = [];
    g.edges.forEach((e, i) => {
      const ev = p.edges[i];
      if (!ev?.faces || e.length < 0.1) return;
      const w = ev.width;
      const off = (v: Vec2): Vec2 => [v[0] + e.outward[0] * w, v[1] + e.outward[1] * w];
      const fa = off(e.la);
      const fb = off(e.lb);
      bands.push({ polygon: [e.a, e.b, g.projector.toLngLat(fb), g.projector.toLngLat(fa)] });
      highlights.push({ index: i, path: [e.a, e.b] });
      for (const [a, b] of dashSegments(fa, fb, 2.0, 1.4)) {
        const la = g.projector.toLngLat(a);
        const lb = g.projector.toLngLat(b);
        farDashes.push({ s: [la[0], la[1], 0.1], t: [lb[0], lb[1], 0.1] });
      }
    });

    layers.push(
      new SolidPolygonLayer<{ polygon: LngLat[] }>({
        id: "frontage-band",
        data: bands,
        getPolygon: (d) => d.polygon,
        getFillColor: [214, 104, 37, 22],
        parameters: { depthWriteEnabled: false },
      }),
      new LineLayer<SegDatum>({
        id: "frontage-far-side",
        data: farDashes,
        getSourcePosition: (d) => d.s as [number, number, number],
        getTargetPosition: (d) => d.t as [number, number, number],
        getColor: COLORS.frontage,
        getWidth: 2,
        widthUnits: "pixels",
      }),
    );

    // Clickable edge hit-area + hover highlight.
    const edgeData: EdgeDatum[] = g.edges.map((e) => ({ index: e.index, path: [e.a, e.b] }));
    layers.push(
      new PathLayer<EdgeDatum>({
        id: "plot-edge-hit",
        data: edgeData,
        getPath: (d) => d.path,
        getColor: [0, 0, 0, 1],
        getWidth: 16,
        widthUnits: "pixels",
        pickable: p.edgesInteractive,
        autoHighlight: p.edgesInteractive,
        highlightColor: [214, 104, 37, 110],
        onClick: (info: PickingInfo<EdgeDatum>) => {
          if (!info.object || !p.onEdgeClick) return false;
          if (info.coordinate && info.coordinate.length >= 2) {
            const [a, b] = info.object.path;
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            const len2 = dx * dx + dy * dy;
            if (len2 > 0) {
              const t = ((info.coordinate[0] - a[0]) * dx + (info.coordinate[1] - a[1]) * dy) / len2;
              if (t < 0.14 || t > 0.86) return false;
              if (p.isEditing && Math.abs(t - 0.5) < 0.12) return false;
            }
          }
          p.onEdgeClick(info.object.index);
          return true;
        },
        parameters: { depthWriteEnabled: false },
      }),
      new PathLayer<EdgeDatum>({
        id: "frontage-edge",
        data: highlights,
        getPath: (d) => d.path,
        getColor: COLORS.frontage,
        getWidth: 6,
        widthUnits: "pixels",
        capRounded: true,
        parameters: { depthWriteEnabled: false },
      }),
    );
  }

  // --- Engine geometry (local metres) ---------------------------------------------------------
  if (analysis && analysis.plotLocal.length >= 3 && hasPlot) {
    const lp = localProps(analysis);
    const ring = analysis.plotLocal;
    layers.push(
      new SolidPolygonLayer<{ polygon: Vec2[] }>({
        id: "plot-fill",
        ...lp,
        data: [{ polygon: ring }],
        getPolygon: (d) => d.polygon,
        getFillColor: COLORS.plotFill,
        parameters: { depthWriteEnabled: false },
      }),
      new PathLayer<{ path: Vec2[] }>({
        id: "plot-outline",
        ...lp,
        data: [{ path: [...ring, ring[0]] }],
        getPath: (d) => d.path,
        getColor: COLORS.ink,
        getWidth: 2.5,
        widthUnits: "pixels",
        jointRounded: true,
      }),
    );

    if (p.envelope && p.showEnvelope) {
      const ed = envelopeData(p.envelope);
      layers.push(
        new LineLayer<SegDatum>({
          id: "envelope-setback",
          ...lp,
          data: ed.dashes,
          getSourcePosition: (d) => d.s as [number, number, number],
          getTargetPosition: (d) => d.t as [number, number, number],
          getColor: COLORS.setback,
          getWidth: 1.5,
          widthUnits: "pixels",
        }),
      );
    }

    if (p.design && p.showDesign) {
      layers.push(
        new SolidPolygonLayer<FloorDatum>({
          id: "design-floors",
          ...lp,
          data: floorsOf(p.design),
          extruded: true,
          wireframe: false,
          getPolygon: (d) => d.polygon,
          getElevation: (d) => d.elevation,
          getFillColor: (d) => FLOOR_COLORS[d.floor.use] ?? FLOOR_COLORS.residential,
          material: { ambient: 0.55, diffuse: 0.5, shininess: 8, specularColor: [40, 40, 40] },
          pickable: true,
          autoHighlight: true,
          highlightColor: [37, 84, 214, 90],
        }),
      );
    }

    if (p.envelope && p.showEnvelope) {
      const ed = envelopeData(p.envelope);
      layers.push(
        new SimpleMeshLayer({
          id: "envelope-volume",
          ...lp,
          data: [0],
          mesh: ed.mesh as never,
          getPosition: () => [0, 0, 0],
          getColor: COLORS.envelopeFill,
          material: { ambient: 0.8, diffuse: 0.35, shininess: 0, specularColor: [0, 0, 0] },
          parameters: { depthWriteEnabled: false, cullMode: "none" },
        }),
        new LineLayer<SegDatum>({
          id: "envelope-edges",
          ...lp,
          data: ed.edges,
          getSourcePosition: (d) => d.s as [number, number, number],
          getTargetPosition: (d) => d.t as [number, number, number],
          getColor: COLORS.envelopeEdge,
          getWidth: 1.25,
          widthUnits: "pixels",
        }),
      );
    }
  }

  // --- Edge labels last so they read on top -----------------------------------------------------
  if (hasPlot) {
    const g = plotGeometry(plot);
    const labels = g.edges.map((e) => ({
      position: [e.mid[0], e.mid[1], 0.6] as [number, number, number],
      text: `${edgeLetter(e.index)}  ${e.length.toFixed(1)} m`,
      faces: !!p.edges[e.index]?.faces,
    }));
    layers.push(
      new TextLayer<(typeof labels)[number]>({
        id: "edge-labels",
        data: labels,
        getPosition: (d) => d.position,
        getText: (d) => d.text,
        getSize: 12,
        getColor: (d) => (d.faces ? [150, 66, 14, 255] : COLORS.ink),
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        fontWeight: 600,
        characterSet: "auto",
        background: true,
        getBackgroundColor: [255, 255, 255, 235],
        backgroundPadding: [5, 2, 5, 2],
        getBorderColor: (d) => (d.faces ? [214, 104, 37, 255] : [205, 208, 214, 255]),
        getBorderWidth: 1,
        parameters: { depthCompare: "always", depthWriteEnabled: false },
      }),
    );
  }

  return layers;
}

export function floorTooltip(info: PickingInfo): { html: string; className: string } | null {
  if (!info.object || info.layer?.id !== "design-floors") return null;
  const f = (info.object as FloorDatum).floor;
  const use = f.use.charAt(0).toUpperCase() + f.use.slice(1);
  return {
    className: "deck-tooltip-floor",
    html: `<div class="tt-title">Floor ${f.index + 1}</div><div class="tt-row"><span>Use</span><b>${use}</b></div><div class="tt-row"><span>Area</span><b>${Math.round(f.area).toLocaleString("en-US")} m²</b></div><div class="tt-row"><span>Level</span><b>+${f.z.toFixed(1)} m</b></div>`,
  };
}

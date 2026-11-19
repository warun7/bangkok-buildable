// Shared data contracts for the zoning engine. Pure data, no DOM, no map library.
// Coordinates: geographic input is [lng, lat] (WGS84). All geometry work happens in a
// local tangent plane in metres around the plot centroid: x = east, y = north.

export type LngLat = [number, number];
export type Vec2 = [number, number];
/** Closed implicitly (first point is not repeated). Outer rings counter-clockwise, holes clockwise. */
export type Ring = Vec2[];
/** [outer, ...holes] */
export type Polygon = Ring[];
export type MultiPolygon = Polygon[];

export type BuildingTypeId = "condo" | "office" | "hotel";

/** A plot edge that faces a public road. */
export interface Frontage {
  /** Index i of the plot edge from vertex i to vertex i+1 (local ring order). */
  edgeIndex: number;
  /** Road right-of-way width in metres (เขตทาง), boundary to boundary. */
  roadWidth: number;
  roadName?: string;
}

export interface SiteInput {
  /** Plot outline as drawn, outer ring only, not closed. */
  plot: LngLat[];
  frontages: Frontage[];
  buildingType: BuildingTypeId;
  /** Rule ids the user has switched off to see their effect. Checks still report them. */
  disabledRules?: string[];
}

export interface Citation {
  /** Short document name, e.g. "Ministerial Regulation No. 55 (B.E. 2543)". */
  doc: string;
  /** Clause or article, e.g. "Clause 41". */
  clause: string;
  url?: string;
}

/** One regulation as it applies to this site. */
export interface AppliedRule {
  id: string;
  title: string;
  titleTh?: string;
  /** Human-readable value as applied here, e.g. "6.0 m from road centreline". */
  value: string;
  /** How it acts: shapes the envelope, caps a quantity, or only informs. */
  kind: "envelope" | "cap" | "check" | "info";
  citation: Citation;
  /** False when the rule exists but does not apply to this site/building (with reason in note). */
  applies: boolean;
  note?: string;
}

/** Per-edge distance the building must keep from the plot boundary. */
export interface EdgeSetback {
  edgeIndex: number;
  distance: number;
  ruleId: string;
}

/** Height limit z <= 2 * (perpendicular distance to the far side of the road). */
export interface SkyPlane {
  edgeIndex: number;
  roadWidth: number;
  /** Height gained per metre of horizontal distance (2 for the Thai 2:1 rule). */
  slope: number;
  ruleId: string;
}

export type Regime = "lowrise" | "highrise";

export interface EnvelopeSpec {
  regime: Regime;
  setbacks: EdgeSetback[];
  /** Uniform clearance from every plot edge (e.g. 6 m fire-access space for high-rise). */
  uniformClearance?: { distance: number; ruleId: string };
  skyPlanes: SkyPlane[];
  /** Absolute height cap in metres (exclusive caps such as "< 23 m" are expressed as 23 - epsilon). */
  maxHeight: number;
  maxHeightRuleId: string;
}

export interface Level {
  index: number;
  /** Floor level (bottom) in metres above ground. */
  z: number;
  /** Floor-to-floor height in metres. */
  h: number;
  plate: MultiPolygon;
  area: number;
}

export interface EnvelopeMesh {
  /** xyz in local metres, flat array. */
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  /** Outline edges for drawing crisp lines: pairs of xyz points, flat. */
  edges: Float32Array;
}

export interface Envelope {
  spec: EnvelopeSpec;
  /** Allowed ground footprint after setbacks. */
  footprint: MultiPolygon;
  footprintArea: number;
  /** Slices at a reference floor height, used for stats and design generation. */
  levels: Level[];
  /** Sum of level areas: the most floor area the shape alone could hold (before FAR). */
  geometricCapacity: number;
  height: number;
  mesh: EnvelopeMesh;
}

export type FloorUse = "lobby" | "parking" | "residential" | "office" | "hotel" | "amenity";

export interface Floor {
  index: number;
  z: number;
  h: number;
  use: FloorUse;
  polygons: MultiPolygon;
  area: number;
}

export type CheckStatus = "pass" | "fail" | "warn" | "info";

export interface Check {
  id: string;
  label: string;
  required: string;
  actual: string;
  status: CheckStatus;
  ruleId: string;
}

export interface DesignMetrics {
  gfa: number;
  gfaByUse: Partial<Record<FloorUse, number>>;
  far: number;
  footprint: number;
  openSpace: number;
  /** Open space as % of total floor area (Bangkok OSR basis, to be confirmed by research). */
  osr: number;
  height: number;
  storeys: number;
  units?: number;
  rooms?: number;
  parkingRequired: number;
  parkingProvided: number;
}

export interface Design {
  id: string;
  name: string;
  strategy: string;
  /** One sentence on the idea behind this option. */
  summary: string;
  regime: Regime;
  floors: Floor[];
  metrics: DesignMetrics;
  checks: Check[];
}

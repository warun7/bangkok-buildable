import type { DesignMetrics, Floor, FloorUse, MultiPolygon } from "../types";
import type { BuildingTypeSpec } from "../rules/buildingTypes";
import { union } from "../geom/boolean";
import { multiArea } from "../geom/polygon";

// Metrics are recomputed from the floors themselves, never carried over from the generator's guesses,
// so the numbers on screen always add up to the geometry drawn.

export interface DesignMetricsX extends DesignMetrics {
  largestFloor: number;
  /** Ground coverage: area of every floor plate projected onto the plot. */
  coverage: MultiPolygon;
  nonParkingGfa: number;
}

export interface ParkingBasis {
  nonParkingGfa: number;
  mainArea: number;
  units: number;
  height: number;
  gfa: number;
  largestFloor?: number;
}

/** MR 7 cl. 1 (12): total or any floor > 2,000 m², or ≥ 15 m high with > 1,000 m² total. */
export function isLargeBuilding(b: { gfa: number; height: number; largestFloor?: number }): boolean {
  return b.gfa > 2000 || (b.largestFloor ?? 0) > 2000 || (b.height >= 15 && b.gfa > 1000);
}

/** Cars required by Bangkok MR 7 (see research/RULES.md, B-PARK). */
export function parkingRequired(type: BuildingTypeSpec, b: ParkingBasis): number {
  const large = isLargeBuilding(b) ? Math.ceil(b.nonParkingGfa / 120) : 0;
  if (type.id === "condo") {
    // 1 per unit of ≥ 60 m²; the typical unit here is smaller, so the large-building minimum governs.
    const bigUnits = (type.avgUnitSize ?? 0) >= 60 ? b.units : 0;
    return Math.max(bigUnits, large);
  }
  if (type.id === "office") return Math.max(Math.ceil(b.mainArea / 60), large);
  // Hotel: MR 7 (as amended 2555) counts only halls and shops, which we do not model (assumed none).
  // The BMA Building Control Ordinance 2544 cl. 84(2) still counts rooms; we take the larger.
  return Math.max(hotelRoomParking(b.units), large);
}

/** BMA Ordinance 2544 cl. 84(2): 10 cars for the first 30 rooms, 1 per 5 rooms to 100, then 1 per 10. */
export function hotelRoomParking(rooms: number): number {
  if (rooms <= 0) return 0;
  if (rooms <= 30) return 10;
  if (rooms <= 100) return 10 + Math.ceil((rooms - 30) / 5);
  return 24 + Math.ceil((rooms - 100) / 10);
}

export function countUnits(type: BuildingTypeSpec, mainArea: number): number {
  return type.avgUnitSize ? Math.floor((mainArea * type.efficiency) / type.avgUnitSize) : 0;
}

export function metricsFor(input: { plotArea: number; type: BuildingTypeSpec }, floors: Floor[]): DesignMetricsX {
  const { type, plotArea } = input;
  const gfaByUse: Partial<Record<FloorUse, number>> = {};
  let gfa = 0;
  let largestFloor = 0;
  let height = 0;
  for (const f of floors) {
    gfa += f.area;
    gfaByUse[f.use] = (gfaByUse[f.use] ?? 0) + f.area;
    largestFloor = Math.max(largestFloor, f.area);
    height = Math.max(height, f.z + f.h);
  }
  // Ground coverage: union of distinct plates (most floors repeat the same plate, so dedupe first).
  const seen = new Set<string>();
  const plates: MultiPolygon[] = [];
  for (const f of floors) {
    const key = `${f.area.toFixed(2)}:${f.polygons[0]?.[0]?.[0]?.join(",") ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    plates.push(f.polygons);
  }
  const coverage = plates.length ? union(...plates) : [];
  const footprint = multiArea(coverage);
  const openSpace = Math.max(0, plotArea - footprint);
  const parkingArea = gfaByUse.parking ?? 0;
  const nonParkingGfa = gfa - parkingArea;
  const mainArea = gfaByUse[type.use] ?? 0;
  const units = countUnits(type, mainArea);
  const parkingReq = parkingRequired(type, { nonParkingGfa, mainArea, units, height, gfa, largestFloor });
  return {
    gfa,
    gfaByUse,
    far: plotArea > 0 ? gfa / plotArea : 0,
    footprint,
    openSpace,
    osr: gfa > 0 ? (openSpace / gfa) * 100 : 0,
    height,
    storeys: floors.length,
    units: type.id === "condo" ? units : undefined,
    rooms: type.id === "hotel" ? units : undefined,
    parkingRequired: parkingReq,
    parkingProvided: Math.floor(parkingArea / type.grossAreaPerCar),
    largestFloor,
    coverage,
    nonParkingGfa,
  };
}

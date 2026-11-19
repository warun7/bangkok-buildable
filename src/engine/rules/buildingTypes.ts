import type { BuildingTypeId, FloorUse } from "../types";

// Design assumptions per building type. These are not law: they are typical Bangkok
// practice used to turn floor area into a concept massing. Each one is shown in the UI.

export interface BuildingTypeSpec {
  id: BuildingTypeId;
  label: string;
  labelTh: string;
  /** Main use of the upper floors. */
  use: Extract<FloorUse, "residential" | "office" | "hotel">;
  groundFloorHeight: number;
  typicalFloorHeight: number;
  parkingFloorHeight: number;
  /** Net sellable or lettable area as a share of gross floor area on typical floors. */
  efficiency: number;
  /** Average unit or room size in m² (net), used to estimate unit/room count. */
  avgUnitSize?: number;
  /** Deepest floor plate that still gets daylight to every unit, metres. */
  maxPlateDepth: number;
  /** Largest sensible tower floor plate, m². */
  maxTowerPlate: number;
  /** Gross parking area per car space incl. ramps and aisles, m². */
  grossAreaPerCar: number;
}

export const BUILDING_TYPES: Record<BuildingTypeId, BuildingTypeSpec> = {
  condo: {
    id: "condo",
    label: "Condominium",
    labelTh: "อาคารชุดพักอาศัย",
    use: "residential",
    groundFloorHeight: 4.5,
    typicalFloorHeight: 3.0,
    parkingFloorHeight: 3.0,
    efficiency: 0.72,
    avgUnitSize: 35,
    maxPlateDepth: 21,
    maxTowerPlate: 1200,
    grossAreaPerCar: 30,
  },
  office: {
    id: "office",
    label: "Office",
    labelTh: "อาคารสำนักงาน",
    use: "office",
    groundFloorHeight: 5.0,
    typicalFloorHeight: 4.0,
    parkingFloorHeight: 3.0,
    efficiency: 0.8,
    maxPlateDepth: 32,
    maxTowerPlate: 2000,
    grossAreaPerCar: 30,
  },
  hotel: {
    id: "hotel",
    label: "Hotel",
    labelTh: "โรงแรม",
    use: "hotel",
    groundFloorHeight: 5.0,
    typicalFloorHeight: 3.2,
    parkingFloorHeight: 3.0,
    efficiency: 0.65,
    avgUnitSize: 32,
    maxPlateDepth: 20,
    maxTowerPlate: 1100,
    grossAreaPerCar: 30,
  },
};

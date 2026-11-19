// Sample plots inside zone ย.10-4 (Sukhumvit sois 23–55, north of Sukhumvit Road), Bangkok.
// Built from OSM road centrelines (scripts in research/R5-sample-plots.md): each road edge sits on the
// edge of the road reserve (centreline + half the right-of-way), every vertex is inside the traced zone
// outline, and no other road crosses the plot. Coordinates are [lng, lat]; edge i runs from vertex i
// to vertex i+1. Road widths are the plan annex minimum where the road is listed, otherwise an
// estimate from the OSM road class; the user should replace them with surveyed widths.
import type { BuildingTypeId, LngLat } from "../engine/types";

export interface SamplePlot {
  id: string;
  name: string;
  description: string;
  plot: LngLat[];
  /** Curated frontages (drawn edge index). */
  frontages: { edgeIndex: number; roadWidth: number; roadName: string }[];
  buildingType: BuildingTypeId;
}

export const SAMPLE_PLOTS: SamplePlot[] = [
  {
    id: "soi39-mid",
    name: "Soi Sukhumvit 39, mid-block",
    description: "About 2,750 m² on Phrom Phong (listed ROW ≥ 16 m). Room for a tower.",
    plot: [
      [100.5710018, 13.7326724],
      [100.5710953, 13.7330597],
      [100.570588, 13.7332015],
      [100.5704816, 13.732997],
      [100.5705121, 13.732769],
    ],
    frontages: [{ edgeIndex: 0, roadWidth: 16, roadName: "Soi Sukhumvit 39 (Phrom Phong)" }],
    buildingType: "condo",
  },
  {
    id: "soi39-hotel",
    name: "Soi 39 near BTS Phrom Phong",
    description: "About 2,730 m² by the BTS. The 16 m soi and the station each lift the 80-room hotel limit.",
    plot: [
      [100.5705952, 13.7303498],
      [100.570704, 13.7307893],
      [100.5711713, 13.7306785],
      [100.5711491, 13.7303582],
      [100.5710445, 13.7302434],
    ],
    frontages: [{ edgeIndex: 0, roadWidth: 16, roadName: "Soi Sukhumvit 39 (Phrom Phong)" }],
    buildingType: "hotel",
  },
  {
    id: "soi49-corner",
    name: "Soi 49 × Soi 49/9, corner",
    description: "About 2,500 m² on two roads of different width: the wider road sets the height.",
    plot: [
      [100.5769784, 13.7362496],
      [100.5764752, 13.7361769],
      [100.5765719, 13.7357525],
      [100.5770247, 13.7358178],
    ],
    frontages: [
      { edgeIndex: 0, roadWidth: 6, roadName: "Soi Sukhumvit 49/9" },
      { edgeIndex: 3, roadWidth: 12, roadName: "Soi Sukhumvit 49" },
    ],
    buildingType: "condo",
  },
  {
    id: "soi31-narrow",
    name: "Soi Sukhumvit 31 Yaek 2, narrow soi",
    description: "About 1,600 m² on an 8 m lane: too narrow for a high-rise, so the building stays under 23 m.",
    plot: [
      [100.5681002, 13.7395169],
      [100.5677523, 13.7395652],
      [100.5678044, 13.7399234],
      [100.5681574, 13.7399109],
    ],
    frontages: [{ edgeIndex: 0, roadWidth: 8, roadName: "Soi Sukhumvit 31 Yaek 2" }],
    buildingType: "condo",
  },
];

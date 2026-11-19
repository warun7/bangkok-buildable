import type { ZoneInfo } from "../types";

// Zone ย.10, Bangkok Comprehensive Plan B.E. 2556, clause 17 (unchanged by the 2026 amendment
// except for the factory exemption). Values read from the Royal Gazette text.
export const ZONE_Y10: ZoneInfo = {
  code: "ย.10",
  codeLatin: "Y.10",
  name: "High-density residential",
  nameTh: "ที่อยู่อาศัยหนาแน่นมาก",
  colour: "#8B5A2B",
  maxFar: 8,
  minOsr: 4,
  planTitle: "Bangkok Comprehensive Plan B.E. 2556 (as amended B.E. 2569)",
};

/** Permeable planted ground as a share of the open space (cl. 17 para 3 (2)). */
export const Y10_MIN_PERMEABLE_SHARE = 0.5;
/** Hotel rooms above which a 12 m road or a nearby station is required (cl. 17 para 2 (8)). */
export const Y10_HOTEL_ROOM_LIMIT = 80;
/** Office operating area above which a 12 m road or a nearby station is required (cl. 17 para 2 (10)). */
export const Y10_OFFICE_AREA_LIMIT = 10000;
/** Road right-of-way that lifts the hotel/office limits (cl. 17, read with cl. 36 (2)). */
export const Y10_EXEMPT_ROAD_WIDTH = 12;
/** Minimum plot side on that road (cl. 36 (2)). */
export const Y10_EXEMPT_FRONTAGE = 12;
/** Distance from a station platform that lifts the limits (cl. 17, cl. 37). */
export const Y10_STATION_RADIUS = 500;

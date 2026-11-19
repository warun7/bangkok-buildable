import type { LngLat, Vec2 } from "../types";

const WGS84_A = 6378137;
const WGS84_E2 = 0.00669437999014;
const DEG_TO_RAD = Math.PI / 180;

export interface Frame {
  origin: LngLat;
  toLocal(p: LngLat): Vec2;
  toLngLat(v: Vec2): LngLat;
}

/**
 * Local tangent-plane projection centered at the centroid of `points`.
 * Uses WGS84 meridional (M) and prime-vertical (N) radii of curvature at the origin latitude:
 *   x = dLambda * N * cos(phi0)
 *   y = dPhi * M
 */
export function createFrame(points: LngLat[]): Frame {
  if (points.length === 0) {
    throw new Error("createFrame requires at least one point");
  }

  // Drop closing duplicate if caller passed a closed ring
  let count = points.length;
  if (
    count > 1 &&
    points[0][0] === points[count - 1][0] &&
    points[0][1] === points[count - 1][1]
  ) {
    count -= 1;
  }

  let sumLng = 0;
  let sumLat = 0;
  for (let i = 0; i < count; i++) {
    sumLng += points[i][0];
    sumLat += points[i][1];
  }
  const lng0 = sumLng / count;
  const lat0 = sumLat / count;
  const origin: LngLat = [lng0, lat0];

  const phi0 = lat0 * DEG_TO_RAD;
  const sinPhi = Math.sin(phi0);
  const cosPhi = Math.cos(phi0);
  const w = 1 - WGS84_E2 * sinPhi * sinPhi;
  const M = (WGS84_A * (1 - WGS84_E2)) / Math.pow(w, 1.5);
  const N = WGS84_A / Math.sqrt(w);

  const scaleX = DEG_TO_RAD * N * cosPhi;
  const scaleY = DEG_TO_RAD * M;

  return {
    origin,
    toLocal(p: LngLat): Vec2 {
      const x = (p[0] - lng0) * scaleX;
      const y = (p[1] - lat0) * scaleY;
      return [x, y];
    },
    toLngLat(v: Vec2): LngLat {
      const lng = lng0 + v[0] / scaleX;
      const lat = lat0 + v[1] / scaleY;
      return [lng, lat];
    },
  };
}

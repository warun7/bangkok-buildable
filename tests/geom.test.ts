import { describe, expect, it } from "vitest";
import type { LngLat, MultiPolygon, Ring } from "../src/engine/types";
import { createFrame } from "../src/engine/geom/frame";
import {
  centroid,
  edgeLength,
  edgeNormalInward,
  multiArea,
  normalizeRing,
  polygonArea,
  ringArea,
  validatePlot,
} from "../src/engine/geom/polygon";
import { difference, intersection, union } from "../src/engine/geom/boolean";
import { capsule, insetToArea, perEdgeSetback, uniformInset } from "../src/engine/geom/setback";
import { largestRect } from "../src/engine/geom/rect";

describe("frame.ts", () => {
  it("round-trips a 40 m x 30 m rectangle at lat 13.74 with < 1 mm error and area 1,200 m² ± 0.01%", () => {
    const center: LngLat = [100.523186, 13.74];
    const seedFrame = createFrame([center]);

    const localRect: Ring = [
      [-20, -15],
      [20, -15],
      [20, 15],
      [-20, 15],
    ];
    const lngLatRect = localRect.map((pt) => seedFrame.toLngLat(pt));

    const frame = createFrame(lngLatRect);
    const projected = lngLatRect.map((ll) => frame.toLocal(ll));

    for (let i = 0; i < localRect.length; i++) {
      const err = Math.hypot(
        projected[i][0] - localRect[i][0],
        projected[i][1] - localRect[i][1]
      );
      expect(err).toBeLessThan(1e-3); // < 1 mm

      // Round-trip back to LngLat and back to local
      const rtLngLat = frame.toLngLat(projected[i]);
      const rtLocal = frame.toLocal(rtLngLat);
      const rtErr = Math.hypot(rtLocal[0] - projected[i][0], rtLocal[1] - projected[i][1]);
      expect(rtErr).toBeLessThan(1e-3); // < 1 mm
    }

    const area = ringArea(projected);
    expect(Math.abs(area - 1200) / 1200).toBeLessThan(1e-4); // ± 0.01%
  });
});

describe("polygon.ts", () => {
  it("computes ringArea, polygonArea (with holes), and multiArea", () => {
    const outer: Ring = [
      [0, 0],
      [20, 0],
      [20, 20],
      [0, 20],
    ];
    const holeCW: Ring = [
      [5, 5],
      [5, 15],
      [15, 15],
      [15, 5],
    ];
    expect(ringArea(outer)).toBeCloseTo(400, 6);
    expect(ringArea(holeCW)).toBeCloseTo(-100, 6);
    expect(polygonArea([outer, holeCW])).toBeCloseTo(300, 6);
    expect(multiArea([[outer, holeCW]])).toBeCloseTo(300, 6);
  });

  it("normalizes rings (drops closing & consecutive duplicates, drops collinear, makes CCW, maps sourceEdge)", () => {
    // Clockwise ring with a closing duplicate, a consecutive duplicate (<1mm), and a collinear midpoint
    const raw: Ring = [
      [0, 0], // edge 0: [0,0] -> [0,20] (West edge going North)
      [0, 20], // edge 1: [0,20] -> [0,20.0002] (tiny <1mm duplicate)
      [0, 20.0002], // edge 2: -> [15,20] (North edge part 1)
      [15, 20], // edge 3: -> [30,20] (North edge collinear part 2)
      [30, 20], // edge 4: -> [30,0] (East edge going South)
      [30, 0], // edge 5: -> [0,0] (South edge going West)
      [0, 0], // closing duplicate
    ];

    const { ring, sourceEdge } = normalizeRing(raw);
    expect(ring.length).toBe(4);
    expect(ringArea(ring)).toBeCloseTo(600, 2); // CCW positive

    // Normalised CCW edges from [0,0]:
    // local edge 0: [0,0] -> [30,0] (was original edge 5)
    // local edge 1: [30,0] -> [30,20] (was original edge 4)
    // local edge 2: [30,20] -> [0,20] (was original edge 2/3)
    // local edge 3: [0,20] -> [0,0] (was original edge 0)
    expect(sourceEdge[0]).toBe(5);
    expect(sourceEdge[1]).toBe(4);
    expect([2, 3]).toContain(sourceEdge[2]);
    expect(sourceEdge[3]).toBe(0);
  });

  it("validatePlot flags bow-tie as self-intersecting, 5x5 square as too-small, plus sliver and too-large", () => {
    const bowTie: Ring = [
      [0, 0],
      [20, 20],
      [20, 0],
      [0, 20],
    ];
    const resBow = validatePlot(bowTie);
    expect(resBow.ok).toBe(false);
    expect(resBow.issues.map((i) => i.code)).toContain("self-intersecting");

    const tinySquare: Ring = [
      [0, 0],
      [5, 0],
      [5, 5],
      [0, 5],
    ];
    const resSmall = validatePlot(tinySquare);
    expect(resSmall.ok).toBe(false);
    expect(resSmall.issues.map((i) => i.code)).toContain("too-small");

    const sliverRing: Ring = [
      [0, 0],
      [200, 0],
      [200, 0.5],
      [0, 0.5],
    ];
    const resSliver = validatePlot(sliverRing);
    expect(resSliver.ok).toBe(false);
    expect(resSliver.issues.map((i) => i.code)).toContain("sliver");

    const hugeRing: Ring = [
      [0, 0],
      [500, 0],
      [500, 500],
      [0, 500],
    ];
    const resHuge = validatePlot(hugeRing);
    expect(resHuge.ok).toBe(false);
    expect(resHuge.issues.map((i) => i.code)).toContain("too-large");

    const validRing: Ring = [
      [0, 0],
      [40, 0],
      [40, 30],
      [0, 30],
    ];
    expect(validatePlot(validRing)).toEqual({ ok: true, issues: [] });
  });

  it("computes edgeLength, edgeNormalInward, and centroid", () => {
    const rect: Ring = [
      [0, 0],
      [40, 0],
      [40, 30],
      [0, 30],
    ];
    expect(edgeLength(rect, 0)).toBe(40);
    expect(edgeLength(rect, 1)).toBe(30);
    expect(edgeLength([0, 0], [3, 4])).toBe(5);
    expect(edgeNormalInward(rect, 0)).toEqual([0, 1]);
    expect(edgeNormalInward(rect, 1)).toEqual([-1, 0]);
    expect(edgeNormalInward(rect, 2)).toEqual([0, -1]);
    expect(edgeNormalInward(rect, 3)).toEqual([1, 0]);
    expect(centroid([[rect]])).toEqual([20, 15]);
  });
});

describe("boolean.ts", () => {
  const a: MultiPolygon = [
    [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
    ],
  ];
  const b: MultiPolygon = [
    [
      [
        [5, 0],
        [15, 0],
        [15, 10],
        [5, 10],
      ],
    ],
  ];

  it("computes union, intersection, and difference cleanly", () => {
    expect(multiArea(union(a, b))).toBeCloseTo(150, 4);
    expect(multiArea(intersection(a, b))).toBeCloseTo(50, 4);
    expect(multiArea(difference(a, b))).toBeCloseTo(50, 4);
  });
});

describe("setback.ts", () => {
  it("computes perEdgeSetback on a 40 x 30 rectangle", () => {
    const rect: Ring = [
      [0, 0],
      [40, 0],
      [40, 30],
      [0, 30],
    ];

    // Total 6m vertical setback and 6m horizontal setback -> 34 x 24 = 816 m²
    const fp816 = perEdgeSetback(rect, [6, 3, 0, 3]);
    expect(Math.abs(multiArea(fp816) - 816) / 816).toBeLessThan(0.005);

    const fpUniform3 = perEdgeSetback(rect, [3, 3, 3, 3]);
    expect(Math.abs(multiArea(fpUniform3) - 816) / 816).toBeLessThan(0.005);

    // [6, 3, 3, 3] on 40 x 30 -> (40 - 3 - 3) x (30 - 6 - 3) = 34 x 21 = 714 m²
    const fp714 = perEdgeSetback(rect, [6, 3, 3, 3]);
    expect(Math.abs(multiArea(fp714) - 714) / 714).toBeLessThan(0.005);

    // [6, 3, 3, 3] on 40 x 33 -> (40 - 3 - 3) x (33 - 6 - 3) = 34 x 24 = 816 m²
    const rect40x33: Ring = [
      [0, 0],
      [40, 0],
      [40, 33],
      [0, 33],
    ];
    const fp40x33 = perEdgeSetback(rect40x33, [6, 3, 3, 3]);
    expect(Math.abs(multiArea(fp40x33) - 816) / 816).toBeLessThan(0.005);
  });

  it("L-shaped plot uniform inset has rounded reflex corner and area strictly between sharp-corner and derived bound", () => {
    // L-shape: 40x40 minus top-right 20x20 quadrant (reflex vertex at (20, 20))
    const lShape: Ring = [
      [0, 0],
      [40, 0],
      [40, 20],
      [20, 20],
      [20, 40],
      [0, 40],
    ];
    const d = 4;
    const inset = uniformInset([[lShape]], d);
    const actualArea = multiArea(inset);

    // Half-plane (sharp-corner offset lines):
    // Offsetting infinite lines y=20 -> y=16 and x=20 -> x=16 meets at (16, 16),
    // which is at distance 4*sqrt(2) from the reflex corner (20, 20), cutting off the entire
    // 4x4 square [16,20]x[16,20]:
    // [4,4] -> [36,4] -> [36,16] -> [16,16] -> [16,36] -> [4,36]
    // Area = (32 * 12) + (12 * 20) = 384 + 240 = 624 m²
    const sharpCornerHalfPlaneArea = 624;

    // Upper bound without cutting the [16,20]x[16,20] square at the reflex vertex is 624 + d^2 = 640 m².
    // The true capsule inset cuts only a quarter-disk of area (pi/4)*d^2 out of [16,20]x[16,20],
    // giving area = 624 + (1 - pi/4)*d^2 ≈ 627.43 m².
    const noCornerCutUpperBound = sharpCornerHalfPlaneArea + d * d; // 624 + 16 = 640 m²
    const exactCapsuleArea = sharpCornerHalfPlaneArea + (1 - Math.PI / 4) * d * d; // ~627.43 m²

    expect(actualArea).toBeGreaterThan(sharpCornerHalfPlaneArea);
    expect(actualArea).toBeLessThan(noCornerCutUpperBound);
    expect(Math.abs(actualArea - exactCapsuleArea)).toBeLessThan(0.5);

    // Reflex corner is rounded, so vertex count is strictly greater than the 6 corners of a sharp L-shape
    expect(inset.length).toBe(1);
    expect(inset[0][0].length).toBeGreaterThan(10);
  });

  it("insetToArea binary searches d to reach targetArea within 0.5%", () => {
    const rect: MultiPolygon = [
      [
        [
          [0, 0],
          [40, 0],
          [40, 30],
          [0, 30],
        ],
      ],
    ];
    const { shape, d } = insetToArea(rect, 600);
    const area = multiArea(shape);
    expect(area).toBeLessThanOrEqual(600);
    expect((600 - area) / 600).toBeLessThanOrEqual(0.005);
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(6);
  });

  it("capsule produces a CCW ring with positive area", () => {
    const c = capsule([0, 0], [10, 0], 2, 12);
    expect(ringArea(c)).toBeGreaterThan(0);
    // Analytic area = 10 * 4 + pi * 4 = 40 + 12.566 = 52.566
    expect(Math.abs(ringArea(c) - (40 + Math.PI * 4))).toBeLessThan(0.5);
  });
});

describe("rect.ts", () => {
  it("finds largestRect inside a 40 x 30 rectangle at angle 0 (≈ 40 x 30) and respects maxDepth 20", () => {
    const rect: MultiPolygon = [
      [
        [
          [0, 0],
          [40, 0],
          [40, 30],
          [0, 30],
        ],
      ],
    ];

    const full = largestRect(rect, 0, { cell: 0.5 });
    expect(full).not.toBeNull();
    expect(full!.width).toBeCloseTo(40, 0);
    expect(full!.depth).toBeCloseTo(30, 0);
    expect(full!.area).toBeCloseTo(1200, 0);

    const constrained = largestRect(rect, 0, { cell: 0.5, maxDepth: 20 });
    expect(constrained).not.toBeNull();
    expect(constrained!.depth).toBeLessThanOrEqual(20);
    expect(constrained!.depth).toBeCloseTo(20, 0);
    expect(constrained!.width).toBeCloseTo(40, 0);
    expect(constrained!.area).toBeCloseTo(800, 0);
  });

  it("runs under 15 ms on a 100 m x 100 m plot at 0.5 m cells", () => {
    const bigPlot: MultiPolygon = [
      [
        [
          [0, 0],
          [100, 0],
          [100, 100],
          [0, 100],
        ],
      ],
    ];
    const t0 = performance.now();
    const res = largestRect(bigPlot, 0.3, { cell: 0.5, maxDepth: 30 });
    const elapsed = performance.now() - t0;
    expect(res).not.toBeNull();
    expect(elapsed).toBeLessThan(15);
  });
});

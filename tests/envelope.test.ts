import { describe, expect, it } from "vitest";
import type { EnvelopeMesh, EnvelopeSpec, Ring } from "../src/engine/types";
import {
  buildEnvelopeMesh,
  computeEnvelope,
  computeFootprint,
  sliceLevels,
} from "../src/engine/envelope";

function meshVolume(mesh: EnvelopeMesh): number {
  const pos = mesh.positions;
  const idx = mesh.indices;
  let vol6 = 0;

  for (let i = 0; i + 2 < idx.length; i += 3) {
    const i0 = idx[i] * 3;
    const i1 = idx[i + 1] * 3;
    const i2 = idx[i + 2] * 3;

    const x0 = pos[i0],
      y0 = pos[i0 + 1],
      z0 = pos[i0 + 2];
    const x1 = pos[i1],
      y1 = pos[i1 + 1],
      z1 = pos[i1 + 2];
    const x2 = pos[i2],
      y2 = pos[i2 + 1],
      z2 = pos[i2 + 2];

    // Signed determinant det([v0, v1, v2]) = v0 . (v1 x v2)
    vol6 +=
      x0 * (y1 * z2 - z1 * y2) -
      y0 * (x1 * z2 - z1 * x2) +
      z0 * (x1 * y2 - y1 * x2);
  }

  return vol6 / 6;
}

function assertMeshIsClosed(mesh: EnvelopeMesh): void {
  const pos = mesh.positions;
  const idx = mesh.indices;
  expect(idx.length).toBeGreaterThan(0);
  expect(idx.length % 3).toBe(0);

  const vKey = (vi: number): string => {
    const b = vi * 3;
    const qx = Math.round(pos[b] * 1000);
    const qy = Math.round(pos[b + 1] * 1000);
    const qz = Math.round(pos[b + 2] * 1000);
    return `${qx},${qy},${qz}`;
  };

  const undirectedCounts = new Map<string, number>();
  const directedBalance = new Map<string, number>();

  for (let i = 0; i + 2 < idx.length; i += 3) {
    const k0 = vKey(idx[i]);
    const k1 = vKey(idx[i + 1]);
    const k2 = vKey(idx[i + 2]);

    const pairs: [string, string][] = [
      [k0, k1],
      [k1, k2],
      [k2, k0],
    ];
    for (const [u, v] of pairs) {
      expect(u).not.toBe(v);
      const uKey = u < v ? `${u}|${v}` : `${v}|${u}`;
      undirectedCounts.set(uKey, (undirectedCounts.get(uKey) ?? 0) + 1);
      const sign = u < v ? 1 : -1;
      directedBalance.set(uKey, (directedBalance.get(uKey) ?? 0) + sign);
    }
  }

  for (const [, count] of undirectedCounts) {
    expect(count).toBe(2);
  }
  for (const [, bal] of directedBalance) {
    expect(bal).toBe(0);
  }
}

describe("envelope.ts", () => {
  const rect40x30: Ring = [
    [0, 0],
    [40, 0],
    [40, 30],
    [0, 30],
  ];

  it("Test 5: slices a 40 x 30 plot with south road W=8, slope 2, maxHeight 60 -> at t=30 plate depth is 23 and area is 920 m²", () => {
    const spec: EnvelopeSpec = {
      regime: "highrise",
      setbacks: [],
      skyPlanes: [{ edgeIndex: 0, roadWidth: 8, slope: 2, ruleId: "sky-2to1" }],
      maxHeight: 60,
      maxHeightRuleId: "cap",
    };

    const footprint = computeFootprint(rect40x30, spec);
    // Use 10 levels of 3m each so level index 9 has top t = 30
    const heights = new Array<number>(20).fill(3);
    const levels = sliceLevels(rect40x30, spec, footprint, heights);

    const levelAtTop30 = levels.find((lvl) => Math.abs(lvl.z + lvl.h - 30) < 1e-6);
    expect(levelAtTop30).toBeDefined();
    expect(levelAtTop30!.area).toBeCloseTo(920, 2);
  });

  it("Test 6: mesh volume is 44,000 m³ (± 0.5%) and mesh is closed for 40 x 30 plot, south road W=10, slope 2, maxHeight 40", () => {
    const spec: EnvelopeSpec = {
      regime: "highrise",
      setbacks: [],
      skyPlanes: [{ edgeIndex: 0, roadWidth: 10, slope: 2, ruleId: "sky-2to1" }],
      maxHeight: 40,
      maxHeightRuleId: "cap",
    };

    const footprint = computeFootprint(rect40x30, spec);
    const mesh = buildEnvelopeMesh(rect40x30, spec, footprint);

    assertMeshIsClosed(mesh);

    const vol = meshVolume(mesh);
    expect(Math.abs(vol - 44_000) / 44_000).toBeLessThan(0.005);
    expect(mesh.edges.length).toBeGreaterThan(0);
    expect(mesh.edges.length % 6).toBe(0);
  });

  it("Test 7: corner plot with two frontages (south W=8, west W=12) produces a closed mesh with every vertex z <= H(x, y) + 1e-6", () => {
    const spec: EnvelopeSpec = {
      regime: "highrise",
      setbacks: [],
      skyPlanes: [
        { edgeIndex: 0, roadWidth: 8, slope: 2, ruleId: "sky-south" },
        { edgeIndex: 3, roadWidth: 12, slope: 2, ruleId: "sky-west" },
      ],
      maxHeight: 50,
      maxHeightRuleId: "cap",
    };

    const env = computeEnvelope(rect40x30, spec, 3);
    assertMeshIsClosed(env.mesh);

    const pos = env.mesh.positions;
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i];
      const y = pos[i + 1];
      const z = pos[i + 2];
      const hExpected = Math.min(50, 2 * (y + 8), 2 * (x + 12));
      expect(z).toBeLessThanOrEqual(hExpected + 1e-5); // Float32 precision
      expect(z).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it("Test 8: concave U-shaped plot with a frontage runs without exceptions and plates shrink monotonically with height", () => {
    const uShape: Ring = [
      [0, 0],
      [60, 0],
      [60, 40],
      [45, 40],
      [45, 15],
      [15, 15],
      [15, 40],
      [0, 40],
    ];

    const spec: EnvelopeSpec = {
      regime: "highrise",
      setbacks: [{ edgeIndex: 0, distance: 3, ruleId: "front-setback" }],
      uniformClearance: { distance: 2, ruleId: "side-clearance" },
      skyPlanes: [{ edgeIndex: 0, roadWidth: 10, slope: 2, ruleId: "sky-front" }],
      maxHeight: 75,
      maxHeightRuleId: "cap",
    };

    const env = computeEnvelope(uShape, spec, 3);
    expect(env.footprintArea).toBeGreaterThan(0);
    expect(env.levels.length).toBeGreaterThan(10);
    expect(env.geometricCapacity).toBeGreaterThan(env.footprintArea);
    expect(env.mesh.indices.length).toBeGreaterThan(0);

    for (let i = 1; i < env.levels.length; i++) {
      expect(env.levels[i].area).toBeLessThanOrEqual(env.levels[i - 1].area + 1e-4);
    }
  });

  it("benchmarks computeEnvelope on a 30-vertex plot with 60 levels", () => {
    const n = 30;
    const ring30: Ring = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const r = 50 + (i % 3) * 2; // slightly irregular 30-vertex polygon
      ring30.push([60 + r * Math.cos(ang), 60 + r * Math.sin(ang)]);
    }

    const spec: EnvelopeSpec = {
      regime: "highrise",
      setbacks: [
        { edgeIndex: 0, distance: 6, ruleId: "sb-0" },
        { edgeIndex: 7, distance: 4, ruleId: "sb-7" },
      ],
      uniformClearance: { distance: 3, ruleId: "uniform-3" },
      skyPlanes: [
        { edgeIndex: 0, roadWidth: 12, slope: 2, ruleId: "sky-0" },
        { edgeIndex: 7, roadWidth: 16, slope: 2, ruleId: "sky-7" },
      ],
      maxHeight: 180,
      maxHeightRuleId: "cap-180",
    };

    // Warmup run
    computeEnvelope(ring30, spec, 3);

    const runs = 5;
    const t0 = performance.now();
    let lastEnv = computeEnvelope(ring30, spec, 3);
    for (let r = 1; r < runs; r++) {
      lastEnv = computeEnvelope(ring30, spec, 3);
    }
    const avgMs = (performance.now() - t0) / runs;

    expect(lastEnv.levels.length).toBe(60);
    expect(lastEnv.mesh.indices.length).toBeGreaterThan(0);
    expect(avgMs).toBeLessThan(500);
    console.info(
      `[perf] 30-vertex plot, 60 levels: computeEnvelope avg = ${avgMs.toFixed(2)} ms (${lastEnv.levels.length} levels, ${lastEnv.mesh.indices.length / 3} triangles)`
    );
  });
});

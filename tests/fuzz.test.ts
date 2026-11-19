import { describe, expect, it } from "vitest";
import { analyze } from "../src/engine/analyze";
import { SITE_DATA } from "../src/engine/siteData";
import type { BuildingTypeId, LngLat } from "../src/engine/types";

// Throws random plots, roads and building types at the engine. Whatever comes back must be internally
// consistent: floors add up, every design that claims to pass really sits inside its allowed space.

const LAT0 = 13.7365;
const LNG0 = 100.5655;
const M_LAT = 1 / 110574;
const M_LNG = 1 / (111320 * Math.cos((LAT0 * Math.PI) / 180));

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function randomPlot(r: () => number): LngLat[] {
  const n = 3 + Math.floor(r() * 9);
  const size = 12 + r() * 110;
  const angles = Array.from({ length: n }, () => r() * Math.PI * 2).sort((a, b) => a - b);
  return angles.map((a) => {
    const rad = size * (0.45 + r() * 0.55);
    return [LNG0 + Math.cos(a) * rad * M_LNG, LAT0 + Math.sin(a) * rad * M_LAT] as LngLat;
  });
}

const TYPES: BuildingTypeId[] = ["condo", "office", "hotel"];
const WIDTHS = [4, 6, 8, 10, 12, 16, 20, 30, 45];
const TOGGLES = ["B-SETBACK-ROAD", "B-SIDE", "B-SKY", "B-HR-CLEAR"];

describe("fuzz", () => {
  it("never throws and stays consistent on 300 random sites", () => {
    const r = rng(42);
    let worstMs = 0;
    let designsSeen = 0;
    for (let k = 0; k < 300; k++) {
      const plot = randomPlot(r);
      const nf = Math.floor(r() * 3);
      const frontages = Array.from({ length: nf }, () => ({ edgeIndex: Math.floor(r() * plot.length), roadWidth: WIDTHS[Math.floor(r() * WIDTHS.length)] }));
      const disabledRules = TOGGLES.filter(() => r() < 0.15);
      const buildingType = TYPES[k % 3];
      const a = analyze({ plot, frontages, buildingType, disabledRules }, SITE_DATA);
      worstMs = Math.max(worstMs, a.computeMs);
      expect(Number.isFinite(a.plotArea)).toBe(true);
      for (const d of a.designs) {
        designsSeen++;
        const sum = d.floors.reduce((s, f) => s + f.area, 0);
        expect(d.metrics.gfa).toBeCloseTo(sum, 6);
        const env = d.checks.find((c) => c.id === "envelope");
        expect(env?.status, `site ${k} ${d.id}: ${env?.actual}`).toBe("pass");
        expect(d.checks.find((c) => c.id === "far")?.status, `site ${k} ${d.id}`).toBe("pass");
        for (let i = 1; i < d.floors.length; i++) expect(d.floors[i].z).toBeCloseTo(d.floors[i - 1].z + d.floors[i - 1].h, 6);
      }
    }
    console.log(`fuzz: ${designsSeen} designs, worst analysis ${worstMs.toFixed(1)} ms`);
    expect(worstMs).toBeLessThan(400);
  });

  it("survives degenerate input", () => {
    const p = (x: number, y: number): LngLat => [LNG0 + x * M_LNG, LAT0 + y * M_LAT];
    const cases: LngLat[][] = [
      [],
      [p(0, 0)],
      [p(0, 0), p(10, 0)],
      [p(0, 0), p(10, 0), p(20, 0)], // collinear
      [p(0, 0), p(30, 0), p(0, 30), p(30, 30)], // bow-tie
      [p(0, 0), p(0, 0), p(30, 0), p(30, 30), p(30, 30), p(0, 30), p(0, 0)], // duplicates and closed
      [p(0, 0), p(3, 0), p(3, 3), p(0, 3)], // 9 m²
      [p(0, 0), p(200, 0), p(200, 0.8), p(0, 0.8)], // sliver
    ];
    for (const plot of cases) {
      const a = analyze({ plot, frontages: [{ edgeIndex: 0, roadWidth: 10 }, { edgeIndex: 99, roadWidth: -3 }], buildingType: "condo" }, SITE_DATA);
      expect(a).toBeTruthy();
    }
  });
});

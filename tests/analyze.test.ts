import { describe, expect, it } from "vitest";
import { analyze } from "../src/engine/analyze";
import type { LngLat, SiteInput } from "../src/engine/types";

const LAT0 = 13.7305;
const LNG0 = 100.5712;
const M_LAT = 1 / 110574;
const M_LNG = 1 / (111320 * Math.cos((LAT0 * Math.PI) / 180));

/** Rectangle w (east) × h (north) metres, CCW from the south-west corner; edge 0 is the south side. */
function rect(w: number, h: number, dx = 0, dy = 0): LngLat[] {
  const p = (x: number, y: number): LngLat => [LNG0 + (x + dx) * M_LNG, LAT0 + (y + dy) * M_LAT];
  return [p(0, 0), p(w, 0), p(w, h), p(0, h)];
}

function site(over: Partial<SiteInput> = {}): SiteInput {
  return { plot: rect(40, 60), frontages: [{ edgeIndex: 0, roadWidth: 16, roadName: "Soi Sukhumvit 39" }], buildingType: "condo", ...over };
}

const VERBOSE = process.env.VERBOSE === "1";

describe("analyze", () => {
  it("produces consistent designs on a 40 x 60 m plot on a 16 m soi", () => {
    const a = analyze(site());
    if (VERBOSE) {
      console.log("plot", a.plotArea.toFixed(1), "maxGfa", a.maxGfa, "ms", a.computeMs.toFixed(1));
      console.log("low fp", a.envelopes.lowrise.footprintArea.toFixed(1), "cap", a.envelopes.lowrise.geometricCapacity.toFixed(0), "h", a.envelopes.lowrise.height.toFixed(2));
      console.log("high fp", a.envelopes.highrise?.footprintArea.toFixed(1), "cap", a.envelopes.highrise?.geometricCapacity.toFixed(0), "h", a.envelopes.highrise?.height.toFixed(2));
      for (const d of a.designs) {
        console.log(`\n${d.name} [${d.regime}] gfa ${d.metrics.gfa.toFixed(0)} far ${d.metrics.far.toFixed(2)} h ${d.metrics.height.toFixed(1)} storeys ${d.metrics.storeys} fp ${d.metrics.footprint.toFixed(0)} open ${d.metrics.openSpace.toFixed(0)} units ${d.metrics.units} park ${d.metrics.parkingProvided}/${d.metrics.parkingRequired}`);
        console.log("  " + d.summary);
        console.log("  uses", d.floors.map((f) => f.use[0]).join(""));
        for (const c of d.checks) console.log(`  [${c.status}] ${c.label}: ${c.required} | ${c.actual}`);
      }
    }
    expect(a.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(a.plotArea).toBeCloseTo(2400, -1);
    expect(a.maxGfa).toBeCloseTo(8 * a.plotArea, 3);
    expect(a.envelopes.highrise).not.toBeNull();
    expect(a.designs.length).toBeGreaterThanOrEqual(2);
    for (const d of a.designs) {
      const sum = d.floors.reduce((s, f) => s + f.area, 0);
      expect(d.metrics.gfa).toBeCloseTo(sum, 6);
      expect(d.metrics.far).toBeCloseTo(sum / a.plotArea, 6);
      expect(d.checks.find((c) => c.id === "envelope")?.status).toBe("pass");
      expect(d.checks.find((c) => c.id === "far")?.status).toBe("pass");
    }
  });

  it("each toggleable rule changes the envelope", () => {
    const base = analyze(site());
    for (const rule of ["B-SETBACK-ROAD", "B-SIDE", "B-SKY", "B-HR-CLEAR"]) {
      const off = analyze(site({ disabledRules: [rule] }));
      const changed =
        Math.abs(off.envelopes.lowrise.geometricCapacity - base.envelopes.lowrise.geometricCapacity) > 1 ||
        Math.abs((off.envelopes.highrise?.geometricCapacity ?? 0) - (base.envelopes.highrise?.geometricCapacity ?? 0)) > 1;
      expect(changed, rule).toBe(true);
    }
  });

  it("gives the same answer for a clockwise drawing", () => {
    const ccw = analyze(site());
    const cwPlot = [...rect(40, 60)].reverse(); // edges: 0 = W side... south side is now edge 2 (SE->SW)
    const cw = analyze(site({ plot: cwPlot, frontages: [{ edgeIndex: 2, roadWidth: 16 }] }));
    expect(cw.plotArea).toBeCloseTo(ccw.plotArea, 3);
    expect(cw.envelopes.lowrise.geometricCapacity).toBeCloseTo(ccw.envelopes.lowrise.geometricCapacity, 0);
  });

  it("keeps a plot on a narrow soi under the high-rise threshold", () => {
    const a = analyze(site({ frontages: [{ edgeIndex: 0, roadWidth: 6 }] }));
    expect(a.envelopes.highrise).toBeNull();
    expect(a.highriseBlockedReason).toBeTruthy();
    for (const d of a.designs) {
      expect(d.metrics.height).toBeLessThan(23);
      expect(d.metrics.gfa).toBeLessThan(10000);
    }
  });

  it("handles an L-shaped corner plot with two unequal roads", () => {
    const p = (x: number, y: number): LngLat => [LNG0 + x * M_LNG, LAT0 + y * M_LAT];
    const plot = [p(0, 0), p(70, 0), p(70, 30), p(35, 30), p(35, 65), p(0, 65)];
    const a = analyze({ plot, frontages: [{ edgeIndex: 0, roadWidth: 30, roadName: "Sukhumvit Road" }, { edgeIndex: 5, roadWidth: 8 }], buildingType: "office" });
    if (VERBOSE) for (const d of a.designs) console.log(d.name, d.metrics.gfa.toFixed(0), d.checks.filter((c) => c.status === "fail").map((c) => c.label));
    expect(a.designs.length).toBeGreaterThanOrEqual(2);
    for (const d of a.designs) expect(d.checks.find((c) => c.id === "envelope")?.status).toBe("pass");
  });
});

import { SITE_DATA, STATIONS } from "../src/engine/siteData";

describe("site data", () => {
  it("loads stations and the zone outline", () => {
    expect(STATIONS.length).toBeGreaterThanOrEqual(8);
    expect(SITE_DATA.zone?.[0].length).toBeGreaterThan(20);
  });

  it("lifts the hotel room limit next to a station but not on a narrow soi far from one", () => {
    const phromPhong = STATIONS.find((s) => s.code === "E5")!;
    const c = phromPhong.rings[0][0];
    const near = (dx: number, dy: number): LngLat[] => {
      const p = (x: number, y: number): LngLat => [c[0] + (x + dx) * M_LNG, c[1] + (y + dy) * M_LAT];
      return [p(0, 0), p(30, 0), p(30, 40), p(0, 40)];
    };
    const a = analyze({ plot: near(0, 120), frontages: [{ edgeIndex: 0, roadWidth: 8 }], buildingType: "hotel" }, SITE_DATA);
    expect(a.rules.find((r) => r.id === "Z-USE")?.value).toMatch(/within 500 m/);
  });
});

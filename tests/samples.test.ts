import { describe, expect, it } from "vitest";
import { analyze } from "../src/engine/analyze";
import { SITE_DATA } from "../src/engine/siteData";
import { SAMPLE_PLOTS } from "../src/fixtures/samplePlots";

describe("sample plots", () => {
  for (const s of SAMPLE_PLOTS)
    it(`${s.id} is inside the zone and gives passing designs`, () => {
      const a = analyze({ plot: s.plot, frontages: s.frontages, buildingType: s.buildingType }, SITE_DATA);
      if (process.env.VERBOSE === "1") {
        console.log(s.id, a.plotArea.toFixed(0), "m²; high-rise:", !!a.envelopes.highrise, a.rules.find((r) => r.id === "Z-USE")?.value);
        for (const d of a.designs) console.log("  ", d.name, d.metrics.gfa.toFixed(0), "m²", d.metrics.height.toFixed(1), "m", d.metrics.rooms ?? d.metrics.units, d.checks.filter((c) => c.status === "fail").map((c) => c.label));
      }
      expect(a.issues).toEqual([]);
      expect(a.designs.length).toBeGreaterThanOrEqual(2);
      for (const d of a.designs) expect(d.checks.filter((c) => c.status === "fail")).toEqual([]);
    });
});

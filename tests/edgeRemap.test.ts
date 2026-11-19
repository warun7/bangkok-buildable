import { describe, expect, it } from "vitest";
import { remapEdgeStates } from "../src/ui/edgeRemap";
import type { LngLat } from "../src/engine/types";

const sq: LngLat[] = [[100.57, 13.73], [100.5704, 13.73], [100.5704, 13.7304], [100.57, 13.7304]];
const st = (faces: boolean, tag: string) => ({ faces, tag });
const blank = () => st(false, "blank");

describe("remapEdgeStates", () => {
  const old = [st(false, "S"), st(true, "E-road"), st(false, "N"), st(false, "W")];

  it("keeps sides when a corner moves", () => {
    const moved = sq.map((p, i) => (i === 2 ? ([p[0] + 0.0001, p[1]] as LngLat) : p));
    expect(remapEdgeStates(sq, moved, old, blank).map((s) => s.tag)).toEqual(["S", "E-road", "N", "W"]);
  });

  it("splits a side when a corner is inserted before the road", () => {
    const ins = [sq[0], [100.5702, 13.7299] as LngLat, sq[1], sq[2], sq[3]];
    expect(remapEdgeStates(sq, ins, old, blank).map((s) => s.tag)).toEqual(["S", "S", "E-road", "N", "W"]);
  });

  it("splits the road side into two road sides", () => {
    const ins = [sq[0], sq[1], [100.5705, 13.7302] as LngLat, sq[2], sq[3]];
    expect(remapEdgeStates(sq, ins, old, blank).map((s) => s.tag)).toEqual(["S", "E-road", "E-road", "N", "W"]);
  });

  it("merges sides when a corner is deleted, keeping the road", () => {
    const del = [sq[0], sq[1], sq[3]]; // corner 2 removed: E and N merge
    expect(remapEdgeStates(sq, del, old, blank).map((s) => s.tag)).toEqual(["S", "E-road", "W"]);
  });
});

import type { LngLat } from "../engine/types";

// When a corner is inserted or deleted, edge numbers after it shift. Road-frontage settings belong to a
// side of the plot, not to a number, so carry them over by matching corners between the old and new
// outline: unchanged corners keep their identity, a new corner splits the old side it was dragged out of,
// and deleting a corner merges two sides (keeping a road if either side had one).

const MATCH_M = 0.05;

function close(a: LngLat, b: LngLat): boolean {
  const dx = (a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);
  const dy = (a[1] - b[1]) * 110574;
  return Math.hypot(dx, dy) < MATCH_M;
}

export function remapEdgeStates<T extends { faces: boolean }>(
  oldPlot: LngLat[],
  newPlot: LngLat[],
  oldStates: T[],
  blank: () => T,
): T[] {
  const n0 = oldPlot.length;
  const n1 = newPlot.length;
  if (n0 < 3 || n1 < 3 || oldStates.length !== n0) {
    return Array.from({ length: n1 }, (_, i) => oldStates[i] ?? blank());
  }
  if (n0 === n1) return oldStates; // a corner was moved: sides keep their numbers

  // Old index of each new corner (-1 for a corner that did not exist before).
  const oldIdx = newPlot.map((p) => oldPlot.findIndex((q) => close(p, q)));
  const matched = oldIdx.filter((i) => i >= 0).length;
  if (matched < Math.min(n0, n1) - 1) {
    // Not a simple insert/delete (e.g. the outline was redrawn): fall back to position.
    return Array.from({ length: n1 }, (_, i) => oldStates[i] ?? blank());
  }

  return newPlot.map((_, i) => {
    const a = oldIdx[i];
    const b = oldIdx[(i + 1) % n1];
    if (a >= 0 && b >= 0) {
      if ((a + 1) % n0 === b) return oldStates[a]; // same side as before
      // Merged sides a..b (a corner between them was deleted): keep a road if any merged side had one.
      const merged: T[] = [];
      for (let k = a; k !== b; k = (k + 1) % n0) merged.push(oldStates[k]);
      return merged.find((s) => s.faces) ?? merged[0] ?? blank();
    }
    if (a >= 0) return oldStates[a]; // first half of a split side
    if (b >= 0) return oldStates[(b - 1 + n0) % n0]; // second half of a split side
    return blank();
  });
}

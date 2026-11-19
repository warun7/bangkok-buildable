# Worker brief 01: geometry engine (pure TypeScript + tests)

You are one worker in a small team building a browser tool for Bangkok real-estate developers: draw a plot on a map, and see the 3D space a building may legally fill (the "envelope") plus concept designs. You own ONLY the files listed under "Your files". Other workers are editing other files at the same time: do not touch anything else (no package.json, no lockfile, no config, no other src files). Do not install packages, deploy, push, or contact any external service except npm docs if needed.

Read first: `src/engine/types.ts` (the shared contracts; do not edit it — if you think it needs a change, write the proposal at the end of your final reply instead).

Already installed: `polygon-clipping@0.15.7` (booleans), `earcut@3` (triangulation, ships types), `vitest`. TypeScript strict, ESM, `moduleResolution: bundler`. Import local modules with explicit `.ts` extensions are allowed but not required; prefer extensionless imports.

## Your files

- `src/engine/geom/frame.ts`: local tangent-plane projection.
- `src/engine/geom/polygon.ts`: ring/polygon utilities and validation.
- `src/engine/geom/boolean.ts`: thin, safe wrappers around polygon-clipping.
- `src/engine/geom/setback.ts`: per-edge setbacks and uniform insets.
- `src/engine/geom/rect.ts`: largest inscribed oriented rectangle.
- `src/engine/envelope.ts`: slicing and envelope mesh from an `EnvelopeSpec`.
- `tests/geom.test.ts`, `tests/envelope.test.ts`.

## Requirements

### frame.ts
`createFrame(points: LngLat[]): Frame` with origin at the centroid of the points; `frame.toLocal(p: LngLat): Vec2`, `frame.toLngLat(v: Vec2): LngLat`. Use WGS84 radii at the origin latitude: meridional M = a(1−e²)/(1−e² sin²φ)^1.5 and prime vertical N = a/√(1−e² sin²φ), x = Δλ·N·cosφ0, y = Δφ·M (radians). a = 6378137, e² = 0.00669437999014. Exact inverse.

### polygon.ts
- `ringArea(ring)` signed shoelace (CCW positive); `polygonArea(p)` (outer minus holes, always positive); `multiArea(mp)`.
- `normalizeRing(ring)`: drop closing duplicate, drop consecutive duplicates (< 1 mm), drop collinear points (cross-product tolerance), make CCW. Must keep a mapping so callers can relate edges back to the original drawn edges: return `{ ring, sourceEdge: number[] }` where `sourceEdge[i]` is the original edge index that local edge i lies on.
- `validatePlot(ring): { ok: boolean; issues: { code: string; message: string }[] }` with codes: `too-few-points` (< 3 after normalising), `self-intersecting` (any two non-adjacent edges intersect or touch), `too-small` (< 50 m²), `too-large` (> 200,000 m²), `sliver` (area / perimeter² < 0.005, i.e. extremely thin). Plain-English messages a developer would understand.
- `edgeLength`, `edgeNormalInward(ring, i)` (unit normal pointing into a CCW ring), `centroid(mp)`.

### boolean.ts
`union`, `intersection`, `difference` over `MultiPolygon` (our type is `[x,y]` arrays like polygon-clipping's). Snap inputs to 0.1 mm before calling. Wrap every call in try/catch: on a library exception retry once with inputs snapped to 1 mm; if it still throws, return the best safe fallback (`difference` → the minuend; `intersection` → empty) and `console.warn` once. Never throw to the caller. Drop output polygons with area < 0.01 m².

### setback.ts
- `capsule(a: Vec2, b: Vec2, r: number, segments = 12): Ring`: stadium around a segment (CCW), `segments` per half circle.
- `perEdgeSetback(ring, distances: number[]): MultiPolygon`: the set of points inside the plot whose distance to edge i is ≥ distances[i], computed as plot − ∪ capsule(edge_i, distances[i]) for distances > 0. Distance to the segment, not the infinite line: this is the legal meaning of "distance from the boundary".
- `uniformInset(mp, d)` the same idea with one distance for every edge of every ring.
- `insetToArea(mp, targetArea, opts?)`: binary search on `d` (0 .. inradius) so that area ≤ target, within 0.5% or 20 iterations. Returns `{ shape, d }`.

### rect.ts
`largestRect(mp, angleRad, opts: { cell?: number /*0.5*/, minSide?: number, maxDepth?: number, maxLength?: number }): { ring: Ring; width: number; depth: number; area: number } | null`. Rotate the shape by −angle, rasterise it on a `cell` grid (a cell counts only if fully inside), run the maximal-rectangle-in-binary-matrix (histogram stack) algorithm with the side constraints, rotate the result back. "length" is along the angle, "depth" perpendicular. Must be fast: a 100 m × 100 m plot at 0.5 m cells in < 15 ms.

### envelope.ts
Height rule for each sky plane i (a frontage edge with road width W_i): at any point (x, y), height ≤ slope_i × (d_i(x, y) + W_i), where d_i is the signed perpendicular distance from the infinite line through plot edge i, positive into the plot. Overall top surface: H(x, y) = min(maxHeight, min_i slope_i·(d_i + W_i)). This is a minimum of affine functions, so the region where each plane is lowest is convex (an intersection of half-planes).

- `computeFootprint(ring, spec): MultiPolygon` = `perEdgeSetback` with per-edge distance = max over `spec.setbacks` for that edge and `spec.uniformClearance` (if any).
- `sliceLevels(ring, spec, footprint, levelHeights: number[]): Level[]`: levels stacked from z = 0; the plate of a level whose top is t = z + h is footprint ∩ {d_i ≥ t/slope_i − W_i for all i}, and empty if t > maxHeight. Stop at the first empty level. Use half-plane clipping against the infinite line (build a large convex quad for each half-plane, then intersect).
- `buildEnvelopeMesh(ring, spec, footprint): EnvelopeMesh`: a closed, outward-facing triangle mesh of the solid {(x,y) ∈ footprint, 0 ≤ z ≤ H(x,y)}:
  - Top: for each plane j (the cap and each sky plane), region_j = footprint ∩ {f_j ≤ f_k for all k}; triangulate with earcut (holes supported) at z = f_j(x, y). Skip empty regions.
  - Walls: for every footprint ring edge, split it at the breakpoints of the 1-D lower envelope of the plane functions along it, and emit two triangles per piece from z = 0 up to H.
  - Bottom face at z = 0.
  - Per-vertex normals per face (duplicate vertices at creases; flat shading is the goal).
  - `edges`: line segments for: the footprint outline at z = 0, the top outline along every wall, crease lines between top regions, and vertical lines at footprint vertices.
- `computeEnvelope(ring, spec, refFloorHeight = 3): Envelope` tying it together (`geometricCapacity` = sum of level areas, `height` = max H over the footprint vertices and region vertices).

## Tests (vitest, must pass with `npx vitest run`)
Write focused tests including at least:
1. Frame: a 40 m × 30 m rectangle built from metres at lat 13.74 round-trips through lng/lat with < 1 mm error; area 1,200 m² ± 0.01%.
2. `perEdgeSetback` on a 40 × 30 rectangle with distances [6, 3, 3, 3] → area 34 × 24 = 816 m² (± 0.5%).
3. L-shaped plot uniform inset: area strictly between the half-plane (sharp-corner) result and the bound you derive; reflex corner is rounded.
4. `validatePlot` flags a bow-tie as `self-intersecting` and a 5 m × 5 m square as `too-small`.
5. Slicing: 40 m (along the road) × 30 m plot, road on the south edge with W = 8, slope 2, no setbacks, maxHeight 60. A level with top t = 30 has plate depth 30 − (15 − 8) = 23 → area 920 m².
6. Mesh volume (divergence theorem over the triangles) for a 40 × 30 plot, no setbacks, road W = 10 on the south edge, slope 2, maxHeight 40: analytic volume 44,000 m³ (± 0.5%). Also assert the mesh is closed (every edge shared by exactly two triangles) for this case.
7. Corner plot with two frontages (south W = 8, west W = 12): mesh is closed and every vertex z ≤ H(x, y) + 1e-6.
8. A concave U-shaped plot with a frontage: no exceptions, plates shrink monotonically with height.
9. `largestRect` inside a 40 × 30 rectangle at angle 0 → ≈ 40 × 30; with maxDepth 20 → depth ≤ 20.

## Done means
`npx vitest run` passes, `npx tsc --noEmit -p .` has no errors in your files, and your final reply lists: files created, test results, performance numbers for a 30-vertex plot with 60 levels (`computeEnvelope` time), and any proposal for `types.ts`.

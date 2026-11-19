# Bangkok Buildable

What may be built on a plot in Bangkok zone ย.10 (high-density residential), shown in 3D on the real site.

**Live:** https://bangkok-buildable.varun-g-ug23.workers.dev

Draw a plot on the map (any shape), mark the sides that face a public road and their right-of-way widths, and
pick a building type (condominium, office or hotel). The tool shows:

- the rules that apply, each with its clause and a link to the legal text;
- the allowed space in 3D: below the 23 m high-rise line, and above it when the road allows a high-rise;
- concept designs (tower on podium, low-rise block, linear slab), each with a pass/fail checklist and a
  floor-by-floor area schedule.

Everything updates live as you drag corners, change a road width or switch a rule off.

## Scope

One zone, done properly: **ย.10** under the Bangkok Comprehensive Plan B.E. 2556 (as amended B.E. 2569), with the
demo patch **ย.10-4** (Sukhumvit sois 23–55, north of Sukhumvit Road) traced on the map. Building control rules
come from Ministerial Regulations 55, 33 and 7 and the BMA Building Control Ordinance 2544. The verified rule set,
with sources and the judgement calls made in applying it, is in [`research/RULES.md`](research/RULES.md).

## How it works

- **Engine** (`src/engine/`): pure TypeScript and synchronous, so the same input always gives the same output.
  - `rules/` turns the site into applied rules and two envelope specs (low-rise, high-rise).
  - `envelope.ts` builds the allowed footprint (per-edge setbacks as distance-to-segment), slices it per floor
    against the 2 : 1 road planes, and makes the 3D mesh.
  - `design/` generates the concept massings and then re-checks every design from its floor plates, using an
    independent clip of the allowed space (`design/allowed.ts`).
- **Geometry**: local tangent-plane metres (WGS84), polygon-clipping for booleans, earcut for triangulation.
- **Map**: MapLibre GL 5 with OpenFreeMap vector tiles (OSM buildings with heights), and deck.gl 9 interleaved
  so the envelope and massing share the depth buffer with the real buildings.
- **Site data** (`src/data/`): the zone ย.10-4 outline, traced from the plan's written boundary onto OSM
  geometry (about ±15 m), and mass-transit platforms from OSM ([`research/R4-site-data.md`](research/R4-site-data.md)).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine, geometry, sample-plot and fuzz tests
npm run build
```

Deployed as a static-assets Cloudflare Worker with the `cf` CLI (`cloudflare.config.ts`, `npm run deploy`).

## Known limits

- Road widths come from the plan's annex lists (official minimum) or an estimate from the OSM road class; a
  surveyed width should replace them.
- Side distances assume windows on every façade. FAR bonuses, planned road widenings and canal setbacks are not
  modelled.
- The zone outline is approximate; check a plot near its edge against the official map.
- Concept massings are feasibility studies, not designs: unit mix, cores and structure are simplified.

# R4: site data (stations and zone ย.10-4)

Built 19 Nov 2026 from OpenStreetMap via the Overpass API. Outputs:

- `src/data/stations.geojson`: 11 features (Polygon, MultiPolygon or Point), one per station.
- `src/data/zone-y10-4.geojson`: 1 feature, Polygon, 87 vertices, area 2.83 km².

Build scripts (Node ESM, rerunnable, no dependencies): `scripts/data/fetch-overpass.mjs`,
`scripts/data/build-stations.mjs`, `scripts/data/build-zone.mjs`, shared helpers in `scripts/data/geo.mjs`.

## What was fetched

Two Overpass queries (POST to https://overpass-api.de/api/interpreter, User-Agent `bangkok-buildable-data/0.1`,
2 s apart). The first attempt returned HTTP 502; the script retried after 10 s and the query succeeded.

1. Stations: `railway=station` and `railway=platform` / `public_transport=platform` in bbox 13.715–13.770 N, 100.535–100.610 E. 54 elements.
2. Zone: canal `waterway=canal` named แสนแสบ / Saen Saep; highways named สุขุมวิท, อโศกมนตรี, ทองหล่อ, ข 41, Soi 49 / 55 / 21 (Thai and English); the SWU Prasarnmit university
   (amenity and landuse, closed way 329745926) in bbox 13.715–13.775 N, 100.530–100.620 E. 366 elements.

Raw responses are kept outside the repo at `/private/tmp/claude-501/-Users-varunsg-code-general-machines/205d8ee5-9cf6-4645-9b8a-761236306ee6/scratchpad/raw/` (`stations.json`, `zone.json`).
Rerun: `node scripts/data/fetch-overpass.mjs <dir>`, then `node scripts/data/build-stations.mjs <dir>` and `node scripts/data/build-zone.mjs <dir>/zone.json`.

## Stations: decisions

- Candidates: every rail station node with a network code (BTS E/N/S, MRT BL, Airport Rail Link A). The SRT Khlong Tan station (a state railway, not in the list) was left out, and the second SRT node for Makkasan was dropped in favour of ARL A6.
- The 500 m test measures from the platform outline (station point if no platform) to Sukhumvit Road, Asok Montri Road (Soi 21) and sois 1–63. Sukhumvit Road is cut at the Soi 63 junction (lon 100.5846), so sois 65 and up do not count. Threshold 500 m.
- Judgement: the test follows the sois network rather than the rough lat/lon box. Phra Khanong (E8) passes only through Soi 46, which is south of the box (lat 13.713–13.72). Ekkamai (E7) passes through Soi 63 and is south of the box too, and it was named in the brief. If the box is the strict boundary, drop E8.
- Platforms: each platform is assigned to its nearest candidate station within 200 m. Closed ways become polygons; open ways would be buffered to 6 m (none needed here). Two platforms per BTS station and per Makkasan; these are merged into a MultiPolygon.
- Phetchaburi (BL21) has one platform, 147 m from the station node. It is taken as the MRT platform; not checked against imagery.
- Sukhumvit (BL22) and Queen Sirikit (BL23) have no platform in OSM, so they are Points.

| Code | Station | Line | Geometry | In range (m to road) |
|---|---|---|---|---|
| E2 | Phloen Chit | BTS Sukhumvit | MultiPolygon | 112 |
| E3 | Nana | BTS Sukhumvit | MultiPolygon | 3 |
| E4 | Asok | BTS Sukhumvit | MultiPolygon | 3 |
| E5 | Phrom Phong | BTS Sukhumvit | MultiPolygon | 1 |
| E6 | Thong Lo | BTS Sukhumvit | MultiPolygon | 3 |
| E7 | Ekkamai | BTS Sukhumvit | MultiPolygon | 14 |
| E8 | Phra Khanong | BTS Sukhumvit | MultiPolygon | 11 (via Soi 46) |
| BL21 | Phetchaburi | MRT Blue | Polygon | 143 |
| BL22 | Sukhumvit | MRT Blue | Point | 30 |
| BL23 | Queen Sirikit NCC | MRT Blue | Point | 415 |
| A6 | Makkasan | Airport Rail Link | MultiPolygon | 161 |

Out of range (not included): Chit Lom E1 (761 m), Victory Monument N3, Ratchadamri S1, Si Lom BL26, Lumphini BL25, Khlong Toei BL24 (890 m), Phra Ram 9 BL20, Thailand Cultural Centre BL19, Ramkhamhaeng A5 (980 m), Ratchaprarop A7 (1200 m).

## Zone ย.10-4: method and decisions

Lines are built as offsets of OSM centrelines, then intersected to give the ring. Offsets in metres: Sukhumvit north edge 15 (centreline to north edge, per brief); sois 4 (side of Soi 55, Soi 49, Soi 49/4); canal south bank 5; Asok Montri east edge 10 (assumed half right-of-way) plus 200 = 210 m. The mapped carriageways zigzag by 10–20 m, so centrelines are smoothed over a window (15 m for Sukhumvit and sois, 30 m for Asok Montri) and then simplified (3 m) before offsetting.

Ring (counter-clockwise, GeoJSON): west line from Sukhumvit north edge to the campus, campus south and east edges to its NE corner on the canal, canal south bank east to Soi 49, Soi 49 west side south to the link, link south side east to Soi 55, Soi 55 west side south to Sukhumvit, Sukhumvit north edge west back to start.

Decisions where the legal text is ambiguous or OSM is incomplete:

1. ข 41 is not in OSM under that name. I read it as Soi 49/11 (west of Soi 49), the Soi 49 section between 49/11 and 49/4, and Soi 49/4 (east to Soi 55), per the brief.
2. The planned link from the 49/4 east end (100.5802) to Soi 55 (about 180 m) is not mapped. I extended the 49/4 south side straight east to meet Soi 55 (V3 at 100.58234, 13.73341).
3. Soi 49 is not mapped up to the canal (north end 13.7449, canal bank about 13.7453). I extended its west side 250 m north to the canal (V5 at 100.57639, 13.74526).
4. Soi 49/11 is treated as inside the zone (zone lies west of Soi 49 both north and south of it). If the zone should lie only south of 49/11, the strip north of it (about 0.03 km²) comes out.
5. The west line is 210 m east of Asok Montri's centreline. Its mapped south end sits north of Sukhumvit, so the line is extended 400 m south to meet the Sukhumvit north edge (V1 at 100.56329, 13.73517).
6. Srinakharinwirot Prasarnmit campus: the west line crosses the campus. The zone boundary follows the campus south and east edges (from V7 at 100.56419, 13.74354 to the NE corner at 100.56729, 13.74695), so the campus is excluded. The sliver between the campus north edge and the canal bank (under 5 m) is ignored. The demonstration school is inside the campus outline and is not subtracted separately.
7. The canal is taken as the south bank, 5 m offset from the mapped centreline.

## Validation

| Check | Result |
|---|---|
| Vertices | 87 (< 400) |
| Valid, no self-intersection | pass (after smoothing; before smoothing the Soi 55 and Asok edges folded over) |
| Area | 2.829 km² (plausible range 2–4 km²) |
| INSIDE: Soi 31 (100.5665, 13.7350) | pass |
| INSIDE: Soi 39 near Phrom Phong (100.5700, 13.7330) | pass |
| OUTSIDE: Asok intersection (100.5603, 13.7370) | pass |
| OUTSIDE: Benjasiri Park south of Sukhumvit (100.5675, 13.7300) | pass |
| OUTSIDE: Thong Lo east of Soi 55 (100.5850, 13.7300) | pass |
| Extra: campus interior (100.5648, 13.7450) outside; canal-side NE of campus (100.5690, 13.7455) inside; west of Soi 49 (100.5750, 13.7400) inside; east of Soi 49, north of link (100.5790, 13.7380) outside; between Soi 49 and Soi 55, south of link (100.5790, 13.7300) inside; canal north of zone (100.5720, 13.7480) outside; Soi 49/11 area (100.5745, 13.7368) inside | all as expected |

The build script exits without writing the file if any validation check fails.

## Uncertain

- Half-widths are assumed, not measured: Asok Montri right-of-way 20 m (half 10), canal 10 m wide (half 5). A 5 m error on the Asok line moves the west boundary 5 m.
- The legal text is the translation in the brief. I did not check the plan PDF (p. 71) or the printed zone map, so the ring is traced from the description, not from the official map.
- OSM geometry is community-mapped and may be stale for road widths and the campus outline.
- Expected accuracy is about ±15 m, per the brief. Check the Sukhumvit north edge and the link line against imagery before relying on plot-level decisions.

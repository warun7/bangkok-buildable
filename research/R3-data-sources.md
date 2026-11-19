# R3 - Data sources for a Bangkok 3D envelope browser tool

Date of tests: 2026-11-19. Sandbox network from this machine. Samples in `/Users/varunsg/code/general-machines/research/samples/`.

Legend: TESTED = run here with curl/WebFetch; DOC = from documentation/search snippets only; NOT VERIFIED = not checked.

## Summary of blockers

- All Thai government hosts tested (cpd.bangkok.go.th, data.bangkok.go.th, www.dpt.go.th, data.go.th, dev.data.go.th, gdcc.data.go.th, www.bangkok.go.th) were unreachable from this sandbox (connection reset, 403, empty reply, or certificate mismatch). This is a test-environment limit, not proof the services are down. Q1 and Q2 are therefore unresolved by test.
- No public zoning GIS endpoint for the BMA Comprehensive Plan was found by web search.
- Overpass rejects curl's default User-Agent with HTTP 406. A custom User-Agent works.

---

## 1. Zoning map GIS (Bangkok Comprehensive Plan, ผังเมืองรวมกรุงเทพมหานคร)

### 1a. Candidate endpoints and test results

| Candidate | URL tested | Result |
|---|---|---|
| BMA City Planning | https://cpd.bangkok.go.th/ | TESTED: `curl -sS -I https://cpd.bangkok.go.th` gave "Recv failure: Connection reset by peer" (HTTP/1.1 and HTTP/2, with and without browser UA). WebFetch: `read ECONNRESET`. |
| BMA open data | https://data.bangkok.go.th/ | TESTED: connection reset (`curl -sS -I https://data.bangkok.go.th/`). CKAN status endpoint `/api/3/action/status_show` also reset. |
| BMA main site | https://www.bangkok.go.th/ | TESTED: HTTP 403 (text/html). |
| DPT main site | https://www.dpt.go.th/ | TESTED: `curl: (92) HTTP/2 stream 1 ... CANCEL` then `(52) Empty reply from server`. |
| DPT GIS hosts guessed | gis.dpt.go.th, maps.bangkok.go.th | TESTED: DNS does not resolve. Hostnames are guesses; do not rely on them. |
| Thai open data portal | https://data.go.th/ | TESTED: HTTP 403 (text/html; charset=UTF-8), with and without browser UA. |
| Thai open data dataset (zoning-related) | https://dev.data.go.th/en/dataset/bdctl_polygon | TESTED: `curl: (60) SSL: no alternative certificate subject name matches target host name 'dev.data.go.th'`. WebFetch also failed on the same cert mismatch. |
| Same dataset on production host | https://data.go.th/en/dataset/bdctl_polygon | TESTED: HTTP 403. |
| Open data WMS catalogue | https://gdcc.data.go.th/en/dataset/wms | TESTED: HTTP 403. |

WebSearch (standard mode) for "Bangkok comprehensive plan zoning GIS ArcGIS FeatureServer shapefile" returned news and background only (Wikipedia, Nation Thailand, condodee). It did not point to any GIS server or shapefile. It did confirm:
- The current plan is the 3rd revision (2013). A 4th revision is in drafting, expected mid-2027 per the search snippets.
- BMA says about 90% of zone classifications stay the same in the new revision.

WebSearch for "data.bangkok.go.th zoning GeoJSON" found one candidate on the national portal: **BDCTL_POLYGON** (dataset title in English, tagged ผังเมือง, created 2022-08-31, maintained by the city planning and development department). Its resource list did not render in the search snippet, so format, licence and URLs are **NOT VERIFIED**. Its host is unreachable from here (see above).

Commercial: Goong (goong.io) lists a "city plan" layer with land-use per city planning law. It is paid and not open data. Not tested.

### 1b. Feature-service sample query

Not possible to write a verified query: no BMA or DPT FeatureServer URL was found or reachable. Do not ship a query against a guessed URL.

Template to use once a real ArcGIS endpoint is found (replace `<SERVICE>` and check field names from the layer's `?f=json` metadata first):

```
curl -sS "https://<host>/arcgis/rest/services/<SERVICE>/FeatureServer/0/query" \
  --data-urlencode "where=1=1" \
  --data-urlencode "geometry=100.56,13.74" \
  --data-urlencode "geometryType=esriGeometryPoint" \
  --data-urlencode "inSR=4326" \
  --data-urlencode "spatialRel=esriSpatialRelIntersects" \
  --data-urlencode "outFields=*" \
  --data-urlencode "returnGeometry=true" \
  --data-urlencode "outSR=4326" \
  --data-urlencode "f=geojson"
```

Test first: `curl -sS "https://<host>/arcgis/rest/services/<SERVICE>/FeatureServer/0?f=json"` to confirm `geometryType` and fields. Check CORS by sending `-H "Origin: https://example.pages.dev"` and looking for `Access-Control-Allow-Origin`.

### 1c. Licence and terms

Not determined. Thai government open data is usually under a permissive licence, but the BDCTL_POLYGON licence was not visible. Check the dataset page and the Thai Open Government Data licence before any use.

---

## 2. If no GIS service: official boundary sources and tracing

Not verified in this session because the BMA CPD site is unreachable. From general knowledge (**NOT VERIFIED**):
- BMA's City Planning Department (กองนโยบายและแผนงาน / สำนักการวางผังและพัฒนาเมือง) publishes the Comprehensive Plan as PDF map sheets by district, with zone codes such as ย.10, พ.4, พ.5.
- Official sheets are usually scanned or vector PDFs at 1:10,000 or similar scale, with a title block and coordinate grid (UTM or Thai grid) that could be used for georeferencing.

Tracing approach (proposed, not tested):
1. Download the PDF sheet covering the area. Confirm the licence and the attribution requirement before use.
2. Georeference it in QGIS against OSM roads or buildings. Use at least 4 control points on named intersections or grid ticks.
3. Trace the zone polygon for the target patch in QGIS, then export GeoJSON in EPSG:4326.
4. Record the sheet number, scale, and date of the plan revision with each polygon.
5. Check the traced polygon against the printed legend and the zone's text rules (FAR, height limit). Zone colour alone is not enough.

Risk: tracing is manual and slow, and positional error at sheet scale can be tens of metres. Legal use also needs the authoritative text, not just the map.

---

## 3. Surrounding buildings and roads

### 3a. OpenFreeMap (https://tiles.openfreemap.org)

TESTED:
```
curl -sS -o ofm_style_liberty.json https://tiles.openfreemap.org/styles/liberty     -> HTTP 200 application/json
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://tiles.openfreemap.org/styles/positron  -> 200 application/json
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://tiles.openfreemap.org/styles/bright    -> 200 application/json
curl -sS -o ofm_planet_tilejson.json https://tiles.openfreemap.org/planet            -> 200, 19,254 bytes
```
- Style name/version: `version: 8`. No API key or token in any URL tested.
- Sources: `openmaptiles` -> `https://tiles.openfreemap.org/planet`. TileJSON `tiles`: `https://tiles.openfreemap.org/planet/20261115_080022_pt/{z}/{x}/{y}.pbf` (dated build, 2026-11-15).
- Sprite: `https://tiles.openfreemap.org/sprites/ofm_f384/ofm`. Glyphs: `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf`.
- Schema: OpenMapTiles (tilejson 3.0.0). Vector layers include `building`, `transportation`, `brunnel`, `place`, `poi`, etc. Names carry `name:en`, `name:th` and many other languages.

Building layer attributes (TESTED on one z14 tile over Asok, x=12768 y=7560, 475,138 bytes, `application/vnd.mapbox-vector-tile`):
- Strings found in the tile bytes: `building`, `render_height`, `render_min_height`, `height`, `min_height`, `levels`, `hide_3d`. (Counts are raw byte-string occurrences, not feature counts. Full decoding was not done.)
- Liberty style layer `building-3d` (type `fill-extrusion`):
  - `fill-extrusion-height`: `["get","render_height"]`
  - `fill-extrusion-base`: `["get","render_min_height"]`
  - filter: `["!", ["has","hide_3d"]]`
  - `fill-extrusion-opacity`: 0.8

Height derivation when OSM has no height tag: **NOT VERIFIED**. The `render_height` value is computed server-side from OSM `height`, `building:levels` and similar tags in the OpenMapTiles pipeline. The exact fallback (default storey height, default value when no tag) was not confirmed. Test it by checking a building with `building:levels` but no `height`, then comparing the decoded `render_height` with 3.x m per level. Use a decoder such as `@mapbox/vector-tile` for this.

CORS: tilejson and tile responses return `access-control-allow-origin: *` (TESTED with `-H "Origin: https://example.pages.dev"`).

Licence / keys / attribution: no key needed (TESTED). Production use: not stated in the tested responses. Attribution text was not found in the liberty style JSON (grep for `attribution` returned nothing). From general knowledge (**DOC/NOT VERIFIED**): OpenFreeMap asks for OpenFreeMap and OpenMapTiles attribution, plus OpenStreetMap data credit (ODbL). Check https://openfreemap.org before going live.

### 3b. OSM coverage in central Bangkok (Overpass)

Box: `13.735,100.555,13.745,100.565` (S,W,N,E), about 1.1 km x 1.0 km around Asok/Sukhumvit.

Critical quirk: `overpass-api.de` returns HTTP 406 (nginx) to curl's default User-Agent, for GET and POST, and to an explicit `Accept: application/json` header. A custom User-Agent works.

Commands run (all with `-A "research-probe/0.1 (contact: none)"`):
```
curl -sS -m 150 -A "$UA" --data-urlencode "data=[out:json][timeout:120];way[\"building\"](13.735,100.555,13.745,100.565);out count;" https://overpass-api.de/api/interpreter
```
Results (ways, from `out count`):

| Query | Count |
|---|---|
| buildings (`way["building"]`) | **950** (two runs, both 950) |
| buildings with `height` | **102** (10.7%) |
| buildings with `building:levels` | **442** (46.5%) |
| buildings with `height` OR `building:levels` | **445** (46.8%) |
| highway ways (`way["highway"]`) | **644** |
| highway with `width` | **0** |
| highway with `lanes` | **72** (derived: the union of width-or-lanes was 72 and width was 0; the direct lanes query timed out once) |

Interpretation: about half of buildings have a height proxy, and about 53% have neither. Almost no roads have width; about 11% have lanes. Roads need a width default by highway class in the app.

CORS (TESTED):
- Preflight `OPTIONS` to `https://overpass-api.de/api/interpreter` with `Origin: https://example.pages.dev`: `HTTP/1.1 200 OK`, `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Max-Age: 600`.
- Actual `POST` response: the header check only showed `Content-Type: application/json`, with **no** `Access-Control-Allow-Origin` line. A browser needs that header on the real response. This is a risk: verify in a browser with the real request before depending on Overpass from the client. Otherwise proxy through a Worker.
- Mirror `overpass.kumi.systems` and `overpass.private.coffee` hung past 120 s and were stopped.

Usage policy: NOT FETCHED. From general knowledge (**DOC**): public Overpass instances are fair-use only, with rate and slot limits. Heavy client-side use is discouraged; cache results.

Cache/availability: Overpass is shared and slow at times (queries took 30-150 s here). Do not run it per user click.

### 3c. Overture Maps buildings

TESTED: public S3 bucket `overturemaps-us-west-2` is listable over HTTPS and sends `Access-Control-Allow-Origin: *` (`Allow-Methods: GET, HEAD`).
```
curl -sS "https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/&delimiter=/"
  -> releases include 2026-09-23.0, 2026-09-23.1, 2026-10-21.0, 2026-11-18.0 (latest)
curl -sS "https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/2026-11-18.0/theme%3Dbuildings/type%3Dbuilding/&max-keys=3"
  -> part-00000-...zstd.parquet, part-00001-...zstd.parquet, part-00002-...zstd.parquet (IsTruncated=true)
```
So the buildings theme exists as zstd parquet in release 2026-11-18.0. Parquet is not directly usable in MapLibre; it needs conversion (for example PMTiles via `pmtiles extract` and `planetiler`, or DuckDB/GeoParquet in a worker).

Not tested: whether Bangkok buildings have a populated `height` or `num_floors` value. Downloading and filtering a parquet part was out of scope for this session. DOC: the Overture building schema has `height` and `num_floors` fields with source tracking, and height is populated from several sources (including lidar-based releases in some countries). Bangkok coverage is **NOT VERIFIED**.

Browser access without own server: DOC. Overture's docs point to PMTiles extracts (`pmtiles extract` with bbox) and to viewers such as pmtiles.io. A public PMTiles file for Bangkok was not found. The bucket is public, but a 2-3 GB parquet set cannot be fetched directly in a browser for a Bangkok box. Practical path: build a Bangkok PMTiles extract ourselves (offline job, uploaded to R2 with CORS) rather than fetch from the browser.

### 3d. Satellite imagery (Esri World Imagery)

TESTED:
```
curl -sS "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer?f=json"  -> HTTP 200 application/json
curl -sS -D - -o /dev/null "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/16/40281/26007"
  -> HTTP/1.1 200 OK, Access-Control-Allow-Origin: *, Content-Type: image/jpeg
```
- Service metadata: `copyrightText` = "Source: Esri"; `singleFusedMapCache` = true; description says it includes Vantor imagery at 0.3 m for selected metros.
- No API key for tile reads (TESTED). Tile URL pattern: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`. Note the order is z/y/x for ESRI.
- Terms: Esri's ArcGIS Online basemap terms apply; the esri.com legal page returned 301 (not followed). Attribution is required: include "Esri, Maxar, Earthstar Geographics, and the GIS User Community" or the current Esri attribution string from the metadata. Usage above low volume may breach terms; check before public launch. NOT VERIFIED.

### 4. Geocoding (search box)

Nominatim (`https://nominatim.openstreetmap.org`), TESTED:
```
curl -sS -A "research-probe/0.1 (contact: none)" -D - -o nominatim_asok.json \
  -H "Origin: https://example.pages.dev" \
  "https://nominatim.openstreetmap.org/search?q=Asok&format=jsonv2&limit=2&accept-language=th"
  -> HTTP/2 200, access-control-allow-origin: *, content-type application/json
```
- Returned `Asok` (neighbourhood, lat 13.7366, lon 100.5614) with `display_name` in Thai: "Asok, แขวงคลองเตยเหนือ, วัฒนา, กรุงเทพมหานคร". Thai names and `accept-language=th` work.
- Without a User-Agent, the same URL returned 200 in this test. Policy (DOC, not fetched): identify the app with a valid UA or Referer, max 1 request/s, no autocomplete-style bulk use, cache results, show ODbL attribution. Autocomplete per keystroke will violate policy.

Photon (`https://photon.komoot.io`), TESTED:
```
curl -sS -D - -o photon_th.json "https://photon.komoot.io/api/?q=%E0%B8%AD%E0%B9%82%E0%B8%A8%E0%B8%81&lat=13.7367&lon=100.5600&limit=3"
  -> HTTP/1.1 200 OK (no Access-Control-Allow-Origin line shown in this test)
```
- Thai query "อโศก" returned: อโศก (railway station, 100.5604, 13.7370), Terminal 21, Sukhumvit Soi 11. Good Thai coverage.
- `lang=th` returns HTTP 400: "Language is not supported. Supported are: default, de, en, fr". Use no `lang` param, or `lang=en`.
- A `Access-Control-Allow-Origin: *` header appeared on the 400 response. The 200 response in this test did not show it, so CORS for Photon's success path is **not confirmed**. Test in a browser before using.
- Usage policy: from general knowledge (**DOC**), a public service, fair use, no heavy traffic. Self-host for production.

---

## Recommendation

| Need | Use | Why / status | Main risk |
|---|---|---|---|
| Zoning boundaries | Not decided. Short term: manual trace from the official BMA PDF sheets (Section 2), or a licensed layer (Goong, paid). Check BDCTL_POLYGON once data.go.th is reachable. | No open GIS endpoint found. Official hosts unreachable from here. | Legal accuracy; draft 4th revision (mid-2027) will change zones. |
| Buildings (3D context) | OpenFreeMap liberty style (`building-3d`) for rendering; Overpass only for offline checks. Build a Bangkok PMTiles extract for heights if OSM coverage is too thin. | OpenFreeMap: TESTED keyless, CORS `*`, `render_height` present. OSM heights exist for only 47% of buildings. | Height fallback unverified; OSM gaps. Attribution requirements. |
| Roads | OpenFreeMap `transportation` layer. | Tested as part of the vector schema; road widths are almost all missing in OSM (0 of 644 with width). | Road width must be a default per class. |
| Imagery | Esri World Imagery tiles (keyless, CORS `*`). | TESTED tile fetch 200 with CORS. | Terms and volume limits; attribution. |
| Geocoding | Photon (Thai query works, no key) for typing; Nominatim for final lookups, cached, 1 req/s. | Both TESTED with Thai text. | Photon CORS on success path unconfirmed; Nominatim policy; no autocomplete on Nominatim. |
| Overpass (client) | Do not call from the browser in production. Use a Worker proxy, or an offline extract. | 406 without custom UA; POST response lacked ACAO in test; 30-150 s latency. | Availability and fair use. |

Key risks, in order:
1. Zoning data: no verified machine-readable source. This blocks the main legal value of the tool.
2. Height data: about half of OSM buildings have a height proxy; fallback heights will be wrong for many plots. Tell users the envelope is only as good as the context heights.
3. Browser CORS: Overpass POST and Photon success responses need a browser test before use.
4. Imagery and map terms: attribution and volume rules must be checked before public launch.
5. Thai government hosts were unreachable here. Retest from another network before finalising Q1 and Q2.

Unverified items to close next: decode a z14/z16 OpenFreeMap tile to check `render_height` fallback; read BDCTL_POLYGON from a reachable network; check Overture Bangkok `height` by filtering one parquet part with DuckDB; read the OpenFreeMap and Overpass usage pages.

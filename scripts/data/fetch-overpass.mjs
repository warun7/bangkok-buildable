// Fetches raw OSM data for the Bangkok site-data build via the Overpass API.
// Usage: node scripts/data/fetch-overpass.mjs <outDir>
// Writes <outDir>/stations.json and <outDir>/zone.json. Waits 2 s between queries.
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT = process.argv[2];
if (!OUT) throw new Error("usage: fetch-overpass.mjs <outDir>");
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const UA = "bangkok-buildable-data/0.1";

// bbox order for Overpass: south, west, north, east
const STATION_BBOX = "13.715,100.535,13.770,100.610";
const ZONE_BBOX = "13.715,100.530,13.775,100.620";

const QUERIES = {
  stations: `[out:json][timeout:120];
(
  nwr["railway"="station"](${STATION_BBOX});
  nwr["railway"="platform"](${STATION_BBOX});
  nwr["public_transport"="platform"]["railway"](${STATION_BBOX});
);
out geom;`,
  zone: `[out:json][timeout:180];
(
  way["waterway"="canal"]["name"~"แสนแสบ|Saen Saep|Saen Sep"](${ZONE_BBOX});
  way["waterway"~"canal|river|drain"]["name"~"แสนแสบ|Saen Saep|Saen Sep"](${ZONE_BBOX});
  way["highway"]["name"~"สุขุมวิท|Sukhumvit|อโศกมนตรี|Asok Montri|ทองหล่อ|Thong Lo|ข 41|ข41|ศรีนครินทรวิโรฒ|Srinakharinwirot|ประสานมิตร|Prasarnmit|Soi 49|Soi 55|Soi 21|ซอย 49|ซอย 55|ซอย 21"](${ZONE_BBOX});
  way["highway"]["ref"~"ข 41|ข41|ข.41"](${ZONE_BBOX});
  nwr["amenity"="university"]["name"~"ศรีนครินทรวิโรฒ|Srinakharinwirot|ประสานมิตร|Prasarnmit"](${ZONE_BBOX});
  way["landuse"]["name"~"ศรีนครินทรวิโรฒ|Srinakharinwirot|ประสานมิตร|Prasarnmit"](${ZONE_BBOX});
  nwr["name"~"ศรีนครินทรวิโรฒ|Srinakharinwirot|ประสานมิตร|Prasarnmit"](${ZONE_BBOX});
);
out geom;`,
};

async function run(name, query) {
  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }).toString(),
    });
    if (res.ok) break;
    console.log(`${name}: HTTP ${res.status}, attempt ${attempt}`);
    await new Promise((r) => setTimeout(r, 10000));
  }
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const json = await res.json();
  await writeFile(join(OUT, `${name}.json`), JSON.stringify(json));
  console.log(`${name}: ${json.elements.length} elements`);
}

await mkdir(OUT, { recursive: true });
let first = true;
for (const [name, q] of Object.entries(QUERIES)) {
  if (!first) await new Promise((r) => setTimeout(r, 2000));
  first = false;
  await run(name, q);
}

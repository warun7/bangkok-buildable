import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { SolidPolygonLayer } from "@deck.gl/layers";

// Smoke test: OpenFreeMap basemap with 3D buildings + an interleaved deck.gl extrusion.
export default function App() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const map = new maplibregl.Map({
      container: el.current!,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [100.5605, 13.7385],
      zoom: 17,
      pitch: 60,
      bearing: -20,
    });
    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [
        new SolidPolygonLayer({
          id: "test",
          data: [{ polygon: [[100.5600, 13.7380, 0], [100.5606, 13.7380, 0], [100.5606, 13.7385, 0], [100.5600, 13.7385, 0]] }],
          getPolygon: (d: { polygon: number[][] }) => d.polygon,
          extruded: true,
          getElevation: 60,
          getFillColor: [255, 120, 40, 200],
        }),
      ],
    });
    map.addControl(overlay);
    return () => map.remove();
  }, []);
  return <div ref={el} style={{ position: "fixed", inset: 0 }} />;
}

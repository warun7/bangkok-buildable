import { ROAD_WIDTH_BY_CLASS } from "../map/roads";
import { fmtMetres } from "./format";

export interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="About and sources">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">About Bangkok Buildable</h2>
            <p className="modal-subtitle">
              Real-time zoning envelope and concept massing feasibility for Bangkok development sites
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close modal">
            Close
          </button>
        </div>

        <div className="modal-body">
          <section className="modal-section">
            <h3>Statutory &amp; regulatory sources</h3>
            <ul className="source-list">
              <li>
                <strong>Bangkok Comprehensive Plan B.E. 2556 (2013)</strong> — Land-use zone classification,
                maximum Floor Area Ratio (FAR), and minimum Open Space Ratio (OSR).
              </li>
              <li>
                <strong>Ministerial Regulation No. 55 (B.E. 2543)</strong> under the Building Control Act B.E.
                2522 — Building height limit equal to twice the horizontal distance from the opposite side of
                the public road (Clause 41), road boundary setbacks, and side/rear boundary clearances (Clause
                50).
              </li>
              <li>
                <strong>Ministerial Regulation No. 33 (B.E. 2535)</strong> — High-rise building rules (height
                ≥ 23.0 m), minimum 10.0 m public road right-of-way requirement, and 6.0 m perimeter fire-access
                clearance.
              </li>
              <li>
                <strong>Ministerial Regulation No. 7 (B.E. 2517) &amp; BMA Building Control Bylaws</strong> —
                Minimum car parking requirements by building use and gross floor area.
              </li>
            </ul>
          </section>

          <section className="modal-section">
            <h3>Map data &amp; existing building masking</h3>
            <p>
              Vector basemap and 3D context buildings are streamed from <strong>OpenFreeMap</strong>{" "}
              (OpenMapTiles schema over OpenStreetMap data). Satellite imagery is provided by{" "}
              <strong>Esri World Imagery</strong> (Esri, Maxar, Earthstar Geographics) inserted below the road
              network.
            </p>
            <p>
              When a plot polygon is drawn or loaded, existing OSM buildings sitting inside the site boundary
              are automatically hidden by querying loaded features on the <code>building</code> source-layer and
              filtering out matching feature IDs on both the <code>building-3d</code> extrusion layer and ground{" "}
              <code>building</code> footprint layer.
            </p>
          </section>

          <section className="modal-section">
            <h3>Estimated road right-of-way widths by class</h3>
            <p>
              Nearby road centrelines within 20 m and 30° of each plot edge are matched from the{" "}
              <code>transportation</code> and <code>transportation_name</code> vector layers. When no surveyed
              right-of-way width (เขตทาง) is available, the following estimates are suggested as defaults:
            </p>
            <div className="mini-table-wrap">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>OSM road class</th>
                    <th className="num">Suggested width</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ROAD_WIDTH_BY_CLASS).map(([cls, w]) => (
                    <tr key={cls}>
                      <td>
                        <code>{cls}</code>
                      </td>
                      <td className="num tabular">{fmtMetres(w, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="modal-section">
            <h3>Disclaimer</h3>
            <p className="muted-text">
              This tool produces early-stage architectural feasibility studies. Always verify land title deed
              boundaries, officially surveyed public road right-of-way widths (เขตทาง), and plot-specific BMA
              interpretations with a licensed Thai architect before acquisition or submission.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

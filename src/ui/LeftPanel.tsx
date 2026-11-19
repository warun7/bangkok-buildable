import { useState } from "react";
import type { BuildingTypeId, FrontageCandidate } from "../engine/types";
import { SAMPLE_PLOTS, type SamplePlot } from "../fixtures/samplePlots";
import type { DrawToolMode } from "../map/draw";
import { edgeLetter, type EdgeGeom } from "../map/geo";
import { fmtArea, fmtInt, fmtMetres } from "./format";

export interface EdgeState {
  faces: boolean;
  width: number;
  roadName: string;
}

export interface LeftPanelProps {
  drawMode: DrawToolMode;
  activeSampleId: string | null;
  edges: EdgeGeom[];
  plotArea: number;
  plotPerimeter: number;
  edgeStates: EdgeState[];
  candidatesByEdge: Map<number, FrontageCandidate>;
  buildingType: BuildingTypeId;
  onStartDraw: () => void;
  onToggleEdit: () => void;
  onClearPlot: () => void;
  onSelectSample: (sample: SamplePlot) => void;
  onToggleEdgeFrontage: (edgeIndex: number) => void;
  onChangeEdgeWidth: (edgeIndex: number, width: number) => void;
  onChangeEdgeRoadName: (edgeIndex: number, name: string) => void;
  onAutoDetectRoads: () => void;
  onChangeBuildingType: (type: BuildingTypeId) => void;
}

const BUILDING_TYPE_OPTIONS: {
  id: BuildingTypeId;
  label: string;
  labelTh: string;
  spec: string;
}[] = [
  {
    id: "condo",
    label: "Condominium",
    labelTh: "อาคารชุดพักอาศัย",
    spec: "3.0 m floor-to-floor · 21 m max plate depth",
  },
  {
    id: "office",
    label: "Office",
    labelTh: "อาคารสำนักงาน",
    spec: "4.0 m floor-to-floor · 32 m max plate depth",
  },
  {
    id: "hotel",
    label: "Hotel",
    labelTh: "โรงแรม",
    spec: "3.3 m floor-to-floor · 20 m max plate depth",
  },
];

export function LeftPanel({
  drawMode,
  activeSampleId,
  edges,
  plotArea,
  plotPerimeter,
  edgeStates,
  candidatesByEdge,
  buildingType,
  onStartDraw,
  onToggleEdit,
  onClearPlot,
  onSelectSample,
  onToggleEdgeFrontage,
  onChangeEdgeWidth,
  onChangeEdgeRoadName,
  onAutoDetectRoads,
  onChangeBuildingType,
}: LeftPanelProps) {
  const [samplesOpen, setSamplesOpen] = useState(false);
  const hasPlot = edges.length >= 3;
  const frontageCount = edgeStates.filter((e) => e.faces).length;

  return (
    <aside className="panel panel-left" aria-label="Site inputs">
      <div className="panel-scroll">
        {/* Section 1: Plot Boundary */}
        <section className="panel-section">
          <div className="section-header">
            <span className="section-num">01</span>
            <h2 className="section-title">Plot boundary</h2>
            {hasPlot && (
              <span className="section-meta tabular">
                {fmtInt(edges.length)} corners
              </span>
            )}
          </div>

          <div className="btn-toolbar">
            <button
              type="button"
              className={`btn ${drawMode === "draw" ? "btn-primary" : ""}`}
              onClick={onStartDraw}
            >
              Draw plot
            </button>
            <button
              type="button"
              className={`btn ${drawMode === "edit" ? "btn-active" : ""}`}
              disabled={!hasPlot}
              onClick={onToggleEdit}
              title="Toggle vertex and midpoint editing handles on the map"
            >
              Edit
            </button>
            <button
              type="button"
              className="btn"
              disabled={!hasPlot && drawMode !== "draw"}
              onClick={onClearPlot}
            >
              Clear
            </button>
          </div>

          {/* Sample plots menu */}
          <div className="sample-menu-wrap">
            <button
              type="button"
              className="sample-menu-trigger"
              onClick={() => setSamplesOpen((o) => !o)}
              aria-expanded={samplesOpen}
            >
              <span className="sample-trigger-label">
                Sample plots
                {activeSampleId && (
                  <span className="sample-active-name">
                    {" · "}
                    {SAMPLE_PLOTS.find((s) => s.id === activeSampleId)?.name ?? ""}
                  </span>
                )}
              </span>
              <span className="caret" aria-hidden="true">
                {samplesOpen ? "▴" : "▾"}
              </span>
            </button>

            {samplesOpen && (
              <div className="sample-menu-dropdown" role="menu">
                {SAMPLE_PLOTS.map((s) => {
                  const isCurrent = s.id === activeSampleId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="menuitem"
                      className={`sample-menu-item ${isCurrent ? "selected" : ""}`}
                      onClick={() => {
                        onSelectSample(s);
                        setSamplesOpen(false);
                      }}
                    >
                      <div className="sample-item-name">{s.name}</div>
                      <div className="sample-item-desc">{s.description}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {drawMode === "draw" && (
            <div className="hint-banner">
              Click corners on the map to trace a site boundary. Click the first corner again to close the
              polygon.
            </div>
          )}

          {drawMode === "edit" && hasPlot && (
            <div className="hint-banner">
              Drag white corners to reshape live. Drag blue midpoints to insert a corner. Right-click a corner to
              delete it.
            </div>
          )}

          {hasPlot && (
            <div className="stat-strip">
              <div className="stat-cell">
                <span className="stat-label">Plot area</span>
                <span className="stat-val tabular">{fmtArea(plotArea)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-label">Perimeter</span>
                <span className="stat-val tabular">{fmtMetres(plotPerimeter, 1)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-label">Frontages</span>
                <span className="stat-val tabular">
                  {fmtInt(frontageCount)} / {fmtInt(edges.length)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Building Type */}
        <section className="panel-section">
          <div className="section-header">
            <span className="section-num">02</span>
            <h2 className="section-title">Building type</h2>
          </div>

          <div className="btype-list" role="radiogroup" aria-label="Building type">
            {BUILDING_TYPE_OPTIONS.map((opt) => {
              const active = buildingType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`btype-card ${active ? "active" : ""}`}
                  onClick={() => onChangeBuildingType(opt.id)}
                >
                  <div className="btype-top">
                    <span className="btype-name">{opt.label}</span>
                    <span className="btype-th">{opt.labelTh}</span>
                  </div>
                  <div className="btype-spec tabular">{opt.spec}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Road Frontage */}
        <section className="panel-section">
          <div className="section-header">
            <span className="section-num">03</span>
            <h2 className="section-title">Road frontage</h2>
            {hasPlot && (
              <button
                type="button"
                className="link-action-btn"
                onClick={onAutoDetectRoads}
                title="Re-detect nearby parallel roads from map vector tiles"
              >
                Auto-detect
              </button>
            )}
          </div>

          {!hasPlot ? (
            <p className="muted-note">
              Draw a plot or choose a sample above to inspect edges and assign road right-of-way widths.
            </p>
          ) : (
            <>
              <p className="muted-note">
                Mark each boundary edge facing a public road (เขตทาง) and set its right-of-way width. Click an
                edge on the map to toggle it.
              </p>

              <div className="edge-list">
                {edges.map((e) => {
                  const st = edgeStates[e.index] ?? { faces: false, width: 8, roadName: "" };
                  const cand = candidatesByEdge.get(e.index);
                  const letter = edgeLetter(e.index);

                  return (
                    <div key={e.index} className={`edge-item ${st.faces ? "faces-road" : ""}`}>
                      <div className="edge-row-main">
                        <div className="edge-id-group">
                          <span className={`edge-tag ${st.faces ? "active" : ""}`}>Edge {letter}</span>
                          <span className="edge-length tabular">{fmtMetres(e.length, 1)}</span>
                        </div>

                        <label className="faces-toggle">
                          <input
                            type="checkbox"
                            checked={st.faces}
                            onChange={() => onToggleEdgeFrontage(e.index)}
                          />
                          <span>Faces road</span>
                        </label>
                      </div>

                      {cand && !st.faces && (
                        <div className="edge-detected-hint">
                          Near {cand.roadName ?? cand.roadClass ?? "road"} ({fmtMetres(cand.distance, 1)} away, est.{" "}
                          {fmtMetres(cand.suggestedWidth, 0)})
                        </div>
                      )}

                      {st.faces && (
                        <div className="edge-controls">
                          <div className="edge-field-row">
                            <label className="edge-field-label" htmlFor={`road-name-${e.index}`}>
                              Road
                            </label>
                            <input
                              id={`road-name-${e.index}`}
                              type="text"
                              className="edge-text-input"
                              placeholder={cand?.roadName ?? "Unnamed public road"}
                              value={st.roadName}
                              onChange={(ev) => onChangeEdgeRoadName(e.index, ev.target.value)}
                            />
                            {cand?.roadClass && (
                              <span className="road-class-tag" title="OSM road class">
                                {cand.roadClass}
                              </span>
                            )}
                          </div>

                          <div className="edge-width-row">
                            <label className="edge-field-label" htmlFor={`road-width-${e.index}`}>
                              ROW width
                            </label>
                            <input
                              id={`road-width-${e.index}`}
                              type="range"
                              min={3}
                              max={60}
                              step={0.5}
                              value={Math.min(60, Math.max(3, st.width))}
                              onChange={(ev) => onChangeEdgeWidth(e.index, Number(ev.target.value))}
                              className="edge-slider"
                            />
                            <div className="edge-num-wrap">
                              <input
                                type="number"
                                min={3}
                                max={60}
                                step={0.5}
                                value={st.width}
                                onChange={(ev) => {
                                  const v = parseFloat(ev.target.value);
                                  if (!Number.isNaN(v)) {
                                    onChangeEdgeWidth(e.index, Math.min(60, Math.max(3, v)));
                                  }
                                }}
                                className="edge-num-input tabular"
                                aria-label={`Edge ${letter} road width in metres`}
                              />
                              <span className="unit-suffix">m</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </aside>
  );
}

import { useState } from "react";
import type { CheckStatus, Design, FloorUse } from "../engine/types";
import { fmtArea, fmtDec, fmtInt, fmtMetres, fmtPercent, fmtStoreys } from "./format";

export interface DesignCardProps {
  design: Design;
  maxFar: number;
  maxGfa: number;
  selected: boolean;
  onSelect: () => void;
}

const USE_LABELS: Record<FloorUse, string> = {
  lobby: "Lobby",
  parking: "Parking",
  residential: "Residential",
  office: "Office",
  hotel: "Hotel",
  amenity: "Amenity",
};

const STATUS_LABELS: Record<CheckStatus, string> = {
  pass: "PASS",
  fail: "FAIL",
  warn: "WARN",
  info: "INFO",
};

export function DesignCard({ design, maxFar, maxGfa, selected, onSelect }: DesignCardProps) {
  const [floorsOpen, setFloorsOpen] = useState(false);
  const { metrics, checks, floors } = design;

  const farRatio = maxFar > 0 ? Math.min(1, Math.max(0, metrics.far / maxFar)) : 0;
  const farOver = metrics.far > maxFar + 1e-4;
  const passCount = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  return (
    <article
      className={`design-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
      aria-selected={selected}
    >
      <div className="design-card-head">
        <div className="design-title-row">
          <div className="design-title-group">
            <span className={`design-radio ${selected ? "on" : ""}`} aria-hidden="true" />
            <h3 className="design-name">{design.name}</h3>
          </div>
          <div className="design-badges">
            <span className="regime-chip">
              {design.regime === "highrise" ? "High-rise" : "Low-rise"}
            </span>
            <span className={`check-summary-chip ${failCount > 0 ? "has-fail" : "all-pass"} tabular`}>
              {failCount > 0
                ? `${failCount} fail${failCount > 1 ? "s" : ""}`
                : `All ${passCount} rules pass${warnCount ? ` · ${warnCount} note${warnCount > 1 ? "s" : ""}` : ""}`}
            </span>
          </div>
        </div>
        <p className="design-summary">{design.summary}</p>
      </div>

      {/* FAR bar: used vs max */}
      <div className="far-bar-block">
        <div className="far-bar-header">
          <span className="far-bar-label">FAR utilisation</span>
          <span className="far-bar-values tabular">
            <strong>{fmtDec(metrics.far, 2)}</strong> / {fmtDec(maxFar, 1)}{" "}
            <span className="muted-inline">
              ({fmtArea(metrics.gfa)} of {fmtArea(maxGfa)})
            </span>
          </span>
        </div>
        <div className="far-bar-track" aria-hidden="true">
          <div
            className={`far-bar-fill ${farOver ? "over" : ""}`}
            style={{ width: `${(farRatio * 100).toFixed(1)}%` }}
          />
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="design-metrics-grid">
        <div className="metric-box">
          <span className="metric-label">Total GFA</span>
          <span className="metric-value tabular">{fmtArea(metrics.gfa)}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Height</span>
          <span className="metric-value tabular">{fmtMetres(metrics.height, 1)}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Storeys</span>
          <span className="metric-value tabular">{fmtStoreys(metrics.storeys)}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">
            {metrics.units !== undefined
              ? "Est. units"
              : metrics.rooms !== undefined
                ? "Est. rooms"
                : "Footprint"}
          </span>
          <span className="metric-value tabular">
            {metrics.units !== undefined
              ? `${fmtInt(metrics.units)} units`
              : metrics.rooms !== undefined
                ? `${fmtInt(metrics.rooms)} rooms`
                : fmtArea(metrics.footprint)}
          </span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Parking (prov / req)</span>
          <span className="metric-value tabular">
            {fmtInt(metrics.parkingProvided)} / {fmtInt(metrics.parkingRequired)} spaces
          </span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Open space (OSR)</span>
          <span className="metric-value tabular">
            {fmtPercent(metrics.osr, 1)} ({fmtArea(metrics.openSpace)})
          </span>
        </div>
      </div>

      {/* Pass/fail checklist */}
      <div className="checklist-block">
        <div className="subblock-title">Compliance checklist</div>
        <div className="checklist-rows">
          {checks.map((c) => (
            <div key={c.id} className="check-row">
              <span className={`status-chip status-${c.status}`}>{STATUS_LABELS[c.status]}</span>
              <span className="check-label">{c.label}</span>
              <span className="check-figures tabular">
                <span className="check-actual">{c.actual}</span>
                <span className="check-req">req. {c.required}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable floor-by-floor schedule */}
      <div
        className="floor-table-section"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <button
          type="button"
          className="floor-table-toggle"
          onClick={() => setFloorsOpen((o) => !o)}
          aria-expanded={floorsOpen}
        >
          <span>Floor-by-floor schedule ({fmtStoreys(floors.length)})</span>
          <span className="tabular">
            {fmtArea(metrics.gfa)} {floorsOpen ? "▴" : "▾"}
          </span>
        </button>

        {floorsOpen && (
          <div className="floor-table-wrap">
            <table className="floor-table">
              <thead>
                <tr>
                  <th>Floor</th>
                  <th>Use</th>
                  <th className="num">Base Z</th>
                  <th className="num">Height</th>
                  <th className="num">GFA</th>
                </tr>
              </thead>
              <tbody>
                {floors.map((f) => (
                  <tr key={f.index}>
                    <td className="tabular">L{f.index + 1}</td>
                    <td>
                      <span className={`use-dot use-${f.use}`} />
                      {USE_LABELS[f.use]}
                    </td>
                    <td className="num tabular">+{fmtMetres(f.z, 1)}</td>
                    <td className="num tabular">{fmtMetres(f.h, 1)}</td>
                    <td className="num tabular">{fmtArea(f.area, 1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={4}>Total GFA ({fmtStoreys(floors.length)})</th>
                  <th className="num tabular">{fmtArea(metrics.gfa, 1)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </article>
  );
}

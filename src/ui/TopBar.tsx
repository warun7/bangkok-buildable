import type { Analysis, Regime } from "../engine/types";
import { fmtDec } from "./format";

export interface TopBarProps {
  analysis: Analysis | null;
  hasPlot: boolean;
  satellite: boolean;
  onToggleSatellite: () => void;
  showEnvelope: boolean;
  onToggleShowEnvelope: () => void;
  showDesign: boolean;
  onToggleShowDesign: () => void;
  envelopeRegime: Regime;
  onChangeEnvelopeRegime: (regime: Regime) => void;
  onFitPlot: () => void;
  onOpenAbout: () => void;
}

export function TopBar({
  analysis,
  hasPlot,
  satellite,
  onToggleSatellite,
  showEnvelope,
  onToggleShowEnvelope,
  showDesign,
  onToggleShowDesign,
  envelopeRegime,
  onChangeEnvelopeRegime,
  onFitPlot,
  onOpenAbout,
}: TopBarProps) {
  const zone = analysis?.zone;
  const hasHighrise = !!analysis?.envelopes.highrise;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Bangkok Buildable</span>
        </div>

        {zone && (
          <div className="zone-badge" title={`${zone.planTitle} — ${zone.nameTh}`}>
            <span className="zone-swatch" style={{ backgroundColor: zone.colour }} />
            <span className="zone-code">
              {zone.code} <span className="zone-code-latin">({zone.codeLatin})</span>
            </span>
            <span className="zone-sep" />
            <span className="zone-name">{zone.name}</span>
            <span className="zone-sep" />
            <span className="zone-caps tabular">
              FAR {fmtDec(zone.maxFar, 1)} · OSR {fmtDec(zone.minOsr, 1)} %
            </span>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {hasPlot && analysis && (
          <div className="topbar-controls">
            <div className="segmented-sm" role="group" aria-label="Envelope regime">
              <button
                type="button"
                className={`seg-btn ${envelopeRegime === "lowrise" ? "active" : ""}`}
                onClick={() => onChangeEnvelopeRegime("lowrise")}
                title="Show low-rise building envelope (< 23 m)"
              >
                Low-rise
              </button>
              <button
                type="button"
                className={`seg-btn ${envelopeRegime === "highrise" && hasHighrise ? "active" : ""}`}
                disabled={!hasHighrise}
                onClick={() => hasHighrise && onChangeEnvelopeRegime("highrise")}
                title={
                  hasHighrise
                    ? "Show high-rise building envelope (≥ 23 m)"
                    : (analysis.highriseBlockedReason ?? "High-rise envelope not permitted on this site")
                }
              >
                High-rise
              </button>
            </div>

            <button
              type="button"
              className={`pill-toggle ${showEnvelope ? "on" : ""}`}
              onClick={onToggleShowEnvelope}
              title="Toggle 3D zoning envelope mesh"
            >
              Envelope
            </button>

            <button
              type="button"
              className={`pill-toggle ${showDesign ? "on" : ""}`}
              onClick={onToggleShowDesign}
              title="Toggle 3D concept massing slabs"
            >
              Massing
            </button>

            <button
              type="button"
              className="pill-toggle"
              onClick={onFitPlot}
              title="Fit camera to plot"
            >
              Fit plot
            </button>
          </div>
        )}

        <button
          type="button"
          className={`pill-toggle ${satellite ? "on" : ""}`}
          onClick={onToggleSatellite}
          title="Toggle Esri World Imagery satellite layer below roads"
        >
          Satellite
        </button>

        {analysis && hasPlot && (
          <span className="perf-readout tabular" title="Zoning and massing calculation time">
            {fmtDec(analysis.computeMs, 1)} ms
          </span>
        )}

        <button type="button" className="text-link-btn" onClick={onOpenAbout}>
          About / sources
        </button>
      </div>
    </header>
  );
}

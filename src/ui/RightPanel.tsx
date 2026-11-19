import type { Analysis, AppliedRule, Envelope, Regime } from "../engine/types";
import { SAMPLE_PLOTS, type SamplePlot } from "../fixtures/samplePlots";
import { DesignCard } from "./DesignCard";
import { fmtArea, fmtDec, fmtInt, fmtMetres, fmtPercent, fmtStoreys } from "./format";

export interface RightPanelProps {
  hasPlot: boolean;
  analysis: Analysis | null;
  activeEnvelope: Envelope | null;
  envelopeRegime: Regime;
  onChangeEnvelopeRegime: (regime: Regime) => void;
  showEnvelope: boolean;
  onToggleShowEnvelope: () => void;
  showDesign: boolean;
  onToggleShowDesign: () => void;
  selectedDesignId: string | null;
  onSelectDesign: (id: string) => void;
  disabledRules: string[];
  onToggleRule: (ruleId: string) => void;
  onStartDraw: () => void;
  onSelectSample: (sample: SamplePlot) => void;
}

const RULE_GROUPS: { kind: AppliedRule["kind"]; label: string }[] = [
  { kind: "envelope", label: "Envelope & setbacks" },
  { kind: "cap", label: "Density & open space caps" },
  { kind: "check", label: "Building code checks" },
  { kind: "info", label: "Context & information" },
];

function EyeIcon({ off }: { off: boolean }) {
  if (off) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function RightPanel({
  hasPlot,
  analysis,
  activeEnvelope,
  envelopeRegime,
  onChangeEnvelopeRegime,
  showEnvelope,
  onToggleShowEnvelope,
  showDesign,
  onToggleShowDesign,
  selectedDesignId,
  onSelectDesign,
  disabledRules,
  onToggleRule,
  onStartDraw,
  onSelectSample,
}: RightPanelProps) {
  if (!hasPlot || !analysis) {
    return (
      <aside className="panel panel-right" aria-label="Zoning and feasibility results">
        <div className="panel-scroll">
          <div className="empty-state">
            <div className="empty-state-mark" aria-hidden="true" />
            <h2 className="empty-state-title">Draw your plot or pick a sample</h2>
            <p className="empty-state-text">
              Trace a site boundary on the map, or load a sample plot around Sukhumvit / Asok to inspect
              applicable Bangkok zoning rules, 3D building envelopes, and concept massing options.
            </p>
            <div className="empty-state-actions">
              <button type="button" className="btn btn-primary" onClick={onStartDraw}>
                Draw plot on map
              </button>
              <div className="empty-sample-list">
                <span className="empty-sample-heading">Sample sites</span>
                {SAMPLE_PLOTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="empty-sample-btn"
                    onClick={() => onSelectSample(s)}
                  >
                    <span className="empty-sample-name">{s.name}</span>
                    <span className="empty-sample-desc">{s.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const { zone, issues, rules, envelopes, highriseBlockedReason, plotArea, maxGfa, designs } = analysis;
  const disabledSet = new Set(disabledRules);
  const hasHighrise = !!envelopes.highrise;
  const env = activeEnvelope ?? envelopes.highrise ?? envelopes.lowrise;
  const coveragePct = plotArea > 0 ? (env.footprintArea / plotArea) * 100 : 0;

  return (
    <aside className="panel panel-right" aria-label="Zoning and feasibility results">
      <div className="panel-scroll">
        {/* (e) Prominent issues and high-rise blocked explanation */}
        {(issues.length > 0 || highriseBlockedReason) && (
          <section className="panel-section alerts-section">
            {issues.map((iss, idx) => (
              <div key={`${iss.code}-${idx}`} className={`issue-banner issue-${iss.severity}`}>
                <span className="issue-badge">{iss.severity === "error" ? "ERROR" : "NOTICE"}</span>
                <span className="issue-msg">{iss.message}</span>
              </div>
            ))}

            {highriseBlockedReason && (
              <div className="issue-banner issue-highrise-blocked">
                <div className="blocked-head">High-rise regime not available on this site</div>
                <div className="blocked-body">{highriseBlockedReason}</div>
              </div>
            )}
          </section>
        )}

        {/* (a) Site summary */}
        <section className="panel-section">
          <div className="section-header">
            <span className="section-num">A</span>
            <h2 className="section-title">Site summary</h2>
            <span className="section-meta">{zone.planTitle}</span>
          </div>

          <div className="zone-summary-card">
            <div className="zone-summary-left">
              <span className="zone-pill" style={{ backgroundColor: zone.colour }}>
                {zone.code} · {zone.codeLatin}
              </span>
              <div className="zone-titles">
                <div className="zone-title-en">{zone.name}</div>
                <div className="zone-title-th">{zone.nameTh}</div>
              </div>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Plot area</span>
              <span className="summary-value tabular">{fmtArea(plotArea)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Max FAR → Max GFA</span>
              <span className="summary-value tabular">
                {fmtDec(zone.maxFar, 1)} : 1 → <strong>{fmtArea(maxGfa)}</strong>
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Minimum OSR</span>
              <span className="summary-value tabular">{fmtPercent(zone.minOsr, 1)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Min open space at max GFA</span>
              <span className="summary-value tabular">{fmtArea((maxGfa * zone.minOsr) / 100)}</span>
            </div>
          </div>
        </section>

        {/* (c) Envelope stats */}
        <section className="panel-section">
          <div className="section-header">
            <span className="section-num">B</span>
            <h2 className="section-title">3D building envelope</h2>
            <div className="header-controls">
              <label className="inline-check">
                <input type="checkbox" checked={showEnvelope} onChange={onToggleShowEnvelope} />
                <span>Show 3D</span>
              </label>
            </div>
          </div>

          {hasHighrise && (
            <div className="regime-switch-bar" role="group" aria-label="Switch envelope regime">
              <button
                type="button"
                className={`regime-tab ${envelopeRegime === "lowrise" ? "active" : ""}`}
                onClick={() => onChangeEnvelopeRegime("lowrise")}
              >
                Low-rise (&lt; 23 m)
              </button>
              <button
                type="button"
                className={`regime-tab ${envelopeRegime === "highrise" ? "active" : ""}`}
                onClick={() => onChangeEnvelopeRegime("highrise")}
              >
                High-rise (≥ 23 m)
              </button>
            </div>
          )}

          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Envelope height cap</span>
              <span className="summary-value tabular">{fmtMetres(env.height, 1)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Buildable footprint</span>
              <span className="summary-value tabular">
                {fmtArea(env.footprintArea)} ({fmtPercent(coveragePct, 0)})
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Geometric capacity</span>
              <span className="summary-value tabular">{fmtArea(env.geometricCapacity)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Reference slices</span>
              <span className="summary-value tabular">{fmtStoreys(env.levels.length)}</span>
            </div>
          </div>
        </section>

        {/* (b) Rules that apply */}
        <section className="panel-section">
          <div className="section-header">
            <span className="section-num">C</span>
            <h2 className="section-title">Rules that apply</h2>
            {disabledRules.length > 0 && (
              <span className="section-meta warn-text tabular">
                {fmtInt(disabledRules.length)} switched off
              </span>
            )}
          </div>

          <p className="muted-note">
            Toggle the eye icon on any envelope rule to switch it off and inspect how it shapes the 3D
            buildable volume.
          </p>

          <div className="rule-groups">
            {RULE_GROUPS.map((grp) => {
              const list = rules.filter((r) => r.kind === grp.kind);
              if (list.length === 0) return null;
              return (
                <div key={grp.kind} className="rule-group">
                  <div className="rule-group-title">{grp.label}</div>
                  <div className="rule-list">
                    {list.map((rule) => {
                      const isDisabled = disabledSet.has(rule.id);
                      const isEnvelope = rule.kind === "envelope";
                      return (
                        <div
                          key={rule.id}
                          className={`rule-row ${!rule.applies ? "not-applicable" : ""} ${
                            isDisabled ? "rule-disabled" : ""
                          }`}
                        >
                          <div className="rule-main">
                            <div className="rule-titles">
                              <span className="rule-title">{rule.title}</span>
                              {rule.titleTh && <span className="rule-title-th">{rule.titleTh}</span>}
                            </div>

                            {isEnvelope && (
                              <button
                                type="button"
                                className={`eye-toggle ${isDisabled ? "off" : "on"}`}
                                onClick={() => onToggleRule(rule.id)}
                                title={
                                  isDisabled
                                    ? "Rule switched off — click to re-apply to envelope"
                                    : "Click to temporarily switch off this rule in the 3D envelope"
                                }
                                aria-label={`Toggle ${rule.title} in envelope`}
                                aria-pressed={!isDisabled}
                              >
                                <EyeIcon off={isDisabled} />
                              </button>
                            )}
                          </div>

                          <div className="rule-value tabular">
                            {rule.value}
                            {isDisabled && <span className="disabled-pill">Switched off</span>}
                          </div>

                          {!rule.applies && rule.note && <div className="rule-note">{rule.note}</div>}

                          <div className="rule-citation">
                            {rule.citation.url ? (
                              <a
                                href={rule.citation.url}
                                target="_blank"
                                rel="noreferrer"
                                className="citation-link"
                              >
                                {rule.citation.doc} · {rule.citation.clause}
                              </a>
                            ) : (
                              <span>
                                {rule.citation.doc} · {rule.citation.clause}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* (d) Concept designs */}
        <section className="panel-section">
          <div className="section-header">
            <span className="section-num">D</span>
            <h2 className="section-title">Concept designs ({fmtInt(designs.length)})</h2>
            <div className="header-controls">
              <label className="inline-check">
                <input type="checkbox" checked={showDesign} onChange={onToggleShowDesign} />
                <span>Show 3D</span>
              </label>
            </div>
          </div>

          <p className="muted-note">
            Select a massing option to view its floor plates in 3D. Hover any floor slab on the map for level
            details.
          </p>

          <div className="design-cards-list">
            {designs.map((d) => (
              <DesignCard
                key={d.id}
                design={d}
                maxFar={zone.maxFar}
                maxGfa={maxGfa}
                selected={d.id === selectedDesignId}
                onSelect={() => onSelectDesign(d.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

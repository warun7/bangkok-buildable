import { useCallback, useMemo, useRef, useState } from "react";
import type {
  Analysis,
  BuildingTypeId,
  Envelope,
  Frontage,
  FrontageCandidate,
  LngLat,
  Regime,
  SiteInput,
} from "./engine/types";
import { analyze as runAnalysis } from "./engine/analyze";
import { SITE_DATA } from "./engine/siteData";
import { SAMPLE_PLOTS, type SamplePlot } from "./fixtures/samplePlots";
import type { DrawToolMode, PlotChangeMeta } from "./map/draw";
import { plotGeometry } from "./map/geo";
import { DEFAULT_ROAD_WIDTH } from "./map/roads";
import { AboutModal } from "./ui/AboutModal";
import { LeftPanel, type EdgeState } from "./ui/LeftPanel";
import { MapCanvas, type MapCanvasHandle } from "./ui/MapCanvas";
import { RightPanel } from "./ui/RightPanel";
import { TopBar } from "./ui/TopBar";
import "./styles/app.css";

function edgeStatesFromSample(sample: SamplePlot): EdgeState[] {
  const byEdge = new Map(sample.frontages.map((f) => [f.edgeIndex, f]));
  return sample.plot.map((_, i) => {
    const f = byEdge.get(i);
    return {
      faces: !!f,
      width: f?.roadWidth ?? DEFAULT_ROAD_WIDTH,
      roadName: f?.roadName ?? "",
    };
  });
}

function edgeStatesFromCandidates(count: number, candidates: FrontageCandidate[]): EdgeState[] {
  const byEdge = new Map(candidates.map((c) => [c.edgeIndex, c]));
  return Array.from({ length: count }, (_, i) => {
    const c = byEdge.get(i);
    return {
      faces: !!c,
      width: c?.suggestedWidth ?? DEFAULT_ROAD_WIDTH,
      roadName: c?.roadName ?? "",
    };
  });
}

const INITIAL_SAMPLE =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("empty") === "1"
    ? null
    : SAMPLE_PLOTS[0];

export default function App() {
  const mapRef = useRef<MapCanvasHandle>(null);

  const [plot, setPlot] = useState<LngLat[]>(() => INITIAL_SAMPLE?.plot ?? []);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(() => INITIAL_SAMPLE?.id ?? null);
  const [edgeStates, setEdgeStates] = useState<EdgeState[]>(() =>
    INITIAL_SAMPLE ? edgeStatesFromSample(INITIAL_SAMPLE) : [],
  );
  const [candidates, setCandidates] = useState<FrontageCandidate[]>([]);
  const [buildingType, setBuildingType] = useState<BuildingTypeId>(
    () => INITIAL_SAMPLE?.buildingType ?? "condo",
  );
  const [disabledRules, setDisabledRules] = useState<string[]>([]);

  const [drawMode, setDrawMode] = useState<DrawToolMode>("edit");
  const [satellite, setSatellite] = useState(false);
  const [showEnvelope, setShowEnvelope] = useState(true);
  const [showDesign, setShowDesign] = useState(true);
  const [preferredRegime, setPreferredRegime] = useState<Regime>("highrise");
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const candidatesByEdge = useMemo(
    () => new Map(candidates.map((c) => [c.edgeIndex, c])),
    [candidates],
  );

  // Live plot geometry for the left panel (edge lengths, area, perimeter)
  const geom = useMemo(() => plotGeometry(plot), [plot]);

  // Single SiteInput -> analyze(input): Analysis pipeline
  const siteInput: SiteInput = useMemo(() => {
    const frontages: Frontage[] = [];
    for (let i = 0; i < plot.length; i++) {
      const st = edgeStates[i];
      if (st?.faces) {
        frontages.push({
          edgeIndex: i,
          roadWidth: st.width,
          roadName: st.roadName.trim() || undefined,
        });
      }
    }
    return {
      plot,
      frontages,
      buildingType,
      disabledRules: disabledRules.length ? disabledRules : undefined,
    };
  }, [plot, edgeStates, buildingType, disabledRules]);

  const analysis: Analysis | null = useMemo(() => {
    if (plot.length < 3) return null;
    return runAnalysis(siteInput, SITE_DATA);
  }, [plot.length, siteInput]);

  // Active envelope (high-rise when available & selected, otherwise low-rise)
  const effectiveRegime: Regime =
    analysis?.envelopes.highrise && preferredRegime === "highrise" ? "highrise" : "lowrise";

  const activeEnvelope: Envelope | null = analysis
    ? effectiveRegime === "highrise" && analysis.envelopes.highrise
      ? analysis.envelopes.highrise
      : analysis.envelopes.lowrise
    : null;

  // Selected design (defaults to first design if current selection doesn't exist)
  const activeDesign = useMemo(() => {
    if (!analysis || analysis.designs.length === 0) return null;
    if (selectedDesignId) {
      const found = analysis.designs.find((d) => d.id === selectedDesignId);
      if (found) return found;
    }
    return analysis.designs[0];
  }, [analysis, selectedDesignId]);

  const handlePlotChange = useCallback(
    (newPlot: LngLat[], meta: PlotChangeMeta, detected: FrontageCandidate[]) => {
      setPlot(newPlot);
      if (meta.finished) {
        setActiveSampleId(null);
        setCandidates(detected);
        setEdgeStates(edgeStatesFromCandidates(newPlot.length, detected));
        return;
      }
      setEdgeStates((prev) => {
        if (prev.length === newPlot.length) return prev;
        return Array.from({ length: newPlot.length }, (_, i) => {
          if (i < prev.length) return prev[i];
          return { faces: false, width: DEFAULT_ROAD_WIDTH, roadName: "" };
        });
      });
    },
    [],
  );

  const handleCandidatesChange = useCallback((cands: FrontageCandidate[]) => {
    setCandidates(cands);
    // Fill in road names on edges that already face a road but have no name yet
    setEdgeStates((prev) => {
      const byEdge = new Map(cands.map((c) => [c.edgeIndex, c]));
      let changed = false;
      const next = prev.map((st, idx) => {
        const c = byEdge.get(idx);
        if (c && !st.roadName && c.roadName) {
          changed = true;
          return { ...st, roadName: c.roadName };
        }
        return st;
      });
      return changed ? next : prev;
    });
  }, []);

  const handleStartDraw = useCallback(() => {
    setActiveSampleId(null);
    setPlot([]);
    setEdgeStates([]);
    setCandidates([]);
    mapRef.current?.startDraw();
  }, []);

  const handleToggleEdit = useCallback(() => {
    if (plot.length < 3) return;
    const nextEdit = drawMode !== "edit";
    mapRef.current?.setEditMode(nextEdit);
  }, [drawMode, plot.length]);

  const handleClearPlot = useCallback(() => {
    setActiveSampleId(null);
    setPlot([]);
    setEdgeStates([]);
    setCandidates([]);
    mapRef.current?.clearPlot();
  }, []);

  const handleSelectSample = useCallback((sample: SamplePlot) => {
    setActiveSampleId(sample.id);
    setPlot(sample.plot);
    setEdgeStates(edgeStatesFromSample(sample));
    setBuildingType(sample.buildingType);
    setCandidates([]);
    mapRef.current?.loadPlot(sample.plot, { fit: true, enterEdit: true });
  }, []);

  const handleToggleEdgeFrontage = useCallback(
    (edgeIndex: number) => {
      setEdgeStates((prev) =>
        prev.map((st, i) => {
          if (i !== edgeIndex) return st;
          const nextFaces = !st.faces;
          const cand = candidatesByEdge.get(i);
          return {
            faces: nextFaces,
            width: nextFaces && st.width === DEFAULT_ROAD_WIDTH && cand ? cand.suggestedWidth : st.width,
            roadName: nextFaces && !st.roadName && cand?.roadName ? cand.roadName : st.roadName,
          };
        }),
      );
    },
    [candidatesByEdge],
  );

  const handleChangeEdgeWidth = useCallback((edgeIndex: number, width: number) => {
    setEdgeStates((prev) => prev.map((st, i) => (i === edgeIndex ? { ...st, width } : st)));
  }, []);

  const handleChangeEdgeRoadName = useCallback((edgeIndex: number, roadName: string) => {
    setEdgeStates((prev) => prev.map((st, i) => (i === edgeIndex ? { ...st, roadName } : st)));
  }, []);

  const handleAutoDetectRoads = useCallback(() => {
    if (!mapRef.current || plot.length < 3) return;
    const cands = mapRef.current.detectRoads(plot);
    setEdgeStates(edgeStatesFromCandidates(plot.length, cands));
  }, [plot]);

  const handleToggleRule = useCallback((ruleId: string) => {
    setDisabledRules((prev) =>
      prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId],
    );
  }, []);

  const hasPlot = plot.length >= 3;

  return (
    <div className="app-shell">
      <MapCanvas
        ref={mapRef}
        plot={plot}
        edges={edgeStates}
        analysis={analysis}
        envelope={activeEnvelope}
        design={activeDesign}
        showEnvelope={showEnvelope}
        showDesign={showDesign}
        satellite={satellite}
        drawMode={drawMode}
        onPlotChange={handlePlotChange}
        onCandidatesChange={handleCandidatesChange}
        onDrawModeChange={setDrawMode}
        onEdgeClick={handleToggleEdgeFrontage}
      />

      <TopBar
        analysis={analysis}
        hasPlot={hasPlot}
        satellite={satellite}
        onToggleSatellite={() => setSatellite((s) => !s)}
        showEnvelope={showEnvelope}
        onToggleShowEnvelope={() => setShowEnvelope((s) => !s)}
        showDesign={showDesign}
        onToggleShowDesign={() => setShowDesign((s) => !s)}
        envelopeRegime={effectiveRegime}
        onChangeEnvelopeRegime={setPreferredRegime}
        onFitPlot={() => mapRef.current?.fitToPlot()}
        onOpenAbout={() => setAboutOpen(true)}
      />

      <LeftPanel
        drawMode={drawMode}
        activeSampleId={activeSampleId}
        edges={geom.edges}
        plotArea={analysis?.plotArea ?? geom.area}
        plotPerimeter={geom.perimeter}
        edgeStates={edgeStates}
        candidatesByEdge={candidatesByEdge}
        buildingType={buildingType}
        onStartDraw={handleStartDraw}
        onToggleEdit={handleToggleEdit}
        onClearPlot={handleClearPlot}
        onSelectSample={handleSelectSample}
        onToggleEdgeFrontage={handleToggleEdgeFrontage}
        onChangeEdgeWidth={handleChangeEdgeWidth}
        onChangeEdgeRoadName={handleChangeEdgeRoadName}
        onAutoDetectRoads={handleAutoDetectRoads}
        onChangeBuildingType={setBuildingType}
      />

      <RightPanel
        hasPlot={hasPlot}
        analysis={analysis}
        activeEnvelope={activeEnvelope}
        envelopeRegime={effectiveRegime}
        onChangeEnvelopeRegime={setPreferredRegime}
        showEnvelope={showEnvelope}
        onToggleShowEnvelope={() => setShowEnvelope((s) => !s)}
        showDesign={showDesign}
        onToggleShowDesign={() => setShowDesign((s) => !s)}
        selectedDesignId={activeDesign?.id ?? null}
        onSelectDesign={setSelectedDesignId}
        disabledRules={disabledRules}
        onToggleRule={handleToggleRule}
        onStartDraw={handleStartDraw}
        onSelectSample={handleSelectSample}
      />

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  );
}

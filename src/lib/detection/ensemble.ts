import type { AnalysisResult, DetectorResult, Evidence, MatchData, Verdict } from "./types";
import { generateBaseline } from "./baseline";
import { statisticalDetector } from "./statistical";
import { isolationForestDetector } from "./isolationForest";
import { lofDetector } from "./lof";
import { bayesianDetector } from "./bayesian";
import { patternsDetector } from "./patterns";
import { temporalDetector } from "./temporal";
import { oddsMovementDetector } from "./oddsMovement";
import { mlHistoricalDetector } from "./mlHistorical";
import { benfordDetector } from "./benford";

export type EnsembleOptions = {
  baselineSize?: number;
  historicalBaseline?: number[][];
};

export function runAnalysis(match: MatchData, opts: EnsembleOptions = {}): AnalysisResult {
  const baseline = opts.historicalBaseline?.length
    ? opts.historicalBaseline
    : generateBaseline(opts.baselineSize ?? 300);

  const detectors: DetectorResult[] = [
    statisticalDetector(match, baseline),
    isolationForestDetector(match, baseline),
    lofDetector(match, baseline),
    bayesianDetector(match),
    patternsDetector(match),
    temporalDetector(match),
    oddsMovementDetector(match),
    mlHistoricalDetector(match),
    benfordDetector(match),
  ];

  // Weighted score
  const totalWeight = detectors.reduce((s, d) => s + d.weight, 0);
  const weighted = detectors.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight;

  // Cross-validation: how many detectors fire above threshold
  const firing = detectors.filter((d) => d.score >= 0.55).length;
  const strongFiring = detectors.filter((d) => d.score >= 0.75).length;

  // Boost when multiple independent detectors agree
  let overall = weighted;
  if (firing >= 3) overall = Math.min(1, overall * 1.15);
  if (strongFiring >= 2) overall = Math.min(1, overall * 1.2);
  // Dampen when only 1 detector fires (single-signal is weak evidence)
  if (firing <= 1) overall = overall * 0.7;

  const dataCompleteness = computeCompleteness(match);
  // Confidence: bigger with more data + more agreement
  const agreement = 1 - variance(detectors.map((d) => d.score));
  const confidence = clamp01(dataCompleteness * 0.6 + agreement * 0.4);

  const verdict: Verdict =
    overall >= 0.75 ? "high_risk" : overall >= 0.55 ? "suspicious" : overall >= 0.35 ? "watch" : "clean";

  const evidences: Evidence[] = detectors.flatMap((d) =>
    d.reasons.map((message) => ({
      detector: d.detector,
      message,
      severity: d.score >= 0.75 ? "high" : d.score >= 0.5 ? "warn" : "info",
    })),
  );

  return {
    overallScore: overall,
    verdict,
    confidence,
    perDetector: detectors,
    evidences,
    dataCompleteness,
  };
}

function computeCompleteness(m: MatchData): number {
  let filled = 0, total = 0;
  const check = (v: unknown) => { total++; if (v != null && v !== "" && !(Array.isArray(v) && v.length === 0)) filled++; };
  check(m.homeScore); check(m.awayScore);
  check(m.htHomeScore); check(m.htAwayScore);
  check(m.stats.home?.shots); check(m.stats.away?.shots);
  check(m.stats.home?.shots_on_target); check(m.stats.away?.shots_on_target);
  check(m.stats.home?.possession);
  check(m.stats.home?.xg);
  check(m.events);
  check(m.odds?.home_open); check(m.odds?.home_close);
  check(m.odds?.over_open); check(m.odds?.over_close);
  return total ? filled / total : 0;
}

function variance(arr: number[]) {
  if (arr.length === 0) return 0;
  const m = arr.reduce((s, v) => s + v, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

export const DETECTOR_LABELS: Record<string, string> = {
  statistical: "Estadístico (Z-score)",
  isolation_forest: "Isolation Forest",
  lof: "Local Outlier Factor",
  bayesian: "Análisis Bayesiano",
  patterns: "Patrones conocidos",
  temporal: "Análisis temporal",
  odds_movement: "Movimiento de cuotas",
  ml_historical: "Modelo histórico (ML)",
  benford: "Ley de Benford (integridad de datos)",
};

export const VERDICT_LABELS: Record<Verdict, { label: string; color: string; description: string }> = {
  clean: { label: "Sin anomalías", color: "text-emerald-500", description: "Partido dentro de patrones normales." },
  watch: { label: "Bajo interés", color: "text-yellow-500", description: "Señales débiles, atención mínima." },
  suspicious: { label: "Sospechoso", color: "text-orange-500", description: "Varios detectores coinciden en señales anómalas." },
  high_risk: { label: "Alto riesgo", color: "text-red-500", description: "Fuerte convergencia de indicadores de anomalía." },
};

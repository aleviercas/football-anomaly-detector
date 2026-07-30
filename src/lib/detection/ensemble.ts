import type { AnalysisResult, CompletenessItem, DetectorResult, Evidence, MatchData, Verdict } from "./types";
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

  const { score: dataCompleteness, breakdown: completenessBreakdown } = computeCompleteness(match);
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
    completenessBreakdown,
  };
}

function computeCompleteness(m: MatchData): { score: number; breakdown: CompletenessItem[] } {
  const items: CompletenessItem[] = [
    { key: "score", label: "Resultado final", present: has(m.homeScore) && has(m.awayScore) },
    { key: "ht_score", label: "Resultado al entretiempo", present: has(m.htHomeScore) && has(m.htAwayScore) },
    { key: "shots", label: "Remates (ambos equipos)", present: has(m.stats.home?.shots) && has(m.stats.away?.shots) },
    { key: "shots_on_target", label: "Remates al arco", present: has(m.stats.home?.shots_on_target) && has(m.stats.away?.shots_on_target) },
    { key: "possession", label: "Posesión", present: has(m.stats.home?.possession) },
    { key: "xg", label: "Goles esperados (xG)", present: has(m.stats.home?.xg) },
    { key: "events", label: "Eventos del partido (goles, tarjetas, cambios)", present: m.events.length > 0 },
    { key: "odds_pre", label: "Cuotas antes del partido", present: has(m.odds?.home_open) },
    { key: "odds_close", label: "Cuotas al cierre / en vivo", present: has(m.odds?.home_close) },
    { key: "odds_ou", label: "Cuotas over/under de goles", present: has(m.odds?.over_open) && has(m.odds?.over_close) },
  ];
  const filled = items.filter((i) => i.present).length;
  return { score: items.length ? filled / items.length : 0, breakdown: items };
}

function has(v: unknown): boolean {
  return v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
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

export const DETECTOR_DESCRIPTIONS: Record<string, { what: string; variables: string }> = {
  statistical: {
    what: "Calcula cuántos desvíos estándar (Z-score) se aleja cada estadística del partido respecto al promedio histórico de partidos similares. Un valor muy alto o muy bajo en varias variables a la vez sube el score.",
    variables: "Remates, remates al arco, posesión, córners, faltas, tarjetas, goles totales.",
  },
  isolation_forest: {
    what: "Algoritmo de Machine Learning que aísla el partido en un 'árbol' de decisiones aleatorias sobre todas sus variables a la vez. Partidos raros se aíslan con menos particiones que uno normal — eso sube el score.",
    variables: "Vector completo de estadísticas del partido (remates, posesión, tarjetas, goles, xG, córners).",
  },
  lof: {
    what: "Local Outlier Factor: compara la densidad de partidos 'vecinos' (estadísticamente parecidos) contra la densidad general. Si el partido está en una zona rara del espacio estadístico, sube el score.",
    variables: "Mismo vector de estadísticas que Isolation Forest, pero mirando densidad local en vez de aislamiento global.",
  },
  bayesian: {
    what: "Estima la probabilidad de que el resultado sea 'orgánico' dado el marcador, el momento de los goles y la diferencia de nivel entre los equipos, usando probabilidad condicional (teorema de Bayes).",
    variables: "Marcador final, minuto de cada gol, favoritismo pre-partido (si hay cuotas).",
  },
  patterns: {
    what: "Reglas explícitas basadas en patrones documentados de amaños reales: remontadas inusuales en pocos minutos, penales/tarjetas en momentos sospechosos, resultados exactos que benefician mercados de apuestas comunes (ej. 2-1, over/under).",
    variables: "Secuencia de eventos (goles, tarjetas, penales) con su minuto exacto.",
  },
  temporal: {
    what: "Analiza la distribución de los eventos a lo largo de los 90 minutos: si todos los goles/tarjetas relevantes se concentran de forma anormal en un tramo muy corto del partido.",
    variables: "Minuto de cada evento (goles, tarjetas, cambios).",
  },
  odds_movement: {
    what: "Compara las cuotas de apuestas antes del partido contra las de cierre/en vivo. Movimientos bruscos sin razón deportiva aparente (lesiones, clima) son la señal más citada en casos reales de amaño.",
    variables: "Cuotas 1X2 y over/under, apertura vs. cierre.",
  },
  ml_historical: {
    what: "Modelo entrenado con partidos históricos etiquetados (limpios vs. sospechosos) que calcula qué tan parecido es el vector de este partido a los casos sospechosos conocidos.",
    variables: "Combinación ponderada de todas las variables disponibles del partido.",
  },
  benford: {
    what: "Ley de Benford: en datos numéricos genuinos, el primer dígito de cada número sigue una distribución logarítmica predecible. Una desviación fuerte (chi-cuadrado alto) sugiere que algunos datos pudieron ser fabricados o alterados manualmente.",
    variables: "Primer dígito de todos los números del partido: goles, remates, córners, faltas, minutos de eventos, cuotas.",
  },
};

export function explainScoreFormula() {
  return [
    "Cada uno de los 9 detectores da un puntaje de 0 a 1 y tiene un peso (algunos pesan más que otros según qué tan confiable es su señal).",
    "El score general arranca como el promedio ponderado de los 9 detectores.",
    "Si 3 o más detectores superan 0.55 a la vez, el score sube un 15% (varias señales independientes coincidiendo es más confiable que una sola).",
    "Si 2 o más detectores superan 0.75 (señal fuerte), el score sube otro 20% adicional.",
    "Si solo 1 detector (o ninguno) supera 0.55, el score baja un 30% — una sola señal aislada no alcanza para sospechar.",
    "La confianza del análisis combina qué tan completos son los datos del partido (¿hay cuotas? ¿hay xG? ¿hay eventos minuto a minuto?) con qué tan de acuerdo están los detectores entre sí.",
  ];
}

export const VERDICT_LABELS: Record<Verdict, { label: string; color: string; description: string }> = {
  clean: { label: "Sin anomalías", color: "text-emerald-500", description: "Partido dentro de patrones normales." },
  watch: { label: "Bajo interés", color: "text-yellow-500", description: "Señales débiles, atención mínima." },
  suspicious: { label: "Sospechoso", color: "text-orange-500", description: "Varios detectores coinciden en señales anómalas." },
  high_risk: { label: "Alto riesgo", color: "text-red-500", description: "Fuerte convergencia de indicadores de anomalía." },
};

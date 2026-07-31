import type { AnalysisResult, CompletenessItem, DetectorResult, Evidence, MatchData, Verdict } from "./types";
import { getCalibratedBaseline, generateBaseline, type BaselineResult } from "./baseline";
import { ppdaIsEstimate } from "./features";

// Motor estadístico principal (7 detectores): la anomalía se define como la
// distancia entre lo esperado por contexto y lo ocurrido, calibrada contra
// partidos históricos comparables (misma liga, cuando hay suficientes en
// caché — ver baseline.ts).
import { zscoreMultivariateDetector } from "./zscoreMultivariate";
import { mahalanobisDetector } from "./mahalanobis";
import { pcaDetector } from "./pca";
import { isolationForestDetector } from "./isolationForest";
import { oneClassSvmDetector } from "./oneClassSvm";
import { dbscanDetector } from "./dbscan";
import { changePointDetector } from "./changePoint";

// Señales de dominio adicionales (evidencia complementaria).
import { bayesianDetector } from "./bayesian";
import { patternsDetector } from "./patterns";
import { oddsMovementDetector } from "./oddsMovement";
import { benfordDetector } from "./benford";

export type EnsembleOptions = {
  baselineSize?: number;
  historicalBaseline?: number[][];
};

export async function runAnalysis(match: MatchData, opts: EnsembleOptions = {}): Promise<AnalysisResult> {
  const baselineResult: BaselineResult = opts.historicalBaseline?.length
    ? { vectors: opts.historicalBaseline, source: "synthetic", sampleSize: opts.historicalBaseline.length }
    : await getCalibratedBaseline(match).catch(() => ({
        vectors: generateBaseline(opts.baselineSize ?? 300),
        source: "synthetic" as const,
        sampleSize: 300,
      }));
  const baseline = baselineResult.vectors;

  const detectors: DetectorResult[] = [
    // 1-7: motor estadístico principal
    zscoreMultivariateDetector(match, baseline),
    mahalanobisDetector(match, baseline),
    pcaDetector(match, baseline),
    isolationForestDetector(match, baseline),
    oneClassSvmDetector(match, baseline),
    dbscanDetector(match, baseline),
    changePointDetector(match),
    // Señales de dominio (evidencia complementaria)
    bayesianDetector(match),
    patternsDetector(match),
    oddsMovementDetector(match),
    benfordDetector(match),
  ];

  // Weighted score
  const totalWeight = detectors.reduce((s, d) => s + d.weight, 0);
  const weighted = detectors.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight;

  // Cross-validation: how many detectors fire above threshold
  const firing = detectors.filter((d) => d.score >= 0.55).length;
  const strongFiring = detectors.filter((d) => d.score >= 0.75).length;
  const coreFiring = detectors.filter((d) => d.tier === "core" && d.score >= 0.55).length;

  // Boost when multiple independent detectors agree — el motor estadístico
  // (7 detectores) coincidiendo entre sí pesa más que señales de dominio
  // aisladas, porque son estimaciones más independientes entre sí.
  let overall = weighted;
  if (coreFiring >= 3) overall = Math.min(1, overall * 1.2);
  else if (firing >= 3) overall = Math.min(1, overall * 1.15);
  if (strongFiring >= 2) overall = Math.min(1, overall * 1.2);
  // Dampen when only 1 detector fires (single-signal is weak evidence)
  if (firing <= 1) overall = overall * 0.7;

  const { score: dataCompleteness, breakdown: completenessBreakdownBase } = computeCompleteness(match);
  const completenessBreakdown: CompletenessItem[] = [
    ...completenessBreakdownBase,
    { key: "passes", label: "Pases y precisión de pase", present: has(match.stats.home?.passes) },
    { key: "ppda", label: "Presión (PPDA) medida directamente (no estimada)", present: !ppdaIsEstimate(match) },
    { key: "structure360", label: "Datos de tracking / estructura 360", present: !!match.structure360?.length },
  ];
  // Confidence: bigger with more data + more agreement
  const agreement = 1 - variance(detectors.map((d) => d.score));
  const historicalBonus = baselineResult.source === "historical" ? 0.05 : 0;
  const confidence = clamp01(dataCompleteness * 0.55 + agreement * 0.4 + historicalBonus);

  const verdict: Verdict =
    overall >= 0.75 ? "high_risk" : overall >= 0.55 ? "suspicious" : overall >= 0.35 ? "watch" : "clean";

  const evidences: Evidence[] = detectors.flatMap((d) =>
    d.reasons.map((message) => ({
      detector: d.detector,
      message,
      severity: d.score >= 0.75 ? "high" : d.score >= 0.5 ? "warn" : "info",
    })),
  );
  if (baselineResult.source === "historical") {
    evidences.unshift({
      detector: "zscore_multivariate",
      severity: "info",
      message: `El baseline se calibró contra ${baselineResult.sampleSize} partidos históricos reales de ${match.league ?? "esta competencia"}, no solo con supuestos genéricos.`,
    });
  }

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
    { key: "shots", label: "Remates (producción)", present: has(m.stats.home?.shots) && has(m.stats.away?.shots) },
    { key: "shots_on_target", label: "Remates al arco", present: has(m.stats.home?.shots_on_target) && has(m.stats.away?.shots_on_target) },
    { key: "xg", label: "Goles esperados (xG)", present: has(m.stats.home?.xg) },
    { key: "possession", label: "Posesión", present: has(m.stats.home?.possession) },
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
  zscore_multivariate: "Z-score multivariado",
  mahalanobis: "Distancia de Mahalanobis",
  pca: "PCA (Análisis de Componentes Principales)",
  isolation_forest: "Isolation Forest",
  one_class_svm: "One-Class SVM",
  dbscan: "DBSCAN",
  change_point: "Detector secuencial de cambio de nivel",
  bayesian: "Análisis Bayesiano",
  patterns: "Patrones conocidos",
  odds_movement: "Movimiento de cuotas",
  benford: "Ley de Benford (integridad de datos)",
};

export const DETECTOR_TIER: Record<string, "core" | "domain"> = {
  zscore_multivariate: "core",
  mahalanobis: "core",
  pca: "core",
  isolation_forest: "core",
  one_class_svm: "core",
  dbscan: "core",
  change_point: "core",
  bayesian: "domain",
  patterns: "domain",
  odds_movement: "domain",
  benford: "domain",
};

export const DETECTOR_DESCRIPTIONS: Record<string, { what: string; variables: string }> = {
  zscore_multivariate: {
    what: "Calcula el desvío estándar (Z-score) de cada variable del partido contra el baseline calibrado, y combina todos los desvíos a la vez (raíz de la suma de cuadrados). Varias variables desviadas al mismo tiempo suben el score más que una sola.",
    variables: "Las 22 variables del vector: producción (xG, tiros), posesión/pases, progresión, PPDA, disciplina, defensa y contexto (goles, cuotas).",
  },
  mahalanobis: {
    what: "Como el Z-score, pero tiene en cuenta la correlación entre variables (ej. tiros y xG suelen moverse juntos). Puede detectar una combinación conjunta rara aunque cada variable por separado parezca normal.",
    variables: "Mismo vector de 22 variables, ponderado por la matriz de covarianza del baseline.",
  },
  pca: {
    what: "Ajusta las direcciones donde varían los partidos normales (componentes principales) y mide cuánto de este partido queda fuera de esas direcciones dominantes (error de reconstrucción). Partidos raros varían de formas que los partidos normales casi no usan.",
    variables: "Mismo vector de 22 variables, proyectado sobre sus 6 componentes principales.",
  },
  isolation_forest: {
    what: "Algoritmo de Machine Learning que aísla el partido en árboles de decisión aleatorios sobre todas sus variables a la vez. Partidos raros se aíslan con menos particiones que uno normal.",
    variables: "Vector completo de 22 variables (producción, posesión/pases, progresión, presión, disciplina, defensa, contexto).",
  },
  one_class_svm: {
    what: "Aproximación de One-Class SVM vía similitud de kernel RBF: mide qué tan parecido es este partido, en conjunto, a la 'nube' de partidos normales. Baja similitud = zona novedosa/anómala del espacio de datos.",
    variables: "Mismo vector de 22 variables, normalizado.",
  },
  dbscan: {
    what: "Clustering por densidad: si el partido cae como 'punto de ruido' (sin suficientes partidos comparables cerca), es una señal de que ocurre en una región poco poblada del espacio estadístico.",
    variables: "Mismo vector de 22 variables, comparado por densidad contra la muestra del baseline.",
  },
  change_point: {
    what: "Detector secuencial de cambio de nivel (CUSUM) sobre la serie temporal de eventos decisivos del partido: identifica si en algún tramo la intensidad de goles/tarjetas cambia de régimen de forma abrupta y sostenida, más allá de lo esperable por variación normal.",
    variables: "Minuto exacto de cada gol, penal, autogol y tarjeta roja.",
  },
  bayesian: {
    what: "Estima la probabilidad de que el resultado sea 'orgánico' dado el marcador, el momento de los goles y el favoritismo pre-partido, usando razones de verosimilitud (teorema de Bayes) calibradas con patrones públicos documentados.",
    variables: "Marcador final, minuto de cada gol/penal/tarjeta, cuotas pre-partido si están disponibles.",
  },
  patterns: {
    what: "Reglas explícitas basadas en patrones documentados de amaños reales: remontadas inusuales en pocos minutos, penales/tarjetas en momentos sospechosos, resultados que benefician mercados de apuestas comunes.",
    variables: "Secuencia de eventos (goles, tarjetas, penales) con su minuto exacto.",
  },
  odds_movement: {
    what: "Compara las cuotas de apuestas antes del partido contra las de cierre/en vivo. Movimientos bruscos sin razón deportiva aparente son la señal más citada en casos reales de amaño.",
    variables: "Cuotas 1X2 y over/under, apertura vs. cierre.",
  },
  benford: {
    what: "Ley de Benford: en datos numéricos genuinos, el primer dígito de cada número sigue una distribución logarítmica predecible. Una desviación fuerte sugiere que algunos datos pudieron ser fabricados o alterados manualmente.",
    variables: "Primer dígito de todos los números del partido: goles, remates, córners, faltas, minutos de eventos, cuotas.",
  },
};

export function explainScoreFormula() {
  return [
    "El motor estadístico principal corre 7 métodos independientes (Z-score multivariado, Mahalanobis, PCA, Isolation Forest, One-Class SVM, DBSCAN y un detector secuencial de cambio de nivel), todos midiendo lo mismo desde ángulos distintos: qué tan lejos está este partido de lo esperado, calibrado contra partidos históricos comparables de la misma liga cuando hay suficientes en caché (si no, se usa un baseline sintético razonable).",
    "Se suman 4 señales de dominio adicionales (Bayesiano, patrones conocidos de amaño, movimiento de cuotas, Ley de Benford) como evidencia complementaria, no como reemplazo del motor estadístico.",
    "El score general arranca como el promedio ponderado de los 11 detectores (cada uno pesa distinto según qué tan confiable es su señal).",
    "Si 3 o más detectores del motor estadístico principal coinciden a la vez, el score sube un 20% — varios métodos independientes de detección de anomalías coincidiendo es la evidencia más fuerte.",
    "Si 2 o más detectores (de cualquier capa) superan una señal fuerte (0.75), el score sube otro 20% adicional.",
    "Si solo 1 detector (o ninguno) dispara, el score baja un 30% — una sola señal aislada no alcanza para sospechar.",
    "La confianza combina completitud de datos (¿hay xG? ¿posesión? ¿pases? ¿cuotas?), acuerdo entre detectores, y un plus si el baseline se calibró contra partidos históricos reales en vez del sintético.",
  ];
}

export const VERDICT_LABELS: Record<Verdict, { label: string; color: string; description: string }> = {
  clean: { label: "Sin anomalías", color: "text-emerald-500", description: "Partido dentro de patrones normales." },
  watch: { label: "Bajo interés", color: "text-yellow-500", description: "Señales débiles, atención mínima." },
  suspicious: { label: "Sospechoso", color: "text-orange-500", description: "Varios detectores coinciden en señales anómalas." },
  high_risk: { label: "Alto riesgo", color: "text-red-500", description: "Fuerte convergencia de indicadores de anomalía." },
};

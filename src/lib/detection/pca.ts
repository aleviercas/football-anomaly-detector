import { extractFeatures } from "./features";
import type { FeatureVector } from "./features";
import type { DetectorResult, MatchData } from "./types";
import { mean, covariance, sub, dot, topEigenvectors } from "./linalg";

// 3) PCA (Análisis de Componentes Principales): ajustamos las componentes
// principales del baseline (las direcciones donde los partidos normales
// varían más) y proyectamos el partido sobre ellas. El "error de
// reconstrucción" — cuánto del partido queda fuera de esas direcciones
// dominantes — es la señal de anomalía: partidos raros varían en
// direcciones que los partidos normales casi no usan.
export function pcaDetector(
  match: MatchData,
  baseline: FeatureVector[],
  k = 6,
): DetectorResult {
  const mu = mean(baseline);
  const cov = covariance(baseline, mu);
  const { vectors } = topEigenvectors(cov, Math.min(k, mu.length - 1));

  const x = extractFeatures(match);
  const centered = sub(x, mu);

  // Reconstruir usando solo las k componentes principales, y medir el error.
  let reconstructed = new Array(centered.length).fill(0);
  const scores: number[] = [];
  for (const v of vectors) {
    const s = dot(centered, v);
    scores.push(s);
    reconstructed = reconstructed.map((val, i) => val + s * v[i]);
  }
  let errSq = 0;
  for (let i = 0; i < centered.length; i++) errSq += (centered[i] - reconstructed[i]) ** 2;
  const totalVarSq = dot(centered, centered) || 1;
  const reconstructionRatio = errSq / totalVarSq; // 0 = totalmente explicado por las PCs, 1 = nada

  const score = 1 / (1 + Math.exp(-(reconstructionRatio - 0.45) * 6));
  const reasons =
    score > 0.55
      ? [`El ${(reconstructionRatio * 100).toFixed(0)}% de las diferencias de este partido caen fuera de las ${vectors.length} direcciones donde varían normalmente los partidos comparables (error de reconstrucción PCA alto).`]
      : [];
  return { detector: "pca", tier: "core", score, reasons, weight: 1.05 };
}

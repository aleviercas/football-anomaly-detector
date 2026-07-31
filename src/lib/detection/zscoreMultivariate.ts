import { extractFeatures, FEATURE_NAMES } from "./features";
import type { DetectorResult, MatchData } from "./types";
import type { FeatureVector } from "./features";

// 1) Z-score multivariado: combina el desvío estándar de cada variable a la
// vez (no una por una) contra el baseline calibrado, vía la raíz de la suma
// de cuadrados de los z-scores individuales (una versión simplificada —sin
// covarianza— de la distancia de Mahalanobis, que sí modela correlación
// entre variables en su propio detector).
export function zscoreMultivariateDetector(
  match: MatchData,
  baseline: FeatureVector[],
): DetectorResult {
  const feats = extractFeatures(match);
  const means: number[] = new Array(feats.length).fill(0);
  const sds: number[] = new Array(feats.length).fill(0);
  for (const row of baseline) {
    for (let i = 0; i < feats.length; i++) means[i] += row[i];
  }
  for (let i = 0; i < feats.length; i++) means[i] /= baseline.length;
  for (const row of baseline) {
    for (let i = 0; i < feats.length; i++) sds[i] += (row[i] - means[i]) ** 2;
  }
  for (let i = 0; i < feats.length; i++) sds[i] = Math.sqrt(sds[i] / baseline.length) || 1;

  const reasons: string[] = [];
  let maxZ = 0;
  let sumSq = 0;
  for (let i = 0; i < feats.length; i++) {
    const z = Math.abs((feats[i] - means[i]) / sds[i]);
    sumSq += z * z;
    if (z > maxZ) maxZ = z;
    if (z >= 2.5) {
      reasons.push(
        `${FEATURE_NAMES[i]} se desvía ${z.toFixed(1)}σ (valor ${feats[i].toFixed(2)}, media esperada ${means[i].toFixed(2)})`,
      );
    }
  }
  const rms = Math.sqrt(sumSq / feats.length);
  const score = 1 / (1 + Math.exp(-(rms - 1.4) * 1.6));
  return { detector: "zscore_multivariate", tier: "core", score, reasons, weight: 1 };
}

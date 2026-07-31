import { extractFeatures } from "./features";
import type { FeatureVector } from "./features";
import type { DetectorResult, MatchData } from "./types";
import { mean, covariance, invert, mahalanobisSq } from "./linalg";

// 2) Distancia de Mahalanobis: a diferencia del Z-score simple, tiene en
// cuenta la correlación entre variables (ej. tiros y xG suelen moverse
// juntos) — un partido puede tener cada variable individualmente "normal"
// pero una combinación conjunta rarísima, y eso es justamente lo que esto
// detecta.
export function mahalanobisDetector(
  match: MatchData,
  baseline: FeatureVector[],
): DetectorResult {
  const x = extractFeatures(match);
  const mu = mean(baseline);
  const cov = covariance(baseline, mu);
  const covInv = invert(cov);
  const d2 = mahalanobisSq(x, mu, covInv);
  const d = Math.sqrt(Math.max(0, d2));

  // Bajo la hipótesis nula (datos ~ normales multivariados), d² sigue
  // aproximadamente una chi-cuadrado con k grados de libertad, cuya media es
  // k y desvío √(2k). Normalizamos sobre eso en vez de un umbral fijo.
  const k = x.length;
  const expected = k;
  const sd = Math.sqrt(2 * k);
  const normalized = (d2 - expected) / sd;
  const score = 1 / (1 + Math.exp(-(normalized - 0.5) * 0.9));

  const reasons =
    score > 0.55
      ? [`Distancia de Mahalanobis ${d.toFixed(2)} (χ²=${d2.toFixed(1)} vs. esperado ~${expected} con ${k} variables) — la combinación conjunta de variables es atípica aunque cada una por separado no lo sea tanto.`]
      : [];
  return { detector: "mahalanobis", tier: "core", score, reasons, weight: 1.15 };
}

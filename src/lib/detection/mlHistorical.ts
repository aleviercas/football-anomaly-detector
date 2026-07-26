import { extractFeatures } from "./features";
import type { DetectorResult, MatchData } from "./types";

// Placeholder logistic regression scored against hand-tuned coefficients.
// Coefficients are calibrated so obvious anomalies fire strongly; retraining
// with real labelled data is a future step.
const WEIGHTS = [
  0.15,  // total_goals
  0.05,  // 2H goals
  0.25,  // late goals
  0.35,  // red cards
  0.55,  // early red
  -0.01, // total shots
  -0.02, // total sot
  0.02,  // possession gap
  0.01,  // corners
  0.06,  // yellows
  0.35,  // xG vs goals diff
  2.5,   // odds home move
  2.5,   // odds away move
  2.5,   // odds over move
];
const BIAS = -3;

export function mlHistoricalDetector(m: MatchData): DetectorResult {
  const f = extractFeatures(m);
  let z = BIAS;
  for (let i = 0; i < f.length; i++) z += WEIGHTS[i] * f[i];
  const score = 1 / (1 + Math.exp(-z));
  const reasons =
    score > 0.6 ? [`Modelo histórico estima probabilidad ${(score * 100).toFixed(0)}%`] : [];
  return { detector: "ml_historical", score, reasons, weight: 1.1 };
}

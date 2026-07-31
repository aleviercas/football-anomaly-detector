import { extractFeatures } from "./features";
import type { FeatureVector } from "./features";
import type { DetectorResult, MatchData } from "./types";

// 4→5) One-Class SVM: entrenar un SVM exacto (SMO con kernel RBF) no es
// realista para correr en cada request de un runtime serverless. En su
// lugar usamos la aproximación estándar de "distancia en espacio de kernel":
// calculamos la similitud RBF promedio del partido contra una muestra del
// baseline (esto es, en esencia, lo que el SVM one-class terminaría usando
// como función de decisión con soporte denso). Un partido "normal" tiene
// alta similitud promedio con el resto de partidos normales; uno anómalo,
// baja.
function normalize(baseline: FeatureVector[]): { norm: FeatureVector[]; mins: number[]; ranges: number[] } {
  const d = baseline[0].length;
  const mins = new Array(d).fill(Infinity);
  const maxs = new Array(d).fill(-Infinity);
  for (const row of baseline) {
    for (let i = 0; i < d; i++) {
      if (row[i] < mins[i]) mins[i] = row[i];
      if (row[i] > maxs[i]) maxs[i] = row[i];
    }
  }
  const ranges = mins.map((m, i) => Math.max(1e-6, maxs[i] - m));
  const norm = baseline.map((row) => row.map((v, i) => (v - mins[i]) / ranges[i]));
  return { norm, mins, ranges };
}

export function oneClassSvmDetector(
  match: MatchData,
  baseline: FeatureVector[],
  opts: { gamma?: number; sampleSize?: number } = {},
): DetectorResult {
  const { norm, mins, ranges } = normalize(baseline);
  const d = norm[0].length;
  const gamma = opts.gamma ?? 1 / d;
  const sampleSize = Math.min(opts.sampleSize ?? 150, norm.length);
  const sample = norm.slice(0, sampleSize);

  const xRaw = extractFeatures(match);
  const x = xRaw.map((v, i) => (v - mins[i]) / ranges[i]);

  let simSum = 0;
  for (const row of sample) {
    let sqDist = 0;
    for (let i = 0; i < d; i++) sqDist += (x[i] - row[i]) ** 2;
    simSum += Math.exp(-gamma * sqDist);
  }
  const avgSimilarity = simSum / sample.length; // 0..1, 1 = idéntico al centro de la nube normal

  // Comparar contra la similitud promedio que un punto normal tendría
  // consigo mismo dentro de la nube (referencia empírica, submuestreada).
  let refSum = 0;
  const refN = Math.min(40, sample.length);
  for (let i = 0; i < refN; i++) {
    const p = sample[i];
    let s = 0;
    for (const row of sample) {
      let sqDist = 0;
      for (let j = 0; j < d; j++) sqDist += (p[j] - row[j]) ** 2;
      s += Math.exp(-gamma * sqDist);
    }
    refSum += s / sample.length;
  }
  const refAvg = refSum / refN;

  const noveltyRatio = 1 - avgSimilarity / Math.max(1e-6, refAvg); // 0 = tan normal como el resto, →1 = muy afuera
  const score = Math.min(1, Math.max(0, noveltyRatio * 1.3));
  const reasons =
    score > 0.55
      ? [`Baja similitud (kernel RBF) con la nube de partidos normales: ${(avgSimilarity * 100).toFixed(0)}% vs. ${(refAvg * 100).toFixed(0)}% típico.`]
      : [];
  return { detector: "one_class_svm", tier: "core", score, reasons, weight: 1 };
}

import { extractFeatures } from "./features";
import type { FeatureVector } from "./features";
import type { DetectorResult, MatchData } from "./types";

// 6) DBSCAN: corremos DBSCAN sobre una muestra del baseline + el partido a
// evaluar. Si el partido cae como "ruido" (noise point — ni core point ni
// alcanzable por densidad desde ningún cluster), eso es la señal de
// anomalía: está en una región del espacio de features demasiado poco
// poblada como para pertenecer a ningún grupo de partidos "normales".
function normalize(rows: FeatureVector[]): FeatureVector[] {
  const d = rows[0].length;
  const mins = new Array(d).fill(Infinity);
  const maxs = new Array(d).fill(-Infinity);
  for (const row of rows) {
    for (let i = 0; i < d; i++) {
      if (row[i] < mins[i]) mins[i] = row[i];
      if (row[i] > maxs[i]) maxs[i] = row[i];
    }
  }
  const ranges = mins.map((m, i) => Math.max(1e-6, maxs[i] - m));
  return rows.map((row) => row.map((v, i) => (v - mins[i]) / ranges[i]));
}

function dist(a: FeatureVector, b: FeatureVector): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export function dbscanDetector(
  match: MatchData,
  baseline: FeatureVector[],
  opts: { eps?: number; minPts?: number; sampleSize?: number } = {},
): DetectorResult {
  const sampleSize = Math.min(opts.sampleSize ?? 150, baseline.length);
  const sample = baseline.slice(0, sampleSize);
  const x = extractFeatures(match);
  const all = normalize([...sample, x]);
  const point = all[all.length - 1];
  const neighbors = all.slice(0, all.length - 1);

  const eps = opts.eps ?? 0.35;
  const minPts = opts.minPts ?? Math.max(4, Math.round(sampleSize * 0.03));

  const distances = neighbors.map((n) => dist(point, n)).sort((a, b) => a - b);
  const neighborCount = distances.filter((d) => d <= eps).length;
  const kthDist = distances[Math.min(minPts, distances.length - 1)] ?? distances[distances.length - 1];

  // Score: cuanto más lejos del k-ésimo vecino más cercano (relativo al eps
  // esperado) y cuantos menos vecinos dentro de eps, más "ruido" es.
  const densityRatio = neighborCount / minPts; // >=1 => el punto está en una región densa
  const distanceRatio = kthDist / eps;
  const noiseSignal = Math.max(0, 1 - densityRatio) * 0.6 + Math.max(0, distanceRatio - 1) * 0.4;
  const score = Math.min(1, noiseSignal);

  const reasons =
    score > 0.55
      ? [`DBSCAN: solo ${neighborCount} partidos comparables dentro del radio de densidad normal (se esperaban ≥${minPts}) — el partido queda como punto de ruido, fuera de cualquier grupo denso de partidos parecidos.`]
      : [];
  return { detector: "dbscan", tier: "core", score, reasons, weight: 0.95 };
}

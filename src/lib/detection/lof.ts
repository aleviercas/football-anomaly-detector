import { extractFeatures } from "./features";
import type { FeatureVector } from "./features";
import type { DetectorResult, MatchData } from "./types";

// Local Outlier Factor with min-max normalization so heterogeneous
// feature scales don't dominate the distance.
function normalize(data: FeatureVector[], target: FeatureVector) {
  const dims = target.length;
  const min = new Array(dims).fill(Infinity);
  const max = new Array(dims).fill(-Infinity);
  for (const row of data) {
    for (let i = 0; i < dims; i++) {
      if (row[i] < min[i]) min[i] = row[i];
      if (row[i] > max[i]) max[i] = row[i];
    }
  }
  for (let i = 0; i < dims; i++) {
    if (target[i] < min[i]) min[i] = target[i];
    if (target[i] > max[i]) max[i] = target[i];
  }
  const scale = (v: number, i: number) =>
    max[i] === min[i] ? 0 : (v - min[i]) / (max[i] - min[i]);
  return {
    data: data.map((r) => r.map((v, i) => scale(v, i))),
    target: target.map((v, i) => scale(v, i)),
  };
}

function dist(a: FeatureVector, b: FeatureVector): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export function lofDetector(
  match: MatchData,
  baseline: FeatureVector[],
  k = 20,
): DetectorResult {
  const raw = extractFeatures(match);
  const { data, target } = normalize(baseline, raw);

  const knn = (p: FeatureVector, exclude?: number) => {
    const dists: { i: number; d: number }[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i === exclude) continue;
      dists.push({ i, d: dist(p, data[i]) });
    }
    dists.sort((a, b) => a.d - b.d);
    return dists.slice(0, k);
  };

  const targetNN = knn(target);
  const kDistTarget = targetNN[targetNN.length - 1].d;

  // reachability distance from target -> neighbor n
  const reachDistFromNeighbor = (n: { i: number; d: number }) => {
    const nn = knn(data[n.i]);
    const kDistN = nn[nn.length - 1].d;
    return Math.max(kDistN, n.d);
  };
  const lrdTarget = 1 / (targetNN.reduce((s, n) => s + reachDistFromNeighbor(n), 0) / k || 1e-9);
  const lofRatios = targetNN.map((n) => {
    const nn = knn(data[n.i]);
    const kDistN = nn[nn.length - 1].d;
    const lrdN =
      1 /
      (nn.reduce((s, m) => {
        const mm = knn(data[m.i]);
        return s + Math.max(mm[mm.length - 1].d, m.d);
      }, 0) /
        k || 1e-9);
    return lrdN / lrdTarget;
  });
  const lof = lofRatios.reduce((s, v) => s + v, 0) / k;
  // squash to 0..1
  const score = 1 / (1 + Math.exp(-(lof - 1.5) * 2));
  const reasons = score > 0.6 ? [`LOF ${lof.toFixed(2)} — partido aislado respecto a sus vecinos (kDist ${kDistTarget.toFixed(2)})`] : [];
  return { detector: "lof", score, reasons, weight: 1 };
}

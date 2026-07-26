import { extractFeatures } from "./features";
import type { FeatureVector } from "./features";
import type { DetectorResult, MatchData } from "./types";

// Minimal Isolation Forest implementation in TypeScript.
// Reference: Liu, Ting & Zhou (2008).

type INode =
  | { type: "leaf"; size: number }
  | { type: "split"; feature: number; value: number; left: INode; right: INode };

function buildTree(data: FeatureVector[], height: number, limit: number): INode {
  if (height >= limit || data.length <= 1) return { type: "leaf", size: data.length };
  const nFeatures = data[0].length;
  const feature = Math.floor(Math.random() * nFeatures);
  let min = Infinity, max = -Infinity;
  for (const row of data) {
    if (row[feature] < min) min = row[feature];
    if (row[feature] > max) max = row[feature];
  }
  if (min === max) return { type: "leaf", size: data.length };
  const value = min + Math.random() * (max - min);
  const left: FeatureVector[] = [];
  const right: FeatureVector[] = [];
  for (const row of data) (row[feature] < value ? left : right).push(row);
  return {
    type: "split", feature, value,
    left: buildTree(left, height + 1, limit),
    right: buildTree(right, height + 1, limit),
  };
}

function pathLength(node: INode, x: FeatureVector, depth = 0): number {
  if (node.type === "leaf") {
    const s = node.size;
    if (s <= 1) return depth;
    return depth + cFactor(s);
  }
  return x[node.feature] < node.value
    ? pathLength(node.left, x, depth + 1)
    : pathLength(node.right, x, depth + 1);
}

function cFactor(n: number): number {
  if (n <= 1) return 0;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
}

export function isolationForestDetector(
  match: MatchData,
  baseline: FeatureVector[],
  opts: { trees?: number; sampleSize?: number } = {},
): DetectorResult {
  const trees = opts.trees ?? 80;
  const sampleSize = Math.min(opts.sampleSize ?? 128, baseline.length);
  const limit = Math.ceil(Math.log2(sampleSize));
  const forest: INode[] = [];
  for (let i = 0; i < trees; i++) {
    const sample: FeatureVector[] = [];
    for (let j = 0; j < sampleSize; j++) {
      sample.push(baseline[Math.floor(Math.random() * baseline.length)]);
    }
    forest.push(buildTree(sample, 0, limit));
  }
  const x = extractFeatures(match);
  let avg = 0;
  for (const t of forest) avg += pathLength(t, x);
  avg /= forest.length;
  const c = cFactor(sampleSize);
  const anomaly = Math.pow(2, -avg / c); // 0..1, higher = more anomalous
  const reasons =
    anomaly > 0.6
      ? [`Isolation Forest aisló el partido en ${avg.toFixed(2)} pasos promedio (score ${anomaly.toFixed(2)})`]
      : [];
  return { detector: "isolation_forest", score: anomaly, reasons, weight: 1.1 };
}

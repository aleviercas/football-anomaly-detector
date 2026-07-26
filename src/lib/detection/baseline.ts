import type { FeatureVector } from "./features";

// Synthetic baseline distribution for a "normal" football match. When we
// don't have a historical corpus for the league yet, we fall back to this
// so distance/tree-based detectors still work.
// Values reflect approximate top-flight European league averages.
export function generateBaseline(size = 300, seed = 42): FeatureVector[] {
  const rand = mulberry32(seed);
  const out: FeatureVector[] = [];
  for (let i = 0; i < size; i++) {
    const totalGoals = Math.max(0, Math.round(gauss(rand, 2.7, 1.5)));
    const secondHalfGoals = Math.max(0, Math.min(totalGoals, Math.round(gauss(rand, totalGoals * 0.55, 1))));
    const lateGoals = Math.max(0, Math.round(gauss(rand, totalGoals * 0.25, 0.6)));
    const redCards = Math.max(0, Math.round(gauss(rand, 0.2, 0.5)));
    const earlyRed = rand() < 0.05 ? 1 : 0;
    const shots = Math.max(4, Math.round(gauss(rand, 24, 6)));
    const sot = Math.max(1, Math.round(gauss(rand, 8, 3)));
    const possGap = Math.abs(gauss(rand, 0, 12));
    const corners = Math.max(0, Math.round(gauss(rand, 10, 3)));
    const yellows = Math.max(0, Math.round(gauss(rand, 4, 1.5)));
    const xgDiff = Math.abs(gauss(rand, 0.9, 0.6));
    const oddsMoveHome = gauss(rand, 0, 0.06);
    const oddsMoveAway = gauss(rand, 0, 0.06);
    const oddsMoveOver = gauss(rand, 0, 0.05);
    out.push([
      totalGoals, secondHalfGoals, lateGoals, redCards, earlyRed,
      shots, sot, possGap, corners, yellows, xgDiff,
      oddsMoveHome, oddsMoveAway, oddsMoveOver,
    ]);
  }
  return out;
}

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number, mean: number, sd: number): number {
  // Box-Muller
  const u = Math.max(1e-9, rand());
  const v = rand();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * sd;
}

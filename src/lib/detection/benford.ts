import type { DetectorResult, MatchData } from "./types";

// Benford's Law (first-digit law) analysis, ported from the original
// football-anomaly-detector Python engine (StatisticalUtils.benford_analysis).
//
// The idea: naturally occurring collections of numbers (goals, shots,
// corners, fouls, cards, odds movements, etc. accumulated across a match)
// tend to follow a logarithmic first-digit distribution. Numbers that were
// partly fabricated or manipulated (e.g. doctored stat sheets) tend to
// deviate from that distribution more than genuine data does.
//
// This is a weak, "extra evidence" signal on a single match — it's most
// meaningful across many matches/seasons — so it's weighted lower than the
// statistical/pattern detectors, and only fires when the data has enough
// numeric variety to be meaningful.

const BENFORD_DIST = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => Math.log10(1 + 1 / d));

export function benfordChiSquared(numbers: number[]): number {
  const firstDigits: number[] = [];
  for (const n of numbers) {
    if (!n) continue;
    const s = String(Math.abs(Math.trunc(n)));
    if (s && s[0] !== "0") firstDigits.push(Number(s[0]));
  }
  if (firstDigits.length < 8) return 0; // not enough data to be meaningful

  const total = firstDigits.length;
  const observed = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
    (d) => firstDigits.filter((x) => x === d).length / total,
  );
  return observed.reduce((sum, obs, i) => {
    const exp = BENFORD_DIST[i];
    return exp > 0 ? sum + ((obs - exp) ** 2) / exp : sum;
  }, 0);
}

function collectNumbers(match: MatchData): number[] {
  const nums: number[] = [];
  const push = (v?: number) => { if (typeof v === "number" && Number.isFinite(v)) nums.push(v); };

  push(match.homeScore); push(match.awayScore);
  push(match.htHomeScore); push(match.htAwayScore);
  for (const side of ["home", "away"] as const) {
    const s = match.stats[side];
    if (!s) continue;
    push(s.shots); push(s.shots_on_target); push(s.possession);
    push(s.corners); push(s.fouls); push(s.yellow_cards);
    push(s.red_cards); push(s.offsides); push(s.xg);
  }
  for (const e of match.events) push(e.minute);
  if (match.odds) {
    const o = match.odds;
    push(o.home_open); push(o.draw_open); push(o.away_open);
    push(o.home_close); push(o.draw_close); push(o.away_close);
    push(o.over_open); push(o.under_open); push(o.over_close); push(o.under_close);
  }
  return nums;
}

export function benfordDetector(match: MatchData): DetectorResult {
  const numbers = collectNumbers(match);
  const chiSquared = benfordChiSquared(numbers);

  // Empirical thresholds ported from the Python engine (chi-squared vs the
  // 9-bucket Benford distribution). >15 was the original "flag" threshold.
  let score = 0;
  const reasons: string[] = [];
  if (numbers.length >= 8) {
    if (chiSquared > 25) {
      score = 0.75;
      reasons.push(`Desviación severa de la Ley de Benford (χ²=${chiSquared.toFixed(2)}) — posible manipulación de datos`);
    } else if (chiSquared > 15) {
      score = 0.5;
      reasons.push(`Desviación notable de la Ley de Benford (χ²=${chiSquared.toFixed(2)})`);
    } else if (chiSquared > 8) {
      score = 0.2;
      reasons.push(`Ligera desviación de la Ley de Benford (χ²=${chiSquared.toFixed(2)})`);
    }
  }

  return {
    detector: "benford",
    score,
    reasons,
    // Lower weight than direct football signals: this is corroborating
    // data-integrity evidence, not a football-behavior signal by itself.
    weight: 0.6,
  };
}

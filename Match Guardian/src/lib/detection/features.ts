import type { MatchData } from "./types";

// Extract a normalized numeric feature vector from a match for use by
// distance/tree-based detectors (Isolation Forest, LOF).
export type FeatureVector = number[];

export function extractFeatures(m: MatchData): FeatureVector {
  const home = m.stats.home ?? {};
  const away = m.stats.away ?? {};
  const totalGoals = m.homeScore + m.awayScore;
  const secondHalfGoals =
    totalGoals - ((m.htHomeScore ?? 0) + (m.htAwayScore ?? 0));
  const lateGoals = m.events.filter(
    (e) => (e.type === "goal" || e.type === "penalty" || e.type === "own_goal") && e.minute >= 80,
  ).length;
  const redCards = m.events.filter((e) => e.type === "red_card").length;
  const earlyRed = m.events.some((e) => e.type === "red_card" && e.minute <= 30) ? 1 : 0;
  const oddsHomeMove =
    m.odds && m.odds.home_open && m.odds.home_close
      ? (m.odds.home_close - m.odds.home_open) / m.odds.home_open
      : 0;
  const oddsAwayMove =
    m.odds && m.odds.away_open && m.odds.away_close
      ? (m.odds.away_close - m.odds.away_open) / m.odds.away_open
      : 0;
  const overMove =
    m.odds && m.odds.over_open && m.odds.over_close
      ? (m.odds.over_close - m.odds.over_open) / m.odds.over_open
      : 0;
  const xgDiff = Math.abs((home.xg ?? totalGoals / 2) - m.homeScore) +
    Math.abs((away.xg ?? totalGoals / 2) - m.awayScore);

  return [
    totalGoals,
    secondHalfGoals,
    lateGoals,
    redCards,
    earlyRed,
    (home.shots ?? 10) + (away.shots ?? 10),
    (home.shots_on_target ?? 4) + (away.shots_on_target ?? 4),
    Math.abs((home.possession ?? 50) - 50),
    (home.corners ?? 5) + (away.corners ?? 5),
    (home.yellow_cards ?? 2) + (away.yellow_cards ?? 2),
    xgDiff,
    oddsHomeMove,
    oddsAwayMove,
    overMove,
  ];
}

export const FEATURE_NAMES = [
  "total_goals",
  "second_half_goals",
  "late_goals",
  "red_cards",
  "early_red",
  "total_shots",
  "total_sot",
  "possession_gap",
  "total_corners",
  "total_yellows",
  "xg_vs_goals_diff",
  "odds_home_move",
  "odds_away_move",
  "odds_over_move",
];

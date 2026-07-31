import type { MatchData, TeamStats } from "./types";

// Extract a normalized numeric feature vector from a match for use by the
// core statistical detectors (Z-score multivariado, Mahalanobis, PCA,
// Isolation Forest, One-Class SVM, DBSCAN). Anomaly = distance between what
// this vector says happened and what a calibrated baseline of comparable
// historical matches says should happen.
export type FeatureCategory =
  | "production" // xG, tiros
  | "possession_passing" // posesión y pases
  | "progression" // progresión hacia el arco rival
  | "pressing" // PPDA / intensidad de presión
  | "defense"
  | "discipline"
  | "context"; // goles, tarjetas rojas tempranas, cuotas — mezcla temporal/contextual

export type FeatureVector = number[];

export type FeatureDef = { name: string; category: FeatureCategory };

type TeamStatsAny = TeamStats;

function ppda(own: TeamStatsAny, opp: TeamStatsAny): { value: number; isEstimate: boolean } {
  if (own.ppda != null) return { value: own.ppda, isEstimate: !!own.ppda_is_estimate };
  // Proxy PPDA: pases del rival divididos por acciones defensivas propias
  // (entradas + intercepciones + faltas). Sin datos de zona real esto es una
  // aproximación — se marca isEstimate para que la UI lo aclare.
  const oppPasses = opp.passes ?? 350; // promedio genérico si falta el dato
  const defActions = (own.tackles ?? 0) + (own.interceptions ?? 0) + (own.fouls ?? 12);
  return { value: oppPasses / Math.max(1, defActions), isEstimate: true };
}

export const FEATURE_DEFS: FeatureDef[] = [
  { name: "total_goals", category: "context" },
  { name: "second_half_goals", category: "context" },
  { name: "late_goals", category: "context" },
  { name: "red_cards", category: "discipline" },
  { name: "early_red", category: "discipline" },
  { name: "xg_vs_goals_diff", category: "production" },
  { name: "total_shots", category: "production" },
  { name: "total_sot", category: "production" },
  { name: "shots_inside_box_ratio", category: "production" },
  { name: "possession_gap", category: "possession_passing" },
  { name: "pass_accuracy_gap", category: "possession_passing" },
  { name: "total_passes", category: "possession_passing" },
  { name: "progression_gap", category: "progression" },
  { name: "ppda_home", category: "pressing" },
  { name: "ppda_away", category: "pressing" },
  { name: "total_corners", category: "discipline" },
  { name: "total_yellows", category: "discipline" },
  { name: "total_fouls", category: "discipline" },
  { name: "saves_gap", category: "defense" },
  { name: "odds_home_move", category: "context" },
  { name: "odds_away_move", category: "context" },
  { name: "odds_over_move", category: "context" },
];

export const FEATURE_NAMES = FEATURE_DEFS.map((f) => f.name);

export function extractFeatures(m: MatchData): FeatureVector {
  const home = m.stats.home ?? {};
  const away = m.stats.away ?? {};
  const totalGoals = m.homeScore + m.awayScore;
  const secondHalfGoals = totalGoals - ((m.htHomeScore ?? 0) + (m.htAwayScore ?? 0));
  const lateGoals = m.events.filter(
    (e) => (e.type === "goal" || e.type === "penalty" || e.type === "own_goal") && e.minute >= 80,
  ).length;
  const redCards = m.events.filter((e) => e.type === "red_card").length;
  const earlyRed = m.events.some((e) => e.type === "red_card" && e.minute <= 30) ? 1 : 0;

  const oddsHomeMove = m.odds?.home_open && m.odds.home_close
    ? (m.odds.home_close - m.odds.home_open) / m.odds.home_open : 0;
  const oddsAwayMove = m.odds?.away_open && m.odds.away_close
    ? (m.odds.away_close - m.odds.away_open) / m.odds.away_open : 0;
  const overMove = m.odds?.over_open && m.odds.over_close
    ? (m.odds.over_close - m.odds.over_open) / m.odds.over_open : 0;

  // Producción
  const xgDiff = Math.abs((home.xg ?? totalGoals / 2) - m.homeScore) +
    Math.abs((away.xg ?? totalGoals / 2) - m.awayScore);
  const totalShots = (home.shots ?? 10) + (away.shots ?? 10);
  const totalSot = (home.shots_on_target ?? 4) + (away.shots_on_target ?? 4);
  const insideBox = (home.shots_inside_box ?? 0) + (away.shots_inside_box ?? 0);
  const shotsInsideBoxRatio = totalShots > 0 ? insideBox / totalShots : 0.5;

  // Posesión y pases
  const possessionGap = Math.abs((home.possession ?? 50) - 50);
  const passAccGap = Math.abs((home.pass_accuracy ?? 80) - (away.pass_accuracy ?? 80));
  const totalPasses = (home.passes ?? 400) + (away.passes ?? 400);

  // Progresión (proxy sin datos de zona reales: relación tiros-al-área vs posesión)
  const homeProg = (home.progression_index ?? shotsInsideBoxRatio);
  const awayProg = (away.progression_index ?? shotsInsideBoxRatio);
  const progressionGap = Math.abs(homeProg - awayProg);

  // Presión / PPDA (más bajo = más presión; el gap alto es lo raro)
  const ppdaHome = ppda(home, away).value;
  const ppdaAway = ppda(away, home).value;

  // Disciplina
  const totalCorners = (home.corners ?? 5) + (away.corners ?? 5);
  const totalYellow = (home.yellow_cards ?? 2) + (away.yellow_cards ?? 2);
  const totalFouls = (home.fouls ?? 12) + (away.fouls ?? 12);

  // Defensa
  const savesGap = Math.abs((home.saves ?? 3) - (away.saves ?? 3));

  return [
    totalGoals, secondHalfGoals, lateGoals, redCards, earlyRed,
    xgDiff, totalShots, totalSot, shotsInsideBoxRatio,
    possessionGap, passAccGap, totalPasses,
    progressionGap,
    ppdaHome, ppdaAway,
    totalCorners, totalYellow, totalFouls,
    savesGap,
    oddsHomeMove, oddsAwayMove, overMove,
  ];
}

/** Whether PPDA had to be estimated (no real zone/passing data) for this match. */
export function ppdaIsEstimate(m: MatchData): boolean {
  const home = m.stats.home ?? {};
  const away = m.stats.away ?? {};
  return ppda(home, away).isEstimate || ppda(away, home).isEstimate;
}

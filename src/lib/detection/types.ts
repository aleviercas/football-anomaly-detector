// Shared types for the anomaly detection engine.

export type MatchEvent = {
  minute: number;
  type: "goal" | "own_goal" | "penalty" | "yellow_card" | "red_card" | "substitution" | "var";
  team: "home" | "away";
  player?: string;
  detail?: string;
};

export type OddsSnapshot = {
  bookmaker?: string;
  home_open?: number;
  draw_open?: number;
  away_open?: number;
  home_close?: number;
  draw_close?: number;
  away_close?: number;
  over_line?: number;
  over_open?: number;
  under_open?: number;
  over_close?: number;
  under_close?: number;
};

export type TeamStats = {
  shots?: number;
  shots_on_target?: number;
  possession?: number; // %
  corners?: number;
  fouls?: number;
  yellow_cards?: number;
  red_cards?: number;
  offsides?: number;
  xg?: number;
};

export type MatchData = {
  id: string;
  provider: string;
  externalId: string;
  league?: string;
  season?: string;
  matchDate: string; // ISO
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  htHomeScore?: number;
  htAwayScore?: number;
  status?: string;
  stats: {
    home?: TeamStats;
    away?: TeamStats;
  };
  events: MatchEvent[];
  odds?: OddsSnapshot;
  referee?: {
    name?: string;
    avg_cards?: number;
    avg_penalties?: number;
  };
  context?: {
    home_form?: number[]; // last-5 result codes (3 win, 1 draw, 0 loss)
    away_form?: number[];
    home_elo?: number;
    away_elo?: number;
    h2h?: { home_wins: number; draws: number; away_wins: number };
    importance?: "low" | "mid" | "high";
  };
};

export type DetectorId =
  | "statistical"
  | "isolation_forest"
  | "lof"
  | "bayesian"
  | "patterns"
  | "temporal"
  | "odds_movement"
  | "ml_historical"
  | "benford";

export type DetectorResult = {
  detector: DetectorId;
  score: number; // 0..1 (1 = highly anomalous)
  reasons: string[];
  weight: number;
};

export type Evidence = {
  detector: DetectorId;
  severity: "info" | "warn" | "high";
  message: string;
};

export type Verdict = "clean" | "watch" | "suspicious" | "high_risk";

export type CompletenessItem = { key: string; label: string; present: boolean };

export type AnalysisResult = {
  overallScore: number; // 0..1
  verdict: Verdict;
  confidence: number; // 0..1 — depends on data completeness + detector agreement
  perDetector: DetectorResult[];
  evidences: Evidence[];
  dataCompleteness: number; // 0..1
  completenessBreakdown: CompletenessItem[];
};

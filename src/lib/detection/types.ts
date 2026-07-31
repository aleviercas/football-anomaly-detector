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
  // Producción (tiros / xG)
  shots?: number;
  shots_on_target?: number;
  shots_inside_box?: number;
  shots_outside_box?: number;
  blocked_shots?: number;
  xg?: number;
  // Posesión y pases
  possession?: number; // %
  passes?: number;
  passes_accurate?: number;
  pass_accuracy?: number; // %
  // Progresión (proxy: cuánto del juego se traduce en llegadas al área)
  progression_index?: number; // 0..1 — shots_inside_box / total_shots cuando hay datos de zona
  // Presión / PPDA (passes allowed per defensive action — más bajo = más presión)
  ppda?: number;
  ppda_is_estimate?: boolean; // true si se calculó con proxy (sin datos de zona reales)
  // Defensa
  tackles?: number;
  interceptions?: number;
  clearances?: number;
  saves?: number;
  // Disciplina
  corners?: number;
  fouls?: number;
  yellow_cards?: number;
  red_cards?: number;
  offsides?: number;
};

/**
 * Estructura 360 (freeze-frames / posicionamiento en cada evento clave), al
 * estilo de los feeds premium de tracking (Opta 360, StatsBomb 360, Second
 * Spectrum). Ninguna de las fuentes gratuitas que usamos hoy (API-Football,
 * football-data.org, TheSportsDB) provee esto — queda tipado y listo para
 * cuando se conecte un proveedor de tracking data, pero por ahora siempre
 * viene undefined y los detectores lo ignoran si no está.
 */
export type Structure360Frame = {
  eventMinute: number;
  team: "home" | "away";
  ballLocation?: { x: number; y: number }; // 0..100 normalizado a la cancha
  defendersBehindBall?: number;
  playersInFrame?: { team: "home" | "away"; x: number; y: number }[];
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
  structure360?: Structure360Frame[]; // reservado para proveedores de tracking data (ver arriba)
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

// Motor estadístico principal (7 detectores): la anomalía se define como la
// distancia entre lo esperado por contexto (baseline calibrado contra
// partidos históricos comparables) y lo ocurrido.
export type CoreDetectorId =
  | "zscore_multivariate"
  | "mahalanobis"
  | "pca"
  | "isolation_forest"
  | "one_class_svm"
  | "dbscan"
  | "change_point";

// Señales de dominio adicionales (evidencia complementaria, no reemplazan
// al motor estadístico): patrones documentados de amaño, movimiento de
// cuotas, integridad de datos (Benford) y un heurístico bayesiano.
export type DomainDetectorId = "patterns" | "odds_movement" | "benford" | "bayesian";

export type DetectorId = CoreDetectorId | DomainDetectorId;

export type DetectorResult = {
  detector: DetectorId;
  tier: "core" | "domain";
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

export type CompetitionInfo = {
  id: string;
  label: string;
  /** football-data.org competition code, e.g. "WC" for World Cup. */
  fdCode?: string;
  /** API-Football league id, e.g. 1 for World Cup. */
  afLeagueId?: number;
};

// A curated set of major competitions. Codes/ids per each provider's own
// docs (football-data.org: /v4/competitions, API-Football: /leagues).
export const COMPETITIONS: CompetitionInfo[] = [
  { id: "world_cup", label: "Copa del Mundo (FIFA World Cup)", fdCode: "WC", afLeagueId: 1 },
  { id: "euro", label: "Eurocopa (UEFA Euro)", fdCode: "EC", afLeagueId: 4 },
  { id: "copa_america", label: "Copa América", afLeagueId: 9 },
  { id: "champions_league", label: "Champions League", fdCode: "CL", afLeagueId: 2 },
  { id: "europa_league", label: "Europa League", afLeagueId: 3 },
  { id: "libertadores", label: "Copa Libertadores", fdCode: "CLI", afLeagueId: 13 },
  { id: "premier_league", label: "Premier League (Inglaterra)", fdCode: "PL", afLeagueId: 39 },
  { id: "la_liga", label: "La Liga (España)", fdCode: "PD", afLeagueId: 140 },
  { id: "serie_a", label: "Serie A (Italia)", fdCode: "SA", afLeagueId: 135 },
  { id: "bundesliga", label: "Bundesliga (Alemania)", fdCode: "BL1", afLeagueId: 78 },
  { id: "ligue_1", label: "Ligue 1 (Francia)", fdCode: "FL1", afLeagueId: 61 },
  { id: "brasileirao", label: "Brasileirão (Brasil)", fdCode: "BSA", afLeagueId: 71 },
  { id: "primera_argentina", label: "Liga Profesional (Argentina)", afLeagueId: 128 },
  { id: "mls", label: "MLS (Estados Unidos)", afLeagueId: 253 },
];

export function findCompetition(id?: string): CompetitionInfo | undefined {
  return id ? COMPETITIONS.find((c) => c.id === id) : undefined;
}

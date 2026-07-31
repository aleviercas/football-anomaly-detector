import type { MatchData } from "./detection/types";

export function rowToMatchData(matchRow: Record<string, unknown>): MatchData {
  const raw = (matchRow.raw ?? {}) as { events?: unknown[]; odds?: unknown; referee?: unknown };
  return {
    id: matchRow.id as string,
    provider: matchRow.provider as string,
    externalId: matchRow.external_id as string,
    league: (matchRow.league as string | null) ?? undefined,
    season: (matchRow.season as string | null) ?? undefined,
    matchDate: matchRow.match_date as string,
    homeTeam: matchRow.home_team as string,
    awayTeam: matchRow.away_team as string,
    homeScore: (matchRow.home_score as number) ?? 0,
    awayScore: (matchRow.away_score as number) ?? 0,
    htHomeScore: (matchRow.ht_home_score as number | null) ?? undefined,
    htAwayScore: (matchRow.ht_away_score as number | null) ?? undefined,
    status: (matchRow.status as string | null) ?? undefined,
    stats: (matchRow.stats ?? {}) as MatchData["stats"],
    events: (raw.events as MatchData["events"]) ?? [],
    odds: (raw.odds as MatchData["odds"]) ?? undefined,
    referee: (raw.referee as MatchData["referee"]) ?? undefined,
  };
}

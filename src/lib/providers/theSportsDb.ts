import type { MatchDataProvider, ProviderSearchResult } from "./types";
import type { MatchData } from "../detection/types";

// TheSportsDB free tier (no key needed, uses test key "3").
// Docs: https://www.thesportsdb.com/free_sports_api
const BASE = "https://www.thesportsdb.com/api/v1/json/3";

export function theSportsDbProvider(): MatchDataProvider {
  return {
    id: "thesportsdb",
    label: "TheSportsDB",
    isAvailable: () => true,
    async searchMatches(query) {
      if (query.text) {
        // Search team then last events
        const teamRes = await fetch(`${BASE}/searchteams.php?t=${encodeURIComponent(query.text)}`);
        if (!teamRes.ok) return [];
        const tj = await teamRes.json() as { teams?: { idTeam: string; strTeam: string; strSport?: string }[] };
        const team = (tj.teams ?? []).find((t) => t.strSport === "Soccer");
        if (!team) return [];
        const evRes = await fetch(`${BASE}/eventslast.php?id=${team.idTeam}`);
        if (!evRes.ok) return [];
        const ej = await evRes.json() as { results?: TSDBEvent[] };
        return (ej.results ?? []).map(mapEvent);
      }
      return [];
    },
    async getMatchDetail(externalId): Promise<Partial<MatchData> | null> {
      const res = await fetch(`${BASE}/lookupevent.php?id=${externalId}`);
      if (!res.ok) return null;
      const j = await res.json() as { events?: TSDBEvent[] };
      const e = j.events?.[0];
      if (!e) return null;
      return {
        provider: "thesportsdb",
        externalId: e.idEvent,
        league: e.strLeague,
        season: e.strSeason,
        matchDate: e.dateEvent + "T" + (e.strTime ?? "00:00:00") + "Z",
        homeTeam: e.strHomeTeam,
        awayTeam: e.strAwayTeam,
        homeScore: e.intHomeScore != null ? Number(e.intHomeScore) : 0,
        awayScore: e.intAwayScore != null ? Number(e.intAwayScore) : 0,
        stats: {},
        events: [],
      };
    },
  };
}

type TSDBEvent = {
  idEvent: string;
  strEvent?: string;
  strLeague?: string;
  strSeason?: string;
  dateEvent: string;
  strTime?: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore?: string;
  intAwayScore?: string;
};

function mapEvent(e: TSDBEvent): ProviderSearchResult {
  return {
    provider: "thesportsdb",
    externalId: e.idEvent,
    league: e.strLeague,
    matchDate: e.dateEvent + "T" + (e.strTime ?? "00:00:00") + "Z",
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    homeScore: e.intHomeScore != null ? Number(e.intHomeScore) : undefined,
    awayScore: e.intAwayScore != null ? Number(e.intAwayScore) : undefined,
    status: "FT",
  };
}

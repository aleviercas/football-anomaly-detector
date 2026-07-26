import type { MatchData } from "../detection/types";
import type { MatchDataProvider, ProviderSearchResult } from "./types";
import { markCoolDown } from "./types";

// Football-Data.org — free tier: ~10 requests/minute, only top competitions.
// Docs: https://www.football-data.org/documentation/quickstart
const BASE = "https://api.football-data.org/v4";

export function footballDataProvider(): MatchDataProvider {
  const key = process.env.FOOTBALL_DATA_TOKEN;
  const available = !!key;

  const headers = () => ({ "X-Auth-Token": key ?? "" });

  return {
    id: "football-data",
    label: "Football-Data.org",
    isAvailable: () => available,
    async searchMatches(query) {
      if (!available) return [];
      const params = new URLSearchParams();
      if (query.from) params.set("dateFrom", query.from.slice(0, 10));
      if (query.to) params.set("dateTo", query.to.slice(0, 10));
      const url = `${BASE}/matches?${params.toString()}`;
      const res = await fetch(url, { headers: headers() });
      if (res.status === 429) { markCoolDown("football-data"); return []; }
      if (!res.ok) return [];
      const json = await res.json() as { matches?: FDMatch[] };
      const matches = json.matches ?? [];
      const filtered = query.text
        ? matches.filter((m) =>
            (m.homeTeam?.name?.toLowerCase() ?? "").includes(query.text!.toLowerCase()) ||
            (m.awayTeam?.name?.toLowerCase() ?? "").includes(query.text!.toLowerCase()))
        : matches;
      return filtered.slice(0, 30).map<ProviderSearchResult>((m) => ({
        provider: "football-data",
        externalId: String(m.id),
        league: m.competition?.name,
        matchDate: m.utcDate,
        homeTeam: m.homeTeam?.name ?? "?",
        awayTeam: m.awayTeam?.name ?? "?",
        homeScore: m.score?.fullTime?.home ?? undefined,
        awayScore: m.score?.fullTime?.away ?? undefined,
        status: m.status,
      }));
    },
    async getMatchDetail(externalId) {
      if (!available) return null;
      const res = await fetch(`${BASE}/matches/${externalId}`, { headers: headers() });
      if (res.status === 429) { markCoolDown("football-data"); return null; }
      if (!res.ok) return null;
      const m = await res.json() as FDMatch;
      return {
        provider: "football-data",
        externalId: String(m.id),
        league: m.competition?.name,
        season: m.season?.startDate ? `${m.season.startDate.slice(0, 4)}` : undefined,
        matchDate: m.utcDate,
        homeTeam: m.homeTeam?.name ?? "?",
        awayTeam: m.awayTeam?.name ?? "?",
        homeScore: m.score?.fullTime?.home ?? 0,
        awayScore: m.score?.fullTime?.away ?? 0,
        htHomeScore: m.score?.halfTime?.home ?? undefined,
        htAwayScore: m.score?.halfTime?.away ?? undefined,
        status: m.status,
        stats: {},
        events: [],
        referee: m.referees?.[0]?.name ? { name: m.referees[0].name } : undefined,
      };
    },
  };
}

type FDMatch = {
  id: number;
  utcDate: string;
  status?: string;
  competition?: { name?: string };
  season?: { startDate?: string };
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  score?: {
    fullTime?: { home?: number; away?: number };
    halfTime?: { home?: number; away?: number };
  };
  referees?: { name?: string }[];
};

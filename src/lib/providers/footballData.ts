import type { MatchData } from "../detection/types";
import type { MatchDataProvider, ProviderSearchResult } from "./types";
import { markCoolDown } from "./types";
import { findCompetition } from "./competitions";

// Football-Data.org — free tier: ~10 requests/minute, only top competitions.
// Docs: https://www.football-data.org/documentation/quickstart
const BASE = "https://api.football-data.org/v4";

function mapMatch(m: FDMatch): ProviderSearchResult {
  return {
    provider: "football-data",
    externalId: String(m.id),
    league: m.competition?.name,
    matchDate: m.utcDate,
    homeTeam: m.homeTeam?.name ?? "?",
    awayTeam: m.awayTeam?.name ?? "?",
    homeScore: m.score?.fullTime?.home ?? undefined,
    awayScore: m.score?.fullTime?.away ?? undefined,
    status: m.status,
  };
}

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
      const textLower = query.text?.toLowerCase();
      const matchesTeamText = (m: FDMatch) =>
        !textLower ||
        (m.homeTeam?.name?.toLowerCase() ?? "").includes(textLower) ||
        (m.awayTeam?.name?.toLowerCase() ?? "").includes(textLower);

      // 1) Competition-scoped search (e.g. "World Cup" + season "2022") —
      // the reliable way to get a whole tournament's matches, since a
      // team's individual history endpoint may not go back far enough.
      const comp = findCompetition(query.competition);
      if (comp?.fdCode) {
        const params = new URLSearchParams({ status: "FINISHED" });
        if (query.season) params.set("season", query.season);
        const res = await fetch(`${BASE}/competitions/${comp.fdCode}/matches?${params}`, { headers: headers() });
        if (res.status === 429) { markCoolDown("football-data"); return []; }
        if (!res.ok) return [];
        const json = await res.json() as { matches?: FDMatch[] };
        return (json.matches ?? []).filter(matchesTeamText).slice(0, 40).map(mapMatch);
      }

      // 2) Team-scoped historical search — resolve the team, then pull its
      // finished matches directly (works for old matches, not just recent
      // ones, unlike the unscoped /v4/matches endpoint used below).
      if (query.text) {
        const teamRes = await fetch(`${BASE}/teams?name=${encodeURIComponent(query.text)}`, { headers: headers() });
        if (teamRes.status === 429) { markCoolDown("football-data"); return []; }
        if (teamRes.ok) {
          const tj = await teamRes.json() as { teams?: { id: number; name: string }[] };
          const team = tj.teams?.[0];
          if (team) {
            const params = new URLSearchParams({ status: "FINISHED", limit: "50" });
            if (query.from) params.set("dateFrom", query.from.slice(0, 10));
            if (query.to) params.set("dateTo", query.to.slice(0, 10));
            const mRes = await fetch(`${BASE}/teams/${team.id}/matches?${params}`, { headers: headers() });
            if (mRes.status === 429) { markCoolDown("football-data"); return []; }
            if (mRes.ok) {
              const mj = await mRes.json() as { matches?: FDMatch[] };
              return (mj.matches ?? []).slice(0, 40).map(mapMatch);
            }
          }
        }
      }

      // 3) Fallback: browse by date window across available competitions
      // (only useful when neither a team nor a competition was given).
      const params = new URLSearchParams();
      if (query.from) params.set("dateFrom", query.from.slice(0, 10));
      if (query.to) params.set("dateTo", query.to.slice(0, 10));
      const url = `${BASE}/matches?${params.toString()}`;
      const res = await fetch(url, { headers: headers() });
      if (res.status === 429) { markCoolDown("football-data"); return []; }
      if (!res.ok) return [];
      const json = await res.json() as { matches?: FDMatch[] };
      return (json.matches ?? []).filter(matchesTeamText).slice(0, 30).map(mapMatch);
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

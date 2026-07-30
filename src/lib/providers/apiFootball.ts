import type { MatchData, MatchEvent, OddsSnapshot } from "../detection/types";
import type { MatchDataProvider, ProviderSearchResult } from "./types";
import { markCoolDown } from "./types";
import { findCompetition } from "./competitions";

// API-Football via RapidAPI. Free plan: 100 requests / day.
// Docs: https://www.api-football.com/documentation-v3
const BASE = "https://v3.football.api-sports.io";

export function apiFootballProvider(): MatchDataProvider {
  const key = process.env.API_FOOTBALL_KEY;
  const available = !!key;
  const headers = () => ({ "x-apisports-key": key ?? "" });

  return {
    id: "api-football",
    label: "API-Football",
    isAvailable: () => available,
    async searchMatches(query) {
      if (!available) return [];
      const textLower = query.text?.toLowerCase();
      const matchesTeamText = (f: AFFixture) =>
        !textLower ||
        f.teams.home.name.toLowerCase().includes(textLower) ||
        f.teams.away.name.toLowerCase().includes(textLower);

      // 1) Competition-scoped search (e.g. "World Cup" + season "2022") —
      // the reliable way to pull a whole tournament, since a team's "last N
      // fixtures" is anchored to today and won't reach back that far.
      const comp = findCompetition(query.competition);
      if (comp?.afLeagueId) {
        const season = query.season || String(new Date().getFullYear());
        const res = await fetch(`${BASE}/fixtures?league=${comp.afLeagueId}&season=${season}`, { headers: headers() });
        if (res.status === 429) { markCoolDown("api-football"); return []; }
        if (!res.ok) return [];
        const j = await res.json() as { response?: AFFixture[] };
        return (j.response ?? []).filter(matchesTeamText).slice(0, 60).map(mapFixture);
      }

      // 2) Team-scoped search. With a season, pulls that whole season's
      // fixtures (reaches back further than "last N"); without one, falls
      // back to the team's most recent finished matches.
      if (query.text) {
        const teamRes = await fetch(`${BASE}/teams?search=${encodeURIComponent(query.text)}`, { headers: headers() });
        if (teamRes.status === 429) { markCoolDown("api-football"); return []; }
        if (!teamRes.ok) return [];
        const tj = await teamRes.json() as { response?: { team?: { id: number } }[] };
        const teamId = tj.response?.[0]?.team?.id;
        if (!teamId) return [];
        const fxUrl = query.season
          ? `${BASE}/fixtures?team=${teamId}&season=${query.season}`
          : `${BASE}/fixtures?team=${teamId}&last=50`;
        const fx = await fetch(fxUrl, { headers: headers() });
        if (fx.status === 429) { markCoolDown("api-football"); return []; }
        if (!fx.ok) return [];
        const fj = await fx.json() as { response?: AFFixture[] };
        return (fj.response ?? []).slice(0, 50).map(mapFixture);
      }

      // 3) Fallback: browse by date window (only when neither team nor
      // competition was given).
      const params = new URLSearchParams();
      if (query.from) params.set("from", query.from.slice(0, 10));
      if (query.to) params.set("to", query.to.slice(0, 10));
      if (![...params.keys()].length) return [];
      const res = await fetch(`${BASE}/fixtures?${params.toString()}`, { headers: headers() });
      if (res.status === 429) { markCoolDown("api-football"); return []; }
      if (!res.ok) return [];
      const j = await res.json() as { response?: AFFixture[] };
      return (j.response ?? []).slice(0, 30).map(mapFixture);
    },
    async getMatchDetail(externalId) {
      if (!available) return null;
      const [fxRes, statsRes, eventsRes, oddsRes] = await Promise.all([
        fetch(`${BASE}/fixtures?id=${externalId}`, { headers: headers() }),
        fetch(`${BASE}/fixtures/statistics?fixture=${externalId}`, { headers: headers() }),
        fetch(`${BASE}/fixtures/events?fixture=${externalId}`, { headers: headers() }),
        fetch(`${BASE}/odds?fixture=${externalId}`, { headers: headers() }),
      ]);
      if (fxRes.status === 429) { markCoolDown("api-football"); return null; }
      if (!fxRes.ok) return null;
      const fxJson = await fxRes.json() as { response?: AFFixture[] };
      const fx = fxJson.response?.[0];
      if (!fx) return null;
      const partial = mapFixtureFull(fx);
      if (statsRes.ok) {
        const sj = await statsRes.json() as { response?: AFStat[] };
        applyStats(partial, sj.response ?? [], fx);
      }
      if (eventsRes.ok) {
        const ej = await eventsRes.json() as { response?: AFEvent[] };
        partial.events = (ej.response ?? []).map(mapEvent(fx)).filter(Boolean) as MatchEvent[];
      }
      if (oddsRes.ok) {
        const oj = await oddsRes.json() as { response?: AFOdds[] };
        partial.odds = mapOdds(oj.response ?? []);
      }
      return partial;
    },
  };
}

type AFFixture = {
  fixture: { id: number; date: string; status?: { short?: string }; referee?: string };
  league?: { name?: string; season?: number };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals?: { home: number | null; away: number | null };
  score?: { halftime?: { home: number | null; away: number | null } };
};

type AFStat = { team: { id: number }; statistics: { type: string; value: number | string | null }[] };
type AFEvent = {
  time: { elapsed: number };
  team: { id: number };
  player?: { name?: string };
  type: string;
  detail?: string;
};
type AFOdds = { bookmakers?: { name: string; bets: { name: string; values: { value: string; odd: string }[] }[] }[] };

function mapFixture(f: AFFixture): ProviderSearchResult {
  return {
    provider: "api-football",
    externalId: String(f.fixture.id),
    league: f.league?.name,
    matchDate: f.fixture.date,
    homeTeam: f.teams.home.name,
    awayTeam: f.teams.away.name,
    homeScore: f.goals?.home ?? undefined,
    awayScore: f.goals?.away ?? undefined,
    status: f.fixture.status?.short,
  };
}

function mapFixtureFull(f: AFFixture): Partial<MatchData> {
  return {
    provider: "api-football",
    externalId: String(f.fixture.id),
    league: f.league?.name,
    season: f.league?.season ? String(f.league.season) : undefined,
    matchDate: f.fixture.date,
    homeTeam: f.teams.home.name,
    awayTeam: f.teams.away.name,
    homeScore: f.goals?.home ?? 0,
    awayScore: f.goals?.away ?? 0,
    htHomeScore: f.score?.halftime?.home ?? undefined,
    htAwayScore: f.score?.halftime?.away ?? undefined,
    status: f.fixture.status?.short,
    stats: {},
    events: [],
    referee: f.fixture.referee ? { name: f.fixture.referee } : undefined,
  };
}

function applyStats(match: Partial<MatchData>, stats: AFStat[], fx: AFFixture) {
  for (const s of stats) {
    const side = s.team.id === fx.teams.home.id ? "home" : "away";
    const bucket: Record<string, number | undefined> = {};
    for (const st of s.statistics) {
      const key = st.type.toLowerCase();
      const val = typeof st.value === "string" ? Number(st.value.replace("%", "")) : st.value;
      if (val == null || Number.isNaN(val)) continue;
      if (key.includes("shots on goal")) bucket.shots_on_target = val;
      else if (key === "total shots" || key === "shots total") bucket.shots = val;
      else if (key.includes("possession")) bucket.possession = val;
      else if (key.includes("corner")) bucket.corners = val;
      else if (key.includes("fouls")) bucket.fouls = val;
      else if (key.includes("yellow")) bucket.yellow_cards = val;
      else if (key.includes("red")) bucket.red_cards = val;
      else if (key.includes("offside")) bucket.offsides = val;
      else if (key.includes("expected_goals") || key === "expected goals") bucket.xg = val;
    }
    match.stats = { ...(match.stats ?? {}), [side]: bucket };
  }
}

const mapEvent = (fx: AFFixture) => (e: AFEvent): MatchEvent | null => {
  const side: "home" | "away" = e.team.id === fx.teams.home.id ? "home" : "away";
  let type: MatchEvent["type"] | null = null;
  const t = (e.type ?? "").toLowerCase();
  const d = (e.detail ?? "").toLowerCase();
  if (t === "goal") {
    if (d.includes("own")) type = "own_goal";
    else if (d.includes("penalty")) type = "penalty";
    else type = "goal";
  } else if (t === "card") {
    if (d.includes("red")) type = "red_card";
    else type = "yellow_card";
  } else if (t === "subst") type = "substitution";
  else if (t === "var") type = "var";
  if (!type) return null;
  return { minute: e.time.elapsed, type, team: side, player: e.player?.name, detail: e.detail };
};

function mapOdds(list: AFOdds[]): OddsSnapshot | undefined {
  if (list.length === 0) return undefined;
  // Take the first bookmaker with 1X2 + Over/Under
  for (const item of list) {
    for (const bm of item.bookmakers ?? []) {
      let home: number | undefined, draw: number | undefined, away: number | undefined;
      let over: number | undefined, under: number | undefined, line: number | undefined;
      for (const bet of bm.bets) {
        const name = bet.name.toLowerCase();
        if (name.includes("match winner") || name === "1x2") {
          for (const v of bet.values) {
            if (v.value === "Home") home = Number(v.odd);
            else if (v.value === "Draw") draw = Number(v.odd);
            else if (v.value === "Away") away = Number(v.odd);
          }
        } else if (name.includes("goals over/under")) {
          for (const v of bet.values) {
            const m = /^(Over|Under)\s+(\d+(?:\.\d+)?)$/.exec(v.value);
            if (!m) continue;
            const l = Number(m[2]);
            if (line == null || Math.abs(l - 2.5) < Math.abs(line - 2.5)) line = l;
            if (l === (line ?? 2.5)) {
              if (m[1] === "Over") over = Number(v.odd);
              else under = Number(v.odd);
            }
          }
        }
      }
      if (home && away) {
        return {
          bookmaker: bm.name,
          home_open: home, draw_open: draw, away_open: away,
          home_close: home, draw_close: draw, away_close: away,
          over_line: line, over_open: over, under_open: under,
          over_close: over, under_close: under,
        };
      }
    }
  }
  return undefined;
}

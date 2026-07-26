import type { MatchData } from "../detection/types";
import type { MatchDataProvider, ProviderSearchResult } from "./types";
import { footballDataProvider } from "./footballData";
import { apiFootballProvider } from "./apiFootball";
import { theSportsDbProvider } from "./theSportsDb";
import { inCoolDown } from "./types";

// Orchestrates provider fallback: iterates providers in order,
// merges partial data from multiple sources when possible.
function providers(): MatchDataProvider[] {
  return [apiFootballProvider(), footballDataProvider(), theSportsDbProvider()];
}

export function availableProviders() {
  return providers()
    .filter((p) => p.isAvailable() && !inCoolDown(p.id))
    .map((p) => ({ id: p.id, label: p.label }));
}

export async function chainSearch(query: {
  text?: string;
  league?: string;
  from?: string;
  to?: string;
}): Promise<ProviderSearchResult[]> {
  const seen = new Set<string>();
  const merged: ProviderSearchResult[] = [];
  for (const p of providers()) {
    if (!p.isAvailable() || inCoolDown(p.id)) continue;
    try {
      const results = await p.searchMatches(query);
      for (const r of results) {
        const key = `${r.homeTeam}|${r.awayTeam}|${r.matchDate.slice(0, 10)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(r);
      }
      if (merged.length >= 20) break;
    } catch (err) {
      console.warn(`[provider ${p.id}] search failed`, err);
    }
  }
  return merged;
}

// Get one match's detail, merging fields from as many providers as possible.
export async function chainDetail(
  provider: string,
  externalId: string,
  fallbackSearch?: { text?: string; matchDate?: string },
): Promise<{ match: Partial<MatchData>; providersUsed: string[] } | null> {
  const used: string[] = [];
  let merged: Partial<MatchData> | null = null;

  // 1) Primary source
  for (const p of providers()) {
    if (p.id !== provider || !p.isAvailable() || inCoolDown(p.id)) continue;
    try {
      const detail = await p.getMatchDetail(externalId);
      if (detail) { merged = detail; used.push(p.id); }
    } catch (err) { console.warn(`[${p.id}] detail failed`, err); }
    break;
  }

  // 2) Enrich with other providers (search by team+date)
  if (merged && fallbackSearch?.text) {
    for (const p of providers()) {
      if (used.includes(p.id) || !p.isAvailable() || inCoolDown(p.id)) continue;
      try {
        const list = await p.searchMatches({
          text: fallbackSearch.text,
          from: fallbackSearch.matchDate,
          to: fallbackSearch.matchDate,
        });
        const alt = list.find(
          (r) => (r.homeTeam === merged!.homeTeam || r.awayTeam === merged!.awayTeam) &&
            r.matchDate.slice(0, 10) === (merged!.matchDate ?? "").slice(0, 10),
        );
        if (alt) {
          const altDetail = await p.getMatchDetail(alt.externalId);
          if (altDetail) {
            merged = mergeMatch(merged, altDetail);
            used.push(p.id);
          }
        }
      } catch (err) { console.warn(`[${p.id}] enrich failed`, err); }
    }
  }

  if (!merged) return null;
  return { match: merged, providersUsed: used };
}

function mergeMatch(a: Partial<MatchData>, b: Partial<MatchData>): Partial<MatchData> {
  return {
    ...a,
    ...Object.fromEntries(Object.entries(b).filter(([, v]) => v != null)),
    stats: {
      home: { ...(a.stats?.home ?? {}), ...(b.stats?.home ?? {}) },
      away: { ...(a.stats?.away ?? {}), ...(b.stats?.away ?? {}) },
    },
    events: (a.events?.length ?? 0) >= (b.events?.length ?? 0) ? a.events : b.events,
    odds: a.odds ?? b.odds,
    referee: a.referee ?? b.referee,
  };
}

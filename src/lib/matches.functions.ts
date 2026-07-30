import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { chainDetail, chainSearch, availableProviders } from "./providers/chain";
import { runAnalysis } from "./detection/ensemble";
import type { MatchData } from "./detection/types";

const SearchInput = z.object({
  text: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const listProviders = createServerFn({ method: "GET" }).handler(async () => {
  const enabled = availableProviders();
  const knownKeys = ["FOOTBALL_DATA_TOKEN", "API_FOOTBALL_KEY"];
  const missingKeys = knownKeys.filter((k) => !process.env[k]);
  return { enabled, missingKeys };
});

export const searchMatches = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => SearchInput.parse(raw))
  .handler(async ({ data }) => {
    try {
      const results = await chainSearch(data);
      return { results, error: null as string | null };
    } catch (err) {
      console.error("[searchMatches]", err);
      return { results: [], error: err instanceof Error ? err.message : "search_failed" };
    }
  });

const AnalyzeInput = z.object({
  provider: z.string(),
  externalId: z.string(),
  teamHint: z.string().optional(),
  dateHint: z.string().optional(),
});

export const analyzeMatch = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => AnalyzeInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("@/integrations/supabase/client.server");
    const dbAvailable = isSupabaseConfigured();

    try {
      // 1) Try cache first (only if Supabase is set up)
      let matchRow: Record<string, unknown> | null = null;
      if (dbAvailable) {
        const cached = await supabaseAdmin
          .from("matches")
          .select("*")
          .eq("provider", data.provider)
          .eq("external_id", data.externalId)
          .maybeSingle();
        matchRow = cached.data;
      }

      let match: MatchData;

      if (!matchRow) {
        const detail = await chainDetail(data.provider, data.externalId, {
          text: data.teamHint,
          matchDate: data.dateHint,
        });
        if (!detail) {
          return { error: "match_not_found" as const, analysis: null, match: null };
        }
        const m = detail.match;

        if (dbAvailable) {
          const insert = await supabaseAdmin
            .from("matches")
            .insert({
              provider: m.provider ?? data.provider,
              external_id: m.externalId ?? data.externalId,
              league: m.league,
              season: m.season,
              match_date: m.matchDate!,
              home_team: m.homeTeam!,
              away_team: m.awayTeam!,
              home_score: m.homeScore ?? 0,
              away_score: m.awayScore ?? 0,
              ht_home_score: m.htHomeScore,
              ht_away_score: m.htAwayScore,
              status: m.status,
              stats: m.stats ?? {},
              raw: { events: m.events ?? [], odds: m.odds ?? null, referee: m.referee ?? null },
            })
            .select("*")
            .single();
          if (insert.error) {
            // Don't fail the whole analysis just because caching failed —
            // fall back to analyzing the freshly-fetched data directly.
            console.error("[analyzeMatch] insert (continuing without cache)", insert.error);
            matchRow = null;
          } else {
            matchRow = insert.data;
          }
        }

        if (!matchRow) {
          match = { ...m, id: m.id ?? `${data.provider}:${data.externalId}` } as MatchData;
        } else {
          match = rowToMatchData(matchRow);
        }
      } else {
        match = rowToMatchData(matchRow);
      }

      const analysis = runAnalysis(match);

      // Persist analysis (best-effort — never blocks returning the result)
      if (dbAvailable && match.id) {
        try {
          const persisted = await supabaseAdmin
            .from("analyses")
            .insert({
              match_id: match.id,
              overall_score: analysis.overallScore,
              verdict: analysis.verdict,
              confidence: analysis.confidence,
              evidences: analysis.evidences as never,
              data_completeness: analysis.dataCompleteness,
              providers_used: [match.provider],
            })
            .select("id")
            .single();

          if (!persisted.error && persisted.data?.id) {
            await supabaseAdmin.from("detector_scores").insert(
              analysis.perDetector.map((d) => ({
                analysis_id: persisted.data.id,
                detector: d.detector as string,
                score: d.score,
                weight: d.weight,
                reasons: d.reasons as never,
              })),
            );
          }
        } catch (persistErr) {
          console.error("[analyzeMatch] persist analysis (continuing)", persistErr);
        }
      }

      return { error: null, analysis, match };
    } catch (err) {
      console.error("[analyzeMatch]", err);
      return {
        error: err instanceof Error ? err.message : "analyze_failed",
        analysis: null,
        match: null,
      };
    }
  });

function rowToMatchData(matchRow: Record<string, unknown>): MatchData {
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

export const listRecentAnalyses = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin, isSupabaseConfigured } = await import("@/integrations/supabase/client.server");
  if (!isSupabaseConfigured()) return { results: [] as RecentAnalysis[], dbConfigured: false };
  try {
    const { data, error } = await supabaseAdmin
      .from("analyses")
      .select("id, overall_score, verdict, confidence, created_at, match_id, matches(home_team, away_team, league, match_date, home_score, away_score)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[listRecentAnalyses]", error);
      return { results: [] as RecentAnalysis[], dbConfigured: true };
    }
    return { results: (data ?? []) as unknown as RecentAnalysis[], dbConfigured: true };
  } catch (err) {
    console.error("[listRecentAnalyses]", err);
    return { results: [] as RecentAnalysis[], dbConfigured: true };
  }
});

export type RecentAnalysis = {
  id: string;
  overall_score: number;
  verdict: string;
  confidence: number;
  created_at: string;
  match_id: string;
  matches: {
    home_team: string;
    away_team: string;
    league: string | null;
    match_date: string;
    home_score: number | null;
    away_score: number | null;
  } | null;
};

const GetAnalysisInput = z.object({ id: z.string() });

export const getAnalysis = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => GetAnalysisInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("@/integrations/supabase/client.server");
    if (!isSupabaseConfigured()) return { analysis: null, detectorScores: [] };
    try {
      const [{ data: a }, { data: ds }] = await Promise.all([
        supabaseAdmin.from("analyses").select("*, matches(*)").eq("id", data.id).maybeSingle(),
        supabaseAdmin.from("detector_scores").select("*").eq("analysis_id", data.id),
      ]);
      if (!a) return { analysis: null, detectorScores: [] };
      return { analysis: a, detectorScores: ds ?? [] };
    } catch (err) {
      console.error("[getAnalysis]", err);
      return { analysis: null, detectorScores: [] };
    }
  });

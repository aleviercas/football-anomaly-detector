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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Try cache first
    const cached = await supabaseAdmin
      .from("matches")
      .select("*")
      .eq("provider", data.provider)
      .eq("external_id", data.externalId)
      .maybeSingle();

    let matchRow = cached.data;

    if (!matchRow) {
      const detail = await chainDetail(data.provider, data.externalId, {
        text: data.teamHint,
        matchDate: data.dateHint,
      });
      if (!detail) {
        return { error: "match_not_found" as const, analysis: null, match: null };
      }
      const m = detail.match;
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
        console.error("[analyzeMatch] insert", insert.error);
        return { error: "cache_write_failed" as const, analysis: null, match: null };
      }
      matchRow = insert.data;
    }

    const raw = (matchRow.raw ?? {}) as { events?: unknown[]; odds?: unknown; referee?: unknown };
    const match: MatchData = {
      id: matchRow.id,
      provider: matchRow.provider,
      externalId: matchRow.external_id,
      league: matchRow.league ?? undefined,
      season: matchRow.season ?? undefined,
      matchDate: matchRow.match_date,
      homeTeam: matchRow.home_team,
      awayTeam: matchRow.away_team,
      homeScore: matchRow.home_score ?? 0,
      awayScore: matchRow.away_score ?? 0,
      htHomeScore: matchRow.ht_home_score ?? undefined,
      htAwayScore: matchRow.ht_away_score ?? undefined,
      status: matchRow.status ?? undefined,
      stats: (matchRow.stats ?? {}) as MatchData["stats"],
      events: (raw.events as MatchData["events"]) ?? [],
      odds: (raw.odds as MatchData["odds"]) ?? undefined,
      referee: (raw.referee as MatchData["referee"]) ?? undefined,
    };

    const analysis = runAnalysis(match);

    // Persist analysis
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

    return { error: null, analysis, match };
  });

export const listRecentAnalyses = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("analyses")
    .select("id, overall_score, verdict, confidence, created_at, match_id, matches(home_team, away_team, league, match_date, home_score, away_score)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[listRecentAnalyses]", error);
    return { results: [] as RecentAnalysis[] };
  }
  return { results: (data ?? []) as unknown as RecentAnalysis[] };
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: a }, { data: ds }] = await Promise.all([
      supabaseAdmin.from("analyses").select("*, matches(*)").eq("id", data.id).maybeSingle(),
      supabaseAdmin.from("detector_scores").select("*").eq("analysis_id", data.id),
    ]);
    if (!a) return { analysis: null };
    return { analysis: a, detectorScores: ds ?? [] };
  });

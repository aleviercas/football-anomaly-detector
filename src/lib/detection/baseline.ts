import { extractFeatures, type FeatureVector } from "./features";
import type { MatchData } from "./types";
import { rowToMatchData } from "../matchRowMapper";

// Synthetic baseline distribution for a "normal" football match. Used until
// we have enough real cached matches for the same league/competition to
// calibrate against (see getCalibratedBaseline below). Values reflect
// approximate top-flight-league averages across all measurement categories:
// producción, posesión/pases, progresión, presión (PPDA), defensa y
// disciplina.
export function generateBaseline(size = 300, seed = 42): FeatureVector[] {
  const rand = mulberry32(seed);
  const out: FeatureVector[] = [];
  for (let i = 0; i < size; i++) {
    const totalGoals = Math.max(0, Math.round(gauss(rand, 2.7, 1.5)));
    const secondHalfGoals = Math.max(0, Math.min(totalGoals, Math.round(gauss(rand, totalGoals * 0.55, 1))));
    const lateGoals = Math.max(0, Math.round(gauss(rand, totalGoals * 0.25, 0.6)));
    const redCards = Math.max(0, Math.round(gauss(rand, 0.2, 0.5)));
    const earlyRed = rand() < 0.05 ? 1 : 0;
    // Producción
    const xgDiff = Math.abs(gauss(rand, 0.9, 0.6));
    const shots = Math.max(4, Math.round(gauss(rand, 24, 6)));
    const sot = Math.max(1, Math.round(gauss(rand, 8, 3)));
    const insideBoxRatio = Math.min(1, Math.max(0, gauss(rand, 0.55, 0.12)));
    // Posesión y pases
    const possGap = Math.abs(gauss(rand, 0, 12));
    const passAccGap = Math.abs(gauss(rand, 0, 6));
    const totalPasses = Math.max(150, gauss(rand, 820, 140));
    // Progresión
    const progressionGap = Math.abs(gauss(rand, 0, 0.15));
    // Presión / PPDA (típico 8-16; más alto = menos presión)
    const ppdaHome = Math.max(3, gauss(rand, 11, 3));
    const ppdaAway = Math.max(3, gauss(rand, 11, 3));
    // Disciplina
    const corners = Math.max(0, Math.round(gauss(rand, 10, 3)));
    const yellows = Math.max(0, Math.round(gauss(rand, 4, 1.5)));
    const fouls = Math.max(0, Math.round(gauss(rand, 22, 5)));
    // Defensa
    const savesGap = Math.abs(gauss(rand, 0, 2));
    // Cuotas
    const oddsMoveHome = gauss(rand, 0, 0.06);
    const oddsMoveAway = gauss(rand, 0, 0.06);
    const oddsMoveOver = gauss(rand, 0, 0.05);

    out.push([
      totalGoals, secondHalfGoals, lateGoals, redCards, earlyRed,
      xgDiff, shots, sot, insideBoxRatio,
      possGap, passAccGap, totalPasses,
      progressionGap,
      ppdaHome, ppdaAway,
      corners, yellows, fouls,
      savesGap,
      oddsMoveHome, oddsMoveAway, oddsMoveOver,
    ]);
  }
  return out;
}

export type BaselineResult = {
  vectors: FeatureVector[];
  source: "historical" | "synthetic";
  sampleSize: number;
};

const MIN_HISTORICAL_SAMPLE = 20;

/**
 * Calibra el baseline contra partidos históricos comparables (misma liga,
 * ya finalizados, excluyendo el propio partido) cuando hay suficientes
 * partidos cacheados en Supabase. Si todavía no los hay, cae al baseline
 * sintético. A medida que se analizan más partidos de una liga, el baseline
 * se vuelve automáticamente más real.
 */
export async function getCalibratedBaseline(match: MatchData): Promise<BaselineResult> {
  const synthetic = generateBaseline();
  try {
    const { supabaseAdmin, isSupabaseConfigured } = await import("../../integrations/supabase/client.server");
    if (!isSupabaseConfigured() || !match.league) {
      return { vectors: synthetic, source: "synthetic", sampleSize: synthetic.length };
    }
    const { data, error } = await supabaseAdmin
      .from("matches")
      .select("*")
      .eq("league", match.league)
      .not("home_score", "is", null)
      .neq("id", match.id ?? "")
      .order("match_date", { ascending: false })
      .limit(150);
    if (error || !data || data.length < MIN_HISTORICAL_SAMPLE) {
      return { vectors: synthetic, source: "synthetic", sampleSize: synthetic.length };
    }
    const historical = data.map((row: Record<string, unknown>) => extractFeatures(rowToMatchData(row)));
    // Blend: mostly real data, with a slice of synthetic to keep the
    // covariance well-conditioned while the historical sample is still small.
    const blended = historical.length >= 60 ? historical : [...historical, ...synthetic.slice(0, 60)];
    return { vectors: blended, source: "historical", sampleSize: historical.length };
  } catch (err) {
    console.error("[getCalibratedBaseline]", err);
    return { vectors: synthetic, source: "synthetic", sampleSize: synthetic.length };
  }
}

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number, mean: number, sd: number): number {
  // Box-Muller
  const u = Math.max(1e-9, rand());
  const v = rand();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * sd;
}

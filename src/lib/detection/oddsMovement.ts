import type { DetectorResult, MatchData } from "./types";

export function oddsMovementDetector(m: MatchData): DetectorResult {
  const o = m.odds;
  if (!o) {
    return {
      detector: "odds_movement",
      score: 0,
      reasons: ["Sin datos de cuotas disponibles"],
      weight: 0.6,
    };
  }
  const reasons: string[] = [];
  let score = 0;

  const track = (label: string, open?: number, close?: number, weight = 1) => {
    if (!open || !close) return;
    const mv = (close - open) / open;
    if (Math.abs(mv) > 0.08) {
      reasons.push(`${label}: ${open.toFixed(2)} → ${close.toFixed(2)} (${(mv * 100).toFixed(1)}%)`);
    }
    score += Math.min(1, Math.abs(mv) / 0.4) * weight;
  };

  track("Local 1X2", o.home_open, o.home_close, 1);
  track("Empate", o.draw_open, o.draw_close, 0.6);
  track("Visitante 1X2", o.away_open, o.away_close, 1);
  track("Over", o.over_open, o.over_close, 0.9);
  track("Under", o.under_open, o.under_close, 0.9);

  score = Math.min(1, score / 3);
  return { detector: "odds_movement", score, reasons, weight: 1.2 };
}

import type { DetectorResult, MatchData } from "./types";

// 7) Detector secuencial de cambio de nivel (CUSUM): convierte el partido en
// una serie temporal (eventos de impacto por minuto) y corre un algoritmo
// CUSUM (cumulative sum control chart) para detectar si en algún punto del
// partido la intensidad de eventos "cambia de régimen" de forma abrupta y
// sostenida — la firma clásica de un tramo del partido que se jugó distinto
// al resto (ej. de repente se abre el marcador de forma inusual).
function cusum(series: number[], targetMean: number, k: number, h: number): { changeAt: number; maxStat: number } {
  let sHigh = 0, sLow = 0;
  let maxStat = 0;
  let changeAt = -1;
  for (let t = 0; t < series.length; t++) {
    const x = series[t];
    sHigh = Math.max(0, sHigh + (x - targetMean - k));
    sLow = Math.max(0, sLow + (targetMean - x - k));
    const stat = Math.max(sHigh, sLow);
    if (stat > maxStat) { maxStat = stat; changeAt = t; }
    if (stat > h && changeAt === -1) changeAt = t;
  }
  return { changeAt, maxStat };
}

export function changePointDetector(m: MatchData): DetectorResult {
  const impact = m.events.filter((e) =>
    ["goal", "penalty", "own_goal", "red_card"].includes(e.type),
  );
  if (impact.length === 0) {
    return { detector: "change_point", tier: "core", score: 0, reasons: [], weight: 0.9 };
  }

  // Serie: eventos de impacto por bin de 5 minutos (0..90+).
  const bins = 19; // 0-5, 5-10, ..., 90-95
  const series = new Array(bins).fill(0);
  for (const e of impact) {
    const idx = Math.min(bins - 1, Math.floor(e.minute / 5));
    series[idx] += 1;
  }
  const meanRate = impact.length / bins;
  const { changeAt, maxStat } = cusum(series, meanRate, meanRate * 0.5 + 0.15, meanRate * 1.5 + 0.6);

  // Endgame concentration (siempre relevante en partidos de fútbol: es
  // donde más se reportan arreglos en la literatura pública) se suma como
  // refuerzo del mismo detector, no como uno aparte.
  const endgame = impact.filter((e) => e.minute >= 80).length;
  const endgameRatio = impact.length > 0 ? endgame / impact.length : 0;

  const rawScore = Math.min(1, maxStat / 3) * 0.7 + Math.min(1, endgameRatio * 1.8) * 0.3;
  const score = Math.min(1, rawScore);

  const reasons: string[] = [];
  if (changeAt >= 0 && maxStat > 1) {
    reasons.push(`Cambio de régimen detectado (CUSUM) alrededor del minuto ${changeAt * 5}-${changeAt * 5 + 5}: la intensidad de eventos decisivos se dispara de forma sostenida respecto al resto del partido.`);
  }
  if (endgame >= 3) {
    reasons.push(`${endgame} eventos decisivos concentrados en los últimos 10 minutos.`);
  }

  return { detector: "change_point", tier: "core", score, reasons, weight: 1 };
}

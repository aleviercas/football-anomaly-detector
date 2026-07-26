import type { DetectorResult, MatchData } from "./types";

// Temporal event clustering — detect abnormal densities of high-impact
// events in short time windows.
export function temporalDetector(m: MatchData): DetectorResult {
  const impact = m.events.filter((e) =>
    ["goal", "penalty", "own_goal", "red_card"].includes(e.type),
  );
  if (impact.length === 0) {
    return { detector: "temporal", score: 0, reasons: [], weight: 0.9 };
  }
  const reasons: string[] = [];
  let maxDensity = 0;
  // sliding 10-minute window
  for (let start = 0; start <= 90; start += 5) {
    const end = start + 10;
    const cnt = impact.filter((e) => e.minute >= start && e.minute < end).length;
    if (cnt >= 3) {
      reasons.push(`${cnt} eventos decisivos entre el minuto ${start} y ${end}`);
    }
    if (cnt > maxDensity) maxDensity = cnt;
  }
  // final 10 minutes — highest weight
  const endgame = impact.filter((e) => e.minute >= 80).length;
  if (endgame >= 3) reasons.push(`${endgame} eventos decisivos en los últimos 10 minutos`);

  const raw = maxDensity / 4 + endgame / 5;
  const score = Math.min(1, raw);
  return { detector: "temporal", score, reasons, weight: 1 };
}

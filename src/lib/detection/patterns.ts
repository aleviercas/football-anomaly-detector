import type { DetectorResult, MatchData } from "./types";

// Rule-based known match-fixing patterns.
export function patternsDetector(m: MatchData): DetectorResult {
  const reasons: string[] = [];
  let hits = 0;

  const goals = m.events.filter(
    (e) => e.type === "goal" || e.type === "penalty" || e.type === "own_goal",
  );
  const total = m.homeScore + m.awayScore;
  const late = goals.filter((g) => g.minute >= 80).length;
  const veryLate = goals.filter((g) => g.minute >= 88).length;
  const reds = m.events.filter((e) => e.type === "red_card");

  // Pattern 1 — Late goal that exactly hits over line
  if (m.odds?.over_line && veryLate >= 1) {
    const line = m.odds.over_line;
    if (total === Math.ceil(line)) {
      reasons.push(`Gol en el descuento ajusta exactamente a la línea Over ${line}`);
      hits += 2;
    }
  }

  // Pattern 2 — Odds moved heavily against pre-game favorite in the last hours
  if (m.odds?.home_open && m.odds.home_close) {
    const mv = (m.odds.home_close - m.odds.home_open) / m.odds.home_open;
    if (m.odds.home_open < 1.8 && mv > 0.2) {
      reasons.push(`Favorito local movió +${(mv * 100).toFixed(0)}% contra pronóstico`);
      hits += 2;
    }
  }
  if (m.odds?.away_open && m.odds.away_close) {
    const mv = (m.odds.away_close - m.odds.away_open) / m.odds.away_open;
    if (m.odds.away_open < 1.8 && mv > 0.2) {
      reasons.push(`Favorito visitante movió +${(mv * 100).toFixed(0)}% contra pronóstico`);
      hits += 2;
    }
  }

  // Pattern 3 — Early red card + team down concedes multiple lates
  if (reds.some((r) => r.minute <= 30)) {
    if (late >= 2) {
      reasons.push("Roja temprana seguida de múltiples goles tardíos");
      hits += 2;
    } else {
      reasons.push("Roja muy temprana");
      hits += 1;
    }
  }

  // Pattern 4 — Comeback improbable (2+ goal deficit at HT reverted)
  if (m.htHomeScore != null && m.htAwayScore != null) {
    const htDiff = m.htHomeScore - m.htAwayScore;
    const ftDiff = m.homeScore - m.awayScore;
    if ((htDiff <= -2 && ftDiff >= 1) || (htDiff >= 2 && ftDiff <= -1)) {
      reasons.push(`Remontada improbable (HT ${m.htHomeScore}-${m.htAwayScore} → FT ${m.homeScore}-${m.awayScore})`);
      hits += 3;
    }
  }

  // Pattern 5 — Own goal or penalty at the end that flips result
  const flipEvents = goals.filter((g) => g.minute >= 85 && (g as any).type !== "goal");
  if (flipEvents.length > 0) {
    reasons.push("Autogol/penal en el tramo final del partido");
    hits += 1;
  }

  // Pattern 6 — More than one red card
  if (reds.length >= 2) {
    reasons.push(`${reds.length} tarjetas rojas en el partido`);
    hits += 1;
  }

  const score = Math.min(1, hits / 6);
  return { detector: "patterns", score, reasons, weight: 1.4 };
}

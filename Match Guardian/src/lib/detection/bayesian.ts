import type { DetectorResult, MatchData } from "./types";

// Naive Bayes over discrete evidence signals.
// P(fix | evidences) = P(fix) * Π P(e | fix) / P(e)
// We use approximate likelihood ratios calibrated to public match-fixing research
// (UEFA/Sportradar reports) — this is a heuristic, not a formal estimate.

type Signal = { name: string; present: boolean; lr: number }; // lr = P(e|fix)/P(e|clean)

export function bayesianDetector(m: MatchData): DetectorResult {
  const prior = 0.005; // base rate ~ 0.5% (varies by league)
  const signals: Signal[] = [];

  // 1. Late tie-breaking goal that also matches over/under line
  const totalGoals = m.homeScore + m.awayScore;
  const lateGoal = m.events.find(
    (e) => (e.type === "goal" || e.type === "penalty") && e.minute >= 85,
  );
  if (lateGoal && m.odds?.over_line && totalGoals === Math.ceil(m.odds.over_line)) {
    signals.push({ name: "Gol tardío que cruza la línea over/under", present: true, lr: 6 });
  }

  // 2. Big odds movement against pre-game favorite
  if (m.odds?.home_open && m.odds.home_close) {
    const mv = (m.odds.home_close - m.odds.home_open) / m.odds.home_open;
    if (Math.abs(mv) > 0.25)
      signals.push({ name: `Movimiento de cuota local ${(mv * 100).toFixed(0)}%`, present: true, lr: 4 });
  }
  if (m.odds?.away_open && m.odds.away_close) {
    const mv = (m.odds.away_close - m.odds.away_open) / m.odds.away_open;
    if (Math.abs(mv) > 0.25)
      signals.push({ name: `Movimiento de cuota visitante ${(mv * 100).toFixed(0)}%`, present: true, lr: 4 });
  }

  // 3. Over line drift
  if (m.odds?.over_open && m.odds.over_close) {
    const mv = (m.odds.over_close - m.odds.over_open) / m.odds.over_open;
    if (Math.abs(mv) > 0.2)
      signals.push({ name: `Movimiento línea over ${(mv * 100).toFixed(0)}%`, present: true, lr: 3 });
  }

  // 4. Early red card
  if (m.events.some((e) => e.type === "red_card" && e.minute <= 25))
    signals.push({ name: "Roja muy temprana", present: true, lr: 2.5 });

  // 5. Own goal in last 15 minutes
  if (m.events.some((e) => e.type === "own_goal" && e.minute >= 75))
    signals.push({ name: "Autogol en el último tramo", present: true, lr: 5 });

  // 6. Penalty in last 10 minutes when total goals matches handicap
  if (m.events.some((e) => e.type === "penalty" && e.minute >= 80))
    signals.push({ name: "Penal en el descuento", present: true, lr: 2.5 });

  // 7. xG vs actual goals divergence
  const home = m.stats.home ?? {};
  const away = m.stats.away ?? {};
  const xgDiff = Math.abs((home.xg ?? m.homeScore) - m.homeScore) +
    Math.abs((away.xg ?? m.awayScore) - m.awayScore);
  if (xgDiff > 2.5)
    signals.push({ name: `Divergencia xG vs goles alta (${xgDiff.toFixed(1)})`, present: true, lr: 2 });

  // 8. Very high yellow-card total (referee) or unusually low
  const totalYellow = (home.yellow_cards ?? 0) + (away.yellow_cards ?? 0);
  if (totalYellow >= 9)
    signals.push({ name: `Cartulinas anómalas (${totalYellow})`, present: true, lr: 1.7 });

  // Combine likelihood ratios
  let posterior = prior;
  for (const s of signals) {
    const odds = posterior / (1 - posterior);
    const newOdds = odds * s.lr;
    posterior = newOdds / (1 + newOdds);
  }

  const reasons = signals.map((s) => `${s.name} (LR≈${s.lr})`);
  // Rescale so a posterior of 0.5 maps to ~0.8 (very meaningful in Bayes with tiny prior)
  const score = Math.min(1, posterior * 4);
  return { detector: "bayesian", score, reasons, weight: 1.3 };
}

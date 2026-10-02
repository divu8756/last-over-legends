import { chooseDelivery } from "./bowler";
import { applyBall, ballsLeft, need, type MatchState } from "./match";
import { resolveShot } from "./outcomes";
import { mulberry32, pick, weighted, type Rng } from "./rng";
import type { Timing, Zone } from "./types";

/** Contact quality of an average player. */
const AVERAGE_SKILL: Record<Timing, number> = { perfect: 15, good: 35, early: 17, late: 17, miss: 16 };
const ZONES: Zone[] = ["off", "straight", "leg"];

function playOut(rng: Rng, start: MatchState): MatchState {
  let s = start;
  while (s.status === "playing") {
    const d = chooseDelivery(rng, s.config.difficulty, { need: need(s), ballsLeft: ballsLeft(s) });
    const rate = need(s) / Math.max(1, ballsLeft(s));
    const lofted = rng() < (rate > 1.5 ? 0.75 : 0.3);
    const o = resolveShot(rng, {
      timing: weighted(rng, AVERAGE_SKILL),
      shot: { zone: pick(rng, ZONES), lofted },
      delivery: d,
      hotStreak: s.hot,
    });
    s = applyBall(s, d, o);
  }
  return s;
}

/** Chance (0–1) that the batting side wins from here; a tie counts half. */
export function winProbability(state: MatchState, sims = 300, seed?: number): number {
  if (state.status === "won") return 1;
  if (state.status === "lost") return 0;
  if (state.status === "tied") return 0.5;
  const rng = mulberry32(seed ?? state.runs * 7919 + state.balls * 104729 + state.wickets * 31 + state.config.seed);
  let score = 0;
  for (let i = 0; i < sims; i++) {
    const end = playOut(rng, state);
    if (end.status === "won") score += 1;
    else if (end.status === "tied") score += 0.5;
  }
  return score / sims;
}

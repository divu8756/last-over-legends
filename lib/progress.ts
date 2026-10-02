import type { MatchState } from "@/game/engine/match";
import { istDate } from "@/game/engine/match";
import { ACHIEVEMENTS, JERSEYS } from "@/data/achievements";
import type { Profile } from "./storage";

export interface MatchSummary {
  sixes: number;
  fours: number;
  dots: number;
  ballsFaced: number;
  dropped: boolean;
  hotStreak: boolean;
  lastBallWin: boolean;
}

export function summarise(m: MatchState): MatchSummary {
  const legal = m.history.filter((h) => h.outcome.legal);
  const last = m.history[m.history.length - 1];
  return {
    sixes: m.history.filter((h) => h.outcome.boundary === 6).length,
    fours: m.history.filter((h) => h.outcome.boundary === 4).length,
    dots: legal.filter((h) => h.outcome.runs === 0 && !h.outcome.wicket).length,
    ballsFaced: legal.length,
    dropped: m.history.some((h) => h.outcome.dropped),
    hotStreak: hadHotStreak(m),
    lastBallWin: m.status === "won" && m.balls === m.config.balls && !!last?.outcome.legal,
  };
}

function hadHotStreak(m: MatchState) {
  let run = 0;
  for (const h of m.history) {
    const t = h.outcome.timing;
    if ((t === "perfect" || t === "good") && !h.outcome.wicket) {
      run += 1;
      if (run >= 3) return true;
    } else if (h.outcome.extra !== "wide") run = 0;
  }
  return false;
}

/** Record a finished match. Returns the new profile and newly unlocked achievement ids. */
export function recordMatch(p: Profile, m: MatchState): { profile: Profile; unlocked: string[] } {
  const s = summarise(m);
  const won = m.status === "won";
  const next: Profile = {
    ...p,
    matches: p.matches + 1,
    wins: p.wins + (won ? 1 : 0),
    sixes: p.sixes + s.sixes,
    fours: p.fours + s.fours,
    bestChase: won ? Math.max(p.bestChase, m.config.target) : p.bestChase,
    achievements: [...p.achievements],
    daily: { ...p.daily },
  };
  if (m.config.mode === "daily") {
    const date = istDate();
    if (!next.daily[date]) next.daily[date] = { won, runs: m.runs, target: m.config.target };
  }
  const earned: Record<string, boolean> = {
    "first-six": s.sixes > 0,
    "first-win": won,
    "last-ball": s.lastBallWin,
    "three-sixes": s.sixes >= 3,
    international: won && m.config.difficulty === "international",
    "death-overs": won && m.config.mode === "death-overs",
    daily: won && m.config.mode === "daily",
    "hot-streak": s.hotStreak,
    survivor: won && s.dropped,
    tie: m.status === "tied",
  };
  const unlocked = ACHIEVEMENTS.map((a) => a.id).filter((id) => earned[id] && !next.achievements.includes(id));
  next.achievements.push(...unlocked);
  return { profile: next, unlocked };
}

export function availableJerseys(p: Profile) {
  return JERSEYS.filter((j) => p.achievements.length >= j.need);
}

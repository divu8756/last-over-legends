import { type Rng, hashSeed, mulberry32, pick, randInt, randomSeed } from "./rng";
import type { Delivery, Difficulty, Mode, Outcome } from "./types";
import { TEAMS, type Team } from "@/data/teams";

export interface MatchConfig {
  mode: Mode;
  difficulty: Difficulty;
  /** runs required to win */
  target: number;
  balls: number;
  wickets: number;
  team: Team;
  opponent: Team;
  seed: number;
  label: string;
}

export interface BallRecord {
  delivery: Delivery;
  outcome: Outcome;
  batter: string;
  /** label for the ball-by-ball strip */
  mark: string;
}

export type Status = "playing" | "won" | "lost" | "tied";

export interface MatchState {
  config: MatchConfig;
  runs: number;
  balls: number;
  wickets: number;
  striker: number;
  nonStriker: number;
  nextIn: number;
  history: BallRecord[];
  streak: number;
  hot: boolean;
  status: Status;
}

export const DEATH_OVERS: Record<Difficulty, { target: number; wickets: number }> = {
  gully: { target: 30, wickets: 5 },
  club: { target: 38, wickets: 4 },
  international: { target: 45, wickets: 3 },
};

/** Today's date in IST as YYYY-MM-DD. */
export function istDate(now = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 10);
}

export function createConfig(
  mode: Mode,
  difficulty: Difficulty,
  opts: { teamId?: string; seed?: number; date?: string } = {},
): MatchConfig {
  if (mode === "daily") {
    const date = opts.date ?? istDate();
    const seed = hashSeed(`lol-daily-${date}`);
    const rng = mulberry32(seed);
    const team = pick(rng, TEAMS);
    const opponent = pick(rng, TEAMS.filter((t) => t.id !== team.id));
    return {
      mode,
      difficulty: "club",
      target: randInt(rng, 16, 24),
      balls: 6,
      wickets: 2,
      team,
      opponent,
      seed,
      label: `Daily Challenge · ${date}`,
    };
  }
  const seed = opts.seed ?? randomSeed();
  const rng = mulberry32(seed);
  const team = TEAMS.find((t) => t.id === opts.teamId) ?? pick(rng, TEAMS);
  const opponent = pick(rng, TEAMS.filter((t) => t.id !== team.id));
  if (mode === "super-over") {
    return { mode, difficulty, target: randInt(rng, 14, 24), balls: 6, wickets: 2, team, opponent, seed, label: "Super Over" };
  }
  const d = DEATH_OVERS[difficulty];
  return { mode, difficulty, target: d.target, balls: 18, wickets: d.wickets, team, opponent, seed, label: "Death Overs" };
}

export function newMatch(config: MatchConfig): MatchState {
  return {
    config,
    runs: 0,
    balls: 0,
    wickets: 0,
    striker: 0,
    nonStriker: 1,
    nextIn: 2,
    history: [],
    streak: 0,
    hot: false,
    status: "playing",
  };
}

/** Separate streams so the daily ball sequence is identical for everyone. */
export function matchRngs(config: MatchConfig): { bowler: Rng; play: Rng } {
  return { bowler: mulberry32(config.seed ^ 0x5eed0b0b), play: mulberry32(config.seed ^ 0x0c0ffee) };
}

export const need = (s: MatchState) => Math.max(0, s.config.target - s.runs);
export const ballsLeft = (s: MatchState) => s.config.balls - s.balls;
export const strikerName = (s: MatchState) => s.config.team.batters[s.striker % s.config.team.batters.length];

export function markFor(o: Outcome): string {
  if (o.extra === "wide") return "Wd";
  const base = o.wicket ? "W" : o.runs === 0 ? "•" : String(o.runs - o.extras);
  return o.extra === "noball" ? `Nb${base === "•" ? "" : "+" + base}` : base;
}

/** Apply a resolved delivery to the match. Pure: returns a new state. */
export function applyBall(prev: MatchState, delivery: Delivery, raw: Outcome): MatchState {
  const s: MatchState = { ...prev, history: [...prev.history] };
  const o: Outcome = { ...raw, extra: delivery.extra };

  if (delivery.extra === "wide") {
    o.runs = 1;
    o.extras = 1;
    o.legal = false;
    o.wicket = null;
  } else if (delivery.extra === "noball") {
    o.legal = false;
    o.extras = 1;
    o.wicket = null; // can't be bowled, lbw or caught off a no-ball
    o.runs = o.runs + 1;
  }

  const batter = strikerName(s);
  s.runs += o.runs;
  if (o.legal) s.balls += 1;

  // hot streak: three Good-or-better contacts in a row
  const good = o.timing === "perfect" || o.timing === "good";
  if (delivery.extra !== "wide") {
    if (good && !o.wicket) {
      if (prev.hot && o.timing === "perfect") {
        // boost spent on this shot
        s.hot = false;
        s.streak = 0;
      } else {
        s.streak += 1;
        if (s.streak >= 3) s.hot = true;
      }
    } else if (o.timing === "miss" || o.timing === "leave" || o.wicket) {
      s.streak = 0;
      s.hot = false;
    } else {
      s.streak = 0;
    }
  }

  if (o.wicket) {
    s.wickets += 1;
    s.striker = s.nextIn;
    s.nextIn += 1;
  } else {
    const ran = o.runs - o.extras;
    if (ran % 2 === 1 && !o.boundary) [s.striker, s.nonStriker] = [s.nonStriker, s.striker];
  }
  // change of ends at the end of an over
  if (o.legal && s.balls % 6 === 0 && s.balls < s.config.balls) {
    [s.striker, s.nonStriker] = [s.nonStriker, s.striker];
  }

  s.history.push({ delivery, outcome: o, batter, mark: markFor(o) });

  if (s.runs >= s.config.target) s.status = "won";
  else if (s.wickets >= s.config.wickets) s.status = "lost";
  else if (s.balls >= s.config.balls) s.status = s.runs === s.config.target - 1 ? "tied" : "lost";
  return s;
}

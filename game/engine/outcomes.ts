import { type Rng, weighted } from "./rng";
import type { Delivery, HowOut, Line, Outcome, Shot, Timing, Zone } from "./types";

type GroundKey = "dot" | "one" | "twoThree" | "four" | "six" | "edge" | "out";
type LoftKey = "dot" | "oneTwo" | "four" | "six" | "caught" | "out";

export const GROUND: Record<Timing, Record<GroundKey, number>> = {
  perfect: { dot: 0, one: 10, twoThree: 25, four: 58, six: 7, edge: 0, out: 0 },
  good: { dot: 8, one: 25, twoThree: 32, four: 32, six: 0, edge: 3, out: 0 },
  early: { dot: 30, one: 30, twoThree: 15, four: 5, six: 0, edge: 20, out: 0 },
  late: { dot: 35, one: 20, twoThree: 10, four: 5, six: 0, edge: 22, out: 8 },
  miss: { dot: 55, one: 0, twoThree: 0, four: 0, six: 0, edge: 5, out: 40 },
};

export const LOFTED: Record<Timing, Record<LoftKey, number>> = {
  perfect: { dot: 0, oneTwo: 0, four: 18, six: 75, caught: 7, out: 0 },
  good: { dot: 0, oneTwo: 12, four: 28, six: 38, caught: 22, out: 0 },
  early: { dot: 10, oneTwo: 25, four: 15, six: 8, caught: 42, out: 0 },
  late: { dot: 15, oneTwo: 20, four: 10, six: 5, caught: 40, out: 10 },
  miss: { dot: 40, oneTwo: 0, four: 0, six: 0, caught: 5, out: 55 },
};

export const DROP_CHANCE = 0.06;
export const SAVE_CHANCE = 0.04;

export interface ShotInput {
  timing: Timing | "leave";
  shot: Shot | null;
  delivery: Delivery;
  /** batter is on a hot streak: next perfect contact gets a boost */
  hotStreak: boolean;
}

export type LineMatch = "with" | "against" | "neutral";

export function lineMatch(zone: Zone, line: Line): LineMatch {
  if ((zone === "off" && line === "off") || (zone === "leg" && line === "leg") || (zone === "straight" && line === "middle")) {
    return "with";
  }
  if ((zone === "leg" && line === "off") || (zone === "off" && line === "leg")) return "against";
  return "neutral";
}

/** Playing across the line: working a ball on off/middle to the leg side. */
function acrossTheLine(zone: Zone, line: Line) {
  return zone === "leg" && line !== "leg";
}

/** Move up to `pts` weight from the scoring keys (largest first) to `to`. */
function shift<K extends string>(t: Record<K, number>, from: K[], to: K, pts: number) {
  let left = pts;
  const order = [...from].sort((a, b) => t[b] - t[a]);
  for (const k of order) {
    if (left <= 0) break;
    const take = Math.min(t[k], left);
    t[k] -= take;
    left -= take;
  }
  t[to] += pts - left;
}

export function groundTable(timing: Timing, shot: Shot, d: Delivery, hot: boolean) {
  const t = { ...GROUND[timing] };
  if (d.type === "yorker" && timing === "miss") t.out *= 1.5;
  if (d.type === "bouncer") {
    if (shot.zone === "off") t.edge += 10;
    // a bouncer goes over the stumps
    t.dot += t.out;
    t.out = 0;
  }
  if (d.type === "fulltoss" && timing !== "miss") t.six += 4;
  if (d.type === "swing") {
    if (shot.zone === "off") t.edge += 10;
    if (acrossTheLine(shot.zone, d.line)) t.out += 10;
  }
  if (timing !== "miss") {
    const m = lineMatch(shot.zone, d.line);
    if (m === "with") {
      const scoring = t.four + t.six;
      if (scoring > 0) {
        t.four += (8 * t.four) / scoring;
        t.six += (8 * t.six) / scoring;
      } else t.four += 8;
    } else if (m === "against") {
      shift(t, ["four", "twoThree", "one", "six"], acrossTheLine(shot.zone, d.line) ? "out" : "edge", 8);
    }
  }
  if (hot && timing === "perfect") t.six += 10;
  return t;
}

export function loftedTable(timing: Timing, shot: Shot, d: Delivery, hot: boolean) {
  // a lofted yorker can at best be a Good contact
  const eff: Timing = d.type === "yorker" && timing === "perfect" ? "good" : timing;
  const t = { ...LOFTED[eff] };
  if (d.type === "yorker" && eff === "miss") t.out *= 1.5;
  if (d.type === "bouncer") {
    if (shot.zone === "leg") t.six += 15;
    t.dot += t.out;
    t.out = 0;
  }
  if (d.type === "fulltoss" && eff !== "miss") t.six += 10;
  if (d.type === "swing" && acrossTheLine(shot.zone, d.line)) t.out += 10;
  if (eff !== "miss") {
    const m = lineMatch(shot.zone, d.line);
    if (m === "with") {
      const scoring = t.four + t.six;
      if (scoring > 0) {
        t.four += (8 * t.four) / scoring;
        t.six += (8 * t.six) / scoring;
      }
    } else if (m === "against") {
      shift(t, ["six", "four", "oneTwo"], acrossTheLine(shot.zone, d.line) ? "out" : "caught", 8);
    }
  }
  if (hot && eff === "perfect") t.six += 10;
  return t;
}

function blank(d: Delivery, timing: Outcome["timing"]): Outcome {
  return {
    runs: 0,
    extras: 0,
    boundary: 0,
    wicket: null,
    edge: false,
    dropped: false,
    save: false,
    legal: true,
    extra: "none",
    timing,
    slowmo: false,
  };
}

function bowledOrLbw(rng: Rng, shot: Shot | null, d: Delivery): HowOut {
  if (d.type === "yorker") return rng() < 0.65 ? "bowled" : "lbw";
  if (shot && acrossTheLine(shot.zone, d.line)) return rng() < 0.65 ? "lbw" : "bowled";
  return rng() < 0.55 ? "bowled" : "lbw";
}

/** Apply drop / stunning-save randomness to a caught or boundary result. */
function fielding(rng: Rng, o: Outcome): Outcome {
  if (o.wicket === "caught" || o.wicket === "caught-behind") {
    if (rng() < DROP_CHANCE) {
      o.runs = o.wicket === "caught-behind" ? 0 : 1;
      o.wicket = null;
      o.dropped = true;
    }
  } else if (o.boundary && rng() < SAVE_CHANCE) {
    o.save = true;
    o.boundary = 0;
    if (rng() < 0.5) {
      o.wicket = "caught";
      o.runs = 0;
    } else o.runs = 1;
  }
  return o;
}

function resolveEdge(rng: Rng, o: Outcome): Outcome {
  o.edge = true;
  const r = rng();
  if (r < 0.4) o.wicket = "caught-behind";
  else if (r < 0.55) {
    o.runs = 4;
    o.boundary = 4;
  } else o.runs = rng() < 0.6 ? 1 : 2;
  return o;
}

/** Resolve the batting part of a delivery (extras are applied by the match). */
export function resolveShot(rng: Rng, input: ShotInput): Outcome {
  const { delivery: d, shot, timing, hotStreak } = input;
  const o = blank(d, timing);

  if (d.extra === "wide") return o;

  if (timing === "leave" || !shot) {
    const onStumps = d.line === "middle" || (d.line === "off" && d.type === "swing");
    if (onStumps && d.type !== "bouncer") {
      const p = d.type === "yorker" ? 0.55 : 0.35;
      if (rng() < p) o.wicket = rng() < 0.6 ? "bowled" : "lbw";
    }
    return o;
  }

  o.slowmo = hotStreak && timing === "perfect";

  if (!shot.lofted) {
    const k = weighted(rng, groundTable(timing, shot, d, hotStreak));
    switch (k) {
      case "dot":
        break;
      case "one":
        o.runs = 1;
        break;
      case "twoThree":
        o.runs = rng() < 0.75 ? 2 : 3;
        break;
      case "four":
        o.runs = 4;
        o.boundary = 4;
        break;
      case "six":
        o.runs = 6;
        o.boundary = 6;
        break;
      case "edge":
        resolveEdge(rng, o);
        break;
      case "out":
        o.wicket = bowledOrLbw(rng, shot, d);
        break;
    }
  } else {
    const k = weighted(rng, loftedTable(timing, shot, d, hotStreak));
    switch (k) {
      case "dot":
        break;
      case "oneTwo":
        o.runs = rng() < 0.6 ? 1 : 2;
        break;
      case "four":
        o.runs = 4;
        o.boundary = 4;
        break;
      case "six":
        o.runs = 6;
        o.boundary = 6;
        break;
      case "caught":
        o.wicket = "caught";
        break;
      case "out":
        o.wicket = bowledOrLbw(rng, shot, d);
        break;
    }
  }
  if (o.wicket) o.runs = 0;
  return fielding(rng, o);
}

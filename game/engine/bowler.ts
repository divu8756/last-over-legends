import { type Rng, randInt, weighted } from "./rng";
import type { Delivery, DeliveryType, Difficulty, Extra, Line } from "./types";

const TYPE_WEIGHTS: Record<Difficulty, Record<DeliveryType, number>> = {
  gully: { length: 42, fulltoss: 16, bouncer: 10, yorker: 10, slower: 10, swing: 12 },
  club: { length: 36, fulltoss: 8, bouncer: 12, yorker: 18, slower: 12, swing: 14 },
  international: { length: 30, fulltoss: 3, bouncer: 12, yorker: 25, slower: 15, swing: 15 },
};

const SPEED: Record<Difficulty, [number, number]> = {
  gully: [118, 130],
  club: [128, 140],
  international: [138, 150],
};

/** Base travel time for a ~135 km/h ball; tuned for playability, not realism. */
const BASE_TRAVEL: Record<Difficulty, number> = {
  gully: 1080,
  club: 940,
  international: 820,
};

export const EXTRA_RATE: Record<Difficulty, number> = {
  gully: 0.04,
  club: 0.03,
  international: 0.02,
};

export interface BowlerContext {
  need: number;
  ballsLeft: number;
}

export function chooseDelivery(rng: Rng, difficulty: Difficulty, ctx: BowlerContext): Delivery {
  const w = { ...TYPE_WEIGHTS[difficulty] };
  // under pressure at the death, bowlers go for the blockhole
  if (ctx.ballsLeft <= 2 && ctx.need > ctx.ballsLeft) {
    w.yorker += 15;
    w.slower += 5;
  }
  const type = weighted(rng, w);
  const line = weighted<Line>(rng, { off: 45, middle: 35, leg: 20 });

  const [lo, hi] = SPEED[difficulty];
  let speedKmh = randInt(rng, lo, hi);
  if (type === "slower") speedKmh = randInt(rng, lo - 28, lo - 16);
  if (type === "bouncer") speedKmh += 3;

  let travelMs = Math.round(BASE_TRAVEL[difficulty] * (135 / speedKmh));
  if (type === "slower") travelMs = Math.max(travelMs, BASE_TRAVEL[difficulty] + 180);

  let extra: Extra = "none";
  if (rng() < EXTRA_RATE[difficulty]) extra = rng() < 0.6 ? "wide" : "noball";

  const swing = type === "swing" ? (rng() < 0.5 ? -1 : 1) * (0.25 + rng() * 0.25) : 0;

  return { type, line, speedKmh, travelMs, extra, swing };
}

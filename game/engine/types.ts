export type Difficulty = "gully" | "club" | "international";
export type Mode = "super-over" | "death-overs" | "daily";

export type DeliveryType = "length" | "yorker" | "bouncer" | "fulltoss" | "slower" | "swing";
export type Line = "off" | "middle" | "leg";
export type Extra = "none" | "wide" | "noball";

export interface Delivery {
  type: DeliveryType;
  line: Line;
  speedKmh: number;
  /** ms from release to the ideal contact point */
  travelMs: number;
  extra: Extra;
  /** lateral swing in metres, + towards off side */
  swing: number;
}

export type Zone = "off" | "straight" | "leg";
export interface Shot {
  zone: Zone;
  lofted: boolean;
}

export type Timing = "perfect" | "good" | "early" | "late" | "miss";

export type HowOut = "bowled" | "lbw" | "caught" | "caught-behind";

export interface Outcome {
  runs: number;
  /** runs credited from a wide / no-ball penalty, included in `runs` */
  extras: number;
  boundary: 0 | 4 | 6;
  wicket: HowOut | null;
  edge: boolean;
  dropped: boolean;
  /** a stunning boundary save by a fielder */
  save: boolean;
  /** this delivery counts as a legal ball */
  legal: boolean;
  extra: Extra;
  timing: Timing | "leave";
  slowmo: boolean;
}

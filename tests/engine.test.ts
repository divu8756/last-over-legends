import { describe, expect, it } from "vitest";
import { GROUND, LOFTED, groundTable, loftedTable, resolveShot } from "@/game/engine/outcomes";
import { gradeTiming, windowsFor } from "@/game/engine/timing";
import { chooseDelivery } from "@/game/engine/bowler";
import { applyBall, createConfig, istDate, matchRngs, newMatch } from "@/game/engine/match";
import { winProbability } from "@/game/engine/winprob";
import { mulberry32 } from "@/game/engine/rng";
import type { Delivery, Outcome } from "@/game/engine/types";

const ball = (over: Partial<Delivery> = {}): Delivery => ({
  type: "length",
  line: "middle",
  speedKmh: 135,
  travelMs: 900,
  extra: "none",
  swing: 0,
  ...over,
});

const blank = (over: Partial<Outcome> = {}): Outcome => ({
  runs: 0,
  extras: 0,
  boundary: 0,
  wicket: null,
  edge: false,
  dropped: false,
  save: false,
  legal: true,
  extra: "none",
  timing: "good",
  slowmo: false,
  ...over,
});

describe("outcome tables", () => {
  it("every row sums to 100", () => {
    for (const row of [...Object.values(GROUND), ...Object.values(LOFTED)]) {
      expect(Object.values(row).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });

  it("a lofted yorker caps at Good", () => {
    const t = loftedTable("perfect", { zone: "straight", lofted: true }, ball({ type: "yorker" }), false);
    expect(t.caught).toBeGreaterThanOrEqual(LOFTED.good.caught);
  });

  it("bouncers can't bowl you", () => {
    const t = groundTable("miss", { zone: "off", lofted: false }, ball({ type: "bouncer" }), false);
    expect(t.out).toBe(0);
  });

  it("playing with the line adds boundary weight", () => {
    const withLine = groundTable("good", { zone: "off", lofted: false }, ball({ line: "off" }), false);
    const neutral = groundTable("good", { zone: "straight", lofted: false }, ball({ line: "off" }), false);
    expect(withLine.four + withLine.six).toBeCloseTo(neutral.four + neutral.six + 8);
  });

  it("perfect lofted shots mostly clear the rope; misses mostly get you out", () => {
    const rng = mulberry32(1);
    let sixes = 0;
    let outs = 0;
    for (let i = 0; i < 4000; i++) {
      const p = resolveShot(rng, { timing: "perfect", shot: { zone: "straight", lofted: true }, delivery: ball(), hotStreak: false });
      if (p.boundary === 6) sixes++;
      const m = resolveShot(rng, { timing: "miss", shot: { zone: "straight", lofted: true }, delivery: ball(), hotStreak: false });
      if (m.wicket) outs++;
    }
    expect(sixes / 4000).toBeGreaterThan(0.6);
    expect(outs / 4000).toBeGreaterThan(0.45);
  });

  it("a wide is never a wicket", () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 200; i++) {
      const o = resolveShot(rng, { timing: "miss", shot: { zone: "leg", lofted: true }, delivery: ball({ extra: "wide" }), hotStreak: false });
      expect(o.wicket).toBeNull();
    }
  });
});

describe("timing", () => {
  it("grades by window", () => {
    const w = windowsFor("club", ball());
    expect(gradeTiming(10, w)).toBe("perfect");
    expect(gradeTiming(-60, w)).toBe("good");
    expect(gradeTiming(-120, w)).toBe("early");
    expect(gradeTiming(120, w)).toBe("late");
    expect(gradeTiming(400, w)).toBe("miss");
  });

  it("yorkers shrink and full tosses grow the windows", () => {
    const base = windowsFor("club", ball());
    expect(windowsFor("club", ball({ type: "yorker" })).perfect).toBeCloseTo(base.perfect * 0.65);
    expect(windowsFor("club", ball({ type: "fulltoss" })).good).toBeCloseTo(base.good * 1.5);
  });
});

describe("match", () => {
  const cfg = () => ({ ...createConfig("super-over", "club", { seed: 42 }), target: 15 });

  it("super over targets are 14-24 with 2 wickets", () => {
    for (let s = 0; s < 50; s++) {
      const c = createConfig("super-over", "gully", { seed: s });
      expect(c.target).toBeGreaterThanOrEqual(14);
      expect(c.target).toBeLessThanOrEqual(24);
      expect(c.wickets).toBe(2);
      expect(c.balls).toBe(6);
    }
  });

  it("wides add a run and don't count as a ball", () => {
    const s = applyBall(newMatch(cfg()), ball({ extra: "wide" }), blank());
    expect(s.runs).toBe(1);
    expect(s.balls).toBe(0);
    expect(s.history[0].mark).toBe("Wd");
  });

  it("no-balls add a run, keep the batter in and re-bowl", () => {
    const s = applyBall(newMatch(cfg()), ball({ extra: "noball" }), blank({ wicket: "caught" }));
    expect(s.runs).toBe(1);
    expect(s.wickets).toBe(0);
    expect(s.balls).toBe(0);
  });

  it("wins, loses and ties", () => {
    let s = newMatch(cfg());
    for (let i = 0; i < 3; i++) s = applyBall(s, ball(), blank({ runs: 6, boundary: 6 }));
    expect(s.status).toBe("won");

    let l = newMatch(cfg());
    l = applyBall(l, ball(), blank({ wicket: "bowled" }));
    l = applyBall(l, ball(), blank({ wicket: "lbw" }));
    expect(l.status).toBe("lost");

    let t = newMatch(cfg());
    t = applyBall(t, ball(), blank({ runs: 6, boundary: 6 }));
    t = applyBall(t, ball(), blank({ runs: 6, boundary: 6 }));
    t = applyBall(t, ball(), blank({ runs: 2 }));
    for (let i = 0; i < 3; i++) t = applyBall(t, ball(), blank());
    expect(t.status).toBe("tied");
  });

  it("three good contacts make a hot streak; a miss breaks it", () => {
    let s = newMatch(cfg());
    for (let i = 0; i < 3; i++) s = applyBall(s, ball(), blank({ runs: 1, timing: "good" }));
    expect(s.hot).toBe(true);
    s = applyBall(s, ball(), blank({ timing: "miss" }));
    expect(s.hot).toBe(false);
  });

  it("odd runs swap strike", () => {
    const s = applyBall(newMatch(cfg()), ball(), blank({ runs: 1 }));
    expect(s.striker).toBe(1);
  });
});

describe("daily challenge", () => {
  it("is the same scenario and ball sequence for everyone on a date", () => {
    const a = createConfig("daily", "gully", { date: "2026-10-02" });
    const b = createConfig("daily", "international", { date: "2026-10-02" });
    expect(a.target).toBe(b.target);
    expect(a.team.id).toBe(b.team.id);
    const ra = matchRngs(a).bowler;
    const rb = matchRngs(b).bowler;
    for (let i = 0; i < 10; i++) {
      expect(chooseDelivery(ra, a.difficulty, { need: 10, ballsLeft: 6 })).toEqual(chooseDelivery(rb, b.difficulty, { need: 10, ballsLeft: 6 }));
    }
    expect(createConfig("daily", "club", { date: "2026-10-03" }).seed).not.toBe(a.seed);
  });

  it("uses the IST date", () => {
    expect(istDate(new Date("2026-10-02T19:00:00Z"))).toBe("2026-10-03");
    expect(istDate(new Date("2026-10-02T10:00:00Z"))).toBe("2026-10-02");
  });
});

describe("win probability", () => {
  it("is between 0 and 1 and falls as the chase gets harder", () => {
    const easy = newMatch({ ...createConfig("super-over", "club", { seed: 1 }), target: 6 });
    const hard = newMatch({ ...createConfig("super-over", "club", { seed: 1 }), target: 30 });
    const pe = winProbability(easy);
    const ph = winProbability(hard);
    expect(pe).toBeGreaterThan(ph);
    expect(pe).toBeLessThanOrEqual(1);
    expect(ph).toBeGreaterThanOrEqual(0);
  });
});

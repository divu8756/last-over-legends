import { Camera } from "./render/camera";
import { drawBatter, drawPlayer, drawStumps, type Kit } from "./render/figures";
import { chooseDelivery } from "./engine/bowler";
import {
  applyBall,
  ballsLeft,
  matchRngs,
  need,
  newMatch,
  strikerName,
  type MatchConfig,
  type MatchState,
} from "./engine/match";
import { resolveShot } from "./engine/outcomes";
import type { Rng } from "./engine/rng";
import { gradeTiming, windowsFor } from "./engine/timing";
import type { Delivery, Outcome, Shot, Zone } from "./engine/types";
import { winProbability } from "./engine/winprob";
import type { CommentaryEvent } from "@/commentary/lines";
import type { Sfx } from "@/audio/sfx";
import { BOWLERS } from "@/data/teams";

export type Phase = "ready" | "runup" | "delivery" | "result" | "done";

export interface Moment {
  event: CommentaryEvent;
  vars: Record<string, string | number>;
}

export interface GameCallbacks {
  onUpdate(info: { match: MatchState; winProb: number; phase: Phase; bowler: string; hot: boolean }): void;
  /** commentary moments; the game waits on `busy()` before the next ball */
  onMoment(m: Moment): void;
  onEnd(match: MatchState): void;
  busy(): boolean;
}

type V3 = [number, number, number];

interface Flight {
  from: V3;
  to: V3;
  height: number;
  dur: number;
  start: number;
  ground: boolean;
  fielder: number;
  /** fielder takes the catch at the end */
  catchIt: boolean;
  /** fielder fumbles at the end */
  drop: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

const RUNUP_MS = 1150;
const RELEASE: V3 = [0.3, 2.1, 18.9];
const CONTACT_Z = 1.6;
const BATTER_X = -0.45;
const BATTER_Z = 1.0;

const GEOMETRY: Record<Delivery["type"], { zp: number | null; yc: number }> = {
  length: { zp: 6.5, yc: 0.8 },
  yorker: { zp: 1.3, yc: 0.12 },
  bouncer: { zp: 11, yc: 1.55 },
  fulltoss: { zp: null, yc: 0.95 },
  slower: { zp: 6, yc: 0.7 },
  swing: { zp: 5, yc: 0.75 },
};

const LINE_X: Record<Delivery["line"], number> = { off: 0.22, middle: 0.02, leg: -0.14 };

const FIELDERS: [number, number][] = [
  [-24, 12],
  [26, 10],
  [-36, 38],
  [37, 40],
  [2, 58],
  [-52, 22],
  [52, 24],
  [-16, 52],
  [20, 60],
];

const ZONE_ANGLE: Record<Zone, [number, number]> = {
  off: [0.45, 1.25],
  straight: [-0.22, 0.22],
  leg: [-1.25, -0.45],
};

export class Game {
  private ctx: CanvasRenderingContext2D;
  private cam = new Camera();
  private dpr = 1;
  private raf = 0;
  private lastReal = 0;
  private clock = 0;
  private timeScale = 1;
  private paused = false;

  private match: MatchState;
  private rng: { bowler: Rng; play: Rng };
  private fx: Rng = Math.random;
  private winProb = 0.5;
  private bowler: string;
  private kit: Kit;
  private oppKit: Kit;

  private phase: Phase = "ready";
  private phaseStart = 0;
  private delivery: Delivery | null = null;
  private outcome: Outcome | null = null;
  private shot: Shot | null = null;
  private swingAt = -1;
  private resolvedAt = -1;
  private contacted = false;
  private flight: Flight | null = null;
  private ballStop: V3 | null = null;
  private bounced = false;
  private stumpsBroken = -1;
  private fielders: { home: [number, number]; pos: [number, number] }[];
  private particles: Particle[] = [];
  private banner: { text: string; sub: string; color: string; start: number } | null = null;
  private shake = 0;
  private crowdWave = -1;
  private crowd: { x: number; y: number; c: string; p: number }[] = [];
  private stars: [number, number, number][] = [];
  private pending: { id: number; t: number; x: number; y: number; zone: Zone } | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private nextBallAt = -1;
  private ended = false;
  /** phone/tablet vs mouse+keyboard: changes the on-screen hints */
  private touch = false;
  private crowdCache: HTMLCanvasElement | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    config: MatchConfig,
    private sfx: Sfx,
    private cb: GameCallbacks,
    kit?: Kit,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not supported");
    this.ctx = ctx;
    this.match = newMatch(config);
    this.rng = matchRngs(config);
    this.kit = kit ?? { primary: config.team.primary, secondary: config.team.secondary };
    this.oppKit = { primary: config.opponent.primary, secondary: config.opponent.secondary };
    this.bowler = BOWLERS[config.seed % BOWLERS.length];
    this.fielders = FIELDERS.map(([x, z]) => ({ home: [x, z], pos: [x, z] }));
    this.winProb = winProbability(this.match);
    this.touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
    this.bind();
  }

  // ───────────────────────────── lifecycle ─────────────────────────────

  start() {
    this.lastReal = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - this.lastReal);
      this.lastReal = now;
      if (!this.paused) {
        this.clock += dt * this.timeScale;
        this.update();
      }
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.emit();
    this.cb.onMoment({ event: "start", vars: this.vars() });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    this.unbind();
  }

  setPaused(p: boolean) {
    this.paused = p;
  }

  resize(cssW: number, cssH: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.cam.resize(cssW, cssH);
    this.buildBackdrop();
  }

  // ───────────────────────────── input ─────────────────────────────

  private onPointerDown = (e: PointerEvent) => {
    this.sfx.unlock();
    this.touch = e.pointerType === "touch" || e.pointerType === "pen";
    if (this.paused) return;
    if (this.phase === "ready" || (this.phase === "result" && this.nextBallAt > 0)) {
      this.requestNextBall(true);
      return;
    }
    if (this.phase !== "delivery" || this.shot || this.outcome) return;
    const rect = this.canvas.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const zone: Zone = rx < 0.36 ? "leg" : rx > 0.64 ? "off" : "straight";
    this.pending = { id: e.pointerId, t: this.now(), x: e.clientX, y: e.clientY, zone };
    // decide loft on release or after a short swipe window
    this.pendingTimer = setTimeout(() => this.commitPending(false), 170);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pending || e.pointerId !== this.pending.id) return;
    if (this.pending.y - e.clientY > 28) this.commitPending(true);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pending || e.pointerId !== this.pending.id) return;
    this.commitPending(this.pending.y - e.clientY > 28);
  };

  private commitPending(lofted: boolean) {
    if (!this.pending) return;
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    this.pendingTimer = null;
    const p = this.pending;
    this.pending = null;
    this.swing({ zone: p.zone, lofted }, p.t);
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.repeat || this.paused) return;
    const k = e.key.toLowerCase();
    const map: Record<string, Shot> = {
      arrowleft: { zone: "leg", lofted: e.shiftKey },
      arrowright: { zone: "off", lofted: e.shiftKey },
      arrowdown: { zone: "straight", lofted: e.shiftKey },
      arrowup: { zone: "straight", lofted: true },
      a: { zone: "leg", lofted: false },
      s: { zone: "straight", lofted: false },
      d: { zone: "off", lofted: false },
      q: { zone: "leg", lofted: true },
      w: { zone: "straight", lofted: true },
      e: { zone: "off", lofted: true },
      " ": { zone: "straight", lofted: false },
    };
    const shot = map[k];
    if (!shot) return;
    e.preventDefault();
    this.touch = false;
    this.sfx.unlock();
    if (this.phase === "ready" || (this.phase === "result" && this.nextBallAt > 0)) {
      if (k === " " || k === "enter") this.requestNextBall(true);
      return;
    }
    if (this.phase === "delivery" && !this.shot && !this.outcome) this.swing(shot, this.now());
  };

  private onVisibility = () => {
    if (document.hidden) this.paused = true;
  };

  private bind() {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("keydown", this.onKey);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  private unbind() {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("keydown", this.onKey);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  /** Game time, including the part of the current frame already elapsed. */
  private now() {
    return this.clock + (this.paused ? 0 : (performance.now() - this.lastReal) * this.timeScale);
  }

  // ───────────────────────────── flow ─────────────────────────────

  private vars(extra: Record<string, string | number> = {}) {
    const s = this.match;
    return {
      name: strikerName(s),
      bowler: this.bowler,
      team: s.config.team.name,
      opp: s.config.opponent.name,
      need: need(s),
      balls: ballsLeft(s),
      runs: s.runs,
      wickets: s.config.wickets - s.wickets,
      target: s.config.target,
      ...extra,
    };
  }

  private emit() {
    this.cb.onUpdate({
      match: this.match,
      winProb: this.winProb,
      phase: this.phase,
      bowler: this.bowler,
      hot: this.match.hot,
    });
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.phaseStart = this.clock;
    this.emit();
  }

  private requestNextBall(force = false) {
    if (this.match.status !== "playing") return;
    if (!force && this.cb.busy()) return;
    this.nextBallAt = -1;
    this.timeScale = 1;
    this.flight = null;
    this.ballStop = null;
    this.outcome = null;
    this.shot = null;
    this.swingAt = -1;
    this.resolvedAt = -1;
    this.contacted = false;
    this.bounced = false;
    this.stumpsBroken = -1;
    this.banner = null;
    for (const f of this.fielders) f.pos = [...f.home];

    this.flightDone = false;
    const s = this.match;
    if (s.config.balls > 6 && ballsLeft(s) === 6 && !this.announced.has("finalOver")) {
      this.announced.add("finalOver");
      this.cb.onMoment({ event: "finalOver", vars: this.vars() });
    } else if (ballsLeft(s) === 1 && !this.announced.has("lastBall")) {
      this.announced.add("lastBall");
      this.cb.onMoment({ event: "lastBall", vars: this.vars() });
    }

    this.delivery = chooseDelivery(this.rng.bowler, s.config.difficulty, { need: need(s), ballsLeft: ballsLeft(s) });
    this.setPhase("runup");
  }

  private get contactTime() {
    return RUNUP_MS + (this.delivery?.travelMs ?? 0);
  }

  private swing(shot: Shot, at: number) {
    if (!this.delivery || this.outcome) return;
    const sinceStart = at - this.phaseStart;
    // swings before the ball is released are ignored
    if (this.phase !== "delivery" || sinceStart < RUNUP_MS) return;
    this.shot = shot;
    this.swingAt = at;
    const delta = sinceStart - this.contactTime;
    const timing = gradeTiming(delta, windowsFor(this.match.config.difficulty, this.delivery));
    this.resolve(timing, shot);
    this.sfx.whoosh();
  }

  private resolve(timing: Outcome["timing"], shot: Shot | null) {
    const d = this.delivery!;
    this.outcome = resolveShot(this.rng.play, { timing, shot, delivery: d, hotStreak: this.match.hot });
    this.resolvedAt = this.clock;
  }

  private update() {
    const t = this.clock - this.phaseStart;
    const d = this.delivery;

    if (this.phase === "runup" && t >= RUNUP_MS) {
      this.phase = "delivery";
      this.emit();
    }

    if (this.phase === "delivery" && d) {
      const pos = this.ballAt(t - RUNUP_MS);
      const geo = GEOMETRY[d.type];
      if (!this.bounced && geo.zp !== null && pos[2] <= geo.zp) {
        this.bounced = true;
        this.sfx.bounce();
      }
      const w = windowsFor(this.match.config.difficulty, d);
      // no swing by the end of the window: the ball is left alone
      if (!this.outcome && t > this.contactTime + w.edge) this.resolve("leave", null);
      if (this.outcome) this.playOutcome(t);
    }

    if (this.phase === "result") this.updateResult();

    this.updateParticles();
    this.shake *= 0.9;
  }

  /** While the ball is still travelling, decide when the outcome becomes visible. */
  private playOutcome(t: number) {
    const o = this.outcome!;
    const d = this.delivery!;
    const sinceRelease = t - RUNUP_MS;
    const contactAt = this.contactTime;
    const bat = o.wicket !== "bowled" && o.wicket !== "lbw";
    const hits =
      !!this.shot &&
      o.timing !== "leave" &&
      bat &&
      (o.runs > 0 || o.edge || o.dropped || o.save || o.wicket !== null || o.timing !== "miss");
    const wideOrMiss = d.extra === "wide" || !hits;

    if (!wideOrMiss) {
      // the bat meets the ball at contact, or now if the swing was late
      if (t >= Math.max(contactAt, this.swingAt - this.phaseStart)) this.beginResult(this.ballAt(sinceRelease));
      return;
    }

    if (o.wicket === "lbw") {
      const [, , z] = this.ballAt(sinceRelease);
      if (z <= BATTER_Z + 0.15) {
        this.ballStop = this.ballAt(sinceRelease);
        this.beginResult(null);
      }
      return;
    }
    const [, , z] = this.ballAt(sinceRelease);
    if (z <= 0.05) {
      if (o.wicket === "bowled") {
        this.stumpsBroken = 0;
        this.sfx.stumps();
        this.shake = 14;
      }
      this.ballStop = o.wicket === "bowled" ? this.ballAt(sinceRelease) : null;
      this.beginResult(null);
    }
  }

  private beginResult(contactPos: V3 | null) {
    const o = this.outcome!;
    this.contacted = !!contactPos;
    this.setPhase("result");
    if (contactPos) {
      this.sfx.bat(o.boundary ? 1 : 0.7);
      this.flight = this.makeFlight(contactPos, o);
      if (o.slowmo || (o.boundary === 6 && ballsLeft(this.match) <= 1)) this.timeScale = 0.35;
    }
    this.finishBall();
  }

  private makeFlight(from: V3, o: Outcome): Flight {
    const shot = this.shot!;
    const r = this.fx;
    let [a0, a1] = ZONE_ANGLE[shot.zone];
    let dist = 10;
    let height = 0.4;
    let ground = true;
    let dur = 900;
    let catchIt = false;
    const drop = o.dropped;

    if (o.edge) {
      [a0, a1] = shot.zone === "leg" ? [-2.1, -1.8] : [1.8, 2.1];
      dist = o.boundary ? 30 : 6;
      height = o.wicket ? 1.2 : 0.6;
      ground = !o.wicket;
      dur = o.boundary ? 1100 : 600;
      catchIt = o.wicket === "caught-behind";
    } else if (o.boundary === 6) {
      dist = 90 + r() * 15;
      height = 26 + r() * 8;
      ground = false;
      dur = 2000;
    } else if (o.boundary === 4) {
      dist = 72;
      height = shot.lofted ? 9 : 0.5;
      ground = !shot.lofted;
      dur = 1400;
    } else if (o.wicket === "caught" || o.dropped || o.save) {
      dist = o.save ? 64 : 30 + r() * 25;
      height = 16 + r() * 10;
      ground = false;
      dur = 1700;
      catchIt = o.wicket === "caught";
    } else if (o.runs >= 2) {
      dist = 42 + r() * 12;
      dur = 1300;
    } else if (o.runs === 1) {
      dist = 18 + r() * 8;
      dur = 1000;
    } else {
      dist = 6 + r() * 8;
      dur = 800;
    }
    const a = a0 + r() * (a1 - a0);
    const to: V3 = [Math.sin(a) * dist, 0, Math.max(-2.2, CONTACT_Z + Math.cos(a) * dist)];

    // nearest fielder chases the ball
    let fielder = 0;
    let best = Infinity;
    this.fielders.forEach((f, i) => {
      const dd = Math.hypot(f.home[0] - to[0], f.home[1] - to[2]);
      if (dd < best) {
        best = dd;
        fielder = i;
      }
    });
    if (o.boundary === 6 || o.edge || (o.boundary === 4 && !o.save)) fielder = -1;
    return { from, to, height, dur, start: this.clock, ground, fielder, catchIt, drop };
  }

  private finishBall() {
    const o = this.outcome!;
    const d = this.delivery!;
    const before = this.match;
    const after = applyBall(before, d, o);
    const ball = after.history[after.history.length - 1].outcome;
    this.match = after;
    this.winProb = winProbability(after);

    // banner + crowd
    const big = (text: string, color: string, sub = "") => (this.banner = { text, sub, color, start: this.clock });
    if (d.extra === "wide") big("WIDE", "#ffd23f", "+1 run");
    else if (ball.wicket) {
      const how = { bowled: "BOWLED", lbw: "LBW", caught: "CAUGHT", "caught-behind": "CAUGHT BEHIND" }[ball.wicket];
      big("OUT!", "#ff4d4d", how);
      this.sfx.groan();
    } else if (ball.boundary === 6) {
      big("SIX!", "#ffd23f", d.extra === "noball" ? "+ no-ball" : "");
      this.sfx.cheer(true);
      this.crowdWave = this.clock;
    } else if (ball.boundary === 4) {
      big("FOUR!", "#4dd0ff", ball.edge ? "off the edge" : "");
      this.sfx.cheer(false);
      this.crowdWave = this.clock;
    } else if (ball.dropped) big("DROPPED!", "#ffb347", `${ball.runs - ball.extras} run`);
    else if (ball.save) big("WHAT A SAVE!", "#ffb347", `${ball.runs - ball.extras} run`);
    else if (d.extra === "noball") big("NO BALL", "#ffd23f", `+${ball.runs} runs`);
    else if (ball.runs > 0) big(`${ball.runs} RUN${ball.runs > 1 ? "S" : ""}`, "#ffffff");
    else big("DOT", "#9aa5b1", ball.timing === "leave" ? "left alone" : "");

    // commentary
    const prevBatter = strikerName(before);
    const vars = this.vars({ name: prevBatter });
    let event: CommentaryEvent;
    if (d.extra === "wide") event = "wide";
    else if (ball.wicket === "bowled") event = "bowled";
    else if (ball.wicket === "lbw") event = "lbw";
    else if (ball.wicket === "caught") event = "caught";
    else if (ball.wicket === "caught-behind") event = "caughtBehind";
    else if (ball.dropped) event = "dropped";
    else if (ball.save) event = "save";
    else if (ball.boundary === 6) event = "six";
    else if (ball.boundary === 4) event = ball.edge ? "edgeFour" : "four";
    else if (d.extra === "noball") event = "noball";
    else if (ball.edge && ball.runs > 0) event = "edgeSafe";
    else if (ball.runs === 1) event = "single";
    else if (ball.runs > 1) event = "runs";
    else event = ball.timing === "leave" ? "leave" : "dot";
    if (after.status === "playing" && after.hot && !before.hot && (event === "four" || event === "single" || event === "runs")) {
      event = "hotStreak";
    }
    if (after.status === "playing") this.cb.onMoment({ event, vars });
    else {
      this.cb.onMoment({ event: after.status === "won" ? "win" : after.status === "tied" ? "tie" : "loss", vars });
      if (after.status === "won") this.celebrate();
    }
    this.emit();
  }

  private updateResult() {
    const t = this.clock - this.phaseStart;
    const f = this.flight;
    if (f) {
      const u = Math.min(1, (this.clock - f.start) / f.dur);
      if (f.fielder >= 0) {
        const fl = this.fielders[f.fielder];
        const k = Math.min(1, u * 1.15);
        fl.pos = [fl.home[0] + (f.to[0] - fl.home[0]) * k, fl.home[1] + (f.to[2] - fl.home[1]) * k];
      }
      if (u >= 1 && this.outcome?.boundary === 6 && !this.flightDone) {
        this.flightDone = true;
        this.fireworks(4);
      }
      if (u > 0.4 && this.timeScale < 1 && this.clock - f.start > f.dur * 0.6) this.timeScale = Math.min(1, this.timeScale + 0.02);
    }
    if (this.stumpsBroken >= 0) this.stumpsBroken += 0.03;

    const minWait = this.flight ? this.flight.dur + 500 : 1400;
    if (t > minWait) {
      this.timeScale = 1;
      if (this.match.status !== "playing") {
        if (!this.ended && t > minWait + 1500) {
          this.ended = true;
          this.phase = "done";
          this.emit();
          this.cb.onEnd(this.match);
        }
        return;
      }
      this.nextBallAt = this.nextBallAt > 0 ? this.nextBallAt : this.clock;
      // wait for Bhaskar to finish, but never more than 4.5s
      if (!this.cb.busy() || this.clock - this.nextBallAt > 4500) this.requestNextBall(true);
    }
  }
  private flightDone = false;
  private announced = new Set<string>();

  // ───────────────────────────── effects ─────────────────────────────

  private celebrate() {
    this.crowdWave = this.clock;
    this.fireworks(10);
    this.sfx.cheer(true);
  }

  private fireworks(n: number) {
    const { W, horizon } = this.cam;
    const colors = ["#ffd23f", "#ff4d6d", "#4dd0ff", "#9bff6a", "#ffffff", "#ff9f1c"];
    for (let i = 0; i < n; i++) {
      const cx = W * (0.15 + this.fx() * 0.7);
      const cy = horizon * (0.25 + this.fx() * 0.5);
      const color = colors[Math.floor(this.fx() * colors.length)];
      const delay = i * 180;
      setTimeout(() => {
        this.sfx.firework();
        for (let j = 0; j < 40; j++) {
          const ang = (j / 40) * Math.PI * 2;
          const sp = 1.5 + this.fx() * 2.5;
          this.particles.push({ x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 70 + this.fx() * 30, color, size: 2.5 });
        }
      }, delay);
    }
  }

  private updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.vx *= 0.985;
      p.life += 1;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  // ───────────────────────────── ball physics ─────────────────────────────

  /** Ball position `ms` after release. */
  private ballAt(ms: number): V3 {
    const d = this.delivery!;
    const geo = GEOMETRY[d.type];
    const travel = d.travelMs;
    const p = ms / travel;
    const z = RELEASE[2] + (CONTACT_Z - RELEASE[2]) * p;

    let lineX = LINE_X[d.line];
    if (d.extra === "wide") lineX = d.line === "leg" ? -0.85 : 1.05;
    const pc = Math.min(1.2, Math.max(0, p));
    const swingK = d.swing ? Math.max(0, (pc - 0.4) / 0.6) : 0;
    const x = RELEASE[0] + (lineX - d.swing - RELEASE[0]) * pc + d.swing * swingK * swingK;

    let y: number;
    if (geo.zp === null) {
      y = RELEASE[1] + (geo.yc - RELEASE[1]) * pc + Math.sin(Math.PI * Math.min(1, pc)) * 0.25;
    } else if (z >= geo.zp) {
      const u = (RELEASE[2] - z) / (RELEASE[2] - geo.zp);
      y = RELEASE[1] * (1 - u * u);
    } else {
      const v = Math.min(1.3, (geo.zp - z) / Math.max(0.3, geo.zp - CONTACT_Z));
      y = geo.yc * (1 - (1 - v) * (1 - v));
    }
    return [x, Math.max(0.04, y), z];
  }

  private flightPos(f: Flight): V3 {
    const u = Math.min(1, (this.clock - f.start) / f.dur);
    const e = f.ground ? 1 - (1 - u) * (1 - u) : u;
    const x = f.from[0] + (f.to[0] - f.from[0]) * e;
    const z = f.from[2] + (f.to[2] - f.from[2]) * e;
    let y: number;
    if (f.ground) y = 0.08 + Math.abs(Math.sin(u * Math.PI * 3)) * f.height * (1 - u);
    else y = f.from[1] * (1 - u) + 4 * f.height * u * (1 - u);
    if (f.drop && u >= 1) y = 0.05;
    return [x, Math.max(0.04, y), z];
  }

  // ───────────────────────────── drawing ─────────────────────────────

  private standsTop() {
    const { H, horizon } = this.cam;
    return horizon - Math.max(50, Math.min(horizon * 0.42, H * 0.16));
  }

  private buildBackdrop() {
    const { W, horizon } = this.cam;
    const palette = ["#ffd23f", "#ff4d6d", "#4dd0ff", "#ffffff", "#ff9f1c", "#9bff6a", "#c77dff", this.kit.primary];
    this.crowd = [];
    const top = this.standsTop();
    for (let y = top + 6; y < horizon - 4; y += 7) {
      for (let x = 0; x < W; x += 7) {
        this.crowd.push({ x: x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 2, c: palette[Math.floor(Math.random() * palette.length)], p: Math.random() * 6.28 });
      }
    }
    this.crowdCache = null;
    this.stars = Array.from({ length: 60 }, () => [Math.random() * W, Math.random() * top * 0.9, Math.random()]);
  }

  private draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const sx = (this.fx() - 0.5) * this.shake;
    const sy = (this.fx() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(sx, sy);

    this.drawSky();
    this.drawStands();
    this.drawField();

    const t = this.clock - this.phaseStart;
    const ball = this.currentBall(t);

    // far → near: far stumps, fielders, bowler, ball (if behind the batter), batter, near stumps, ball
    drawStumps(ctx, (x, y, z) => this.cam.project(x, y, z), 20.12, -1, 0);
    const fl = [...this.fielders].sort((a, b) => b.pos[1] - a.pos[1]);
    for (const f of fl) {
      const [px, py, s] = this.cam.project(f.pos[0], 0, f.pos[1]);
      const moving = f.pos[0] !== f.home[0];
      drawPlayer(ctx, px, py, s, this.oppKit, moving ? this.clock / 60 : 0, 0);
    }
    this.drawBowler(t);
    if (ball && ball[2] > BATTER_Z) this.drawBall(ball);
    this.drawBatterNow(t);
    drawStumps(ctx, (x, y, z) => this.cam.project(x, y, z), 0, this.stumpsBroken, this.clock);
    if (ball && ball[2] <= BATTER_Z) this.drawBall(ball);

    this.drawTimingAid(t);
    this.drawParticles();
    ctx.restore();
    this.drawBanner();
    this.drawHints(t);
  }

  private currentBall(t: number): V3 | null {
    if (!this.delivery) return null;
    if (this.phase === "delivery") {
      const ms = t - RUNUP_MS;
      return ms >= 0 ? this.ballAt(ms) : null;
    }
    if (this.phase === "result" || this.phase === "done") {
      if (this.flight) return this.flightPos(this.flight);
      if (this.ballStop) return this.ballStop;
      return null;
    }
    return null;
  }

  private drawSky() {
    const ctx = this.ctx;
    const { W, H, horizon } = this.cam;
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, "#050a1f");
    g.addColorStop(1, "#28215a");
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, H + 40);
    for (const [x, y, b] of this.stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * b * (0.6 + 0.4 * Math.sin(this.clock / 500 + x))})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    // floodlights
    for (const side of [0.06, 0.94]) {
      const x = W * side;
      const top = horizon * 0.18;
      ctx.strokeStyle = "#3a3f5c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, horizon);
      ctx.lineTo(x, top);
      ctx.stroke();
      const glow = ctx.createRadialGradient(x, top, 2, x, top, Math.min(W, H) * 0.35);
      glow.addColorStop(0, "rgba(255,250,220,0.55)");
      glow.addColorStop(1, "rgba(255,250,220,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - W * 0.4, top - H * 0.4, W * 0.8, H * 0.8);
      ctx.fillStyle = "#fffbe6";
      ctx.fillRect(x - 18, top - 8, 36, 14);
    }
  }

  private drawStands() {
    const ctx = this.ctx;
    const { W, horizon } = this.cam;
    const top = this.standsTop();
    const g = ctx.createLinearGradient(0, top, 0, horizon);
    g.addColorStop(0, "#1b1840");
    g.addColorStop(1, "#2d2a5c");
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, horizon - top);
    const wave = this.crowdWave >= 0 ? (this.clock - this.crowdWave) / 1800 : -1;
    if (wave >= 0 && wave < 2.2) {
      // celebrating: animate every fan
      const front = (wave % 1.1) * W * 1.4 - W * 0.2;
      for (const c of this.crowd) {
        const lift = Math.max(0, 1 - Math.abs(c.x - front) / 90) * 5;
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(this.clock / 120 + c.p);
        ctx.fillStyle = c.c;
        ctx.fillRect(c.x, c.y - lift, 3, 3);
      }
    } else {
      // calm: one cached bitmap with a gentle shimmer
      if (!this.crowdCache) this.crowdCache = this.renderCrowd();
      ctx.globalAlpha = 0.85 + 0.15 * Math.sin(this.clock / 700);
      ctx.drawImage(this.crowdCache, 0, 0, W, this.cam.H);
    }
    ctx.globalAlpha = 1;
    // advertising boards
    ctx.fillStyle = "#0e3b2e";
    ctx.fillRect(0, horizon - 6, W, 8);
    ctx.fillStyle = "#ffd23f";
    ctx.font = "bold 7px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let x = 4; x < W; x += 120) ctx.fillText("LAST OVER LEGENDS", x, horizon - 2);
  }

  private renderCrowd(): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.width = Math.round(this.cam.W * this.dpr);
    c.height = Math.round(this.cam.H * this.dpr);
    const g = c.getContext("2d")!;
    g.scale(this.dpr, this.dpr);
    for (const f of this.crowd) {
      g.globalAlpha = 0.55 + 0.45 * Math.sin(f.p * 3);
      g.fillStyle = f.c;
      g.fillRect(f.x, f.y, 3, 3);
    }
    return c;
  }

  private drawField() {
    const ctx = this.ctx;
    const cam = this.cam;
    const { W, H, horizon } = cam;
    ctx.fillStyle = "#1f7a3a";
    ctx.fillRect(0, horizon + 2, W, H - horizon);
    // mowing stripes
    for (let z = -3; z < 80; z += 4) {
      if (Math.floor(z / 4) % 2 === 0) continue;
      const [, y1] = cam.project(0, 0, z);
      const [, y2] = cam.project(0, 0, z + 4);
      ctx.fillStyle = "rgba(255,255,255,0.045)";
      ctx.fillRect(0, y2, W, y1 - y2);
    }
    // boundary rope
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let first = true;
    for (let a = -Math.PI; a <= Math.PI; a += 0.02) {
      const x = Math.sin(a) * 66;
      const z = 10 + Math.cos(a) * 66;
      if (z < -2.5) {
        first = true;
        continue;
      }
      const [px, py] = cam.project(x, 0, z);
      if (first) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
      first = false;
    }
    ctx.stroke();

    // pitch
    const corners: V3[] = [
      [-1.52, 0, -1.5],
      [1.52, 0, -1.5],
      [1.52, 0, 21.6],
      [-1.52, 0, 21.6],
    ];
    ctx.fillStyle = "#c9b27c";
    ctx.beginPath();
    corners.forEach(([x, y, z], i) => {
      const [px, py] = cam.project(x, y, z);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    // creases
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    for (const z of [0, 1.22, 20.12, 18.9]) {
      const [x1, y1] = cam.project(-1.6, 0, z);
      const [x2, y2] = cam.project(1.6, 0, z);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    for (const x of [-1.32, 1.32]) {
      for (const [z1, z2] of [
        [0, 1.22],
        [18.9, 20.12],
      ]) {
        const [a, b] = cam.project(x, 0, z1);
        const [c, d] = cam.project(x, 0, z2);
        ctx.beginPath();
        ctx.moveTo(a, b);
        ctx.lineTo(c, d);
        ctx.stroke();
      }
    }
  }

  private drawBowler(t: number) {
    let z = 21;
    let stride = 0;
    let arm = 0;
    if (this.phase === "runup") {
      const u = t / RUNUP_MS;
      z = 32 - 12 * u;
      stride = t / 70;
      arm = u > 0.85 ? (u - 0.85) / 0.15 : 0;
    } else if (this.phase === "delivery") {
      const u = Math.min(1, (t - RUNUP_MS) / 600);
      z = 20 - 2.5 * u;
      stride = t / 90;
      arm = Math.max(0, 1 - u * 2);
    } else if (this.phase === "result") z = 17.5;
    else z = 32;
    const [px, py, s] = this.cam.project(0.6, 0, z);
    drawPlayer(this.ctx, px, py, s, this.oppKit, stride, arm);
  }

  private batAngle(t: number): number {
    const stance = 0.35;
    const back = -2.3;
    if (this.phase === "runup") return stance + (back - stance) * Math.min(1, t / RUNUP_MS);
    if (this.phase === "delivery" && !this.shot) return back;
    if (this.shot && this.swingAt >= 0) {
      const u = Math.min(1, (this.clock - this.swingAt) / 220);
      const end = this.shot.lofted ? (this.shot.zone === "leg" ? -3.6 : 3.7) : { off: 1.9, straight: 2.6, leg: -1.2 }[this.shot.zone];
      const start = back;
      // leg-side swings go round the other way
      const target = this.shot.zone === "leg" && !this.shot.lofted ? end : end > 0 ? end : end + Math.PI * 2;
      return start + (target - start) * (1 - (1 - u) * (1 - u));
    }
    if (this.phase === "result" || this.phase === "done") return back * 0.3;
    return stance;
  }

  private drawBatterNow(t: number) {
    const [fx, fy, s] = this.cam.project(BATTER_X, 0, BATTER_Z);
    const crouch = this.phase === "delivery" ? 1 : 0.4;
    drawBatter(this.ctx, fx, fy, s, this.kit, this.batAngle(t), crouch);
    if (this.match.hot && this.match.status === "playing") {
      const ctx = this.ctx;
      const g = ctx.createRadialGradient(fx, fy - s * 0.9, s * 0.2, fx, fy - s * 0.9, s * 1.3);
      g.addColorStop(0, "rgba(255,140,0,0)");
      g.addColorStop(0.7, `rgba(255,140,0,${0.18 + 0.1 * Math.sin(this.clock / 120)})`);
      g.addColorStop(1, "rgba(255,80,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(fx - s * 1.5, fy - s * 2.4, s * 3, s * 2.6);
    }
  }

  private drawBall(b: V3) {
    const ctx = this.ctx;
    const [px, py, s] = this.cam.project(b[0], b[1], b[2]);
    const [shx, shy] = this.cam.project(b[0], 0, b[2]);
    const r = Math.max(2, s * 0.06);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(shx, shy, r * 1.1, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // motion trail
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = r;
    ctx.lineCap = "round";
    const prev = this.phase === "delivery" ? this.ballAt(this.clock - this.phaseStart - RUNUP_MS - 40) : null;
    if (prev) {
      const [qx, qy] = this.cam.project(prev[0], prev[1], prev[2]);
      ctx.beginPath();
      ctx.moveTo(qx, qy);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
    ctx.fillStyle = "#f7f3e8";
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,40,40,0.8)";
    ctx.lineWidth = Math.max(0.6, r * 0.25);
    ctx.beginPath();
    ctx.arc(px, py, r * 0.7, -0.6, 0.6);
    ctx.stroke();
  }

  /** On Gully and Club a ring closes on the contact point as the ball arrives. */
  private drawTimingAid(t: number) {
    if (this.phase !== "delivery" || !this.delivery || this.shot || this.outcome) return;
    const diff = this.match.config.difficulty;
    if (diff === "international") return;
    const ms = t - RUNUP_MS;
    if (ms < 0) return;
    const rem = this.contactTime - t;
    const ball = this.ballAt(this.delivery.travelMs);
    const [px, py, s] = this.cam.project(ball[0], ball[1], ball[2]);
    const w = windowsFor(diff, this.delivery);
    const base = s * 0.09;
    const r = base + Math.max(0, rem) * 0.12 * (s / 140);
    const inPerfect = Math.abs(rem) <= w.perfect;
    const ctx = this.ctx;
    ctx.strokeStyle = inPerfect ? "rgba(120,255,140,0.95)" : diff === "gully" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = inPerfect ? 4 : 2;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, base, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawBanner() {
    if (!this.banner) return;
    const ctx = this.ctx;
    const { W, H } = this.cam;
    const age = this.clock - this.banner.start;
    if (age > 2600) return;
    const pop = Math.min(1, age / 160);
    const scale = 0.6 + 0.4 * pop + (age < 300 ? Math.sin((age / 300) * Math.PI) * 0.12 : 0);
    const alpha = age > 2000 ? 1 - (age - 2000) / 600 : 1;
    const size = Math.min(W * 0.14, H * 0.16);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(W / 2, H * 0.3);
    ctx.scale(scale, scale);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.lineWidth = size * 0.08;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.strokeText(this.banner.text, 0, 0);
    ctx.fillStyle = this.banner.color;
    ctx.fillText(this.banner.text, 0, 0);
    if (this.banner.sub) {
      ctx.font = `700 ${size * 0.28}px system-ui, sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.strokeText(this.banner.sub.toUpperCase(), 0, size * 0.62);
      ctx.fillText(this.banner.sub.toUpperCase(), 0, size * 0.62);
    }
    ctx.restore();
  }

  private drawHints(t: number) {
    const ctx = this.ctx;
    const { W, H } = this.cam;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (this.phase === "ready") {
      const a = 0.6 + 0.4 * Math.sin(this.clock / 300);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.font = `800 ${Math.min(28, W * 0.05)}px system-ui, sans-serif`;
      const small = W < 600;
      ctx.fillText(this.touch ? "TAP to face the first ball" : "Click or press SPACE to face the first ball", W / 2, H * 0.52);
      ctx.font = `600 ${Math.min(16, W * 0.036)}px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      const lines = this.touch
        ? small
          ? ["Tap LEFT / MIDDLE / RIGHT as the ball arrives", "to play to leg / straight / off.", "SWIPE UP to loft it for six!"]
          : ["Tap LEFT / MIDDLE / RIGHT as the ball arrives to play leg / straight / off", "SWIPE UP to loft it for six!"]
        : ["Keys: A S D ground shots · Q W E lofted (leg / straight / off)", "or click left / middle / right of the pitch, drag up to loft"];
      lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.52 + 30 + i * 22));
    }
    if (this.phase === "runup" || this.phase === "delivery") {
      const a = this.phase === "runup" ? Math.min(1, t / 400) * 0.3 : 0.2;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.font = `800 ${Math.min(18, W * 0.035)}px system-ui, sans-serif`;
      const k = this.touch ? ["", "", ""] : [" · A/Q", " · S/W", " · D/E"];
      ctx.fillText("LEG" + k[0], W * 0.18, H * 0.96);
      ctx.fillText("STRAIGHT" + k[1], W * 0.5, H * 0.96);
      ctx.fillText("OFF" + k[2], W * 0.82, H * 0.96);
      ctx.fillRect(W * 0.36, H * 0.93, 1, H * 0.06);
      ctx.fillRect(W * 0.64, H * 0.93, 1, H * 0.06);
    }
    if (this.phase === "runup" && this.delivery && this.delivery.extra === "noball" && t > RUNUP_MS * 0.85) {
      ctx.fillStyle = "#ffd23f";
      ctx.font = `800 ${Math.min(20, W * 0.04)}px system-ui, sans-serif`;
      ctx.fillText("NO BALL! FREE SWING", W / 2, H * 0.2);
    }
  }
}

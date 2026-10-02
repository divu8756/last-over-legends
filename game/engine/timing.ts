import type { Delivery, Difficulty, Timing } from "./types";

export interface Windows {
  perfect: number;
  good: number;
  edge: number;
}

export const BASE_WINDOWS: Record<Difficulty, Windows> = {
  gully: { perfect: 45, good: 100, edge: 200 },
  club: { perfect: 30, good: 70, edge: 160 },
  international: { perfect: 20, good: 50, edge: 130 },
};

export function windowsFor(difficulty: Difficulty, delivery: Pick<Delivery, "type">): Windows {
  const w = BASE_WINDOWS[difficulty];
  const k = delivery.type === "yorker" ? 0.65 : delivery.type === "fulltoss" ? 1.5 : 1;
  return { perfect: w.perfect * k, good: w.good * k, edge: w.edge * k };
}

/** deltaMs = input time − ideal contact time. Negative is early. */
export function gradeTiming(deltaMs: number, w: Windows): Timing {
  const d = Math.abs(deltaMs);
  if (d <= w.perfect) return "perfect";
  if (d <= w.good) return "good";
  if (d <= w.edge) return deltaMs < 0 ? "early" : "late";
  return "miss";
}

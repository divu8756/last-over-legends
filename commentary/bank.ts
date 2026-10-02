import { LINES, type CommentaryEvent } from "./lines";

export type Vars = Record<string, string | number>;

export function fill(template: string, vars: Vars): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Picks lines without repeating until every line for that event has been used. */
export class LineBank {
  private used = new Map<CommentaryEvent, Set<number>>();
  constructor(private rng: () => number = Math.random) {}

  pick(event: CommentaryEvent, vars: Vars): string {
    const lines = LINES[event];
    let used = this.used.get(event);
    if (!used || used.size >= lines.length) {
      used = new Set();
      this.used.set(event, used);
    }
    const free = lines.map((_, i) => i).filter((i) => !used!.has(i));
    const idx = free[Math.floor(this.rng() * free.length)];
    used.add(idx);
    return fill(lines[idx], vars);
  }
}

/**
 * Fixed-window, in-memory limiter. Serverless instances don't share memory,
 * so this is per instance: fine for a demo, paired with a per-match cap.
 */
export class RateLimiter {
  private hits = new Map<string, { start: number; count: number }>();
  constructor(private windowMs: number, private max: number) {}

  allow(key: string, now = Date.now()): boolean {
    const h = this.hits.get(key);
    if (!h || now - h.start >= this.windowMs) {
      this.hits.set(key, { start: now, count: 1 });
      this.sweep(now);
      return true;
    }
    if (h.count >= this.max) return false;
    h.count += 1;
    return true;
  }

  private sweep(now: number) {
    if (this.hits.size < 5000) return;
    for (const [k, v] of this.hits) if (now - v.start >= this.windowMs) this.hits.delete(k);
  }
}

import { AI_TIMEOUT_MS, MAX_AI_CALLS_PER_MATCH } from "@/lib/config";
import type { CommentaryRequest } from "./prompt";

/**
 * Ask the server for a live AI line. Resolves to null on timeout, error,
 * filtered output or when this match's AI budget is spent.
 */
export class AiCommentary {
  private calls = 0;
  private disabled = false;

  get remaining() {
    return this.disabled ? 0 : MAX_AI_CALLS_PER_MATCH - this.calls;
  }

  async line(req: CommentaryRequest, timeoutMs = AI_TIMEOUT_MS): Promise<string | null> {
    if (this.remaining <= 0) return null;
    this.calls += 1;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch("/api/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
      const data = (await res.json()) as { line: string | null; reason?: string };
      // no key configured: stop asking for the rest of the match
      if (data.reason === "no-key" || res.status === 429) this.disabled = true;
      return data.line ?? null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

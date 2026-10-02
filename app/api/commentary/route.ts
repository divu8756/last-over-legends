import { NextResponse } from "next/server";
import { AI_EVENTS, systemPrompt, userPrompt, type CommentaryRequest } from "@/commentary/prompt";
import { filterLine } from "@/commentary/filter";
import { RateLimiter } from "@/lib/rateLimit";
import { DEFAULT_GEMINI_MODEL, RATE_LIMIT } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = new RateLimiter(RATE_LIMIT.windowMs, RATE_LIMIT.max);
const SERVER_TIMEOUT_MS = 2300;
/** After Gemini says 429 (quota), stop calling it for a bit; the line bank covers. */
const QUOTA_COOLDOWN_MS = 20_000;
let coolUntil = 0;

const str = (v: unknown, max = 40) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(999, Math.round(v))) : 0);

function parse(body: unknown): CommentaryRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const event = str(b.event) as CommentaryRequest["event"];
  if (!AI_EVENTS.has(event)) return null;
  return {
    event,
    lang: b.lang === "en" ? "en" : "hi",
    batter: str(b.batter),
    bowler: str(b.bowler),
    team: str(b.team),
    opp: str(b.opp),
    need: num(b.need),
    balls: num(b.balls),
    wickets: num(b.wickets),
    runs: num(b.runs),
    target: num(b.target),
    summary: str(b.summary, 200),
    detail: AI_EVENTS.has(str(b.detail) as CommentaryRequest["event"]) ? (str(b.detail) as CommentaryRequest["detail"]) : undefined,
    recent: Array.isArray(b.recent) ? b.recent.slice(-3).map((x) => str(x, 200)) : [],
  };
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return NextResponse.json({ line: null, reason: "no-key" });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  if (!limiter.allow(ip)) return NextResponse.json({ line: null, reason: "rate-limited" }, { status: 429 });

  let r: CommentaryRequest | null = null;
  try {
    r = parse(await req.json());
  } catch {
    r = null;
  }
  if (!r) return NextResponse.json({ line: null, reason: "bad-request" }, { status: 400 });

  if (Date.now() < coolUntil) return NextResponse.json({ line: null, reason: "cooldown" });

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  // Lite models answer in well under a second; no thinking config so any model name works.
  const generationConfig: Record<string, unknown> = { temperature: 1, maxOutputTokens: 120 };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SERVER_TIMEOUT_MS);
  const call = (config: Record<string, unknown>) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(r.lang) }] },
        contents: [{ role: "user", parts: [{ text: userPrompt(r) }] }],
        generationConfig: config,
      }),
      signal: ctrl.signal,
    });
  try {
    const res = await call(generationConfig);
    if (!res.ok) {
      if (res.status === 429) coolUntil = Date.now() + QUOTA_COOLDOWN_MS;
      console.warn(`[commentary] Gemini ${model} returned ${res.status}`);
      return NextResponse.json({ line: null, reason: `upstream-${res.status}` });
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
    const line = filterLine(text, { allowed: [r.batter, r.bowler, r.team, r.opp], lang: r.lang });
    if (!line) console.warn(`[commentary] filtered: ${text.slice(0, 200)}`);
    return NextResponse.json({ line, reason: line ? "ok" : "filtered" });
  } catch {
    return NextResponse.json({ line: null, reason: "timeout" });
  } finally {
    clearTimeout(timer);
  }
}

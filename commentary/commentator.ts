import { AiCommentary } from "./ai";
import { LineBank, fill, type Vars } from "./bank";
import type { CommentaryEvent } from "./lines";
import { AI_EVENTS, type CommentaryRequest } from "./prompt";
import { Speaker } from "./speech";

export interface Caption {
  text: string;
  source: "bank" | "ai";
  id: number;
}

/** AI calls kept back for the result and the verdict. */
const RESERVED_FOR_END = 2;
const EXCITED = new Set<CommentaryEvent>(["six", "four", "win", "bowled", "caught", "lastBall", "hotStreak", "dropped", "save"]);
const END_EVENTS = new Set<CommentaryEvent>(["win", "loss", "tie"]);

export class Commentator {
  readonly speaker = new Speaker();
  private ai = new AiCommentary();
  private bank = new LineBank();
  private seq = 0;
  private waiting = false;

  constructor(private onCaption: (c: Caption) => void) {}

  setMuted(m: boolean) {
    this.speaker.muted = m;
    if (m) this.speaker.stop();
  }

  busy() {
    return this.waiting || this.speaker.speaking;
  }

  private emit(text: string, source: Caption["source"], event: CommentaryEvent) {
    const id = ++this.seq;
    this.onCaption({ text, source, id });
    this.speaker.say(text, EXCITED.has(event));
  }

  private request(event: CommentaryRequest["event"], vars: Vars, summary?: string): CommentaryRequest {
    return {
      event,
      batter: String(vars.name ?? ""),
      bowler: String(vars.bowler ?? ""),
      team: String(vars.team ?? ""),
      opp: String(vars.opp ?? ""),
      need: Number(vars.need ?? 0),
      balls: Number(vars.balls ?? 0),
      wickets: Number(vars.wickets ?? 0),
      runs: Number(vars.runs ?? 0),
      target: Number(vars.target ?? 0),
      summary,
    };
  }

  async moment(event: CommentaryEvent, vars: Vars) {
    const isEnd = END_EVENTS.has(event);
    const useAi = AI_EVENTS.has(event) && (isEnd || this.ai.remaining > RESERVED_FOR_END);
    if (!useAi) {
      this.emit(this.bank.pick(event, vars), "bank", event);
      return;
    }
    const mine = ++this.seq;
    this.waiting = true;
    const line = await this.ai.line(this.request(event, vars));
    this.waiting = false;
    // a newer moment already spoke: drop this one
    if (mine !== this.seq) return;
    this.emit(line ?? this.bank.pick(event, vars), line ? "ai" : "bank", event);
  }

  /** One-line verdict for the end card: AI when possible, template otherwise. */
  async verdict(vars: Vars, summary: string, won: boolean): Promise<{ text: string; source: Caption["source"] }> {
    const line = await this.ai.line(this.request("verdict", vars, summary));
    if (line) return { text: line, source: "ai" };
    const t = won
      ? "{name} held their nerve when it mattered. Bhaskar rates it: absolutely legendary!"
      : "{name} gave it everything, but {opp} had the last laugh. Come back stronger, champion!";
    return { text: fill(t, vars), source: "bank" };
  }

  stop() {
    this.speaker.stop();
  }
}

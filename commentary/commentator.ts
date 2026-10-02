import { AiCommentary } from "./ai";
import { LineBank, fill, type Vars } from "./bank";
import type { CommentaryEvent, Lang } from "./lines";
import type { CommentaryRequest } from "./prompt";
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

const VERDICT_FALLBACK: Record<Lang, { won: string; lost: string }> = {
  hi: {
    won: "{name} ने आख़िर में इज़्ज़त बचा ली। भास्कर की रेटिंग: एकदम लेजेंड, पर दिल का दौरा दिलाने वाले!",
    lost: "{name} ने कोशिश पूरी की, पर {opp} ने आख़िरी हंसी हंसी। प्रैक्टिस करो, चैंपियन!",
  },
  en: {
    won: "{name} held their nerve when it mattered. Bhaskar rates it: absolutely legendary!",
    lost: "{name} gave it everything, but {opp} had the last laugh. Come back stronger, champion!",
  },
};

/** Bhaskar speaks on every ball: an AI line when it arrives in time, the line bank otherwise. */
export class Commentator {
  readonly speaker: Speaker;
  private ai = new AiCommentary();
  private bank: LineBank;
  private seq = 0;
  private waiting = false;
  private recent: string[] = [];

  constructor(
    private onCaption: (c: Caption) => void,
    private lang: Lang = "hi",
  ) {
    this.speaker = new Speaker(lang);
    this.bank = new LineBank(lang);
  }

  setMuted(m: boolean) {
    this.speaker.muted = m;
    if (m) this.speaker.stop();
  }

  busy() {
    return this.waiting || this.speaker.speaking;
  }

  private emit(text: string, source: Caption["source"], event: CommentaryEvent) {
    // whoever speaks now supersedes any AI line still in flight
    this.waiting = false;
    this.recent = [...this.recent, text].slice(-3);
    this.onCaption({ text, source, id: ++this.seq });
    this.speaker.say(text, EXCITED.has(event));
  }

  private request(event: CommentaryRequest["event"], vars: Vars, summary?: string): CommentaryRequest {
    return {
      event,
      lang: this.lang,
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
      detail: typeof vars.ball === "string" ? (vars.ball as CommentaryEvent) : undefined,
      recent: this.recent,
    };
  }

  async moment(event: CommentaryEvent, vars: Vars) {
    const useAi = END_EVENTS.has(event) || this.ai.remaining > RESERVED_FOR_END;
    if (!useAi) {
      this.emit(this.bank.pick(event, vars), "bank", event);
      return;
    }
    const mine = ++this.seq;
    this.waiting = true;
    const line = await this.ai.line(this.request(event, vars));
    // a newer moment already took the mic: drop this one
    if (mine !== this.seq) return;
    this.emit(line ?? this.bank.pick(event, vars), line ? "ai" : "bank", event);
  }

  /** One-line verdict for the end card: AI when possible, template otherwise. */
  async verdict(vars: Vars, summary: string, won: boolean): Promise<{ text: string; source: Caption["source"] }> {
    const line = await this.ai.line(this.request("verdict", vars, summary));
    if (line) return { text: line, source: "ai" };
    const t = VERDICT_FALLBACK[this.lang];
    return { text: fill(won ? t.won : t.lost, vars), source: "bank" };
  }

  stop() {
    this.speaker.stop();
  }
}

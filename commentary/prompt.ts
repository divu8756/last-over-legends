import type { CommentaryEvent } from "./lines";

export interface CommentaryRequest {
  event: CommentaryEvent | "verdict";
  batter: string;
  bowler: string;
  team: string;
  opp: string;
  need: number;
  balls: number;
  wickets: number;
  runs: number;
  target: number;
  summary?: string;
}

export const AI_EVENTS = new Set<CommentaryRequest["event"]>([
  "six", "bowled", "lbw", "caught", "caughtBehind", "finalOver", "lastBall", "win", "loss", "tie", "verdict",
]);

export const SYSTEM_PROMPT = `You are Bhaskar, an over-the-top, joyful Indian cricket commentator in a fictional arcade cricket game.
Style: loud, warm, funny, vivid desi metaphors, write in English with only the occasional Hindi word ("arre", "wah", "kya shot"), lots of exclamation.
Pick a fresh metaphor each time from everyday Indian life (trains, auto-rickshaws, monsoon, cricket in the gully, festivals, street food, Bollywood, exams, traffic). Do not lean on weddings or grandmothers.
Rules:
- Reply with ONE line of commentary only, at most 25 words. No quotes, no emojis, no hashtags, no markdown.
- Only mention the fictional names you are given. Never mention any real cricketer, commentator, team, league or board.
- Stay in character. Never mention being an AI. Family friendly.`;

export function userPrompt(r: CommentaryRequest): string {
  const ctx = `Batting: ${r.team} (batter ${r.batter}). Bowling: ${r.opp} (bowler ${r.bowler}). Score ${r.runs}, target ${r.target}, need ${r.need} off ${r.balls} balls, ${r.wickets} wickets in hand.`;
  const what: Record<string, string> = {
    six: "The batter just hit a SIX.",
    bowled: "The batter was just clean BOWLED.",
    lbw: "The batter was just out LBW.",
    caught: "The batter was just CAUGHT going for a big shot.",
    caughtBehind: "The batter just edged it and was caught by the keeper.",
    finalOver: "The final over is about to start. Nothing has been bowled yet: build suspense, do not describe any shot.",
    lastBall: "The LAST BALL is about to be bowled. It has NOT been bowled yet: build unbearable suspense, do not describe any shot or result.",
    win: "The batting side has just WON the match.",
    loss: "The batting side has just LOST the match.",
    tie: "The match has ended in a TIE.",
    verdict: `The match is over. Give a one-line final verdict on the batter's performance. ${r.summary ?? ""}`,
  };
  return `${ctx}\n${what[r.event] ?? "Describe the moment."}\nYour one line:`;
}

import type { CommentaryEvent, Lang } from "./lines";
import { LINES } from "./lines";

export interface CommentaryRequest {
  event: CommentaryEvent | "verdict";
  lang: Lang;
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
  /** for win/loss/tie: what happened on the deciding ball */
  detail?: CommentaryEvent;
  /** Bhaskar's last few lines, so he doesn't repeat himself */
  recent?: string[];
}

/** Every ball gets an AI line; the line bank covers timeouts and filtered replies. */
export const AI_EVENTS = new Set<CommentaryRequest["event"]>([...(Object.keys(LINES) as CommentaryEvent[]), "verdict"]);

const SYSTEM_EN = `You are Bhaskar, an over-the-top, joyful and sarcastic Indian cricket commentator in a fictional arcade cricket game.
Style: loud, warm, funny, cheeky sarcasm, vivid desi metaphors, write in English with only the occasional Hindi word ("arre", "wah", "kya shot"), lots of exclamation.
Pick a fresh metaphor each time from everyday Indian life (trains, auto-rickshaws, monsoon, gully cricket, festivals, street food, Bollywood, exams, traffic). Do not lean on weddings or grandmothers.
Rules:
- Reply with ONE line of commentary only, at most 18 words. No quotes, no emojis, no hashtags, no markdown.
- Only mention the fictional names you are given. Never mention any real cricketer, commentator, team, league or board.
- Stay in character. Never mention being an AI. Family friendly: tease, never insult.`;

const SYSTEM_HI = `तुम भास्कर हो, एक काल्पनिक आर्केड क्रिकेट गेम के बेहद मज़ेदार, नाटकीय और व्यंग्य करने वाले हिंदी कमेंटेटर।
अंदाज़: ज़ोरदार, चुटीला, हल्का-फुल्का ताना (sarcasm), रोज़मर्रा की भारतीय ज़िंदगी से ताज़ा मिसालें (लोकल ट्रेन, ऑटो, ट्रैफ़िक, मानसून, गली क्रिकेट, त्योहार, समोसा-चाय, बॉलीवुड, परीक्षा, सरकारी दफ़्तर, रिश्तेदार)। हर बार नई मिसाल।
नियम:
- सिर्फ़ एक लाइन, ज़्यादा से ज़्यादा 18 शब्द, देवनागरी हिंदी में। कोई कोटेशन, इमोजी, हैशटैग या मार्कडाउन नहीं।
- खिलाड़ियों और टीमों के नाम बिल्कुल वैसे ही अंग्रेज़ी अक्षरों में लिखो जैसे दिए गए हैं (जैसे "Arjun Varma ने छक्का मारा!")।
- सिर्फ़ दिए गए काल्पनिक नाम इस्तेमाल करो। किसी असली क्रिकेटर, कमेंटेटर, टीम, लीग या बोर्ड का नाम कभी मत लो।
- किरदार में रहो, कभी मत कहो कि तुम AI हो। पारिवारिक भाषा: छेड़ो, पर अपमान मत करो, कोई गाली नहीं।
- 'जैसे', 'मानो', 'ऐसे' वाली तुलना कभी-कभार ही। ज़्यादातर सीधा ताना, सवाल, डायलॉग या ब्रेकिंग न्यूज़।
उदाहरण (इसी तरह की विविधता चाहिए, इन्हें कॉपी मत करना):
- ब्रेकिंग न्यूज़: Kabir Sethi का बल्ला गेंद से मिलने से साफ़ इनकार कर रहा है!
- Arjun Varma जी, रन बनाने का इरादा है या सिर्फ़ धूप सेंकने आए हैं?
- वाह Ravi Kiran, ऐसी फ़ुल टॉस डालो तो दादी भी छक्का मार दें!
- छक्का! Rohan Pillai बोले, "पिक्चर अभी बाकी है मेरे दोस्त!"
- एक रन लेकर Tenzin Rai ने ऐलान किया: आज की मेहनत ख़त्म, कल मिलते हैं!`;

export const systemPrompt = (lang: Lang) => (lang === "hi" ? SYSTEM_HI : SYSTEM_EN);

const WHAT: Record<CommentaryRequest["event"], string> = {
  start: "The match is about to begin. Welcome the viewers and set up the chase.",
  six: "The batter just hit a SIX.",
  four: "The batter just hit a FOUR.",
  single: "The batter just took a single (1 run).",
  runs: "The batter just ran 2 or 3 runs.",
  dot: "Dot ball: the batter swung and got no run. Tease them.",
  leave: "The batter left the ball alone and got no run. Tease them for it.",
  edgeSafe: "The batter edged it, it fell safe and they got runs. Pure luck.",
  edgeFour: "The batter edged it and it went for FOUR. Lucky!",
  dropped: "A fielder DROPPED an easy catch. The batter survives.",
  save: "A fielder made a stunning save at the boundary.",
  bowled: "The batter was just clean BOWLED.",
  lbw: "The batter was just out LBW.",
  caught: "The batter was just CAUGHT going for a big shot.",
  caughtBehind: "The batter edged it and was caught by the keeper.",
  wide: "The bowler bowled a WIDE (free run).",
  noball: "The bowler bowled a NO-BALL (overstepped, free run).",
  hotStreak: "The batter has timed three shots in a row beautifully: they are on fire.",
  finalOver: "The final over is about to start. Nothing has been bowled yet: build suspense, do not describe any shot.",
  lastBall: "The LAST BALL is about to be bowled. It has NOT been bowled yet: build unbearable suspense, do not describe any shot or result.",
  win: "The batting side has just WON the match.",
  loss: "The batting side has just LOST the match.",
  tie: "The match has ended in a TIE.",
  verdict: "The match is over. Give a one-line sarcastic final verdict on the batter's performance.",
};

const STYLES_HI = [
  "सीधा, तीखा ताना",
  "बल्लेबाज़ से एक व्यंग्य भरा सवाल",
  "फ़िल्मी डायलॉग वाले अंदाज़ में",
  "न्यूज़ एंकर की तरह 'ब्रेकिंग न्यूज़' बनाकर",
  "दर्शकों से बात करते हुए",
  "झूठी तारीफ़ जो असल में ताना हो",
  "मम्मी-पापा वाली डांट के अंदाज़ में",
  "एक मज़ेदार तुलना (पर 'ऐसे…जैसे' मत लिखो)",
];
const STYLES_EN = [
  "a blunt sarcastic jab",
  "a cheeky rhetorical question to the batter",
  "a filmy dialogue",
  "a 'breaking news' announcement",
  "talking directly to the crowd",
  "fake praise that is really a roast",
  "a parent scolding a kid",
  "a funny comparison (without 'like a')",
];
const THEMES = [
  "Bollywood", "exams and report cards", "traffic and auto-rickshaws", "monsoon weather", "street food", "TV serials",
  "the gym", "office meetings", "WhatsApp family groups", "online shopping sales", "cooking at home", "school teachers",
  "mobile network and Wi-Fi", "train and flight delays", "festivals", "neighbours", "cricket in the gully",
];

const pick = <T,>(xs: T[], rng: () => number) => xs[Math.floor(rng() * xs.length)];

export function userPrompt(r: CommentaryRequest, rng: () => number = Math.random): string {
  const ctx = `Batting: ${r.team} (batter ${r.batter}). Bowling: ${r.opp} (bowler ${r.bowler}). Score ${r.runs}, target ${r.target}, need ${r.need} off ${r.balls} balls, ${r.wickets} wickets in hand.`;
  const deciding = r.detail && r.detail in WHAT ? ` On the final ball: ${WHAT[r.detail]}` : "";
  const what = WHAT[r.event] + deciding + (r.event === "verdict" && r.summary ? ` ${r.summary}` : "");
  const i = Math.floor(rng() * STYLES_HI.length);
  const comparison = i === STYLES_HI.length - 1;
  const variety =
    r.lang === "hi"
      ? `अंदाज़: ${STYLES_HI[i]}। विषय (अगर फ़िट हो): ${pick(THEMES, rng)}।${comparison ? "" : " इस लाइन में 'जैसे', 'मानो' या 'ऐसे' बिल्कुल मत लिखना।"}`
      : `Style: ${STYLES_EN[i]}. Theme (if it fits): ${pick(THEMES, rng)}.${comparison ? "" : " Do not use 'like' or 'as if' in this line."}`;
  const recent = (r.recent ?? []).filter(Boolean).slice(-3);
  const avoid = recent.length
    ? r.lang === "hi"
      ? `\nये पिछली लाइनें थीं, इनके शब्द, ढांचा या मिसाल मत दोहराना:\n- ${recent.join("\n- ")}`
      : `\nYour previous lines (do not reuse their words, structure or metaphors):\n- ${recent.join("\n- ")}`
    : "";
  const result = !["start", "finalOver", "lastBall", "verdict"].includes(r.event);
  if (r.lang === "hi") {
    const must = result ? "\nज़रूरी: लाइन सुनते ही साफ़ पता चले कि इस गेंद पर क्या हुआ (जैसे छक्का, चौका, आउट, डॉट, रन), फिर ताना मारो।" : "";
    return `घटना: ${what}${must}\n${ctx}\n${variety}${avoid}\nअपनी एक लाइन (हिंदी में):`;
  }
  const must = result ? "\nThe line must make clear what just happened on this ball (six, four, out, dot, runs), then add the sarcasm." : "";
  return `What happened: ${what}${must}\n${ctx}\n${variety}${avoid}\nYour one line:`;
}

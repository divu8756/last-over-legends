import { MAX_AI_WORDS } from "@/lib/config";

/** Real cricketers and broadcasters Bhaskar must never mention. */
export const BANNED_NAMES = [
  "kohli", "virat", "dhoni", "tendulkar", "sachin", "rohit", "sharma", "bumrah", "jadeja", "pandya",
  "gavaskar", "kapil", "dravid", "ganguly", "sehwag", "yuvraj", "gambhir", "ashwin", "shami", "siraj",
  "gill", "rishabh", "rahul dravid", "kl rahul", "surya", "suryakumar", "hardik", "jaiswal", "iyer", "kumble",
  "laxman", "tendlya", "bradman", "ponting", "warne", "lara", "richards", "akram", "waqar", "babar",
  "afridi", "shoaib", "stokes", "anderson", "buttler", "smith", "warner", "cummins",
  "starc", "maxwell", "williamson", "boult", "rabada", "de villiers", "gayle", "pollard", "russell",
  "rashid", "shastri", "bhogle", "harsha", "manjrekar", "chopra", "nasser", "hussain", "atherton",
  "michael holding", "benaud", "boycott", "ipl", "bcci", "icc",
];

const OUT_OF_CHARACTER = [
  /as an ai/i, /language model/i, /i cannot/i, /i can't/i, /i'm sorry/i, /i am sorry/i,
  /\bbhaskar here\b.*\bai\b/i, /http/i, /[#*_`<>{}\[\]]/,
];

export interface FilterOptions {
  /** fictional names from the current match that are allowed */
  allowed: string[];
}

/** Common capitalised words that are not names. */
const COMMON = new Set(
  (
    "Oh My What A The And But So It That This He His Him They We You I Up Out Six Four Two One Three Five " +
    "Ladies Gentlemen Super Over Overs Death Daily Challenge Bhaskar Boom Wow Yes No Not Never Ever Hold Somebody " +
    "Absolutely Unbelievable Incredible Massive Beautiful Brilliant Stunning Timber Dropped Bowled Caught Plumb Wide " +
    "Last Ball Final Here Now Go Let Lets Let's Is Are Was Were Into Over Off On At In To Of For With Every Just What's " +
    "Namaste Good Evening Night Crowd Stadium God Gods Mother Grandmother Uncle Diwali Holi Monsoon Mumbai Delhi Chennai " +
    "Kolkata Bengaluru Howrah India Indian Ladies Sir Madam Chai Samosa Hai Arre Bhai Wah Kya Baat Shabash Bas"
  ).split(" "),
);

/** Returns a clean line, or null if Bhaskar broke character. */
export function filterLine(raw: string, opts: FilterOptions): string | null {
  let line = raw.replace(/\s+/g, " ").trim().replace(/^["'“”]+|["'“”]+$/g, "").trim();
  if (!line) return null;
  if (line.split(" ").length > MAX_AI_WORDS) return null;
  if (OUT_OF_CHARACTER.some((r) => r.test(line))) return null;

  const lower = line.toLowerCase();
  if (BANNED_NAMES.some((n) => new RegExp(`\\b${n}\\b`).test(lower))) return null;

  // Anything that looks like "Firstname Lastname" must be one of our fictional players.
  const allowedWords = new Set(opts.allowed.flatMap((n) => n.split(/\s+/)));
  const pairs = line.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? [];
  for (const pair of pairs) {
    const words = pair.split(/\s+/).filter((w) => !COMMON.has(w) && !allowedWords.has(w));
    if (words.length >= 2) return null;
  }
  if (!/[.!?…]$/.test(line)) line += "!";
  return line;
}

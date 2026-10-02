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

/** The same people written in Devanagari. */
export const BANNED_NAMES_HI = [
  "कोहली", "विराट", "धोनी", "तेंदुलकर", "सचिन", "रोहित", "शर्मा", "बुमराह", "जडेजा", "पांड्या", "हार्दिक",
  "गावस्कर", "कपिल", "द्रविड़", "गांगुली", "सहवाग", "युवराज", "गंभीर", "अश्विन", "शमी", "सिराज", "गिल",
  "ऋषभ", "पंत", "सूर्यकुमार", "जायसवाल", "अय्यर", "कुंबले", "लक्ष्मण", "ब्रैडमैन", "पोंटिंग", "वॉर्न",
  "लारा", "अकरम", "बाबर", "अफरीदी", "शोएब", "स्टोक्स", "स्मिथ", "वॉर्नर", "गेल", "शास्त्री", "भोगले",
  "मांजरेकर", "चोपड़ा", "आईपीएल", "बीसीसीआई", "आईसीसी",
];

const OUT_OF_CHARACTER = [
  /एआई/, /भाषा मॉडल/, /मैं (एक )?(AI|ए\.?आई)/i, /माफ़ (कीजिए|करें)/,
  /as an ai/i, /language model/i, /i cannot/i, /i can't/i, /i'm sorry/i, /i am sorry/i,
  /\bbhaskar here\b.*\bai\b/i, /http/i, /[#*_`<>{}\[\]]/,
];

export interface FilterOptions {
  /** fictional names from the current match that are allowed */
  allowed: string[];
  /** expected language: a Hindi request must come back mostly in Devanagari */
  lang?: "hi" | "en";
}

const DEVANAGARI = /[\u0900-\u097F]/g;

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
  // whole words only: गिल must not match गिल्लियां ("bails")
  if (BANNED_NAMES_HI.some((n) => new RegExp(`(?<![\\p{L}\\p{M}])${n}(?![\\p{L}\\p{M}])`, "u").test(line))) return null;

  if (opts.lang === "hi") {
    const letters = line.replace(/[^\p{L}]/gu, "").length;
    const deva = (line.match(DEVANAGARI) ?? []).length;
    if (letters === 0 || deva / letters < 0.5) return null;
  }

  // Anything that looks like "Firstname Lastname" must be one of our fictional players.
  const allowedWords = new Set(opts.allowed.flatMap((n) => n.split(/\s+/)));
  const pairs = line.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? [];
  for (const pair of pairs) {
    const words = pair.split(/\s+/).filter((w) => !COMMON.has(w) && !allowedWords.has(w));
    if (words.length >= 2) return null;
  }
  if (!/[.!?…।]$/.test(line)) line += "!";
  return line;
}

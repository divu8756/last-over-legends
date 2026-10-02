import { describe, expect, it } from "vitest";
import { LINES } from "@/commentary/lines";
import { LINES_HI } from "@/commentary/lines/hi";
import { LineBank, fill } from "@/commentary/bank";
import { filterLine } from "@/commentary/filter";
import { RateLimiter } from "@/lib/rateLimit";

describe("line bank", () => {
  it("has 150+ lines", () => {
    expect(Object.values(LINES).flat().length).toBeGreaterThanOrEqual(150);
  });

  it("never repeats until the event's lines are exhausted", () => {
    const bank = new LineBank("en");
    const n = LINES.six.length;
    const seen = new Set<string>();
    for (let i = 0; i < n; i++) seen.add(bank.pick("six", { name: "A", need: 1, balls: 1, bowler: "B" }));
    expect(seen.size).toBe(n);
  });

  it("fills placeholders", () => {
    expect(fill("{name} needs {need}", { name: "Arjun Varma", need: 4 })).toBe("Arjun Varma needs 4");
  });

  it("has no real player names", () => {
    for (const line of Object.values(LINES).flat()) {
      expect(filterLine(fill(line, { name: "Arjun Varma", bowler: "Ravi Kiran", team: "Desert Falcons", opp: "Delta Dynamos", need: 4, balls: 2 }), {
        allowed: ["Arjun Varma", "Ravi Kiran", "Desert Falcons", "Delta Dynamos"],
      })).not.toBeNull();
    }
  });
});

describe("Hindi commentary", () => {
  const vars = { name: "Arjun Varma", bowler: "Ravi Kiran", team: "Desert Falcons", opp: "Delta Dynamos", need: 4, balls: 2 };
  const allowed = ["Arjun Varma", "Ravi Kiran", "Desert Falcons", "Delta Dynamos"];

  it("covers every event with 150+ lines", () => {
    for (const ev of Object.keys(LINES)) expect(LINES_HI[ev as keyof typeof LINES].length).toBeGreaterThan(2);
    expect(Object.values(LINES_HI).flat().length).toBeGreaterThanOrEqual(150);
  });

  it("every Hindi bank line passes the Hindi filter", () => {
    for (const line of Object.values(LINES_HI).flat()) {
      expect(filterLine(fill(line, vars), { allowed, lang: "hi" }), line).not.toBeNull();
    }
  });

  it("the default bank speaks Hindi", () => {
    expect(new LineBank().pick("six", vars)).toMatch(/[\u0900-\u097F]/);
  });

  it("rejects real names written in Devanagari, but not lookalike words", () => {
    expect(filterLine("ये शॉट तो कोहली जैसा था!", { allowed, lang: "hi" })).toBeNull();
    expect(filterLine("धोनी स्टाइल फ़िनिश!", { allowed, lang: "hi" })).toBeNull();
    expect(filterLine("गिल्लियां हवा में उड़ गईं!", { allowed, lang: "hi" })).not.toBeNull();
  });

  it("rejects an English reply when Hindi was asked for", () => {
    expect(filterLine("What a shot from Arjun Varma!", { allowed, lang: "hi" })).toBeNull();
    expect(filterLine("Arjun Varma ने गेंद को चांद पर भेज दिया!", { allowed, lang: "hi" })).not.toBeNull();
  });

  it("rejects out-of-character Hindi", () => {
    expect(filterLine("मैं एक एआई हूं, क्रिकेट नहीं देख सकता।", { allowed, lang: "hi" })).toBeNull();
  });
});

describe("AI line filter", () => {
  const opts = { allowed: ["Arjun Varma", "Ravi Kiran", "Monsoon Mavericks"] };

  it("keeps in-character lines", () => {
    expect(filterLine("Arre wah! Arjun Varma has sent that into orbit!", opts)).toBe("Arre wah! Arjun Varma has sent that into orbit!");
  });

  it("rejects real names", () => {
    expect(filterLine("That's a shot Kohli would be proud of!", opts)).toBeNull();
    expect(filterLine("Pure Dhoni-style finish!", opts)).toBeNull();
  });

  it("rejects unknown full names", () => {
    expect(filterLine("Just like Rahul Mehta used to do it!", opts)).toBeNull();
  });

  it("rejects out-of-character and long replies", () => {
    expect(filterLine("As an AI, I cannot watch cricket.", opts)).toBeNull();
    expect(filterLine(Array(40).fill("word").join(" "), opts)).toBeNull();
    expect(filterLine("**SIX!**", opts)).toBeNull();
  });

  it("strips quotes and adds punctuation", () => {
    expect(filterLine('"What a shot from Arjun Varma"', opts)).toBe("What a shot from Arjun Varma!");
  });
});

describe("rate limiter", () => {
  it("allows up to max per window, then resets", () => {
    const rl = new RateLimiter(1000, 3);
    expect([rl.allow("ip", 0), rl.allow("ip", 1), rl.allow("ip", 2), rl.allow("ip", 3)]).toEqual([true, true, true, false]);
    expect(rl.allow("other", 3)).toBe(true);
    expect(rl.allow("ip", 1001)).toBe(true);
  });
});

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TEAMS } from "@/data/teams";
import type { Difficulty } from "@/game/engine/types";
import type { Lang } from "@/commentary/lines";
import { istDate } from "@/game/engine/match";
import { load, loadProfile, save } from "@/lib/storage";

const DIFFS: { id: Difficulty; name: string; key: string }[] = [
  { id: "gully", name: "Gully", key: "1" },
  { id: "club", name: "Club", key: "2" },
  { id: "international", name: "International", key: "3" },
];

const PREFS_KEY = "lol-prefs-v1";

const Kbd = ({ children }: { children: React.ReactNode }) => <kbd className="kbd only-mouse-inline">{children}</kbd>;

export default function Home() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>("club");
  const [team, setTeam] = useState(TEAMS[0].id);
  const [lang, setLang] = useState<Lang>("hi");
  const [dailyDone, setDailyDone] = useState<null | { won: boolean; runs: number; target: number }>(null);

  useEffect(() => {
    const p = load(PREFS_KEY, { difficulty: "club" as Difficulty, team: TEAMS[0].id, lang: "hi" as Lang });
    setDifficulty(p.difficulty);
    setTeam(p.team);
    setLang(p.lang);
    setDailyDone(loadProfile().daily[istDate()] ?? null);
  }, []);

  useEffect(() => save(PREFS_KEY, { difficulty, team, lang }), [difficulty, team, lang]);

  const q = `?d=${difficulty}&team=${team}&lang=${lang}`;

  // the whole title screen works from the keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const go = (href: string) => {
        e.preventDefault();
        router.push(href);
      };
      if (k === "enter" || k === " ") go(`/play/super-over${q}`);
      else if (k === "d") go(`/play/death-overs${q}`);
      else if (k === "c") go(`/play/daily?lang=${lang}`);
      else if (k === "l") go("/locker");
      else if (k === "h") setLang((l) => (l === "hi" ? "en" : "hi"));
      else if (k === "1" || k === "2" || k === "3") setDifficulty(DIFFS[Number(k) - 1].id);
      else if (k === "arrowright" || k === "arrowleft") {
        e.preventDefault();
        setTeam((t) => {
          const i = TEAMS.findIndex((x) => x.id === t);
          return TEAMS[(i + (k === "arrowright" ? 1 : TEAMS.length - 1)) % TEAMS.length].id;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, q, lang]);

  return (
    <main className="home">
      <h1 className="logo">
        LAST OVER<span>LEGENDS</span>
      </h1>
      <p className="tagline">One over. One chase. One mad commentator called Bhaskar. Time your shots, swing for the stands, become a legend.</p>

      <Link className="play-big" href={`/play/super-over${q}`}>
        ▶ PLAY SUPER OVER <Kbd>Enter</Kbd>
      </Link>

      <div className="mode-grid">
        <Link className="mode-card" href={`/play/death-overs${q}`}>
          <strong>
            💀 Death Overs <Kbd>D</Kbd>
          </strong>
          <small>3 overs, big target, more wickets</small>
        </Link>
        <Link className="mode-card" href={`/play/daily?lang=${lang}`}>
          <strong>
            📅 Daily Challenge <Kbd>C</Kbd>
          </strong>
          <small>{dailyDone ? `Today: ${dailyDone.won ? "WON" : "lost"} (${dailyDone.runs}/${dailyDone.target})` : "Same balls for everyone today"}</small>
        </Link>
        <Link className="mode-card" href="/locker">
          <strong>
            🏆 Locker <Kbd>L</Kbd>
          </strong>
          <small>Achievements, stats, jerseys</small>
        </Link>
      </div>

      <section className="panel">
        <p className="label">
          Commentary <Kbd>H</Kbd>
        </p>
        <div className="row">
          <button className="chip" aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>
            हिंदी
          </button>
          <button className="chip" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
            English
          </button>
        </div>
        <p className="label" style={{ marginTop: 14 }}>
          Difficulty <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd>
        </p>
        <div className="row">
          {DIFFS.map((d) => (
            <button key={d.id} className="chip" aria-pressed={difficulty === d.id} onClick={() => setDifficulty(d.id)}>
              {d.name}
            </button>
          ))}
        </div>
        <p className="label" style={{ marginTop: 14 }}>
          Your team <Kbd>←</Kbd> <Kbd>→</Kbd>
        </p>
        <div className="row">
          {TEAMS.map((t) => (
            <button key={t.id} className="chip" aria-pressed={team === t.id} onClick={() => setTeam(t.id)}>
              <span className="team-dot" style={{ background: t.primary }} />
              {t.name}
            </button>
          ))}
        </div>
      </section>

      <section className="panel" style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
        <p className="label">How to bat</p>
        <p className="only-touch" style={{ margin: 0 }}>
          As the ball arrives, <b style={{ color: "var(--text)" }}>tap</b> the left, middle or right of the screen to play to leg, straight or off.{" "}
          <b style={{ color: "var(--text)" }}>Swipe up</b> to loft it: big risk, big reward. Landscape gives the widest view, but portrait works too.
        </p>
        <p className="only-mouse" style={{ margin: 0 }}>
          Keyboard only, no mouse needed. As the ball arrives press <b style={{ color: "var(--text)" }}>A S D</b> for ground shots or{" "}
          <b style={{ color: "var(--text)" }}>Q W E</b> to loft (leg / straight / off). Arrow keys work too (<b style={{ color: "var(--text)" }}>↑</b> or Shift
          to loft). <b style={{ color: "var(--text)" }}>Space</b> bowls the next ball, <b style={{ color: "var(--text)" }}>Esc</b> pause,{" "}
          <b style={{ color: "var(--text)" }}>M</b> mute, <b style={{ color: "var(--text)" }}>F</b> fullscreen.
        </p>
        <p style={{ margin: "8px 0 0" }}>Match the line of the ball for more boundaries. Turn your sound on for Bhaskar!</p>
      </section>
    </main>
  );
}

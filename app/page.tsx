"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TEAMS } from "@/data/teams";
import type { Difficulty } from "@/game/engine/types";
import { istDate } from "@/game/engine/match";
import { load, loadProfile, save } from "@/lib/storage";

const DIFFS: { id: Difficulty; name: string }[] = [
  { id: "gully", name: "Gully" },
  { id: "club", name: "Club" },
  { id: "international", name: "International" },
];

const PREFS_KEY = "lol-prefs-v1";

export default function Home() {
  const [difficulty, setDifficulty] = useState<Difficulty>("club");
  const [team, setTeam] = useState(TEAMS[0].id);
  const [dailyDone, setDailyDone] = useState<null | { won: boolean; runs: number; target: number }>(null);

  useEffect(() => {
    const p = load(PREFS_KEY, { difficulty: "club" as Difficulty, team: TEAMS[0].id });
    setDifficulty(p.difficulty);
    setTeam(p.team);
    setDailyDone(loadProfile().daily[istDate()] ?? null);
  }, []);

  useEffect(() => save(PREFS_KEY, { difficulty, team }), [difficulty, team]);

  const q = `?d=${difficulty}&team=${team}`;

  return (
    <main className="home">
      <h1 className="logo">
        LAST OVER<span>LEGENDS</span>
      </h1>
      <p className="tagline">One over. One chase. One mad commentator called Bhaskar. Time your shots, swing for the stands, become a legend.</p>

      <Link className="play-big" href={`/play/super-over${q}`}>
        ▶ PLAY SUPER OVER
      </Link>

      <div className="mode-grid">
        <Link className="mode-card" href={`/play/death-overs${q}`}>
          <strong>💀 Death Overs</strong>
          <small>3 overs, big target, more wickets</small>
        </Link>
        <Link className="mode-card" href={`/play/daily`}>
          <strong>📅 Daily Challenge</strong>
          <small>{dailyDone ? `Today: ${dailyDone.won ? "WON" : "lost"} (${dailyDone.runs}/${dailyDone.target})` : "Same balls for everyone today"}</small>
        </Link>
        <Link className="mode-card" href="/locker">
          <strong>🏆 Locker</strong>
          <small>Achievements, stats, jerseys</small>
        </Link>
      </div>

      <section className="panel">
        <p className="label">Difficulty</p>
        <div className="row">
          {DIFFS.map((d) => (
            <button key={d.id} className="chip" aria-pressed={difficulty === d.id} onClick={() => setDifficulty(d.id)}>
              {d.name}
            </button>
          ))}
        </div>
        <p className="label" style={{ marginTop: 14 }}>
          Your team
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
        <b style={{ color: "var(--text)" }}>Tap</b> left, middle or right of the screen as the ball arrives to play to leg, straight or off.{" "}
        <b style={{ color: "var(--text)" }}>Swipe up</b> to loft it: big risk, big reward. On a keyboard: <b style={{ color: "var(--text)" }}>A S D</b> ground,{" "}
        <b style={{ color: "var(--text)" }}>Q W E</b> lofted. Match the line of the ball for more boundaries. Turn your sound on for Bhaskar!
      </section>
    </main>
  );
}

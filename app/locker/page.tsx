"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ACHIEVEMENTS, JERSEYS } from "@/data/achievements";
import { DEFAULT_PROFILE, loadProfile, saveProfile, type Profile } from "@/lib/storage";

export default function Locker() {
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE);
  useEffect(() => setP(loadProfile()), []);

  function wear(id: string) {
    const next = { ...p, jersey: id };
    setP(next);
    saveProfile(next);
  }

  const stats: [string, number][] = [
    ["Matches", p.matches],
    ["Wins", p.wins],
    ["Sixes", p.sixes],
    ["Fours", p.fours],
    ["Best chase", p.bestChase],
  ];

  return (
    <main className="locker">
      <Link href="/" className="btn">
        ← Home
      </Link>
      <h1>🏆 Locker</h1>

      <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
        {stats.map(([k, v]) => (
          <div key={k}>
            <b>{v}</b>
            <span>{k}</span>
          </div>
        ))}
      </div>

      <h2 className="section">Jerseys</h2>
      <div className="row">
        {JERSEYS.map((j) => {
          const open = p.achievements.length >= j.need;
          const bg = "primary" in j ? `linear-gradient(135deg, ${j.primary} 60%, ${j.secondary} 60%)` : "linear-gradient(135deg, #888 50%, #444 50%)";
          return (
            <button key={j.id} className="jersey" disabled={!open} aria-pressed={p.jersey === j.id} onClick={() => wear(j.id)}>
              <span className="swatch" style={{ background: bg }} />
              {j.name}
              <small style={{ color: "var(--muted)" }}>{open ? (p.jersey === j.id ? "Wearing" : "Wear") : `🔒 ${j.need} achievements`}</small>
            </button>
          );
        })}
      </div>

      <h2 className="section">
        Achievements · {p.achievements.length}/{ACHIEVEMENTS.length}
      </h2>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const got = p.achievements.includes(a.id);
          return (
            <div key={a.id} className={got ? "ach" : "ach locked"}>
              <strong>
                {got ? "🏆" : "🔒"} {a.name}
              </strong>
              <small>{a.desc}</small>
            </div>
          );
        })}
      </div>
    </main>
  );
}

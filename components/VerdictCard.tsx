"use client";

import Link from "next/link";
import { useState } from "react";
import type { MatchState } from "@/game/engine/match";
import { summarise } from "@/lib/progress";
import { shareCard, shareOrDownload } from "@/lib/share";
import { ACHIEVEMENTS } from "@/data/achievements";

export default function VerdictCard({
  match,
  verdict,
  unlocked,
  onAgain,
}: {
  match: MatchState;
  verdict: { text: string; source: "ai" | "bank" } | null;
  unlocked: string[];
  onAgain: () => void;
}) {
  const [status, setStatus] = useState("");
  const s = summarise(match);
  const title = match.status === "won" ? "YOU WON!" : match.status === "tied" ? "TIED!" : "SO CLOSE";
  const color = match.status === "won" ? "var(--green)" : match.status === "tied" ? "var(--gold)" : "var(--red)";
  const short = match.config.target - match.runs;

  async function share() {
    setStatus("Making your card…");
    const blob = await shareCard(match, verdict?.text ?? "");
    if (!blob) return setStatus("Couldn't draw the card.");
    const how = await shareOrDownload(blob, `I ${match.status} a ${match.config.label} chase in Last Over Legends!`);
    setStatus(how === "shared" ? "Shared!" : "Saved as PNG");
  }

  return (
    <div className="overlay">
      <div className="card">
        <p className="label" style={{ margin: 0 }}>
          {match.config.label}
        </p>
        <h2 style={{ color }}>{title}</h2>
        <div style={{ fontSize: 22, fontWeight: 800 }}>
          {match.runs}/{match.wickets} <span style={{ color: "var(--muted)", fontSize: 15 }}>chasing {match.config.target}</span>
        </div>
        {match.status === "lost" && short > 0 && <div style={{ color: "var(--muted)" }}>Short by {short}</div>}
        <div className="stats">
          <div>
            <b>{s.sixes}</b>
            <span>sixes</span>
          </div>
          <div>
            <b>{s.fours}</b>
            <span>fours</span>
          </div>
          <div>
            <b>{s.dots}</b>
            <span>dots</span>
          </div>
          <div>
            <b>{s.ballsFaced}</b>
            <span>balls</span>
          </div>
        </div>
        <p className="verdict">
          {verdict ? (
            <>
              “{verdict.text}”
              <br />
              <small style={{ color: "var(--muted)" }}>— Bhaskar{verdict.source === "ai" && <span className="ai-tag">LIVE</span>}</small>
            </>
          ) : (
            "Bhaskar is collecting his thoughts…"
          )}
        </p>
        {unlocked.map((id) => {
          const a = ACHIEVEMENTS.find((x) => x.id === id);
          return a ? (
            <div key={id} className="unlock">
              🏆 Unlocked: <b>{a.name}</b>: {a.desc}
            </div>
          ) : null;
        })}
        <div className="btn-row">
          {match.config.mode !== "daily" && (
            <button className="btn primary" onClick={onAgain}>
              Play again
            </button>
          )}
          <button className="btn" onClick={share}>
            Share card
          </button>
          <Link className="btn" href="/">
            Home
          </Link>
        </div>
        {status && <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 0 }}>{status}</p>}
      </div>
    </div>
  );
}

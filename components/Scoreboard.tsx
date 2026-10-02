import type { MatchState } from "@/game/engine/match";
import WinProbBar from "./WinProbBar";

function markClass(mark: string) {
  if (mark === "W") return "ball-mark bw";
  if (mark === "6" || mark.endsWith("+6")) return "ball-mark b6";
  if (mark === "4" || mark.endsWith("+4")) return "ball-mark b4";
  if (mark.startsWith("Wd") || mark.startsWith("Nb")) return "ball-mark bx";
  return "ball-mark";
}

export default function Scoreboard({ match, winProb, hot, bowler }: { match: MatchState; winProb: number; hot: boolean; bowler: string }) {
  const c = match.config;
  const need = Math.max(0, c.target - match.runs);
  const left = c.balls - match.balls;
  // the over in progress, or the one just completed
  const currentOver = match.balls > 0 && match.balls % 6 === 0 ? match.balls / 6 - 1 : Math.floor(match.balls / 6);
  let legal = 0;
  const thisOver = match.history.filter((h) => {
    const over = Math.floor(legal / 6);
    if (h.outcome.legal) legal += 1;
    return over === currentOver;
  });
  const overs = `${Math.floor(match.balls / 6)}.${match.balls % 6}`;

  return (
    <div className="scoreboard" aria-live="polite">
      <div className="sb-team">
        <span className="team-dot" style={{ background: c.team.primary }} />
        {c.team.short} <span style={{ opacity: 0.6 }}>v</span> {c.opponent.short}
        {hot && match.status === "playing" && <span className="hot">🔥 HOT</span>}
      </div>
      <div className="sb-score">
        {match.runs}/{match.wickets}
        <small>
          ({overs} ov) · {c.wickets - match.wickets} wkt left
        </small>
      </div>
      {match.status === "playing" && (
        <div className="sb-need">
          Need {need} off {left} {left === 1 ? "ball" : "balls"}
        </div>
      )}
      <div className="balls">
        {thisOver.map((h, i) => (
          <span key={i} className={markClass(h.mark)}>
            {h.mark}
          </span>
        ))}
      </div>
      <WinProbBar value={winProb} team={c.team.short} opp={c.opponent.short} />
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Bowling: {bowler}</div>
    </div>
  );
}

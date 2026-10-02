export default function WinProbBar({ value, team, opp }: { value: number; team: string; opp: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="winprob" title="Win probability (300 simulated finishes)">
      <div className="winprob-bar">
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className="winprob-label">
        <span>
          {team} {pct}%
        </span>
        <span>
          {opp} {100 - pct}%
        </span>
      </div>
    </div>
  );
}

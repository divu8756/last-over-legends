export default function MuteToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button className="icon-btn" onClick={onToggle} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute" : "Mute"}>
      {muted ? "🔇" : "🔊"}
    </button>
  );
}

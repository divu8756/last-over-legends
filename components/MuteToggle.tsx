export default function MuteToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button className="icon-btn" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={onToggle} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute (M)" : "Mute (M)"}>
      {muted ? "🔇" : "🔊"}
    </button>
  );
}

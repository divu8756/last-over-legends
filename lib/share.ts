import type { MatchState } from "@/game/engine/match";

/** Draw a 1080×1080 share card and return it as a PNG blob. */
export async function shareCard(m: MatchState, verdict: string): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1080;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 1080, 1080);
  g.addColorStop(0, "#0b1033");
  g.addColorStop(1, m.config.team.primary);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 14; i++) ctx.fillRect(0, i * 80, 1080, 40);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd23f";
  ctx.font = "900 64px system-ui, sans-serif";
  ctx.fillText("LAST OVER LEGENDS", 540, 130);
  ctx.fillStyle = "#fff";
  ctx.font = "600 36px system-ui, sans-serif";
  ctx.fillText(m.config.label, 540, 190);

  const result = m.status === "won" ? "WON" : m.status === "tied" ? "TIED" : "LOST";
  ctx.font = "900 220px system-ui, sans-serif";
  ctx.fillStyle = m.status === "won" ? "#9bff6a" : m.status === "tied" ? "#ffd23f" : "#ff6b6b";
  ctx.fillText(result, 540, 440);

  ctx.fillStyle = "#fff";
  ctx.font = "800 96px system-ui, sans-serif";
  ctx.fillText(`${m.runs}/${m.wickets}`, 540, 580);
  ctx.font = "500 40px system-ui, sans-serif";
  ctx.fillText(`chasing ${m.config.target} · ${m.balls} balls · ${m.config.team.name}`, 540, 640);

  const marks = m.history.map((h) => h.mark).join("  ");
  ctx.font = "700 44px ui-monospace, monospace";
  ctx.fillText(marks.length > 60 ? marks.slice(-60) : marks, 540, 730);

  ctx.font = "italic 500 38px Georgia, serif";
  wrap(ctx, `“${verdict}” — Bhaskar`, 540, 830, 900, 50);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText("Can you do better?", 540, 1020);

  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  ctx.fillText(line, x, y);
}

export async function shareOrDownload(blob: Blob, text: string) {
  const file = new File([blob], "last-over-legends.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: "Last Over Legends" });
      return "shared";
    } catch {
      /* user cancelled: fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "last-over-legends.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}

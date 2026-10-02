/** Procedural figures: every player is drawn with canvas paths, no sprites. */

export interface Kit {
  primary: string;
  secondary: string;
}

const SKIN = "#b07a52";
const PAD = "#f4f1ea";

function limb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Batter seen from behind. (fx, fy) is the point between the feet, s is
 * pixels per metre, bat is the bat angle in radians (0 = hanging down,
 * positive = towards screen right).
 */
export function drawBatter(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  s: number,
  kit: Kit,
  bat: number,
  crouch: number,
) {
  const m = (v: number) => v * s;
  const hipY = fy - m(0.92 - crouch * 0.08);
  const shoulderY = fy - m(1.42 - crouch * 0.12);
  const headY = fy - m(1.66 - crouch * 0.12);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(fx, fy, m(0.45), m(0.09), 0, 0, Math.PI * 2);
  ctx.fill();

  // legs with pads
  limb(ctx, fx - m(0.13), hipY, fx - m(0.2), fy - m(0.02), m(0.16), PAD);
  limb(ctx, fx + m(0.13), hipY, fx + m(0.18), fy - m(0.02), m(0.16), PAD);
  ctx.fillStyle = "#222";
  ctx.fillRect(fx - m(0.3), fy - m(0.06), m(0.18), m(0.07));
  ctx.fillRect(fx + m(0.1), fy - m(0.06), m(0.18), m(0.07));

  // torso
  ctx.fillStyle = kit.primary;
  ctx.beginPath();
  ctx.moveTo(fx - m(0.2), hipY);
  ctx.lineTo(fx - m(0.26), shoulderY);
  ctx.quadraticCurveTo(fx, shoulderY - m(0.06), fx + m(0.26), shoulderY);
  ctx.lineTo(fx + m(0.2), hipY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = kit.secondary;
  ctx.fillRect(fx - m(0.2), hipY - m(0.08), m(0.4), m(0.06));
  // number on the back
  ctx.fillStyle = kit.secondary;
  ctx.font = `bold ${Math.max(8, m(0.2))}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("7", fx, (hipY + shoulderY) / 2);

  // hands meet near the front hip; bat pivots there
  const lift = Math.max(0, -Math.cos(bat));
  const hx = fx + m(0.06) + Math.sin(bat) * m(0.12);
  const hy = hipY - m(0.02) - lift * m(0.38);
  limb(ctx, fx - m(0.22), shoulderY + m(0.04), hx, hy, m(0.09), kit.primary);
  limb(ctx, fx + m(0.22), shoulderY + m(0.04), hx, hy, m(0.09), kit.primary);
  ctx.fillStyle = "#f5f5f5";
  ctx.beginPath();
  ctx.arc(hx, hy, m(0.06), 0, Math.PI * 2);
  ctx.fill();

  // bat
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-bat);
  ctx.fillStyle = "#222";
  ctx.fillRect(-m(0.025), 0, m(0.05), m(0.25));
  ctx.fillStyle = "#e3c58f";
  ctx.beginPath();
  ctx.roundRect(-m(0.055), m(0.24), m(0.11), m(0.6), m(0.03));
  ctx.fill();
  ctx.fillStyle = "#c9a56b";
  ctx.fillRect(-m(0.012), m(0.26), m(0.024), m(0.55));
  ctx.restore();

  // helmet
  ctx.fillStyle = "#14213d";
  ctx.beginPath();
  ctx.arc(fx, headY, m(0.13), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = kit.secondary;
  ctx.fillRect(fx - m(0.13), headY + m(0.02), m(0.26), m(0.03));
  ctx.fillStyle = SKIN;
  ctx.fillRect(fx - m(0.05), headY + m(0.11), m(0.1), m(0.07));
}

/** A small standing / running figure for fielders and the bowler. */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  kit: Kit,
  stride = 0,
  armUp = 0,
) {
  const m = (v: number) => Math.max(0.5, v * s);
  const hip = y - m(0.9);
  const sh = y - m(1.45);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y, m(0.35), m(0.07), 0, 0, Math.PI * 2);
  ctx.fill();
  const sw = Math.sin(stride) * 0.25;
  limb(ctx, x, hip, x - m(0.15 + sw), y, m(0.12), "#f0f0f0");
  limb(ctx, x, hip, x + m(0.15 + sw), y, m(0.12), "#f0f0f0");
  ctx.fillStyle = kit.primary;
  ctx.fillRect(x - m(0.2), sh, m(0.4), hip - sh);
  limb(ctx, x - m(0.2), sh + m(0.05), x - m(0.3), sh + m(0.45 - armUp * 0.9), m(0.08), kit.primary);
  limb(ctx, x + m(0.2), sh + m(0.05), x + m(0.3 + armUp * 0.1), sh + m(0.45 - armUp * 1.2), m(0.08), kit.primary);
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(x, sh - m(0.14), m(0.12), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = kit.secondary;
  ctx.fillRect(x - m(0.13), sh - m(0.25), m(0.26), m(0.07));
}

export function drawStumps(
  ctx: CanvasRenderingContext2D,
  project: (x: number, y: number, z: number) => [number, number, number],
  z: number,
  broken: number,
  t: number,
) {
  const xs = [-0.11, 0, 0.11];
  for (let i = 0; i < 3; i++) {
    const [bx, by, s] = project(xs[i], 0, z);
    const tilt = broken > 0 ? (i - 1 + 0.4) * Math.min(1, broken * 3) * 0.9 : 0;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(tilt);
    ctx.fillStyle = "#f3ead7";
    ctx.fillRect(-s * 0.02, -s * 0.71, s * 0.04, s * 0.71);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(-s * 0.02, -s * 0.71, s * 0.04, s * 0.08);
    ctx.restore();
  }
  // bails
  const [lx, ly, s] = project(-0.11, 0.72, z);
  const [rx] = project(0.11, 0.72, z);
  if (broken <= 0) {
    ctx.fillStyle = "#f3ead7";
    ctx.fillRect(lx, ly - s * 0.02, rx - lx, s * 0.025);
  } else {
    const k = Math.min(broken, 1.2);
    ctx.fillStyle = "#f3ead7";
    for (let i = 0; i < 2; i++) {
      const dir = i ? 1 : -1;
      ctx.save();
      ctx.translate(lx + (rx - lx) / 2 + dir * k * s * 1.4, ly - k * s * 1.2 + k * k * s * 0.9);
      ctx.rotate(t * 0.02 * dir);
      ctx.fillRect(-s * 0.05, -s * 0.012, s * 0.1, s * 0.025);
      ctx.restore();
    }
  }
}

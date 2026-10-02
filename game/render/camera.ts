/**
 * Behind-the-batter perspective camera.
 * World: x metres (+ = off side, screen right for a right-hander),
 * y metres up, z metres from the batter's stumps towards the bowler.
 */
export class Camera {
  readonly camZ = -4;
  readonly camY = 2.2;
  F = 700;
  horizon = 240;
  cx = 640;
  W = 1280;
  H = 720;

  resize(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.cx = W / 2;
    const portrait = H > W * 1.1;
    // portrait: crease higher (zone labels below) and a tighter crop so the pitch fills the width
    const creaseY = H * (portrait ? 0.8 : 0.88);
    // short portrait screens need more room for the HUD above the field
    const horizonMin = H * (portrait ? (H < 720 ? 0.46 : 0.4) : 0.34);
    const byHeight = ((creaseY - horizonMin) * -this.camZ) / this.camY;
    const byWidth = (W * (portrait ? 1.05 : 0.62) * -this.camZ) / 3.05;
    this.F = Math.min(byHeight, byWidth);
    this.horizon = creaseY - (this.camY * this.F) / -this.camZ;
  }

  /** Pixels per metre at depth z. */
  scale(z: number) {
    return this.F / Math.max(0.3, z - this.camZ);
  }

  project(x: number, y: number, z: number): [number, number, number] {
    const s = this.scale(z);
    return [this.cx + x * s, this.horizon + (this.camY - y) * s, s];
  }
}

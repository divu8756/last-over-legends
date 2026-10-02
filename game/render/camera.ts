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
    const creaseY = H * 0.9;
    // fit both by height and by width (portrait phones)
    const byHeight = ((creaseY - H * 0.34) * -this.camZ) / this.camY;
    const byWidth = (W * 0.62 * -this.camZ) / 3.05;
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

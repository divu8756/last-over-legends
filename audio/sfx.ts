/** Every sound is synthesised with Web Audio: no audio files to ship. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  /** Must be called from a user gesture. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise(2);
      this.startCrowd();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }

  private makeNoise(seconds: number) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private noiseBurst(dur: number, freq: number, q: number, gain: number, type: BiquadFilterType = "bandpass", when = 0) {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  private tone(freq: number, dur: number, gain: number, type: OscillatorType = "sine", when = 0, slideTo?: number) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private startCrowd() {
    if (!this.ctx || !this.master || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 900;
    f.Q.value = 0.6;
    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.value = 0.05;
    src.connect(f).connect(this.crowdGain).connect(this.master);
    src.start();
  }

  /** Swell the crowd: 0 = murmur, 1 = eruption. */
  crowd(level: number, hold = 1.5) {
    if (!this.ctx || !this.crowdGain) return;
    const t = this.ctx.currentTime;
    const g = this.crowdGain.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0.05 + level * 0.35, t, 0.08);
    g.setTargetAtTime(0.05, t + hold, 0.6);
  }

  bat(power = 1) {
    this.noiseBurst(0.08, 2200, 1.2, 0.9 * power, "bandpass");
    this.tone(900, 0.06, 0.35 * power, "triangle", 0, 300);
  }

  bounce() {
    this.noiseBurst(0.05, 400, 1, 0.25, "lowpass");
  }

  stumps() {
    this.noiseBurst(0.25, 1800, 3, 0.8);
    this.tone(520, 0.15, 0.3, "square", 0, 260);
    this.tone(380, 0.18, 0.25, "square", 0.06, 200);
    this.crowd(0.7, 1.2);
  }

  whoosh() {
    this.noiseBurst(0.25, 600, 0.5, 0.3, "highpass");
  }

  /** Dhol-style drum roll for big moments. */
  drums(beats = 8) {
    for (let i = 0; i < beats; i++) {
      const when = i * 0.14;
      this.tone(i % 2 ? 140 : 90, 0.18, 0.7, "sine", when, 45);
      if (i % 2) this.noiseBurst(0.06, 3000, 1, 0.25, "highpass", when);
    }
  }

  horn() {
    this.tone(330, 0.5, 0.25, "sawtooth");
    this.tone(415, 0.5, 0.2, "sawtooth", 0.02);
  }

  cheer(big = false) {
    this.crowd(big ? 1 : 0.55, big ? 3 : 1.5);
    if (big) {
      this.drums(10);
      this.horn();
    }
  }

  groan() {
    if (!this.ctx || !this.crowdGain) return;
    this.crowd(0.4, 0.6);
    this.tone(220, 0.6, 0.08, "sine", 0, 140);
  }

  firework(delay = 0) {
    this.noiseBurst(0.6, 300, 0.4, 0.5, "lowpass", delay);
  }
}

/** Thin wrapper over the Web Speech API: prefers an Indian English voice. */
export class Speaker {
  private voice: SpeechSynthesisVoice | null = null;
  muted = false;

  constructor() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const choose = () => {
      const voices = window.speechSynthesis.getVoices();
      this.voice =
        voices.find((v) => v.lang === "en-IN") ??
        voices.find((v) => v.lang.startsWith("en-IN") || /india/i.test(v.name)) ??
        voices.find((v) => v.lang === "en-GB") ??
        voices.find((v) => v.lang.startsWith("en")) ??
        null;
    };
    choose();
    window.speechSynthesis.addEventListener?.("voiceschanged", choose);
  }

  get available() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  /** Speak a line, cutting off whatever Bhaskar was saying. */
  say(text: string, excited = false) {
    if (this.muted || !this.available) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) u.voice = this.voice;
    u.lang = this.voice?.lang ?? "en-IN";
    u.rate = excited ? 1.12 : 1.04;
    u.pitch = excited ? 1.15 : 1;
    synth.speak(u);
  }

  get speaking() {
    return this.available && !this.muted && window.speechSynthesis.speaking;
  }

  stop() {
    if (this.available) window.speechSynthesis.cancel();
  }
}

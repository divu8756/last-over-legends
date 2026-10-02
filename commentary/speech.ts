import type { Lang } from "./lines";

/** Thin wrapper over the Web Speech API: Hindi or Indian-English voice. */
export class Speaker {
  private voice: SpeechSynthesisVoice | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending = false;
  muted = false;

  constructor(private lang: Lang = "hi") {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const choose = () => {
      const voices = window.speechSynthesis.getVoices();
      this.voice =
        lang === "hi"
          ? (voices.find((v) => v.lang === "hi-IN" && /google/i.test(v.name)) ??
            voices.find((v) => v.lang.replace("_", "-").startsWith("hi")) ??
            null)
          : (voices.find((v) => v.lang === "en-IN") ??
            voices.find((v) => v.lang.startsWith("en-IN") || /india/i.test(v.name)) ??
            voices.find((v) => v.lang === "en-GB") ??
            voices.find((v) => v.lang.startsWith("en")) ??
            null);
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
    if (this.timer) clearTimeout(this.timer);
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) u.voice = this.voice;
    u.lang = this.voice?.lang ?? (this.lang === "hi" ? "hi-IN" : "en-IN");
    u.rate = excited ? 1.1 : 1.02;
    u.pitch = excited ? 1.12 : 1;
    // Chrome drops an utterance queued in the same tick as cancel()
    this.pending = true;
    this.timer = setTimeout(() => {
      this.pending = false;
      synth.speak(u);
    }, 60);
  }

  get speaking() {
    return this.available && !this.muted && (this.pending || window.speechSynthesis.speaking);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.pending = false;
    if (this.available) window.speechSynthesis.cancel();
  }
}

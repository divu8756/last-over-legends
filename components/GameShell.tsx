"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Game, type Phase } from "@/game/Game";
import { createConfig, type MatchState } from "@/game/engine/match";
import type { Difficulty, Mode } from "@/game/engine/types";
import { Sfx } from "@/audio/sfx";
import { Commentator, type Caption } from "@/commentary/commentator";
import type { Lang } from "@/commentary/lines";
import { JERSEYS } from "@/data/achievements";
import { loadProfile, saveProfile } from "@/lib/storage";
import { recordMatch, summarise } from "@/lib/progress";
import Scoreboard from "./Scoreboard";
import LowerThird from "./LowerThird";
import MuteToggle from "./MuteToggle";
import VerdictCard from "./VerdictCard";
import LandscapePrompt from "./LandscapePrompt";

interface HudState {
  match: MatchState;
  winProb: number;
  phase: Phase;
  bowler: string;
  hot: boolean;
}

/** HUD buttons never take focus, so Space/Enter always reach the game. */
const noFocus = { tabIndex: -1, onMouseDown: (e: React.MouseEvent) => e.preventDefault() };

export default function GameShell({ mode, difficulty, teamId, lang = "hi" }: { mode: Mode; difficulty: Difficulty; teamId?: string; lang?: Lang }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const commRef = useRef<Commentator | null>(null);

  const [round, setRound] = useState(0);
  const [hud, setHud] = useState<HudState | null>(null);
  const [caption, setCaption] = useState<Caption | null>(null);
  const [ended, setEnded] = useState<MatchState | null>(null);
  const [verdict, setVerdict] = useState<{ text: string; source: "ai" | "bank" } | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const profile = loadProfile();
    setMuted(profile.muted);
    const sfx = new Sfx();
    sfx.muted = profile.muted;
    const comm = new Commentator(setCaption, lang);
    comm.setMuted(profile.muted);
    sfxRef.current = sfx;
    commRef.current = comm;

    const config = createConfig(mode, difficulty, { teamId });
    const jersey = JERSEYS.find((j) => j.id === profile.jersey);
    const kit = jersey && "primary" in jersey ? { primary: jersey.primary, secondary: jersey.secondary } : undefined;

    let bowlerName = "";
    let game: Game;
    try {
      game = new Game(
        canvas,
        config,
        sfx,
        {
          onUpdate: (info) => {
            bowlerName = info.bowler;
            setHud({ ...info });
          },
          onMoment: (m) => void comm.moment(m.event, m.vars),
          busy: () => comm.busy(),
          onEnd: (match) => {
            setEnded(match);
            const { profile: next, unlocked } = recordMatch(loadProfile(), match);
            saveProfile(next);
            setUnlocked(unlocked);
            const s = summarise(match);
            const last = match.history[match.history.length - 1];
            const vars = {
              name: last?.batter ?? config.team.batters[0],
              bowler: bowlerName,
              team: config.team.name,
              opp: config.opponent.name,
              need: Math.max(0, config.target - match.runs),
              balls: config.balls - match.balls,
              runs: match.runs,
              wickets: config.wickets - match.wickets,
              target: config.target,
            };
            const summary = `Result: ${match.status}. ${match.runs}/${match.wickets} chasing ${config.target}; ${s.sixes} sixes, ${s.fours} fours, ${s.dots} dots in ${s.ballsFaced} balls.`;
            void comm.verdict(vars, summary, match.status === "won").then(setVerdict);
          },
        },
        kit,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the game");
      return;
    }
    gameRef.current = game;

    const ro = new ResizeObserver(() => game.resize(wrap.clientWidth, wrap.clientHeight));
    ro.observe(wrap);
    game.resize(wrap.clientWidth, wrap.clientHeight);
    game.start();

    return () => {
      ro.disconnect();
      game.destroy();
      comm.stop();
      sfx.dispose();
      gameRef.current = null;
    };
  }, [mode, difficulty, teamId, lang, round]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      sfxRef.current?.setMuted(next);
      commRef.current?.setMuted(next);
      const p = loadProfile();
      saveProfile({ ...p, muted: next });
      return next;
    });
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      gameRef.current?.setPaused(!p);
      if (!p) commRef.current?.stop();
      return !p;
    });
  }, []);

  function again() {
    setEnded(null);
    setVerdict(null);
    setUnlocked([]);
    setCaption(null);
    setHud(null);
    setRound((r) => r + 1);
  }

  const [canFullscreen, setCanFullscreen] = useState(false);
  useEffect(() => setCanFullscreen(!!document.fullscreenEnabled), []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
    gameRef.current?.setPaused(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "m") toggleMute();
      if (k === "f") toggleFullscreen();
      if (ended) return; // the end card has its own keys
      if (paused) {
        if (k === " " || k === "enter") {
          e.preventDefault();
          resume();
        } else if (k === "r") {
          setPaused(false);
          again();
        } else if (k === "q" || k === "h") router.push("/");
        else if (k === "escape" || k === "p") togglePause();
        return;
      }
      if (k === "escape" || k === "p") togglePause();
    };
    const onHidden = () => {
      if (document.hidden) setPaused(true);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [togglePause, toggleMute, toggleFullscreen, resume, paused, ended, router]);

  return (
    <div className="shell" ref={wrapRef}>
      <canvas ref={canvasRef} aria-label="Cricket pitch: tap to bat" />
      {error && (
        <div className="overlay">
          <div className="card">
            <h2 style={{ fontSize: 24 }}>Something went wrong</h2>
            <p>{error}</p>
            <Link className="btn primary" href="/">
              Home
            </Link>
          </div>
        </div>
      )}
      <div className="hud-top">
        {hud ? <Scoreboard match={hud.match} winProb={hud.winProb} hot={hud.hot} bowler={hud.bowler} /> : <div className="scoreboard" style={{ visibility: "hidden" }} />}
        <LowerThird caption={caption} />
        <div className="hud-buttons">
          {canFullscreen && (
            <button className="icon-btn" {...noFocus} onClick={toggleFullscreen} aria-label="Fullscreen" title="Fullscreen (F)">
              ⛶
            </button>
          )}
          <MuteToggle muted={muted} onToggle={toggleMute} />
          <button className="icon-btn" {...noFocus} onClick={togglePause} aria-label="Pause" title="Pause (Esc)">
            ⏸
          </button>
        </div>
      </div>
      {paused && !ended && (
        <div className="overlay">
          <div className="card">
            <h2>Paused</h2>
            <div className="btn-row">
              <button className="btn primary" {...noFocus} onClick={resume}>
                Resume <kbd className="kbd only-mouse-inline">Space</kbd>
              </button>
              <button
                className="btn"
                onClick={() => {
                  setPaused(false);
                  again();
                }}
              >
                Restart <kbd className="kbd only-mouse-inline">R</kbd>
              </button>
              <Link className="btn" href="/">
                Quit <kbd className="kbd only-mouse-inline">Q</kbd>
              </Link>
            </div>
          </div>
        </div>
      )}
      {ended && <VerdictCard match={ended} verdict={verdict} unlocked={unlocked} onAgain={again} />}
      <LandscapePrompt />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Game, type Phase } from "@/game/Game";
import { createConfig, type MatchState } from "@/game/engine/match";
import type { Difficulty, Mode } from "@/game/engine/types";
import { Sfx } from "@/audio/sfx";
import { Commentator, type Caption } from "@/commentary/commentator";
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

export default function GameShell({ mode, difficulty, teamId }: { mode: Mode; difficulty: Difficulty; teamId?: string }) {
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
    const comm = new Commentator(setCaption);
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
  }, [mode, difficulty, teamId, round]);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "p") togglePause();
      if (e.key === "m") toggleMute();
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
  }, [togglePause, toggleMute]);

  function again() {
    setEnded(null);
    setVerdict(null);
    setUnlocked([]);
    setCaption(null);
    setHud(null);
    setRound((r) => r + 1);
  }

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
        {hud ? <Scoreboard match={hud.match} winProb={hud.winProb} hot={hud.hot} bowler={hud.bowler} /> : <div />}
        <div className="hud-buttons">
          <MuteToggle muted={muted} onToggle={toggleMute} />
          <button className="icon-btn" onClick={togglePause} aria-label="Pause" title="Pause (Esc)">
            ⏸
          </button>
        </div>
      </div>
      <LowerThird caption={caption} />
      {paused && !ended && (
        <div className="overlay">
          <div className="card">
            <h2>Paused</h2>
            <div className="btn-row">
              <button
                className="btn primary"
                onClick={() => {
                  setPaused(false);
                  gameRef.current?.setPaused(false);
                }}
              >
                Resume
              </button>
              <button
                className="btn"
                onClick={() => {
                  setPaused(false);
                  again();
                }}
              >
                Restart
              </button>
              <Link className="btn" href="/">
                Quit
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

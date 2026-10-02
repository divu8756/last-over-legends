"use client";

import { useEffect, useState } from "react";

/** Suggests landscape on portrait phones; dismissible. */
export default function LandscapePrompt() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait) and (max-width: 600px)");
    const update = () => setShow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!show || dismissed) return null;
  return (
    <div className="overlay" style={{ zIndex: 20 }}>
      <div className="card">
        <div style={{ fontSize: 56 }}>📱↻</div>
        <h2 style={{ fontSize: 26, margin: "8px 0" }}>Turn your phone sideways</h2>
        <p style={{ color: "var(--muted)" }}>Last Over Legends plays best in landscape.</p>
        <button className="btn primary" onClick={() => setDismissed(true)}>
          Play anyway
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Caption } from "@/commentary/commentator";

/** Commentary caption with a typewriter reveal. */
export default function LowerThird({ caption }: { caption: Caption | null }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    if (!caption) return;
    let i = 0;
    const text = caption.text;
    const timer = setInterval(() => {
      i += 2;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, 22);
    return () => clearInterval(timer);
  }, [caption]);

  if (!caption) return null;
  return (
    <div className="lower-third">
      <div className="lt-name">
        BHASKAR
        <small>ON AIR</small>
      </div>
      <div className="lt-text">
        {shown}
        {caption.source === "ai" && shown.length >= caption.text.length && <span className="ai-tag">LIVE</span>}
      </div>
    </div>
  );
}

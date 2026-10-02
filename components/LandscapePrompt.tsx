"use client";

import { useEffect, useState } from "react";

/** Non-blocking hint on portrait phones: portrait works, landscape is wider. */
export default function LandscapePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait) and (max-width: 600px)");
    setShow(mq.matches);
    const t = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;
  return <div className="toast">📱↻ Rotate for a wider view</div>;
}

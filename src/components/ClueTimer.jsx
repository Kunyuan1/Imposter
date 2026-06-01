import React, { useEffect, useRef, useState } from "react";

const TURN_SECONDS = 20;
const R = 18; // svg radius
const CIRC = 2 * Math.PI * R;

function remaining(endsAt) {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

/**
 * 44px circular timer ring. Orange until 5s left, then red + pulse.
 * Calls onExpire exactly once when it reaches 0.
 */
export default function ClueTimer({ endsAt, onExpire }) {
  const [seconds, setSeconds] = useState(() => remaining(endsAt) ?? TURN_SECONDS);
  const firedRef = useRef(false);

  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (!endsAt) return;
    firedRef.current = false;

    const id = setInterval(() => {
      const s = remaining(endsAt);
      if (s === null) return;
      setSeconds(s);
      if (s === 0 && !firedRef.current) {
        firedRef.current = true;
        if (onExpireRef.current) onExpireRef.current();
      }
    }, 200);

    return () => clearInterval(id);
  }, [endsAt]);

  const s = seconds ?? TURN_SECONDS;
  const danger = s <= 5;
  const tone = danger ? "danger" : s <= 10 ? "warn" : "ok";
  const offset = CIRC * (1 - s / TURN_SECONDS);

  return (
    <div className={`timer-ring ${danger ? "danger" : ""}`} aria-label={`${s} seconds left`}>
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle className="ring-track" cx="22" cy="22" r={R} />
        <circle
          className={`ring-fill ${tone}`}
          cx="22"
          cy="22"
          r={R}
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-value">{s}</div>
    </div>
  );
}

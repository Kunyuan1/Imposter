import React, { useState } from "react";

/**
 * Simultaneous yes/no — every player picks at the same time.
 * After picking, the card is "selected" and a waiting line replaces the helper.
 */
export default function MajorityVoteScreen({ game, onDecision }) {
  const [vote, setVote] = useState(null); // true = yes, false = no, null = none

  function cast(isYes) {
    if (vote !== null) return;
    setVote(isYes);
    onDecision(isYes);
  }

  return (
    <div className="screen">
      <div className="q-emoji" aria-hidden="true">🕵️</div>
      <h2 className="q-title">Enough evidence to accuse?</h2>

      <div className="choice-grid">
        <button
          type="button"
          className={`choice-card choice-card-yes ${vote === true ? "selected-yes" : ""}`}
          onClick={() => cast(true)}
          disabled={vote !== null}
        >
          <span className="icon">✓</span>
          <span className="label">Yes, accuse</span>
        </button>
        <button
          type="button"
          className={`choice-card choice-card-no ${vote === false ? "selected-no" : ""}`}
          onClick={() => cast(false)}
          disabled={vote !== null}
        >
          <span className="icon">↻</span>
          <span className="label">More clues</span>
        </button>
      </div>

      {vote === null ? (
        <p className="helper-line">majority decides — ties send you back</p>
      ) : (
        <p className="helper-line">vote cast — waiting for others</p>
      )}
    </div>
  );
}

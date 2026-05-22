import React, { useEffect, useState } from "react";

/**
 * Multi-stage suspenseful result reveal.
 *
 * Stages:
 *   0 — "ANALYZING VOTES..." spinner
 *   1 — reveal who was accused
 *   2 — reveal whether they were the imposter (verdict banner)
 *   3 — reveal the secret word
 *   4 — show winner banner + Play Again button
 */
export default function ResultScreen({ result, onPlayAgain }) {
  const { accusedName, accusedIsImposter, imposterName, secretWord } = result;
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 2200),
      setTimeout(() => setStage(2), 4600),
      setTimeout(() => setStage(3), 6800),
      setTimeout(() => setStage(4), 8800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const citizensWin = accusedIsImposter;

  return (
    <section className={`card result-card ${citizensWin ? "victory" : "defeat"}`}>
      <h1 className={`title-glow ${citizensWin ? "safe" : "critical"}`}>
        VERDICT
      </h1>

      {/* Stage 0 — analyzing */}
      {stage === 0 && (
        <div className="result-stage analyzing">
          <p className="subtitle blink">// decrypting ballots</p>
          <div className="loader-dots" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
        </div>
      )}

      {/* Stage 1+ — accused name */}
      {stage >= 1 && (
        <div className="result-stage reveal-line">
          <p className="subtitle">Exile target identified:</p>
          <h2 className="player-highlight glitch-in">{accusedName}</h2>
        </div>
      )}

      {/* Stage 2+ — was it the imposter? */}
      {stage >= 2 && (
        <div className={`verdict-banner ${citizensWin ? "good" : "bad"} reveal-line`}>
          {citizensWin
            ? "✓ TARGET CONFIRMED — IMPOSTER"
            : "✗ INNOCENT AGENT EXILED"}
        </div>
      )}

      {/* Stage 3+ — secret word reveal */}
      {stage >= 3 && (
        <div className="result-stage reveal-line">
          <p className="subtitle">The real imposter was</p>
          <h2 className="player-highlight glitch-in">{imposterName}</h2>
          <p className="subtitle" style={{ marginTop: "1rem" }}>The secret word was</p>
          <p className="secret-word glitch-in">{secretWord}</p>
        </div>
      )}

      {/* Stage 4 — winner + play again */}
      {stage >= 4 && (
        <div className="result-stage reveal-line">
          <p className={`winner-line ${citizensWin ? "good" : "bad"}`}>
            {citizensWin ? "AGENTS WIN" : "IMPOSTER WINS"}
          </p>
          <button type="button" className="btn-primary" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      )}

      {stage < 4 && (
        <button
          type="button"
          className="btn-secondary skip-btn"
          onClick={() => setStage(4)}
        >
          Skip ▸
        </button>
      )}
    </section>
  );
}

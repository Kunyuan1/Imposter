import React, { useEffect, useRef, useState } from "react";

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
export default function ResultScreen({ result, onPlayAgain, onImposterGuess, isHost, isImposter }) {
  const { accusedName, accusedIsImposter, imposterName, secretWord } = result;
  const [stage, setStage] = useState(0);
  const timersRef = useRef([]);

  // Never let stage move backward (so Skip can't be undone by a pending timer)
  const advanceTo = (n) => setStage((s) => Math.max(s, n));

  useEffect(() => {
    timersRef.current = [
      setTimeout(() => advanceTo(1), 2200),
      setTimeout(() => advanceTo(2), 4600),
      setTimeout(() => advanceTo(3), 6800),
      setTimeout(() => advanceTo(4), 8800),
    ];
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  function skipToEnd() {
    timersRef.current.forEach(clearTimeout);
    setStage(4);
  }

  const citizensWin = accusedIsImposter && result.imposterGuessedCorrectly === false;

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
        <div className={`verdict-banner ${accusedIsImposter ? "good" : "bad"} reveal-line`}>
          {accusedIsImposter
            ? "✓ TARGET CONFIRMED — IMPOSTER"
            : "✗ INNOCENT AGENT EXILED"}
        </div>
      )}

      {/* Stage 3+ — secret word reveal (only show if imposter already guessed or wasn't caught) */}
      {stage >= 3 && !(accusedIsImposter && result.imposterGuessedCorrectly === null) && (
        <div className="result-stage reveal-line">
          <p className="subtitle">The real imposter was</p>
          <h2 className="player-highlight glitch-in">{imposterName}</h2>
          <p className="subtitle" style={{ marginTop: "1rem" }}>The secret word was</p>
          <p className="secret-word glitch-in">{secretWord}</p>
          {result.imposterGuess && (
            <p className="subtitle" style={{ marginTop: "1rem" }}>
              The imposter guessed: <strong>{result.imposterGuess}</strong>
            </p>
          )}
        </div>
      )}

      {/* Stage 4 — winner + play again */}
      {stage >= 4 && (
        <div className="result-stage reveal-line">
          {result.accusedIsImposter && result.imposterGuessedCorrectly === null ? (
            <>
              <p className="winner-line bad">IMPOSTER CAUGHT!</p>
              <p className="subtitle">Give the imposter one final chance to steal the win.</p>
              {isImposter ? (
                <button type="button" className="btn-primary" onClick={onImposterGuess}>
                  Make Your Last Stand
                </button>
              ) : (
                <p className="subtitle waiting-line">// awaiting imposter's final guess...</p>
              )}
            </>
          ) : (
            <>
              <p className={`winner-line ${citizensWin ? "good" : "bad"}`}>
                {citizensWin
                  ? "AGENTS WIN"
                  : result.imposterGuessedCorrectly
                  ? "IMPOSTER STEALS THE WIN"
                  : "IMPOSTER WINS"}
              </p>
              {isHost ? (
                <button type="button" className="btn-primary" onClick={onPlayAgain}>
                  Play Again
                </button>
              ) : (
                <p className="subtitle waiting-line">// awaiting host to start next mission...</p>
              )}
            </>
          )}
        </div>
      )}

      {stage < 4 && (
        <button
          type="button"
          className="btn-secondary skip-btn"
          onClick={skipToEnd}
        >
          Skip ▸
        </button>
      )}
    </section>
  );
}

import React, { useEffect, useRef, useState } from "react";
import AnimalAvatar from "./AnimalAvatar";

/**
 * Multi-stage suspense reveal on the navy screen.
 *
 * Stages:
 *   0 — "Analyzing votes..." (spinner)
 *   1 — exiled name
 *   2 — verdict (caught / innocent)
 *   3 — true imposter identity + secret word
 *   4 — winner banner + host/imposter CTA
 */
export default function ResultScreen({ result, onPlayAgain, onImposterGuess, isHost, isImposter, players, animals }) {
  const { accusedName, accusedIsImposter, imposterName, secretWord, imposterGuess, imposterGuessedCorrectly } = result;
  const [stage, setStage] = useState(0);
  const timersRef = useRef([]);

  const advanceTo = (n) => setStage((s) => Math.max(s, n));

  useEffect(() => {
    timersRef.current = [
      setTimeout(() => advanceTo(1), 2000),
      setTimeout(() => advanceTo(2), 4000),
      setTimeout(() => advanceTo(3), 6000),
      setTimeout(() => advanceTo(4), 8000),
    ];
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  function skipToEnd() {
    timersRef.current.forEach(clearTimeout);
    setStage(4);
  }

  // Outcome resolution
  const imposterCaughtButNotResolved =
    accusedIsImposter && imposterGuessedCorrectly === null;
  const agentsWin = accusedIsImposter && imposterGuessedCorrectly === false;
  const imposterStole = accusedIsImposter && imposterGuessedCorrectly === true;
  const imposterWinsByEscape = !accusedIsImposter;

  return (
    <div className="screen" style={{ maxWidth: 420 }}>
      {stage < 4 && (
        <button type="button" className="skip-btn" onClick={skipToEnd}>
          skip →
        </button>
      )}

      {stage === 0 && (
        <div className="spinner-row">
          <div className="spinner" />
          <span>analyzing votes...</span>
        </div>
      )}

      {stage >= 1 && (
        <div className="stage">
          <AnimalAvatar players={players} animals={animals} name={accusedName} size="xl" />
          <p className="section-label section-label-light">exiled agent</p>
          <p className="exiled-name">{accusedName}</p>
        </div>
      )}

      {stage >= 2 && (
        <div className={`verdict-banner ${accusedIsImposter ? "caught" : "innocent"} stage`}>
          {accusedIsImposter ? "confirmed — the imposter" : "innocent agent exiled"}
        </div>
      )}

      {stage >= 3 && !imposterCaughtButNotResolved && (
        <>
          <div className="identity-row stage">
            <AnimalAvatar asWolf size="md" />
            <div className="lines">
              <span className="label">the imposter</span>
              <span className="name">{imposterName}</span>
            </div>
          </div>

          <div className="secret-card stage">
            <div className="label">secret word was</div>
            <div className="word">{secretWord}</div>
            {imposterGuess && (
              <div className="label" style={{ marginTop: 8 }}>
                their guess: <span style={{ color: "#FFF" }}>{imposterGuess}</span>
              </div>
            )}
          </div>
        </>
      )}

      {stage >= 4 && (
        <div className="stage" style={{ width: "100%" }}>
          {imposterCaughtButNotResolved ? (
            <>
              <div className="winner-banner winner-imposter">Imposter caught!</div>
              {isImposter ? (
                <button type="button" className="btn btn-red" onClick={onImposterGuess}>
                  Make your last stand
                </button>
              ) : (
                <p className="waiting-light">awaiting imposter's final guess...</p>
              )}
            </>
          ) : (
            <>
              <div className={`winner-banner ${
                agentsWin ? "winner-agents" :
                imposterStole ? "winner-steal" :
                "winner-imposter"
              }`}>
                {agentsWin && "Agents Win"}
                {imposterStole && "Imposter Steals the Win"}
                {imposterWinsByEscape && "Imposter Wins"}
              </div>

              {isHost ? (
                <button type="button" className="btn btn-yellow" onClick={onPlayAgain}>
                  Play again
                </button>
              ) : (
                <p className="waiting-light">waiting for host to start next mission...</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

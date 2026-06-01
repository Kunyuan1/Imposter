import React, { useCallback, useRef } from "react";
import AnimalAvatar from "./AnimalAvatar";
import ClueTimer from "./ClueTimer";

/**
 * Active player's clue screen.
 *  - top bar: clue counter + timer ring
 *  - active turn card highlighting whose turn it is
 *  - scrolling clue log
 *  - purple-dashed input area at the bottom
 *
 * Enter submits. Timer expiry auto-submits whatever is typed (or
 * "— silence —" via the server-side default).
 */
export default function ClueScreen({ game, animals, clueInput, setClueInput, onSubmit }) {
  const currentPlayer = game.players[game.currentPlayerIndex];
  const total = game.players.length;
  const idx = (game.currentPlayerIndex ?? 0) + 1;
  const submittedRef = useRef(false);

  const handleManualSubmit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit();
  };

  const handleExpire = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit({ force: true });
  }, [onSubmit]);

  return (
    <div className="screen">
      <div className="top-bar">
        <span className="section-label">clue {idx} of {total}</span>
        <ClueTimer endsAt={game.turnEndsAt} onExpire={handleExpire} />
      </div>

      <div className="active-turn-card">
        <AnimalAvatar players={game.players} animals={animals} name={currentPlayer} size="sm" />
        <div className="lines">
          <span className="name">{currentPlayer}</span>
          <span className="status">transmitting clue...</span>
        </div>
      </div>

      <p className="section-label">clue log</p>
      <div className="clue-list">
        {(!game.clues || game.clues.length === 0) ? (
          <div className="empty-line">no transmissions yet</div>
        ) : (
          game.clues.map((item, i) => (
            <div key={i} className={`clue-row ${item.timedOut ? "timeout" : ""}`}>
              <AnimalAvatar players={game.players} animals={animals} name={item.player} size="sm" />
              <div>
                <div className="meta">{item.player}</div>
                <div className="text">"{item.clue}"</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="clue-input-area">
        <input
          type="text"
          placeholder="your clue..."
          value={clueInput}
          onChange={(e) => setClueInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
          maxLength={40}
          autoFocus
        />
        <button type="button" className="btn btn-purple btn-pill" onClick={handleManualSubmit}>
          Send
        </button>
      </div>
    </div>
  );
}

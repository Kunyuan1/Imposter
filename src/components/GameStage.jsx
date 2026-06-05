import React, { useState, useEffect } from "react";
import { animalFor } from "../utils/animals";
import { seatsFor } from "../utils/seats";

export default function GameStage({ players = [], host = "", animals = {}, exiled = null, clues = [], showClues = false }) {
  const seats = seatsFor(players.length);
  const [logOpen, setLogOpen] = useState(false);

  // Auto-open the clue log when entering majorityVote phase
  useEffect(() => {
    if (showClues) {
      setLogOpen(true);
    } else {
      setLogOpen(false);
    }
  }, [showClues]);

  return (
    <div className="game-stage">
      <div className="stage-floor" />

      <div className="lamp-cord" />
      <div className="lamp-shade" />
      <div className="lamp-glow" />

      <div className="table-shadow" />
      <div className="table-side" />
      <div className="table-top" />
      <div className="table-felt" />

      {showClues && (
        <button
          className="table-paper"
          aria-label="View clue log"
          onClick={() => setLogOpen(true)}
        >
          <span className="table-paper-label">clues</span>
          <div className="table-paper-line" />
          <div className="table-paper-line" />
          <div className="table-paper-line" />
        </button>
      )}

      {logOpen && (
        <div className="paper-modal-backdrop" onClick={() => setLogOpen(false)}>
          <div className="paper-modal" onClick={(e) => e.stopPropagation()}>
            <div className="paper-modal-header">
              <span className="paper-modal-title">📋 Clue Log</span>
              <button className="paper-modal-close" onClick={() => setLogOpen(false)}>✕</button>
            </div>
            <div className="paper-modal-body">
              {clues.length === 0 ? (
                <p className="paper-modal-empty">No clues yet.</p>
              ) : (
                clues.map((c, i) => {
                  const { emoji, tint } = animalFor(players, c.player, animals);
                  const isSilence = c.timedOut || c.clue === "— silence —";
                  return (
                    <div key={i} className="paper-modal-row">
                      <div className="paper-modal-avatar" style={{ background: tint }}>
                        <span>{emoji}</span>
                      </div>
                      <div className="paper-modal-text">
                        <span className="paper-modal-name">{c.player}</span>
                        {isSilence ? (
                          <span className="paper-modal-silence">— silence —</span>
                        ) : (
                          <span className="paper-modal-clue">"{c.clue}"</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="table-deck">
        <div className="deck-card" />
        <div className="deck-card deck-card-stacked" />
      </div>

      {seats.map((seat, i) => {
        const name = players[i];
        if (!name) return null;
        const { emoji, tint } = animalFor(players, name, animals);
        const isExiled = exiled === name;

        return (
          <React.Fragment key={name}>
            <div
              className="seat-wrap"
              style={{ left: `${seat.left}%`, top: `${seat.top}%` }}
            >
              <div
                className={`seat-disc ${isExiled ? "seat-exiled" : ""}`}
                style={{
                  width: `${seat.size}px`,
                  height: `${seat.size}px`,
                  background: tint,
                  fontSize: `${Math.round(seat.size * 0.55)}px`,
                }}
              >
                <span>{emoji}</span>
                {name === host && <span className="seat-crown">👑</span>}
              </div>
            </div>
            <span
              className="seat-name"
              style={{
                left: `${seat.left}%`,
                top: `calc(${seat.top}% + ${seat.size / 2 + 6}px)`,
              }}
            >
              {name}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

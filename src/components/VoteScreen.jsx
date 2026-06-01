import React, { useState } from "react";
import AnimalAvatar from "./AnimalAvatar";
import { useToast } from "./Toast";

export default function VoteScreen({ game, playerName, votedPlayers = [], hasVoted, animals, onVoteSubmit }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const showToast = useToast();
  const myIndex = game.players.findIndex((p) => p === playerName);

  function handleSubmit() {
    if (selectedIndex === null) {
      showToast("Mark a suspect first.");
      return;
    }
    onVoteSubmit(selectedIndex);
  }

  if (hasVoted) {
    const pending = game.players.filter((p) => !votedPlayers.includes(p));
    return (
      <div className="screen">
        <h2 className="q-title">Vote locked in</h2>
        <p className="section-label center">
          {votedPlayers.length} of {game.players.length} voted
        </p>

        {pending.length > 0 ? (
          <>
            <p className="section-label">still deciding</p>
            <div className="suspects">
              {pending.map((p) => (
                <div key={p} className="suspect" aria-disabled>
                  <AnimalAvatar players={game.players} animals={animals} name={p} size="sm" />
                  <span className="name">{p}</span>
                  <span className="small muted">thinking...</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="helper-line">tallying the votes...</p>
        )}
      </div>
    );
  }

  return (
    <div className="screen">
      <h2 className="q-title">Who's the mole?</h2>
      <p className="small center muted">pick your suspect and lock in</p>

      <div className="suspects">
        {game.players.map((p, i) => (
          i !== myIndex && (
            <button
              key={p}
              type="button"
              className={`suspect ${selectedIndex === i ? "selected" : ""}`}
              onClick={() => setSelectedIndex(i)}
            >
              <AnimalAvatar players={game.players} animals={animals} name={p} size="sm" />
              <span className="name">{p}</span>
            </button>
          )
        ))}
      </div>

      <button type="button" className="btn btn-purple" onClick={handleSubmit}>
        Lock in vote
      </button>

      <p className="tiny center muted">
        {votedPlayers.length} of {game.players.length} voted
      </p>
    </div>
  );
}

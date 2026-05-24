import React, { useState } from "react";
import { useToast } from "./Toast";

export default function VoteScreen({ game, onVoteSubmit }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const currentPlayer = game.players[game.currentPlayerIndex];
  const showToast = useToast();

  function handleSubmit() {
    if (selectedIndex === null) {
      showToast("Mark a suspect before locking in your vote.");
      return;
    }
    onVoteSubmit(selectedIndex);
    setSelectedIndex(null);
  }

  return (
    <section className="card vote-card">
      <h1 className="title-glow critical">EXILE VERDICT</h1>
      <p className="subtitle">Pass the device to:</p>
      <h2 className="player-highlight">{currentPlayer}</h2>
      <p className="subtitle">Who do you think the imposter is?</p>

      <div className="suspect-list">
        {game.players.map((player, index) => (
          index !== game.currentPlayerIndex && (
            <button
              key={index}
              type="button"
              className={`suspect-row ${selectedIndex === index ? "targeted" : ""}`}
              onClick={() => setSelectedIndex(index)}
            >
              <span className="target-scope">⊙</span>
              <span className="suspect-name">{player}</span>
            </button>
          )
        ))}
      </div>

      <button
        type="button"
        className="btn-primary danger pulse"
        onClick={handleSubmit}
      >
        LOCK IN VOTE
      </button>
    </section>
  );
}
import React, { useState } from "react";

export default function VoteScreen({ game, onVoteSubmit }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const currentPlayer = game.players[game.currentPlayerIndex];

  function handleSubmit() {
    console.log("selectedIndex:", selectedIndex);
    console.log("currentPlayerIndex:", game.currentPlayerIndex);
    
    if (selectedIndex === null) {
      alert("Please select a suspect before submitting!");
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
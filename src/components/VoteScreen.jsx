import React, { useState } from 'react';

export default function VoteScreen({ game, onVote }) {
  // Store the index (number) instead of the player name (string)
  const [selectedIndex, setSelectedIndex] = useState(null);

  const handleVoteSubmit = () => {
    if (selectedIndex === null) {
      alert("Please select a suspect before submitting your verdict!");
      return;
    }
    // Now this correctly passes a number back to App.jsx!
    onVote(selectedIndex);
  };

  return (
    <section className="card vote-card">
      <h1 className="title-glow critical">EXILE VERDICT</h1>
      <p className="subtitle">Discuss evidence. Select the prime suspect:</p>

      <div className="suspect-list">
        {game.players.map((player, index) => (
          <button
            key={index}
            type="button"
            // Check if the current button's index matches our saved state
            className={`suspect-row ${selectedIndex === index ? 'targeted' : ''}`}
            onClick={() => setSelectedIndex(index)}
          >
            <span className="target-scope">⊙</span>
            <span className="suspect-name">{player}</span>
          </button>
        ))}
      </div>

      <button 
        type="button" 
        className="btn-primary danger pulse" 
        onClick={handleVoteSubmit}
      >
        LOCK IN ACCUSATION
      </button>
    </section>
  );
}
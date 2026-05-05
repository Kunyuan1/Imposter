import React from 'react';

/**
 * ClueScreen Component
 * Handles the phase where each player submits a hint.
 * Receives game data and control functions from App.jsx as props.
 */
export default function ClueScreen({ game, clueInput, setClueInput, onSubmit }) {
  // Identify who is currently holding the device
  const currentPlayer = game.players[game.currentPlayerIndex];

  return (
    <section className="card clue-card">
      <h1 className="title-glow">CLUE PHASE</h1>
      
      <div className="current-turn-banner">
        <p className="subtitle">Agent's Turn:</p>
        <h2 className="player-highlight">{currentPlayer}</h2>
      </div>

      <div className="input-group">
        <input
          type="text"
          className="game-input"
          placeholder="Transmit your clue..."
          value={clueInput}
          onChange={(e) => setClueInput(e.target.value)}
        />
        <button 
          type="button" 
          className="btn-primary pulse" 
          onClick={onSubmit}
        >
          SUBMIT DATA
        </button>
      </div>

      <div className="clue-log">
        <h3>DECODED CLUES</h3>
        <div className="clue-list">
          {/* Ensure game.clues exists before mapping to avoid crashes */}
          {(!game.clues || game.clues.length === 0) ? (
            <p className="no-data">Waiting for first transmission...</p>
          ) : (
            game.clues.map((item, index) => (
              <div className="clue-item animate-in" key={index}>
                <span className="clue-author">{item.player}:</span>
                <span className="clue-text">"{item.clue}"</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
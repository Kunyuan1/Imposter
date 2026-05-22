import React from 'react';

export default function SetupScreen({
  playerNames,
  updatePlayerName,
  addPlayer,
  removePlayer,
  startGame,
  categories,
  category,
  setCategory,
}) {
  return (
    <section className="card setup-card">
      <h1 className="title-glow">IMPOSTER</h1>
      <p className="subtitle">Gather your crew...</p>

      <div className="player-input-container">
        {playerNames.map((name, index) => (
          <div className="player-row animate-in" key={index}>
            <input
              type="text"
              className="game-input"
              placeholder={`Agent ${index + 1}`}
              value={name}
              onChange={(e) => updatePlayerName(index, e.target.value)}
            />
            {/* Show remove button only if there are more than 3 players */}
            {playerNames.length > 3 && (
              <button
                type="button"
                className="btn-remove"
                onClick={() => removePlayer(index)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="category-input">
        <label className="field-label">// select intel category</label>
        <select
          className="game-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">— choose a category —</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={addPlayer}
        >
          + Add Agent
        </button>
        <button
          type="button"
          className="btn-primary pulse"
          onClick={startGame}
        >
          INITIALIZE GAME
        </button>
      </div>
    </section>
  );
}
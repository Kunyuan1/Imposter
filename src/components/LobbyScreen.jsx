import React from "react";

export default function LobbyScreen({ roomCode, players, host, playerName, onStartGame, category, setCategory, categories }) {
  const isHost = playerName === host;

  return (
    <section className="card">
      <h1>Lobby</h1>
      <p className="subtitle">Share this code with your friends:</p>
      <h2 style={{ letterSpacing: "0.3em" }}>{roomCode}</h2>

      <div style={{ margin: "1.5rem 0" }}>
        <p className="subtitle">Players ({players.length}):</p>
        {players.map((player, index) => (
          <p key={index}>
            {player} {player === host ? "👑" : ""}
          </p>
        ))}
      </div>

      {isHost && (
        <div style={{ marginBottom: "1rem" }}>
          <p className="subtitle">Select a category:</p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" }}
          >
            <option value="">Random</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      )}

      {isHost ? (
        <button
          type="button"
          className="primary"
          onClick={onStartGame}
          disabled={players.length < 3}
        >
          {players.length < 3 ? "Waiting for players..." : "Start Game"}
        </button>
      ) : (
        <p className="subtitle">Waiting for host to start...</p>
      )}
    </section>
  );
}
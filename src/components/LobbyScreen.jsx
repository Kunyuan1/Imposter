import React from "react";
import AnimalAvatar from "./AnimalAvatar";
import { ANIMALS } from "../utils/animals";

export default function LobbyScreen({
  roomCode,
  players,
  host,
  playerName,
  onStartGame,
  category,
  setCategory,
  categories,
  playerAnimals = {},
  onChangeAnimal,
  onLeaveRoom,
}) {
  const isHost = playerName === host;
  const canStart = players.length >= 3 && (isHost ? !!category : true);
  const myAnimalIdx =
    typeof playerAnimals[playerName] === "number"
      ? playerAnimals[playerName]
      : players.indexOf(playerName) % ANIMALS.length;

  return (
    <div className="screen">
      <button type="button" className="back-link" onClick={onLeaveRoom} aria-label="Leave room">
        <span aria-hidden="true">←</span> back
      </button>

      <p className="section-label center">room code</p>
      <div className="code-badge">{roomCode}</div>

      <p className="section-label" style={{ marginTop: 6 }}>agents in the field</p>
      {players.length === 0 ? (
        <div className="empty-line">waiting for agents...</div>
      ) : (
        <div className="avatar-grid">
          {players.map((p) => (
            <AnimalAvatar
              key={p}
              players={players}
              animals={playerAnimals}
              name={p}
              size="md"
              crown={p === host}
              withName
            />
          ))}
        </div>
      )}

      <div className="thin-divider" />

      <p className="section-label">your animal</p>
      <div className="animal-picker" role="radiogroup" aria-label="Choose your animal">
        {ANIMALS.map((a, i) => (
          <button
            type="button"
            key={i}
            className={`animal-pick ${i === myAnimalIdx ? "selected" : ""}`}
            style={{ background: a.tint }}
            onClick={() => onChangeAnimal && onChangeAnimal(i)}
            aria-pressed={i === myAnimalIdx}
            aria-label={`animal ${i + 1}`}
          >
            {a.emoji}
          </button>
        ))}
      </div>

      <div className="thin-divider" />

      {isHost ? (
        <>
          <p className="section-label">choose a category</p>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">— pick one —</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-mint"
            onClick={onStartGame}
            disabled={!canStart}
            title={!canStart ? "need 3+ agents and a category" : undefined}
          >
            Start mission
          </button>
          {!canStart && (
            <p className="tiny center muted">need 3+ agents and a category</p>
          )}
        </>
      ) : (
        <>
          <p className="section-label">category</p>
          <div className="host-pill" style={{ display: "block", textAlign: "center" }}>
            {category || "host is choosing..."}
          </div>
          <p className="small center muted" style={{ marginTop: 8 }}>
            waiting for host to start
          </p>
        </>
      )}

      <p className="tiny center muted">{players.length} agent{players.length === 1 ? "" : "s"} ready</p>
    </div>
  );
}

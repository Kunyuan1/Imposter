import React, { useState } from "react";

export default function HomeScreen({ onCreateRoom, onJoinRoom }) {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [nameError, setNameError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  function clearErrors() {
    setNameError("");
    setCodeError("");
  }

  function handleCreate() {
    clearErrors();
    if (name.trim() === "") {
      setNameError("name your agent first");
      return;
    }
    onCreateRoom(name.trim());
  }

  function handleJoin() {
    clearErrors();
    if (name.trim() === "") {
      setNameError("name your agent first");
      return;
    }
    if (roomCode.trim() === "") {
      setCodeError("enter a room code");
      return;
    }
    onJoinRoom(name.trim(), roomCode.trim().toUpperCase());
  }

  return (
    <div className="screen">
      <div className="home-emoji-row" aria-hidden="true">
        <span>🐸</span>
        <span>🐻</span>
        <span>🐱</span>
        <span className="disguise-wolf">🐺</span>
        <span>🦉</span>
      </div>
      <h1 className="home-title">Imposter</h1>
      <p className="home-subtitle">who's the mole on the team?</p>
      <div className="thin-divider" />

      <div className="instructions-toggle">
        <button
          type="button"
          className="btn-instructions-toggle"
          onClick={() => setShowInstructions(v => !v)}
        >
          <span>{showInstructions ? "▲" : "▼"}</span>
          How to play
        </button>

        {showInstructions && (
          <div className="instructions-body">
            <div className="instructions-step">
              <span className="instructions-emoji">🃏</span>
              <div>
                <strong>Get a role</strong>
                <p>Most players get the secret word. One player is the imposter — they don't.</p>
              </div>
            </div>
            <div className="instructions-step">
              <span className="instructions-emoji">💬</span>
              <div>
                <strong>Give clues</strong>
                <p>Take turns saying hints related to the secret word. Imposter must bluff!</p>
              </div>
            </div>
            <div className="instructions-step">
              <span className="instructions-emoji">🗳️</span>
              <div>
                <strong>Vote</strong>
                <p>Discuss and vote on who you think the imposter is.</p>
              </div>
            </div>
            <div className="instructions-step">
              <span className="instructions-emoji">🏆</span>
              <div>
                <strong>Win</strong>
                <p>Crew wins by catching the imposter. Imposter wins by surviving — or guessing the word!</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <input
          type="text"
          className={`input ${nameError ? "input-error" : ""}`}
          placeholder="your agent name..."
          value={name}
          onChange={(e) => { setName(e.target.value); if (nameError) setNameError(""); }}
          maxLength={20}
        />
        {nameError && <div className="input-error-msg">{nameError}</div>}
      </div>

      <button type="button" className="btn btn-ink" onClick={handleCreate}>
        Create room
      </button>

      <div className="or-divider">or</div>

      <div>
        <input
          type="text"
          className={`input ${codeError ? "input-error" : ""}`}
          placeholder="room code..."
          value={roomCode}
          onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); if (codeError) setCodeError(""); }}
          maxLength={4}
        />
        {codeError && <div className="input-error-msg">{codeError}</div>}
      </div>

      <button type="button" className="btn btn-outline" onClick={handleJoin}>
        Join room
      </button>
    </div>
  );
}

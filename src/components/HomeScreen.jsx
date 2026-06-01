import React, { useState } from "react";

export default function HomeScreen({ onCreateRoom, onJoinRoom }) {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [nameError, setNameError] = useState("");
  const [codeError, setCodeError] = useState("");

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
        <span className="disguise-slot">
          <span className="disguise-cat">🐱</span>
          <span className="disguise-arrow">→</span>
          <span className="disguise-wolf">🐺</span>
        </span>
        <span>🦌</span>
      </div>
      <h1 className="home-title">Imposter</h1>
      <p className="home-subtitle">who's the mole on the team?</p>
      <div className="thin-divider" />

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

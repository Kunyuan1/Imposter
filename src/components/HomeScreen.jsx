import React, { useState } from "react";
import { useToast } from "./Toast";

export default function HomeScreen({ onCreateRoom, onJoinRoom }) {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const showToast = useToast();

  function handleCreate() {
    if (name.trim() === "") {
      showToast("Identify yourself before entering the network.");
      return;
    }
    onCreateRoom(name.trim());
  }

  function handleJoin() {
    if (name.trim() === "") {
      showToast("Identify yourself before entering the network.");
      return;
    }
    if (roomCode.trim() === "") {
      showToast("Enter a room code to join the operation.");
      return;
    }
    onJoinRoom(name.trim(), roomCode.trim().toUpperCase());
  }

  return (
    <section className="card">
      <h1>Imposter</h1>
      <p className="subtitle">Enter your name to get started.</p>

      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="actions" style={{ marginTop: "2rem" }}>
        <button type="button" className="primary" onClick={handleCreate}>
          Create Room
        </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <p className="subtitle">Or join an existing room:</p>
        <input
          type="text"
          placeholder="Room code (e.g. ABCD)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          style={{ marginBottom: "0.5rem" }}
        />
        <button type="button" onClick={handleJoin}>
          Join Room
        </button>
      </div>
    </section>
  );
}
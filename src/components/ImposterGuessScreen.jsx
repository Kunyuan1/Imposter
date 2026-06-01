import React, { useState } from "react";
import AnimalAvatar from "./AnimalAvatar";
import { useToast } from "./Toast";

export default function ImposterGuessScreen({ imposterName, onGuess, players, animals }) {
  const [guess, setGuess] = useState("");
  const showToast = useToast();

  function handleSubmit() {
    if (guess.trim() === "") {
      showToast("Enter your final guess.");
      return;
    }
    onGuess(guess);
  }

  return (
    <div className="screen">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <AnimalAvatar asWolf size="lg" />
      </div>
      <h2 className="q-title" style={{ color: "#FFF" }}>
        last stand, agent {imposterName}
      </h2>
      <p className="small center" style={{ color: "rgba(255,255,255,0.55)" }}>
        guess the secret word to steal the win
      </p>

      <div className="guess-card">
        <input
          type="text"
          placeholder="your guess..."
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          maxLength={30}
          autoFocus
        />
      </div>

      <button type="button" className="btn btn-red" onClick={handleSubmit}>
        Take the shot
      </button>

      <p className="helper-light">one chance — make it count</p>
    </div>
  );
}

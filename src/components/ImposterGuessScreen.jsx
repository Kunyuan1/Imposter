import React, { useState } from "react";
import { useToast } from "./Toast";

export default function ImposterGuessScreen({ imposterName, onGuess }) {
  const [guess, setGuess] = useState("");
  const showToast = useToast();

  function handleSubmit() {
    if (guess.trim() === "") {
      showToast("Enter your final guess — this is your only shot.");
      return;
    }
    onGuess(guess);
  }

  return (
    <section className="card">
      <h1>You've Been Caught!</h1>
      <p className="subtitle">
        <strong>{imposterName}</strong>, you have one chance to guess the secret word and steal the win.
      </p>

      <div className="input-group">
        <input
          type="text"
          placeholder="Enter your guess..."
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
        />
        <button type="button" className="primary" onClick={handleSubmit}>
          Submit Guess
        </button>
      </div>
    </section>
  );
}
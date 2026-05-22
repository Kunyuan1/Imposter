import React from "react";

export default function ResultScreen({ result, onPlayAgain }) {
  const { accusedName, accusedIsImposter, secretWord, imposterName, imposterGuessedCorrectly } = result;

  return (
    <section className="card">
      <h1>Results</h1>

      <p className="subtitle">
        The group voted to exile: <strong>{accusedName}</strong>
      </p>

      {!accusedIsImposter ? (
        <>
          <p className="role imposter">❌ Wrong! {accusedName} was innocent.</p>
          <p>The real imposter was <strong>{imposterName}</strong>.</p>
          <p>The secret word was: <strong>{secretWord}</strong></p>
          <p className="role imposter">😈 Imposter Wins!</p>
        </>
      ) : imposterGuessedCorrectly ? (
        <>
          <p className="role imposter">😈 The imposter guessed the word correctly!</p>
          <p>The secret word was: <strong>{secretWord}</strong></p>
          <p className="role imposter">Imposter Wins!</p>
        </>
      ) : (
        <>
          <p className="role word">✅ You got the Imposter!</p>
          <p>The imposter was <strong>{imposterName}</strong> and failed to guess the word.</p>
          <p>The secret word was: <strong>{secretWord}</strong></p>
          <p className="role word">🎉 Innocents Win!</p>
        </>
      )}

      <div className="actions">
        <button type="button" className="primary" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </section>
  );
}
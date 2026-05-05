import { useState } from "react";
import "./App.css";
import words from "./data/words";
import { createGame } from "./game/gameLogic";

function App() {
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [phase, setPhase] = useState("setup");
  const [game, setGame] = useState(null);
  const [clueInput, setClueInput] = useState("");
  const [isRoleVisible, setIsRoleVisible] = useState(false);

  function updatePlayerName(index, value) {
    const newNames = [...playerNames];
    newNames[index] = value;
    setPlayerNames(newNames);
  }

  function addPlayer() {
    setPlayerNames([...playerNames, ""]);
  }

  function removePlayer(index) {
    if (playerNames.length <= 3) return;
    setPlayerNames(playerNames.filter((_, i) => i !== index));
  }

  function startGame() {
    const validNames = playerNames
      .map((name) => name.trim())
      .filter((name) => name !== "");

    if (validNames.length < 3) {
      alert("You need at least 3 players.");
      return;
    }

    const newGame = createGame(validNames, words);
    setGame(newGame);
    setPhase("roleReveal");
  }

  function nextRoleReveal() {
    const nextIndex = game.currentPlayerIndex + 1;

    if (nextIndex >= game.players.length) {
      setGame({
        ...game,
        currentPlayerIndex: 0,
      });

      setIsRoleVisible(false);
      setPhase("clue");
      return;
    }

    setGame({
      ...game,
      currentPlayerIndex: nextIndex,
    });

    setIsRoleVisible(false);
  }

  function submitClue() {
    if (clueInput.trim() === "") {
      alert("Please enter a clue.");
      return;
    }

    const newClue = {
      player: game.players[game.currentPlayerIndex],
      clue: clueInput.trim(),
    };

    const updatedClues = [...game.clues, newClue];
    const nextIndex = game.currentPlayerIndex + 1;

    if (nextIndex >= game.players.length) {
      setGame({
        ...game,
        clues: updatedClues,
        currentPlayerIndex: 0,
      });

      setClueInput("");
      setPhase("vote");
      return;
    }

    setGame({
      ...game,
      clues: updatedClues,
      currentPlayerIndex: nextIndex,
    });

    setClueInput("");
  }

  return (
    <main className="app">
      {phase === "setup" && (
        <section className="card">
          <h1>Imposter</h1>
          <p className="subtitle">Add players to start the game.</p>

          <div className="player-list">
            {playerNames.map((name, index) => (
              <div className="player-row" key={index}>
                <input
                  type="text"
                  placeholder={`Player ${index + 1}`}
                  value={name}
                  onChange={(e) => updatePlayerName(index, e.target.value)}
                />

                <button type="button" onClick={() => removePlayer(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="actions">
            <button type="button" onClick={addPlayer}>
              Add Player
            </button>

            <button type="button" className="primary" onClick={startGame}>
              Start Game
            </button>
          </div>
        </section>
      )}

      {phase === "roleReveal" && game && (
        <section className="card">
          <h1>Role Reveal</h1>

          <p className="subtitle">Pass the device to:</p>

          <h2>{game.players[game.currentPlayerIndex]}</h2>

          {!isRoleVisible ? (
            <button
              type="button"
              className="primary"
              onClick={() => setIsRoleVisible(true)}
            >
              Reveal My Role
            </button>
          ) : (
            <>
              {game.currentPlayerIndex === game.imposterIndex ? (
                <p className="role imposter">You are the Imposter</p>
              ) : (
                <p className="role word">
                  Your word is: <strong>{game.secretWord}</strong>
                </p>
              )}

              <button type="button" onClick={nextRoleReveal}>
                Hide and Pass
              </button>
            </>
          )}
        </section>
      )}

      {phase === "clue" && game && (
        <section className="card">
          <h1>Clue Phase</h1>

          <p className="subtitle">
            Current player:{" "}
            <strong>{game.players[game.currentPlayerIndex]}</strong>
          </p>

          <input
            type="text"
            placeholder="Enter your clue"
            value={clueInput}
            onChange={(e) => setClueInput(e.target.value)}
          />

          <button type="button" className="primary" onClick={submitClue}>
            Submit Clue
          </button>

          <h3>Clues so far:</h3>

          {game.clues.map((item, index) => (
            <p key={index}>
              <strong>{item.player}:</strong> {item.clue}
            </p>
          ))}
        </section>
      )}
    </main>
  );
}

export default App;
import { useState } from "react";
import "./App.css";
import words from "./data/words";
import { createGame, tallyVotes, getAccused } from "./game/gameLogic";
import ClueScreen from "./components/ClueScreen";
import VoteScreen from "./components/VoteScreen";
import ResultScreen from "./components/ResultScreen";
import ImposterGuessScreen from "./components/ImposterGuessScreen";
import TallyScreen from "./components/TallyScreen";

function App() {
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [phase, setPhase] = useState("setup");
  const [game, setGame] = useState(null);
  const [clueInput, setClueInput] = useState("");
  const [isRoleVisible, setIsRoleVisible] = useState(false);
  const [result, setResult] = useState(null); // stores end game result
  const [category, setCategory] = useState("");
  const [tally, setTally] = useState({});

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

    if (category === "") {
      alert("Please select a category.");
      return;
    }

    const newGame = createGame(validNames, words, category);
    setGame(newGame);
    setResult(null);
    setPhase("roleReveal");
  }

  function nextRoleReveal() {
    const nextIndex = game.currentPlayerIndex + 1;

    if (nextIndex >= game.players.length) {
      setGame({ ...game, currentPlayerIndex: 0 });
      setIsRoleVisible(false);
      setPhase("clue");
      return;
    }

    setGame({ ...game, currentPlayerIndex: nextIndex });
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
      setGame({ ...game, clues: updatedClues, currentPlayerIndex: 0 });
      setClueInput("");
      setPhase("vote");
      return;
    }

    setGame({ ...game, clues: updatedClues, currentPlayerIndex: nextIndex });
    setClueInput("");
  }

  function handleVoteSubmit(accusedIndex) {
    const updatedVotes = { ...game.votes, [game.currentPlayerIndex]: accusedIndex };
    const nextIndex = game.currentPlayerIndex + 1;

    if (nextIndex >= game.players.length) {
      // All players have voted — tally up
      const newTally = {};
      for (const voter in updatedVotes) {
        const accused = updatedVotes[voter];
        newTally[accused] = (newTally[accused] || 0) + 1;
      }
      setTally(newTally);
      setGame({ ...game, votes: updatedVotes, currentPlayerIndex: 0 });
      setPhase("tally");
    } else {
      setGame({ ...game, votes: updatedVotes, currentPlayerIndex: nextIndex });
    }
  }

  function handleTallyContinue() {
    const maxVotes = Math.max(...Object.values(tally));
    const leaders = Object.keys(tally).filter(
      (index) => tally[index] === maxVotes
    );

    if (leaders.length > 1) {
      // Tie — restart clue phase
      restartCluePhase();
      return;
    }

    const accusedIndex = Number(leaders[0]);
    const accusedIsImposter = accusedIndex === game.imposterIndex;

    if (accusedIsImposter) {
      setGame({ ...game, currentPlayerIndex: accusedIndex });
      setPhase("imposterGuess");
    } else {
      setResult({
        accusedIndex,
        accusedName: game.players[accusedIndex],
        accusedIsImposter: false,
        secretWord: game.secretWord,
        imposterName: game.players[game.imposterIndex],
        imposterGuessedCorrectly: null,
      });
      setPhase("result");
    }
  }

  function handleImposterGuess(guess) {
    const correct = guess.trim().toLowerCase() === game.secretWord.toLowerCase();

    setResult({
      accusedIndex: game.imposterIndex,
      accusedName: game.players[game.imposterIndex],
      accusedIsImposter: true,
        secretWord: game.secretWord,
        imposterName: game.players[game.imposterIndex],
        imposterGuessedCorrectly: correct,
      });

      setPhase("result");
    }

  function handleTie() {
    // Called from ResultScreen if it was a tie — restart clue phase
    restartCluePhase();
  }

  function restartCluePhase() {
    setGame({
      ...game,
      clues: [],
      currentPlayerIndex: 0,
      votes: {},
    });
    setClueInput("");
    setPhase("clue");
  }

  function playAgain() {
    setGame(null);
    setResult(null);
    setPhase("setup");
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

          <div className="category-input">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select a category...</option>
              {Object.keys(words).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
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
        <ClueScreen
          game={game}
          clueInput={clueInput}
          setClueInput={setClueInput}
          onSubmit={submitClue}
        />
      )}

      {phase === "vote" && game && (
        <VoteScreen
          key={game.currentPlayerIndex}
          game={game}
          onVoteSubmit={handleVoteSubmit}
        />
      )}

      {phase === "tally" && game && (
        <TallyScreen game={game} tally={tally} onContinue={handleTallyContinue} />
      )}

      {phase === "imposterGuess" && game && (
        <ImposterGuessScreen
          imposterName={game.players[game.imposterIndex]}
          onGuess={handleImposterGuess}
        />
      )}

      {phase === "result" && result && (
        <ResultScreen result={result} onPlayAgain={playAgain} />
      )}
    </main>
  );
}

export default App;
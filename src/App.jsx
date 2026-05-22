import React, { useState } from 'react';
import SetupScreen from './components/SetupScreen';
import ClueScreen from './components/ClueScreen';
import MajorityVoteScreen from './components/MajorityVoteScreen';
import VoteScreen from './components/VoteScreen';
import ResultScreen from './components/ResultScreen';
import words from './data/words';
import './App.css';

function App() {
  // --- STATE MANAGEMENT ---
  const [phase, setPhase] = useState("setup");
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [category, setCategory] = useState("");
  const [game, setGame] = useState(null);
  const [isRoleVisible, setIsRoleVisible] = useState(false);
  const [clueInput, setClueInput] = useState("");
  const [result, setResult] = useState(null);

  const categories = Object.keys(words);

  // --- SETUP PHASE FUNCTIONS ---
  function updatePlayerName(index, name) {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  }

  function addPlayer() {
    setPlayerNames([...playerNames, ""]);
  }

  function removePlayer(index) {
    const newNames = playerNames.filter((_, i) => i !== index);
    setPlayerNames(newNames);
  }

  function startGame() {
    const validPlayers = playerNames.filter(name => name.trim() !== "");
    if (validPlayers.length < 3) {
      alert("You need at least 3 agents to play!");
      return;
    }
    if (!category) {
      alert("Please choose an intel category.");
      return;
    }

    const categoryWords = words[category];
    const secretWord = categoryWords[Math.floor(Math.random() * categoryWords.length)];
    const imposterIndex = Math.floor(Math.random() * validPlayers.length);

    setGame({
      players: validPlayers,
      imposterIndex,
      secretWord,
      category,
      currentPlayerIndex: 0,
      clues: [],
      votes: {}, // { voterIndex: accusedIndex }
    });
    setPhase("roleReveal");
  }

  // --- ROLE REVEAL PHASE ---
  function nextRoleReveal() {
    setIsRoleVisible(false);
    const nextIndex = game.currentPlayerIndex + 1;

    if (nextIndex >= game.players.length) {
      setGame({ ...game, currentPlayerIndex: 0 });
      setPhase("clue");
    } else {
      setGame({ ...game, currentPlayerIndex: nextIndex });
    }
  }

  // --- CLUE PHASE ---
  function submitClue() {
    if (clueInput.trim() === "") {
      alert("Please enter a clue.");
      return;
    }

    const newClue = {
      player: game.players[game.currentPlayerIndex],
      clue: clueInput.trim(),
    };

    const currentClues = game.clues || [];
    const updatedClues = [...currentClues, newClue];
    const nextIndex = game.currentPlayerIndex + 1;

    if (nextIndex >= game.players.length) {
      setGame({
        ...game,
        clues: updatedClues,
        currentPlayerIndex: 0,
      });
      setClueInput("");
      setPhase("majorityVote");
      return;
    }

    setGame({
      ...game,
      clues: updatedClues,
      currentPlayerIndex: nextIndex,
    });
    setClueInput("");
  }

  // --- MAJORITY VOTE PHASE ---
  function handleMajorityDecision(isMajorityYes) {
    if (isMajorityYes) {
      // Reset votes & start the per-player exile vote at player 0
      setGame({ ...game, votes: {}, currentPlayerIndex: 0 });
      setPhase("vote");
    } else {
      // Loop back for another clue round
      setGame({ ...game, clues: [], currentPlayerIndex: 0 });
      setPhase("clue");
    }
  }

  // --- EXILE VOTE PHASE: collect a vote from every player, then tally ---
  function handleCastVote(selectedIndex) {
    const updatedVotes = {
      ...game.votes,
      [game.currentPlayerIndex]: selectedIndex,
    };
    const nextIndex = game.currentPlayerIndex + 1;

    if (nextIndex >= game.players.length) {
      // All players have voted — tally
      const tally = {};
      for (const voter in updatedVotes) {
        const accused = updatedVotes[voter];
        tally[accused] = (tally[accused] || 0) + 1;
      }

      // Find the player(s) with the most votes
      const maxVotes = Math.max(...Object.values(tally));
      const leaders = Object.keys(tally)
        .filter((i) => tally[i] === maxVotes)
        .map(Number);

      // Clear leader → exile them. Tie → no exile (imposter escapes).
      const finalAccused = leaders.length === 1 ? leaders[0] : null;

      setGame({ ...game, votes: updatedVotes });

      if (finalAccused === null) {
        // Tie — no one exiled; treat as imposter escapes
        setResult({
          accusedName: "— TIE —",
          accusedIsImposter: false,
          imposterName: game.players[game.imposterIndex],
          secretWord: game.secretWord,
        });
      } else {
        setResult({
          accusedName: game.players[finalAccused],
          accusedIsImposter: finalAccused === game.imposterIndex,
          imposterName: game.players[game.imposterIndex],
          secretWord: game.secretWord,
        });
      }

      setPhase("result");
      return;
    }

    // Otherwise, hand to the next voter
    setGame({
      ...game,
      votes: updatedVotes,
      currentPlayerIndex: nextIndex,
    });
  }

  // --- RESET GAME ---
  function resetGame() {
    setGame(null);
    setResult(null);
    setPhase("setup");
  }

  return (
    <main className="app">
      {/* 1. SETUP PHASE */}
      {phase === "setup" && (
        <SetupScreen
          playerNames={playerNames}
          updatePlayerName={updatePlayerName}
          addPlayer={addPlayer}
          removePlayer={removePlayer}
          startGame={startGame}
          categories={categories}
          category={category}
          setCategory={setCategory}
        />
      )}

      {/* 2. ROLE REVEAL PHASE */}
      {phase === "roleReveal" && game && (
        <section className="card role-card">
          <h1 className="title-glow">ROLE REVEAL</h1>
          <p className="subtitle">Pass the device to:</p>
          <h2 className="player-highlight">{game.players[game.currentPlayerIndex]}</h2>

          {!isRoleVisible ? (
            <button
              type="button"
              className="btn-primary pulse"
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
              <button type="button" className="btn-secondary" onClick={nextRoleReveal}>
                Hide and Pass
              </button>
            </>
          )}
        </section>
      )}

      {/* 3. CLUE PHASE */}
      {phase === "clue" && game && (
        <ClueScreen
          game={game}
          clueInput={clueInput}
          setClueInput={setClueInput}
          onSubmit={submitClue}
        />
      )}

      {/* 4. MAJORITY VOTE CHECK */}
      {phase === "majorityVote" && game && (
        <MajorityVoteScreen
          game={game}
          onDecision={handleMajorityDecision}
        />
      )}

      {/* 5. FINAL EXILE VOTE — one per player */}
      {phase === "vote" && game && (
        <VoteScreen
          key={game.currentPlayerIndex}
          game={game}
          onVoteSubmit={handleCastVote}
        />
      )}

      {/* 6. SUSPENSE RESULT REVEAL */}
      {phase === "result" && result && (
        <ResultScreen result={result} onPlayAgain={resetGame} />
      )}
    </main>
  );
}

export default App;

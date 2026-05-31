import { useState, useEffect, useRef } from "react";
import "./App.css";
import { connect, sendMessage, disconnect } from "./game/socket";
import HomeScreen from "./components/HomeScreen";
import LobbyScreen from "./components/LobbyScreen";
import ClueScreen from "./components/ClueScreen";
import MajorityVoteScreen from "./components/MajorityVoteScreen";
import VoteScreen from "./components/VoteScreen";
import ResultScreen from "./components/ResultScreen";
import ImposterGuessScreen from "./components/ImposterGuessScreen";
import words from "./data/words";

function App() {
  const [phase, setPhase] = useState("home");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [host, setHost] = useState("");
  const [game, setGame] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [clueInput, setClueInput] = useState("");
  const [isRoleVisible, setIsRoleVisible] = useState(false);
  const [result, setResult] = useState(null);
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");

  const handleMessageRef = useRef(null);

  useEffect(() => {
    connect((msg) => handleMessageRef.current(msg));
    return () => disconnect();
  }, []);

  function handleMessage(msg) {
    console.log("Message received:", msg);

    if (msg.type === "room_created") {
      setRoomCode(msg.code);
      setPhase("lobby");
    }

    else if (msg.type === "joined") {
      setRoomCode(msg.code);
      setPhase("lobby");
    }

    else if (msg.type === "room_update") {
      setPlayers(msg.players);
      setHost(msg.host);
    }

    else if (msg.type === "role_assigned") {
      setMyRole(msg);
    }

    else if (msg.type === "phase_change") {
      const { phase: newPhase, ...rest } = msg;

      if (newPhase === "lobby") {
        setPhase("lobby");
        setGame(null);
        setResult(null);
        setMyRole(null);
        setClueInput("");
      }

      else if (newPhase === "roleReveal") {
        setGame(rest);
        setIsRoleVisible(false);
        setRoleConfirmed(false);
        setPhase("roleReveal");
      }

      else if (newPhase === "clue") {
        setGame(rest);
        setPhase("clue");
      }

      else if (newPhase === "majorityVote") {
        setGame(rest);
        setPhase("majorityVote");
      }

      else if (newPhase === "vote") {
        setGame(rest);
        setPhase("vote");
      }

      else if (newPhase === "imposterGuess") {
        setGame(rest);
        setResult({
          accusedName: rest.accusedName,
          accusedIsImposter: rest.accusedIsImposter,
          imposterName: rest.imposterName,
          secretWord: rest.secretWord,
          imposterGuessedCorrectly: null,
        });
        setPhase("result");
      }

      else if (newPhase === "result") {
        console.log("Result data:", rest);
        setResult({
          accusedName: rest.accusedName,
          accusedIsImposter: rest.accusedIsImposter,
          imposterName: rest.imposterName,
          secretWord: rest.secretWord,
          imposterGuessedCorrectly: rest.imposterGuessedCorrectly ?? null,
          imposterGuess: rest.imposterGuess ?? null,
        });
        setPhase("result");
      }
    }

    else if (msg.type === "error") {
      alert(msg.message);
    }
  }

  handleMessageRef.current = handleMessage;

  // --- ACTIONS ---
  function handleCreateRoom(name) {
    setPlayerName(name);
    sendMessage({ type: "create", name });
  }

  function handleJoinRoom(name, code) {
    setPlayerName(name);
    sendMessage({ type: "join", name, code });
  }

  function handleStartGame() {
    sendMessage({ type: "start_game", category: selectedCategory });
  }

  function handleRoleConfirmed() {
    setRoleConfirmed(true);
    sendMessage({ type: "role_confirmed" });
  }

  function handleSubmitClue() {
    if (clueInput.trim() === "") {
      alert("Please enter a clue.");
      return;
    }
    sendMessage({ type: "submit_clue", clue: clueInput.trim() });
    setClueInput("");
  }

  function handleMajorityDecision(isMajorityYes) {
    sendMessage({ type: "majority_decision", decision: isMajorityYes ? "yes" : "no" });
  }

  function handleCastVote(accusedIndex) {
    sendMessage({ type: "cast_vote", accusedIndex });
  }

  function handleImposterGuess(guess) {
    sendMessage({ type: "imposter_guess", guess });
  }

  function handlePlayAgain() {
    sendMessage({ type: "play_again" });
  }

  function handleImposterGuessButton() {
    setPhase("imposterGuess");
  }

  // --- RENDER ---
  const isMyTurn = game && game.players &&
    game.players[game.currentPlayerIndex] === playerName;

  return (
    <main className="app">

      {phase === "home" && (
        <HomeScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {phase === "lobby" && (
        <LobbyScreen
          roomCode={roomCode}
          players={players}
          host={host}
          playerName={playerName}
          onStartGame={handleStartGame}
          category={selectedCategory}
          setCategory={setSelectedCategory}
          categories={Object.keys(words)}
        />
      )}

      {phase === "roleReveal" && game && (
        <section className="card role-card">
          <h1 className="title-glow">ROLE REVEAL</h1>
          <p className="subtitle">Your role:</p>

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
              {myRole?.role === "imposter" ? (
                <p className="role imposter">You are the Imposter</p>
              ) : (
                <p className="role word">
                  Your word is: <strong>{myRole?.secretWord}</strong>
                </p>
              )}
              {!roleConfirmed ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleRoleConfirmed}
                >
                  I'm Ready
                </button>
              ) : (
                <p className="subtitle">Waiting for other players...</p>
              )}
            </>
          )}
        </section>
      )}

      {phase === "clue" && game && (
        isMyTurn ? (
          <ClueScreen
            game={game}
            clueInput={clueInput}
            setClueInput={setClueInput}
            onSubmit={handleSubmitClue}
          />
        ) : (
          <section className="card">
            <h1 className="title-glow">CLUE PHASE</h1>
            <p className="subtitle">Waiting for:</p>
            <h2 className="player-highlight">
              {game.players[game.currentPlayerIndex]}
            </h2>
            <div className="clue-log">
              <h3>DECODED CLUES</h3>
              {(!game.clues || game.clues.length === 0) ? (
                <p className="subtitle">No clues yet...</p>
              ) : (
                game.clues.map((item, index) => (
                  <div className="clue-item" key={index}>
                    <span className="clue-author">{item.player}:</span>
                    <span className="clue-text"> "{item.clue}"</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )
      )}

      {phase === "majorityVote" && game && (
        <MajorityVoteScreen
          game={game}
          onDecision={handleMajorityDecision}
        />
      )}

      {phase === "vote" && game && (
        isMyTurn ? (
          <VoteScreen
            key={game.currentPlayerIndex}
            game={game}
            onVoteSubmit={handleCastVote}
          />
        ) : (
          <section className="card">
            <h1 className="title-glow critical">EXILE VERDICT</h1>
            <p className="subtitle">Waiting for:</p>
            <h2 className="player-highlight">
              {game.players[game.currentPlayerIndex]}
            </h2>
          </section>
        )
      )}

      {phase === "imposterGuess" && game && (
        myRole?.role === "imposter" ? (
          <ImposterGuessScreen
            imposterName={playerName}
            onGuess={handleImposterGuess}
          />
        ) : (
          <section className="card">
            <h1 className="title-glow">IMPOSTER'S LAST STAND</h1>
            <p className="subtitle">
              The imposter is making their final guess...
            </p>
          </section>
        )
      )}

      {phase === "result" && result && (
        <ResultScreen
          key={result.imposterGuessedCorrectly === null ? "pending" : "final"}
          result={result}
          onPlayAgain={handlePlayAgain}
          onImposterGuess={handleImposterGuessButton}
        />
      )}

    </main>
  );
}

export default App;
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
import RoleBadge from "./components/RoleBadge";
import ClueTimer from "./components/ClueTimer";
import AnimalAvatar from "./components/AnimalAvatar";
import { useToast } from "./components/Toast";
import words from "./data/words";

function App() {
  const showToast = useToast();
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
  const [votedPlayers, setVotedPlayers] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [playerAnimals, setPlayerAnimals] = useState({});

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
      if (msg.playerAnimals) setPlayerAnimals(msg.playerAnimals);
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
        // Prefer the server's relative duration (clock-skew safe). Fall back
        // to an absolute turnEndsAt if a legacy/unrestarted server sends one.
        let turnEndsAt = null;
        if (typeof rest.clueDurationMs === "number") {
          turnEndsAt = Date.now() + rest.clueDurationMs;
        } else if (typeof rest.turnEndsAt === "number") {
          turnEndsAt = rest.turnEndsAt;
        }
        setGame({ ...rest, turnEndsAt });
        setPhase("clue");
      }

      else if (newPhase === "majorityVote") {
        setGame(rest);
        setPhase("majorityVote");
      }

      else if (newPhase === "vote") {
        setGame(rest);
        setVotedPlayers([]);
        setHasVoted(false);
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

    else if (msg.type === "vote_update") {
      setVotedPlayers(msg.votedPlayers || []);
    }

    else if (msg.type === "error") {
      showToast(msg.message);
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

  function handleSubmitClue(opts = {}) {
    const text = clueInput.trim();
    if (!opts.force && text === "") {
      showToast("Transmission empty — submit a clue to proceed.");
      return;
    }
    sendMessage({ type: "submit_clue", clue: text });
    setClueInput("");
  }

  function handleMajorityDecision(isMajorityYes) {
    sendMessage({ type: "majority_decision", decision: isMajorityYes ? "yes" : "no" });
  }

  function handleCastVote(accusedIndex) {
    if (hasVoted) return;
    setHasVoted(true);
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

  function handleChangeAnimal(index) {
    sendMessage({ type: "set_animal", index });
  }

  function handleLeaveRoom() {
    sendMessage({ type: "leave_room" });
    // Reset all lobby/game state back to a fresh "home" view
    setPhase("home");
    setRoomCode("");
    setPlayers([]);
    setHost("");
    setPlayerAnimals({});
    setSelectedCategory("");
    setGame(null);
    setMyRole(null);
    setResult(null);
    setRoleConfirmed(false);
    setVotedPlayers([]);
    setHasVoted(false);
  }

  // --- RENDER ---
  const isMyTurn = game && game.players &&
    game.players[game.currentPlayerIndex] === playerName;

  const inGamePhase = ["clue", "majorityVote", "vote", "imposterGuess"].includes(phase);
  const isHost = host === playerName;

  // Per-phase background tint
  const baseAppClass =
    phase === "lobby"          ? "app app-lobby"  :
    phase === "majorityVote"   ? "app app-purple" :
    phase === "result"         ? "app app-navy"   :
    phase === "imposterGuess"  ? "app app-navy"   :
    "app";

  // When the role badge is showing at top-center, give the page extra
  // top padding so the screen content doesn't sit under it.
  const appClass = (inGamePhase && myRole)
    ? `${baseAppClass} app-with-badge`
    : baseAppClass;

  // Players list to use for avatar derivation across all in-game screens.
  // game.players is authoritative once the game starts; before that, fall
  // back to the lobby list.
  const allPlayers = (game && game.players) || players;

  return (
    <main className={appClass}>

      {inGamePhase && myRole && (
        <RoleBadge
          role={myRole.role}
          secretWord={myRole.secretWord}
          players={allPlayers}
          name={playerName}
          animals={playerAnimals}
        />
      )}

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
          playerAnimals={playerAnimals}
          onChangeAnimal={handleChangeAnimal}
          onLeaveRoom={handleLeaveRoom}
        />
      )}

      {phase === "roleReveal" && game && myRole && (
        <div className="screen">
          <p className="small center muted">eyes on your screen only</p>

          {myRole.role === "imposter" ? (
            <div className="role-card role-card-imposter">
              <span className="role-emoji" aria-hidden="true">🐺</span>
              <span className="role-pill role-pill-imposter">Imposter</span>
              <p className="small" style={{ color: "rgba(255,255,255,0.65)" }}>
                you don't know the word
              </p>
              <p className="tiny" style={{ color: "rgba(255,255,255,0.45)" }}>
                bluff your way through
              </p>
            </div>
          ) : (
            <div className="role-card role-card-agent">
              <AnimalAvatar
                players={allPlayers}
                name={playerName}
                animals={playerAnimals}
                size="lg"
              />
              <span className="role-pill role-pill-agent">Agent</span>
              <p className="section-label">your secret word</p>
              <p className="secret-word">{myRole.secretWord}</p>
            </div>
          )}

          <p className="role-instructions">
            {myRole.role === "imposter" ? (
              <>listen carefully<br/>give vague clues that could mean anything</>
            ) : (
              <>give clues about this word<br/>without saying it directly</>
            )}
          </p>

          {!roleConfirmed ? (
            <button type="button" className="btn btn-ink" onClick={handleRoleConfirmed}>
              I'm ready
            </button>
          ) : (
            <p className="small center muted">waiting for other agents...</p>
          )}
        </div>
      )}

      {phase === "clue" && game && (
        isMyTurn ? (
          <ClueScreen
            game={game}
            animals={playerAnimals}
            clueInput={clueInput}
            setClueInput={setClueInput}
            onSubmit={handleSubmitClue}
          />
        ) : (
          <div className="screen">
            <div className="top-bar">
              <span className="section-label">
                clue {(game.currentPlayerIndex ?? 0) + 1} of {game.players.length}
              </span>
              <ClueTimer endsAt={game.turnEndsAt} />
            </div>

            <div className="active-turn-card">
              <AnimalAvatar players={game.players} animals={playerAnimals} name={game.players[game.currentPlayerIndex]} size="sm" />
              <div className="lines">
                <span className="name">{game.players[game.currentPlayerIndex]}</span>
                <span className="status">transmitting clue...</span>
              </div>
            </div>

            <p className="section-label">clue log</p>
            <div className="clue-list">
              {(!game.clues || game.clues.length === 0) ? (
                <div className="empty-line">no transmissions yet</div>
              ) : (
                game.clues.map((item, i) => (
                  <div key={i} className={`clue-row ${item.timedOut ? "timeout" : ""}`}>
                    <AnimalAvatar players={game.players} animals={playerAnimals} name={item.player} size="sm" />
                    <div>
                      <div className="meta">{item.player}</div>
                      <div className="text">"{item.clue}"</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="small center muted">
              waiting for {game.players[game.currentPlayerIndex]} to transmit
            </p>
          </div>
        )
      )}

      {phase === "majorityVote" && game && (
        <MajorityVoteScreen
          game={game}
          onDecision={handleMajorityDecision}
        />
      )}

      {phase === "vote" && game && (
        <VoteScreen
          game={game}
          playerName={playerName}
          votedPlayers={votedPlayers}
          hasVoted={hasVoted}
          animals={playerAnimals}
          onVoteSubmit={handleCastVote}
        />
      )}

      {phase === "imposterGuess" && game && (
        myRole?.role === "imposter" ? (
          <ImposterGuessScreen
            imposterName={playerName}
            players={game.players}
            animals={playerAnimals}
            onGuess={handleImposterGuess}
          />
        ) : (
          <div className="screen">
            <div style={{ display: "flex", justifyContent: "center" }}>
              <AnimalAvatar asWolf size="lg" />
            </div>
            <h2 className="q-title" style={{ color: "#FFF" }}>
              the imposter is making their final guess...
            </h2>
            <p className="waiting-light">listening for transmission</p>
          </div>
        )
      )}

      {phase === "result" && result && (
        <ResultScreen
          key={result.imposterGuessedCorrectly === null ? "pending" : "final"}
          result={result}
          players={allPlayers}
          animals={playerAnimals}
          onPlayAgain={handlePlayAgain}
          onImposterGuess={handleImposterGuessButton}
          isHost={isHost}
          isImposter={myRole?.role === "imposter"}
        />
      )}

    </main>
  );
}

export default App;
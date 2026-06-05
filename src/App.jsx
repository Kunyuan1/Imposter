import { useState, useEffect, useRef } from "react";
import "./App.css";
import { connect, sendMessage, disconnect } from "./game/socket";
import HomeScreen from "./components/HomeScreen";
import LobbyScreen from "./components/LobbyScreen";
import GameStage from "./components/GameStage";
import PhaseOverlay from "./components/PhaseOverlay";
import RoleBadge from "./components/RoleBadge";
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

      else if (newPhase === "majorityResult") {
        setGame(rest);
        setPhase("majorityResult");
      }

      else if (newPhase === "vote") {
        setGame(rest);
        setVotedPlayers([]);
        setHasVoted(false);
        setPhase("vote");
      }

      else if (newPhase === "tally") {
        setGame(rest);
        setPhase("tally");
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

  const inGamePhase = ["roleReveal", "clue", "majorityVote", "majorityResult", "vote", "tally", "imposterGuess", "result"].includes(phase);
  const isHost = host === playerName;

  const appClass =
    phase === "lobby" ? "app app-lobby" :
    phase === "home"  ? "app" :
    "app app-stage";

  const allPlayers = (game && game.players) || players;

  const exiledName =
    (phase === "tally" && !game?.isTie && game?.accusedName) ||
    (phase === "result" && result?.accusedName) ||
    null;

  // Show the paper clue log on the table during and after clue phase
  const showCluesOnTable = ["majorityVote"].includes(phase);
  const tableClues = game?.clues || [];

  return (
    <main className={appClass}>

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

      {inGamePhase && (
        <div className="stage-wrap">
          <GameStage
            players={allPlayers}
            host={host}
            animals={playerAnimals}
            exiled={exiledName}
            clues={tableClues}
            showClues={showCluesOnTable}
          />
          <PhaseOverlay
            phase={phase}
            game={game}
            myRole={myRole}
            playerName={playerName}
            players={allPlayers}
            animals={playerAnimals}
            isMyTurn={isMyTurn}
            isHost={isHost}
            isImposter={myRole?.role === "imposter"}
            clueInput={clueInput}
            setClueInput={setClueInput}
            onSubmitClue={handleSubmitClue}
            onMajorityDecision={handleMajorityDecision}
            onCastVote={handleCastVote}
            onRoleConfirmed={handleRoleConfirmed}
            roleConfirmed={roleConfirmed}
            votedPlayers={votedPlayers}
            hasVoted={hasVoted}
            result={result}
            onImposterGuess={handleImposterGuess}
            onImposterGuessButton={handleImposterGuessButton}
            onPlayAgain={handlePlayAgain}
          />
          {myRole && phase !== "clue" && (
            <RoleBadge
              role={myRole.role}
              secretWord={myRole.secretWord}
              players={allPlayers}
              name={playerName}
              animals={playerAnimals}
            />
          )}
        </div>
      )}

    </main>
  );
}

export default App;

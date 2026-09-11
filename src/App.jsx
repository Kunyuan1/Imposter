import { useState, useEffect, useRef } from "react";
import "./App.css";
import { connect, sendMessage, disconnect, getAttempts, STATUS } from "./game/socket";
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
  const [connStatus, setConnStatus] = useState(STATUS.CONNECTING);
  const [disconnected, setDisconnected] = useState([]);
  const [connAttempts, setConnAttempts] = useState(0);

  const handleMessageRef = useRef(null);
  // { code, token } for the seat we currently hold, kept in a ref so the
  // socket's onopen callback always sees the latest value.
  const sessionRef = useRef(null);

  function rememberSession(code, token) {
    sessionRef.current = code && token ? { code, token } : null;
    try {
      if (sessionRef.current) {
        sessionStorage.setItem("imposter.session", JSON.stringify(sessionRef.current));
      } else {
        sessionStorage.removeItem("imposter.session");
      }
    } catch {
      // Private mode or blocked storage — the in-memory ref still covers
      // reconnects within this page load.
    }
  }

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("imposter.session");
      if (saved) sessionRef.current = JSON.parse(saved);
    } catch {
      sessionRef.current = null;
    }

    connect(
      (msg) => handleMessageRef.current(msg),
      (status) => {
        setConnStatus(status);
        setConnAttempts(getAttempts());
      },
      () => {
        const s = sessionRef.current;
        if (s?.code && s?.token) {
          sendMessage({ type: "rejoin", code: s.code, token: s.token });
        }
      },
    );
    return () => disconnect();
  }, []);

  function resetToHome() {
    setPhase("home");
    setRoomCode("");
    setPlayers([]);
    setHost("");
    setPlayerAnimals({});
    setDisconnected([]);
    setSelectedCategory("");
    setGame(null);
    setMyRole(null);
    setResult(null);
    setRoleConfirmed(false);
    setVotedPlayers([]);
    setHasVoted(false);
  }

  function handleMessage(msg) {

    if (msg.type === "room_created") {
      rememberSession(msg.code, msg.token);
      setRoomCode(msg.code);
      setPhase("lobby");
    }

    else if (msg.type === "joined") {
      rememberSession(msg.code, msg.token);
      setRoomCode(msg.code);
      setPhase("lobby");
    }

    else if (msg.type === "rejoined") {
      rememberSession(msg.code, msg.token);
      setRoomCode(msg.code);
      setPlayerName(msg.name);
      showToast("Reconnected — you're back in the game.");
    }

    else if (msg.type === "rejoin_failed") {
      // The room ended or the seat was released while we were away.
      rememberSession(null, null);
      resetToHome();
    }

    else if (msg.type === "room_update") {
      setPlayers(msg.players);
      setHost(msg.host);
      setDisconnected(msg.disconnected || []);
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
      if (msg.youVoted) setHasVoted(true);
    }

    else if (msg.type === "error") {
      showToast(msg.message);
    }
  }

  handleMessageRef.current = handleMessage;

  // --- ACTIONS ---
  // sendMessage returns false when the socket is down; without this the UI used
  // to silently do nothing at all.
  function send(msg) {
    if (sendMessage(msg)) return true;
    showToast("No connection to the server — reconnecting...");
    return false;
  }

  function handleCreateRoom(name) {
    setPlayerName(name);
    send({ type: "create", name });
  }

  function handleJoinRoom(name, code) {
    setPlayerName(name);
    send({ type: "join", name, code });
  }

  function handleStartGame() {
    send({ type: "start_game", category: selectedCategory });
  }

  function handleRoleConfirmed() {
    if (send({ type: "role_confirmed" })) setRoleConfirmed(true);
  }

  function handleSubmitClue(opts = {}) {
    const text = clueInput.trim();
    if (!opts.force && text === "") {
      showToast("Transmission empty — submit a clue to proceed.");
      return;
    }
    if (send({ type: "submit_clue", clue: text })) setClueInput("");
  }

  function handleMajorityDecision(isMajorityYes) {
    send({ type: "majority_decision", decision: isMajorityYes ? "yes" : "no" });
  }

  function handleCastVote(accusedIndex) {
    if (hasVoted) return;
    if (send({ type: "cast_vote", accusedIndex })) setHasVoted(true);
  }

  function handleImposterGuess(guess) {
    send({ type: "imposter_guess", guess });
  }

  function handlePlayAgain() {
    send({ type: "play_again" });
  }

  function handleImposterGuessButton() {
    setPhase("imposterGuess");
  }

  function handleChangeAnimal(index) {
    send({ type: "set_animal", index });
  }

  function handleLeaveRoom() {
    send({ type: "leave_room" });
    rememberSession(null, null);
    resetToHome();
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
          connStatus={connStatus}
          connAttempts={connAttempts}
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
            disconnected={disconnected}
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

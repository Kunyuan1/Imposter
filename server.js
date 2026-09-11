import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import process from "node:process";

import { randomBytes } from "node:crypto";

const PORT = Number(process.env.PORT) || 1234;
const MIN_PLAYERS = 3;
const MAX_NAME_LEN = 20;
// How long a seat is held open for a player who dropped mid-game.
const REJOIN_GRACE_MS = Number(process.env.REJOIN_GRACE_MS) || 90000;
// Selectable avatars; must match ANIMALS in src/utils/animals.js.
const ANIMAL_COUNT = 13;

// A crash in one room must never take down every other game on the box.
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", rooms: Object.keys(rooms).length }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Imposter Game WebSocket server is running");
});

const wss = new WebSocketServer({ server: httpServer });

const rooms = {};
let nextPlayerId = 1;

// --- HELPERS ---
function generateCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * 26)];
  return rooms[code] ? generateCode() : code;
}

function send(ws, msg) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function broadcast(room, msg) {
  room.players.forEach((player) => send(player.ws, msg));
}

// Remembering the last phase payload is what lets a reconnecting player be
// dropped back exactly where the room currently is.
function broadcastPhase(room, payload) {
  room.lastPhasePayload = payload;
  broadcast(room, { type: "phase_change", ...payload });
}

function getRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRandomIndex(items) {
  return Math.floor(Math.random() * items.length);
}

// A player whose seat is being held must never block the rest of the table.
function connectedCount(room) {
  return room.players.filter((p) => p.connected !== false).length;
}

function makeToken() {
  return randomBytes(16).toString("hex");
}

function cleanName(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_NAME_LEN);
}

function hostName(room) {
  const host = room.players.find((p) => p.id === room.hostId);
  return host ? host.name : "";
}

function clearRoomTimers(room) {
  if (room.clueTimer) clearTimeout(room.clueTimer);
  if (room.tallyTimer) clearTimeout(room.tallyTimer);
  if (room.majorityResultTimer) clearTimeout(room.majorityResultTimer);
  if (room.imposterGuessTimer) clearTimeout(room.imposterGuessTimer);
  room.clueTimer = null;
  room.tallyTimer = null;
  room.majorityResultTimer = null;
  room.imposterGuessTimer = null;
}

function roomUpdatePayload(room) {
  const animals = {};
  for (const p of room.players) {
    if (typeof p.animal === "number") animals[p.name] = p.animal;
  }
  return {
    type: "room_update",
    players: room.players.map((p) => p.name),
    host: hostName(room),
    playerAnimals: animals,
    disconnected: room.players.filter((p) => p.connected === false).map((p) => p.name),
  };
}

// --- CLUE-TURN TIMER ---
const CLUE_TURN_MS = 20000;
const GRACE_MS = 1000;

function startClueTurn(room) {
  const active = room.players[room.currentPlayerIndex];
  // Their seat is held, but the table should not wait out the full clock.
  if (active && active.connected === false) {
    if (!room.clues.some((c) => c.playerId === active.id)) {
      room.clues.push({
        playerId: active.id,
        player: active.name,
        clue: "— silence —",
        timedOut: true,
      });
    }
    advanceClueTurn(room);
    return;
  }

  if (room.clueTimer) clearTimeout(room.clueTimer);
  room.turnEndsAt = Date.now() + CLUE_TURN_MS;
  room.clueTimer = setTimeout(() => autoAdvanceClue(room), CLUE_TURN_MS + GRACE_MS);

  broadcastPhase(room, {
    phase: "clue",
    currentPlayerIndex: room.currentPlayerIndex,
    players: room.players.map((p) => p.name),
    clues: room.clues,
    clueDurationMs: CLUE_TURN_MS,
    clueRound: room.clueRound || 1,
  });
}

function startNewClueRound(room) {
  if (!room.players || room.players.length === 0) return;
  room.clues = [];
  room.currentPlayerIndex = pickRandomIndex(room.players);
  room.clueRound = (room.clueRound || 0) + 1;
  room.phase = "clue";
  startClueTurn(room);
}

function autoAdvanceClue(room) {
  if (room.phase !== "clue") return;
  const activePlayer = room.players[room.currentPlayerIndex];
  if (!activePlayer) return;

  if (!room.clues.some((c) => c.playerId === activePlayer.id)) {
    room.clues.push({
      playerId: activePlayer.id,
      player: activePlayer.name,
      clue: "— silence —",
      timedOut: true,
    });
  }
  advanceClueTurn(room);
}

// --- VOTE TALLY -> REVEAL ---
const TALLY_WINNER_MS = 3500;
const TALLY_TIE_MS    = 5000;
const IMPOSTER_GUESS_MS = 30000;

function finishWithGuess(room, guess, correct) {
  if (room.imposterGuessTimer) {
    clearTimeout(room.imposterGuessTimer);
    room.imposterGuessTimer = null;
  }
  const imposter = room.players[room.imposterIndex];
  room.phase = "result";
  broadcastPhase(room, {
    phase: "result",
    accusedName: imposter ? imposter.name : null,
    accusedIsImposter: true,
    imposterName: imposter ? imposter.name : null,
    secretWord: room.secretWord,
    imposterGuessedCorrectly: correct,
    imposterGuess: guess,
  });
}

function showTallyThen(room, tally, finalAccused) {
  if (room.tallyTimer) clearTimeout(room.tallyTimer);

  const isTie = finalAccused === null;
  const tallyMs = isTie ? TALLY_TIE_MS : TALLY_WINNER_MS;
  const playerNames = room.players.map((p) => p.name);

  room.phase = "tally";
  room.tally = tally;

  broadcastPhase(room, {
    phase: "tally",
    tally,
    players: playerNames,
    accusedIndex: isTie ? null : finalAccused,
    accusedName: isTie ? null : playerNames[finalAccused],
    isTie,
    tallyDurationMs: tallyMs,
  });

  room.tallyTimer = setTimeout(() => {
    room.tallyTimer = null;
    if (room.phase !== "tally") return;
    if (isTie) {
      room.votes = {};
      startNewClueRound(room);
      return;
    }

    const accused = room.players[finalAccused];
    const imposter = room.players[room.imposterIndex];
    // A player can leave between the tally broadcast and this timer firing.
    if (!accused || !imposter) {
      abortGame(room, "A player left — the mission was aborted.");
      return;
    }

    const accusedIsImposter = finalAccused === room.imposterIndex;
    const resultPayload = {
      tally,
      accusedIndex: finalAccused,
      accusedName: accused.name,
      accusedIsImposter,
      imposterName: imposter.name,
      imposterGuessedCorrectly: null,
    };

    if (accusedIsImposter) {
      // Deliberately no secretWord here: the imposter is about to guess it and
      // would otherwise just read it out of the websocket frame.
      room.phase = "imposterGuess";
      broadcastPhase(room, {
        phase: "imposterGuess",
        ...resultPayload,
        guessDurationMs: IMPOSTER_GUESS_MS,
      });
      room.imposterGuessTimer = setTimeout(() => {
        room.imposterGuessTimer = null;
        if (room.phase !== "imposterGuess") return;
        finishWithGuess(room, "", false);
      }, IMPOSTER_GUESS_MS);
    } else {
      room.phase = "result";
      broadcastPhase(room, {
        phase: "result",
        ...resultPayload,
        secretWord: room.secretWord,
      });
    }
  }, tallyMs);
}

// --- MAJORITY DECISION ---
const MAJORITY_RESULT_MS = 2200;

function showMajorityResultThen(room, yesVotes, noVotes, isMajorityYes) {
  if (room.majorityResultTimer) clearTimeout(room.majorityResultTimer);

  room.phase = "majorityResult";

  broadcastPhase(room, {
    phase: "majorityResult",
    yesVotes,
    noVotes,
    isMajorityYes,
    players: room.players.map((p) => p.name),
    majorityResultDurationMs: MAJORITY_RESULT_MS,
  });

  room.majorityResultTimer = setTimeout(() => {
    room.majorityResultTimer = null;
    if (room.phase !== "majorityResult") return;
    if (isMajorityYes) {
      room.votes = {};
      room.currentPlayerIndex = 0;
      room.phase = "vote";
      broadcastPhase(room, {
        phase: "vote",
        currentPlayerIndex: 0,
        players: room.players.map((p) => p.name),
      });
    } else {
      startNewClueRound(room);
    }
  }, MAJORITY_RESULT_MS);
}

function advanceClueTurn(room) {
  if (room.clueTimer) {
    clearTimeout(room.clueTimer);
    room.clueTimer = null;
  }

  // All clues submitted — go straight to majority vote
  if (room.clues.length >= room.players.length) {
    room.phase = "majorityVote";
    broadcastPhase(room, {
      phase: "majorityVote",
      clues: room.clues,
      players: room.players.map((p) => p.name),
    });
    return;
  }

  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  startClueTurn(room);
}

// --- PHASE RESOLUTION (shared by message handlers and disconnect resync) ---
function resolveMajorityIfReady(room) {
  const ballots = Object.values(room.majorityVotes || {});
  if (ballots.length < connectedCount(room)) return;
  const yesVotes = ballots.filter((v) => v === true).length;
  const noVotes = ballots.length - yesVotes;
  const isMajorityYes = yesVotes > room.players.length / 2;
  room.majorityVotes = {};
  showMajorityResultThen(room, yesVotes, noVotes, isMajorityYes);
}

function resolveVotesIfReady(room) {
  const voterIds = Object.keys(room.votes);
  if (voterIds.length < connectedCount(room)) return;

  const tally = {};
  for (const voterId of voterIds) {
    const accused = room.votes[voterId];
    tally[accused] = (tally[accused] || 0) + 1;
  }
  const counts = Object.values(tally);
  if (counts.length === 0) {
    startNewClueRound(room);
    return;
  }
  const maxVotes = Math.max(...counts);
  const leaders = Object.keys(tally).filter((i) => tally[i] === maxVotes).map(Number);
  const finalAccused = leaders.length === 1 ? leaders[0] : null;
  showTallyThen(room, tally, finalAccused);
}

// --- ABORT / LEAVE ---
function abortGame(room, message) {
  clearRoomTimers(room);
  room.gameStarted = false;
  room.phase = "lobby";
  room.category = null;
  room.secretWord = null;
  room.imposterIndex = null;
  room.currentPlayerIndex = 0;
  room.clues = [];
  room.votes = {};
  room.majorityVotes = {};
  room.confirmedRoles = new Set();
  broadcast(room, { type: "error", message });
  broadcast(room, roomUpdatePayload(room));
  broadcastPhase(room, { phase: "lobby" });
}

// Everything a returning player needs to render the room exactly as it stands.
function stateSnapshot(room, player) {
  const payload = { ...(room.lastPhasePayload || { phase: room.phase || "lobby" }) };
  payload.players = room.players.map((p) => p.name);

  // The clue clock is absolute on the server, so send the time actually left
  // rather than a fresh full turn.
  if (payload.phase === "clue") {
    payload.currentPlayerIndex = room.currentPlayerIndex;
    payload.clues = room.clues;
    payload.clueDurationMs = Math.max(0, (room.turnEndsAt || 0) - Date.now());
  }
  // A player who rejoins mid-tally would otherwise sit on a stale countdown.
  if (payload.phase === "tally") payload.tallyDurationMs = 1200;
  if (payload.phase === "majorityResult") payload.majorityResultDurationMs = 1200;

  return { type: "phase_change", ...payload, isResync: true, you: player.name };
}

function releaseSeat(room, player) {
  if (player.graceTimer) {
    clearTimeout(player.graceTimer);
    player.graceTimer = null;
  }
}

function removePlayer(room, player) {
  releaseSeat(room, player);
  const idx = room.players.indexOf(player);
  if (idx < 0) return;

  room.players.splice(idx, 1);
  if (room.confirmedRoles) room.confirmedRoles.delete(player.id);
  if (room.majorityVotes) delete room.majorityVotes[player.id];

  if (room.players.length === 0) {
    clearRoomTimers(room);
    delete rooms[room.code];
    return;
  }

  if (room.hostId === player.id) room.hostId = room.players[0].id;

  if (!room.gameStarted) {
    broadcast(room, roomUpdatePayload(room));
    return;
  }

  // The imposter leaving makes the round unwinnable for everyone else.
  if (idx === room.imposterIndex) {
    abortGame(room, `${player.name} left the mission — starting over.`);
    return;
  }
  if (room.players.length < MIN_PLAYERS) {
    abortGame(room, "Not enough agents left to continue the mission.");
    return;
  }

  // Every index stored against the old roster has to shift down by one.
  if (typeof room.imposterIndex === "number" && room.imposterIndex > idx) {
    room.imposterIndex -= 1;
  }

  const remappedVotes = {};
  for (const [voterId, accused] of Object.entries(room.votes || {})) {
    if (Number(voterId) === player.id) continue;   // their ballot leaves with them
    if (accused === idx) continue;                 // votes cast against them are void
    remappedVotes[voterId] = accused > idx ? accused - 1 : accused;
  }
  room.votes = remappedVotes;

  room.clues = (room.clues || []).filter((c) => c.playerId !== player.id);

  if (room.currentPlayerIndex > idx) room.currentPlayerIndex -= 1;
  if (room.currentPlayerIndex >= room.players.length) room.currentPlayerIndex = 0;

  broadcast(room, roomUpdatePayload(room));
  resyncPhase(room);
}

// A phase waiting on "everyone" may now be satisfied, either because the roster
// shrank or because someone dropped and no longer counts.
function resyncPhase(room, { restartClueTurn = true } = {}) {
  switch (room.phase) {
    case "roleReveal":
      if (room.confirmedRoles.size >= connectedCount(room)) {
        room.confirmedRoles = new Set();
        startNewClueRound(room);
      }
      break;
    case "clue": {
      const active = room.players[room.currentPlayerIndex];
      if (room.clues.length >= room.players.length) advanceClueTurn(room);
      else if (restartClueTurn || (active && active.connected === false)) startClueTurn(room);
      break;
    }
    case "majorityVote":
      resolveMajorityIfReady(room);
      break;
    case "vote":
      resolveVotesIfReady(room);
      break;
    default:
      break;
  }
}

// --- WORD LIST ---
const words = {
  Food: ["Pizza", "Sushi", "Burger", "Tacos", "Pasta", "Steak", "Ramen", "Sandwich", "Curry", "Pancakes", "Burrito", "Lasagna", "Waffles", "Hot Dog"],
  Sports: ["Basketball", "Soccer", "Tennis", "Baseball", "Swimming", "Volleyball", "Hockey", "Golf", "Boxing", "Cycling", "Skiing", "Surfing", "Wrestling"],
  Movies: ["Titanic", "Avatar", "Inception", "Interstellar", "The Matrix", "Avengers", "Joker", "Frozen", "Toy Story", "The Lion King", "Gladiator"],
  Places: ["Airport", "Library", "Beach", "Hospital", "School", "Stadium", "Museum", "Casino", "Zoo", "Restaurant", "Hotel", "Amusement Park"],
  Animals: ["Elephant", "Shark", "Eagle", "Lion", "Penguin", "Kangaroo", "Dolphin", "Cheetah", "Gorilla", "Crocodile", "Flamingo", "Wolf"],
  Technology: ["Smartphone", "Laptop", "Drone", "Robot", "Satellite", "Camera", "Headphones", "Smart Watch", "Tablet", "Video Game", "3D Printer"],
};

// --- GAME LOGIC ---
function startGame(room, chosenCategory) {
  const categoryNames = Object.keys(words);
  const category = (chosenCategory && words[chosenCategory])
    ? chosenCategory
    : getRandomItem(categoryNames);
  const secretWord = getRandomItem(words[category]);
  const imposterIndex = pickRandomIndex(room.players);

  clearRoomTimers(room);
  room.gameStarted = true;
  room.category = category;
  room.secretWord = secretWord;
  room.imposterIndex = imposterIndex;
  room.phase = "roleReveal";
  room.currentPlayerIndex = 0;
  room.clues = [];
  room.votes = {};
  room.confirmedRoles = new Set();
  room.majorityVotes = {};
  room.clueRound = 0;

  room.players.forEach((player, index) => {
    if (index === imposterIndex) {
      send(player.ws, { type: "role_assigned", role: "imposter", category });
    } else {
      send(player.ws, { type: "role_assigned", role: "innocent", category, secretWord });
    }
  });

  broadcastPhase(room, {
    phase: "roleReveal",
    currentPlayerIndex: 0,
    players: room.players.map((p) => p.name),
  });
}

// --- WEBSOCKET ---
wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  let currentRoom = null;
  let currentPlayer = null;

  function handle(msg) {
    if (msg.type === "create") {
      if (currentRoom) return;
      const name = cleanName(msg.name);
      if (!name) { send(ws, { type: "error", message: "Enter a name first" }); return; }

      const code = generateCode();
      currentPlayer = { id: nextPlayerId++, name, ws, animal: 0, token: makeToken(), connected: true };
      currentRoom = {
        code,
        hostId: currentPlayer.id,
        players: [currentPlayer],
        gameStarted: false,
        phase: "lobby",
        category: null,
        secretWord: null,
        imposterIndex: null,
        currentPlayerIndex: 0,
        clues: [],
        votes: {},
        majorityVotes: {},
        confirmedRoles: new Set(),
      };
      rooms[code] = currentRoom;
      send(ws, { type: "room_created", code, token: currentPlayer.token });
      broadcast(currentRoom, roomUpdatePayload(currentRoom));
    }

    else if (msg.type === "join") {
      if (currentRoom) return;
      const name = cleanName(msg.name);
      if (!name) { send(ws, { type: "error", message: "Enter a name first" }); return; }
      const code = typeof msg.code === "string" ? msg.code.trim().toUpperCase() : "";
      const room = rooms[code];
      if (!room) { send(ws, { type: "error", message: "Room not found" }); return; }
      if (room.gameStarted) { send(ws, { type: "error", message: "Game already started" }); return; }
      // Names are the client's identity for avatars, seats and clue attribution,
      // so two people cannot share one.
      if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        send(ws, { type: "error", message: "That name is taken in this room" });
        return;
      }

      currentPlayer = {
        id: nextPlayerId++,
        name,
        ws,
        animal: room.players.length % ANIMAL_COUNT,
        token: makeToken(),
        connected: true,
      };
      currentRoom = room;
      room.players.push(currentPlayer);
      send(ws, { type: "joined", code: room.code, token: currentPlayer.token });
      broadcast(currentRoom, roomUpdatePayload(currentRoom));
    }

    else if (msg.type === "rejoin") {
      if (currentRoom) return;
      const code = typeof msg.code === "string" ? msg.code.trim().toUpperCase() : "";
      const room = rooms[code];
      const token = typeof msg.token === "string" ? msg.token : "";
      const player = room && token
        ? room.players.find((p) => p.token === token)
        : null;

      if (!player) {
        // The room is gone or the seat was already released — start over.
        send(ws, { type: "rejoin_failed" });
        return;
      }

      releaseSeat(room, player);
      const staleWs = player.ws;
      player.ws = ws;
      player.connected = true;
      currentRoom = room;
      currentPlayer = player;
      if (staleWs && staleWs !== ws) {
        try { staleWs.close(); } catch { /* already gone */ }
      }

      send(ws, {
        type: "rejoined",
        code: room.code,
        token: player.token,
        name: player.name,
      });

      if (room.gameStarted && typeof room.imposterIndex === "number") {
        const isImposter = room.players[room.imposterIndex] === player;
        send(ws, isImposter
          ? { type: "role_assigned", role: "imposter", category: room.category }
          : { type: "role_assigned", role: "innocent", category: room.category, secretWord: room.secretWord });
      }

      broadcast(room, roomUpdatePayload(room));
      send(ws, stateSnapshot(room, player));
      // Their own ballot state matters for whether the vote screen is locked.
      if (room.phase === "vote") {
        const votedNames = Object.keys(room.votes)
          .map((id) => room.players.find((p) => p.id === Number(id)))
          .filter(Boolean)
          .map((p) => p.name);
        send(ws, {
          type: "vote_update",
          votedPlayers: votedNames,
          totalPlayers: room.players.length,
          youVoted: Object.prototype.hasOwnProperty.call(room.votes, player.id),
        });
      }
      console.log(`${player.name} rejoined ${room.code}`);
    }

    else if (msg.type === "leave_room") {
      if (!currentRoom || !currentPlayer) return;
      removePlayer(currentRoom, currentPlayer);
      currentRoom = null;
      currentPlayer = null;
    }

    else if (msg.type === "set_animal") {
      if (!currentRoom || !currentPlayer) return;
      if (currentRoom.gameStarted) return;
      const idx = msg.index;
      if (!Number.isInteger(idx) || idx < 0 || idx >= ANIMAL_COUNT) return;
      currentPlayer.animal = idx;
      broadcast(currentRoom, roomUpdatePayload(currentRoom));
    }

    else if (msg.type === "start_game") {
      if (!currentRoom || !currentPlayer) return;
      if (currentRoom.hostId !== currentPlayer.id) return;
      if (currentRoom.gameStarted) return;
      if (currentRoom.players.length < MIN_PLAYERS) {
        send(ws, { type: "error", message: `Need at least ${MIN_PLAYERS} players to start` });
        return;
      }
      startGame(currentRoom, msg.category);
    }

    else if (msg.type === "role_confirmed") {
      if (!currentRoom || !currentPlayer) return;
      if (currentRoom.phase !== "roleReveal") return;
      currentRoom.confirmedRoles.add(currentPlayer.id);
      if (currentRoom.confirmedRoles.size >= connectedCount(currentRoom)) {
        currentRoom.confirmedRoles = new Set();
        startNewClueRound(currentRoom);
      }
    }

    else if (msg.type === "submit_clue") {
      if (!currentRoom || !currentPlayer) return;
      if (currentRoom.phase !== "clue") return;
      const active = currentRoom.players[currentRoom.currentPlayerIndex];
      if (!active || active.id !== currentPlayer.id) return;
      if (currentRoom.clues.some((c) => c.playerId === currentPlayer.id)) return;

      const raw = typeof msg.clue === "string" ? msg.clue : "";
      const text = raw.trim().slice(0, 60) || "— silence —";
      currentRoom.clues.push({ playerId: currentPlayer.id, player: active.name, clue: text });
      advanceClueTurn(currentRoom);
    }

    else if (msg.type === "majority_decision") {
      if (!currentRoom || !currentPlayer) return;
      if (currentRoom.phase !== "majorityVote") return;
      if (!currentRoom.majorityVotes) currentRoom.majorityVotes = {};
      // One ballot per player — re-clicking must not advance the phase for everyone.
      if (Object.prototype.hasOwnProperty.call(currentRoom.majorityVotes, currentPlayer.id)) return;
      currentRoom.majorityVotes[currentPlayer.id] = msg.decision === "yes";
      resolveMajorityIfReady(currentRoom);
    }

    else if (msg.type === "cast_vote") {
      if (!currentRoom || !currentPlayer) return;
      if (currentRoom.phase !== "vote") return;
      const accusedIndex = msg.accusedIndex;
      if (!Number.isInteger(accusedIndex) ||
          accusedIndex < 0 ||
          accusedIndex >= currentRoom.players.length) {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(currentRoom.votes, currentPlayer.id)) return;

      currentRoom.votes[currentPlayer.id] = accusedIndex;
      const votedNames = Object.keys(currentRoom.votes)
        .map((id) => currentRoom.players.find((p) => p.id === Number(id)))
        .filter(Boolean)
        .map((p) => p.name);
      broadcast(currentRoom, {
        type: "vote_update",
        votedPlayers: votedNames,
        totalPlayers: currentRoom.players.length,
      });
      resolveVotesIfReady(currentRoom);
    }

    else if (msg.type === "imposter_guess") {
      if (!currentRoom || !currentPlayer) return;
      if (currentRoom.phase !== "imposterGuess") return;
      const imposter = currentRoom.players[currentRoom.imposterIndex];
      if (!imposter || imposter.id !== currentPlayer.id) return;

      const guess = (typeof msg.guess === "string" ? msg.guess : "").trim().slice(0, 60);
      const correct = guess.toLowerCase() === String(currentRoom.secretWord).toLowerCase();
      finishWithGuess(currentRoom, guess, correct);
    }

    else if (msg.type === "play_again") {
      if (!currentRoom || !currentPlayer) return;
      if (currentRoom.hostId !== currentPlayer.id) return;
      clearRoomTimers(currentRoom);
      currentRoom.gameStarted = false;
      currentRoom.phase = "lobby";
      currentRoom.clues = [];
      currentRoom.votes = {};
      currentRoom.majorityVotes = {};
      currentRoom.confirmedRoles = new Set();
      currentRoom.currentPlayerIndex = 0;
      currentRoom.imposterIndex = null;
      currentRoom.secretWord = null;
      broadcast(currentRoom, roomUpdatePayload(currentRoom));
      broadcastPhase(currentRoom, { phase: "lobby" });
    }
  }

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }
    if (!msg || typeof msg.type !== "string") return;

    // A bad message must fail this one player, not the whole process.
    try {
      handle(msg);
    } catch (err) {
      console.error(`[handler] ${msg.type} failed:`, err);
      send(ws, { type: "error", message: "Something went wrong on the server" });
    }
  });

  ws.on("error", (err) => console.error("[socket]", err.message));

  ws.on("close", () => {
    if (!currentRoom || !currentPlayer) return;
    const room = currentRoom;
    const player = currentPlayer;
    currentRoom = null;
    currentPlayer = null;

    // A rejoin already moved this player onto a new socket; this close event
    // belongs to the socket we replaced, so there is nothing to clean up.
    if (player.ws !== ws) return;

    try {
      if (!room.gameStarted) {
        removePlayer(room, player);
        return;
      }
      // Mid-game: hold the seat so a refresh or a dropped phone can come back.
      player.connected = false;
      broadcast(room, roomUpdatePayload(room));
      // Whatever the table was waiting on, it is no longer waiting on them.
      resyncPhase(room, { restartClueTurn: false });
      player.graceTimer = setTimeout(() => {
        player.graceTimer = null;
        try {
          removePlayer(room, player);
        } catch (err) {
          console.error("[grace] cleanup failed:", err);
        }
      }, REJOIN_GRACE_MS);
    } catch (err) {
      console.error("[close] cleanup failed:", err);
    }
  });
});

// --- HEARTBEAT ---
// Railway and most proxies silently drop idle websockets after ~60s.
const HEARTBEAT_MS = 30000;
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_MS);

wss.on("close", () => clearInterval(heartbeat));

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

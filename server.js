import { WebSocketServer } from "ws";
import { createServer } from "node:http";

const PORT = Number(process.env.PORT) || 1234;

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Imposter Game WebSocket server is running");
});

const wss = new WebSocketServer({ server: httpServer });

const rooms = {};

// --- HELPERS ---
function generateCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * 26)];
  return rooms[code] ? generateCode() : code;
}

function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

function broadcast(room, msg) {
  room.players.forEach((player) => send(player.ws, msg));
}

function getRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

// Standard room_update payload — names + host + per-player animal choices.
function roomUpdatePayload(room) {
  const animals = {};
  for (const p of room.players) {
    if (typeof p.animal === "number") animals[p.name] = p.animal;
  }
  return {
    type: "room_update",
    players: room.players.map((p) => p.name),
    host: room.host,
    playerAnimals: animals,
  };
}

// --- CLUE-TURN TIMER ---
const CLUE_TURN_MS = 20000;
const GRACE_MS = 1000;

function startClueTurn(room) {
  if (room.clueTimer) clearTimeout(room.clueTimer);
  room.turnEndsAt = Date.now() + CLUE_TURN_MS; // server-side enforcement only
  room.clueTimer = setTimeout(() => autoAdvanceClue(room), CLUE_TURN_MS + GRACE_MS);

  // Send a RELATIVE duration so clients aren't affected by clock skew.
  // Each client computes its own endsAt = Date.now() + clueDurationMs on receipt.
  broadcast(room, {
    type: "phase_change",
    phase: "clue",
    currentPlayerIndex: room.currentPlayerIndex,
    players: room.players.map((p) => p.name),
    clues: room.clues,
    clueDurationMs: CLUE_TURN_MS,
  });
}

function autoAdvanceClue(room) {
  if (room.phase !== "clue") return;
  const activePlayer = room.players[room.currentPlayerIndex];
  if (!activePlayer) return;

  // Active player ran out of time and didn't send anything — record placeholder
  if (!room.clues.some((c) => c.player === activePlayer.name && c._roundIndex === room.clues.length)) {
    room.clues.push({ player: activePlayer.name, clue: "— silence —", timedOut: true });
  }
  advanceClueTurn(room);
}

function advanceClueTurn(room) {
  if (room.clueTimer) {
    clearTimeout(room.clueTimer);
    room.clueTimer = null;
  }

  const nextIndex = room.currentPlayerIndex + 1;
  if (nextIndex >= room.players.length) {
    room.currentPlayerIndex = 0;
    room.phase = "majorityVote";
    broadcast(room, {
      type: "phase_change",
      phase: "majorityVote",
      clues: room.clues,
      players: room.players.map((p) => p.name),
    });
  } else {
    room.currentPlayerIndex = nextIndex;
    startClueTurn(room);
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
  const imposterIndex = Math.floor(Math.random() * room.players.length);

  room.gameStarted = true;
  room.category = category;
  room.secretWord = secretWord;
  room.imposterIndex = imposterIndex;
  room.phase = "roleReveal";
  room.currentPlayerIndex = 0;
  room.clues = [];
  room.votes = {};
  room.confirmedRoles = new Set();
  room.majorityVotes = [];

  // Send each player their role privately
  room.players.forEach((player, index) => {
    if (index === imposterIndex) {
      send(player.ws, {
        type: "role_assigned",
        role: "imposter",
        category,
      });
    } else {
      send(player.ws, {
        type: "role_assigned",
        role: "innocent",
        category,
        secretWord,
      });
    }
  });

  // Tell everyone to move to role reveal screen
  broadcast(room, {
    type: "phase_change",
    phase: "roleReveal",
    currentPlayerIndex: 0,
    players: room.players.map((p) => p.name),
  });
}

// --- WEBSOCKET ---
wss.on("connection", (ws) => {
  console.log("Client connected");

  let currentRoom = null;
  let currentPlayer = null;

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    // CREATE ROOM
    if (msg.type === "create") {
      const code = generateCode();
      currentPlayer = { name: msg.name, ws, animal: 0 };
      currentRoom = {
        code,
        host: msg.name,
        players: [currentPlayer],
        gameStarted: false,
        phase: "lobby",
        category: null,
        secretWord: null,
        imposterIndex: null,
        currentPlayerIndex: 0,
        clues: [],
        votes: {},
      };
      rooms[code] = currentRoom;

      console.log(`Room ${code} created by ${msg.name}`);
      send(ws, { type: "room_created", code });
      broadcast(currentRoom, roomUpdatePayload(currentRoom));
    }

    // JOIN ROOM
    else if (msg.type === "join") {
      const room = rooms[msg.code];
      if (!room) { send(ws, { type: "error", message: "Room not found" }); return; }
      if (room.gameStarted) { send(ws, { type: "error", message: "Game already started" }); return; }

      // Default new player to an animal index that matches their join order
      // (so two players that never touch the picker still get distinct animals).
      currentPlayer = { name: msg.name, ws, animal: room.players.length % 8 };
      currentRoom = room;
      room.players.push(currentPlayer);

      console.log(`${msg.name} joined room ${msg.code}`);
      send(ws, { type: "joined", code: msg.code });
      broadcast(currentRoom, roomUpdatePayload(currentRoom));
    }

    // LEAVE ROOM — player explicitly bails out of the lobby
    else if (msg.type === "leave_room") {
      if (!currentRoom || !currentPlayer) return;
      const room = currentRoom;
      room.players = room.players.filter((p) => p !== currentPlayer);
      console.log(`${currentPlayer.name} left room ${room.code}`);

      if (room.players.length === 0) {
        if (room.clueTimer) clearTimeout(room.clueTimer);
        delete rooms[room.code];
      } else {
        if (room.host === currentPlayer.name) {
          room.host = room.players[0].name;
        }
        broadcast(room, roomUpdatePayload(room));
      }

      currentRoom = null;
      currentPlayer = null;
    }

    // SET ANIMAL — lobby only
    else if (msg.type === "set_animal") {
      if (!currentRoom || !currentPlayer) return;
      if (currentRoom.gameStarted) return;
      const idx = msg.index;
      if (typeof idx !== "number" || idx < 0 || idx > 7) return;
      currentPlayer.animal = idx;
      broadcast(currentRoom, roomUpdatePayload(currentRoom));
    }

    // START GAME
    else if (msg.type === "start_game") {
      if (!currentRoom || currentRoom.host !== currentPlayer.name) return;
      if (currentRoom.players.length < 3) {
        send(ws, { type: "error", message: "Need at least 3 players to start" });
        return;
      }
      startGame(currentRoom, msg.category);
    }

    // ROLE CONFIRMED (player has seen their role and passed the device)
    else if (msg.type === "role_confirmed") {
        if (!currentRoom) return;

        if (!currentRoom.confirmedRoles) currentRoom.confirmedRoles = new Set();
        currentRoom.confirmedRoles.add(currentPlayer.name);

        // Check if all players have confirmed
        if (currentRoom.confirmedRoles.size >= currentRoom.players.length) {
            currentRoom.confirmedRoles = new Set();
            currentRoom.currentPlayerIndex = 0;
            currentRoom.clues = [];
            currentRoom.phase = "clue";
            startClueTurn(currentRoom);
        } else {
            // Still waiting for other players — do nothing
        }
    }

    // SUBMIT CLUE
    else if (msg.type === "submit_clue") {
      if (!currentRoom) return;
      // Only the active player can submit, and only once per turn
      const activeName = currentRoom.players[currentRoom.currentPlayerIndex]?.name;
      if (currentPlayer.name !== activeName) return;
      // Ignore if a clue was already submitted this turn (e.g. duplicate from auto-submit + manual)
      const lastClue = currentRoom.clues[currentRoom.clues.length - 1];
      if (lastClue && lastClue.player === activeName && lastClue._roundIndex === currentRoom.clues.length - 1) {
        return;
      }

      const text = (msg.clue ?? "").trim() || "— silence —";
      currentRoom.clues.push({ player: activeName, clue: text });
      advanceClueTurn(currentRoom);
    }

    // MAJORITY VOTE DECISION
    else if (msg.type === "majority_decision") {
      if (!currentRoom) return;

      if (!currentRoom.majorityVotes) currentRoom.majorityVotes = [];
      currentRoom.majorityVotes.push(msg.decision === "yes");

      if (currentRoom.majorityVotes.length >= currentRoom.players.length) {
        const yesVotes = currentRoom.majorityVotes.filter(v => v === true).length;
        const isMajorityYes = yesVotes > currentRoom.players.length / 2;
        currentRoom.majorityVotes = [];

        if (isMajorityYes) {
          currentRoom.votes = {};
          currentRoom.currentPlayerIndex = 0;
          currentRoom.phase = "vote";
          broadcast(currentRoom, {
            type: "phase_change",
            phase: "vote",
            currentPlayerIndex: 0,
            players: currentRoom.players.map((p) => p.name),
          });
        } else {
          currentRoom.clues = [];
          currentRoom.currentPlayerIndex = 0;
          currentRoom.phase = "clue";
          startClueTurn(currentRoom);
        }
      }
    }

    // CAST VOTE — simultaneous, server tallies once everyone has voted
    else if (msg.type === "cast_vote") {
      if (!currentRoom || currentRoom.phase !== "vote") return;
      const voterIndex = currentRoom.players.findIndex((p) => p.name === currentPlayer.name);
      if (voterIndex < 0) return;
      // Ignore double-votes
      if (Object.prototype.hasOwnProperty.call(currentRoom.votes, voterIndex)) return;

      currentRoom.votes[voterIndex] = msg.accusedIndex;

      // Broadcast who's voted so others see live progress
      const votedNames = Object.keys(currentRoom.votes).map(
        (i) => currentRoom.players[Number(i)].name
      );
      broadcast(currentRoom, {
        type: "vote_update",
        votedPlayers: votedNames,
        totalPlayers: currentRoom.players.length,
      });

      // Wait for everyone before tallying
      if (Object.keys(currentRoom.votes).length < currentRoom.players.length) return;

      // Tally
      const tally = {};
      for (const voter in currentRoom.votes) {
        const accused = currentRoom.votes[voter];
        tally[accused] = (tally[accused] || 0) + 1;
      }

      const maxVotes = Math.max(...Object.values(tally));
      const leaders = Object.keys(tally).filter((i) => tally[i] === maxVotes).map(Number);
      const finalAccused = leaders.length === 1 ? leaders[0] : null;

      if (finalAccused === null) {
        // Tie — restart clue round
        currentRoom.clues = [];
        currentRoom.currentPlayerIndex = 0;
        currentRoom.votes = {};
        currentRoom.phase = "clue";
        startClueTurn(currentRoom);
      } else {
        const accusedIsImposter = finalAccused === currentRoom.imposterIndex;
        const resultPayload = {
          tally,
          accusedIndex: finalAccused,
          accusedName: currentRoom.players[finalAccused].name,
          accusedIsImposter,
          imposterName: currentRoom.players[currentRoom.imposterIndex].name,
          secretWord: currentRoom.secretWord,
          imposterGuessedCorrectly: null,
        };
        broadcast(currentRoom, { type: "phase_change", phase: "result", ...resultPayload });
        if (accusedIsImposter) {
          currentRoom.phase = "imposterGuess";
          broadcast(currentRoom, { type: "phase_change", phase: "imposterGuess", ...resultPayload });
        } else {
          currentRoom.phase = "result";
        }
      }
    }

    // IMPOSTER GUESS
    else if (msg.type === "imposter_guess") {
      if (!currentRoom) return;
      const correct = msg.guess.trim().toLowerCase() === currentRoom.secretWord.toLowerCase();
      currentRoom.phase = "result";
      broadcast(currentRoom, {
        type: "phase_change",
        phase: "result",
        accusedName: currentRoom.players[currentRoom.imposterIndex].name,
        accusedIsImposter: true,
        imposterName: currentRoom.players[currentRoom.imposterIndex].name,
        secretWord: currentRoom.secretWord,
        imposterGuessedCorrectly: correct,
        imposterGuess: msg.guess.trim(),
      });
    }

    // PLAY AGAIN
    else if (msg.type === "play_again") {
      if (!currentRoom || currentRoom.host !== currentPlayer.name) return;
      currentRoom.gameStarted = false;
      currentRoom.phase = "lobby";
      currentRoom.clues = [];
      currentRoom.votes = {};
      currentRoom.currentPlayerIndex = 0;
      broadcast(currentRoom, roomUpdatePayload(currentRoom));
      broadcast(currentRoom, { type: "phase_change", phase: "lobby" });
    }
  });

  ws.on("close", () => {
    if (!currentRoom) return;
    currentRoom.players = currentRoom.players.filter((p) => p !== currentPlayer);
    console.log(`${currentPlayer?.name} disconnected`);

    if (currentRoom.players.length === 0) {
      if (currentRoom.clueTimer) clearTimeout(currentRoom.clueTimer);
      delete rooms[currentRoom.code];
      return;
    }

    if (currentRoom.host === currentPlayer?.name) {
      currentRoom.host = currentRoom.players[0].name;
    }

    broadcast(currentRoom, roomUpdatePayload(currentRoom));
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
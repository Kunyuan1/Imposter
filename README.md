# Imposter

A real-time party game for 3+ players. Everyone gets the same secret word
except one imposter, who has to bluff their way through the clue rounds without
being caught.

**Play it:** <https://imposter-u6ak.onrender.com>. It runs on a free Render
instance that sleeps when idle, so the first player in waits ~a minute while it
wakes. The page says as much and keeps retrying.

## How to play

1. **Gather.** One player creates a room and shares the four-letter code. The
   others join with it, pick a name and an animal avatar. The host picks a
   category and starts once there are at least 3 players.
2. **Get a role.** Everyone except the imposter sees the secret word. The
   imposter only sees the category.
3. **Give clues.** Starting from a random player, everyone takes a turn giving
   a one-line clue about the word. Each turn has a 20-second clock; running out logs
   "— silence —".
4. **Vote to vote.** After each clue round the table votes on whether it is
   ready to accuse someone. Without a majority, another clue round starts.
5. **Accuse.** Everyone votes for who they think the imposter is. A tie sends
   the table back for another clue round.
6. **Win.**
   - The agents win if they exile the imposter *and* the imposter then fails
     to guess the secret word within 30 seconds.
   - The imposter wins by surviving the vote (an innocent gets exiled), or by
     guessing the word after being caught.

Categories: Food, Sports, Movies, Places, Animals, Technology, Jobs, Music,
Nature, History, Mythology and Space. The word lists live in
[`src/data/words.js`](src/data/words.js); the lobby menu and the server both
read from it, so adding a category there is all it takes.

## Features

- Room codes, no accounts: share four letters and play.
- Works across phones on the same table; each player sees only their own role.
- Players who drop mid-game keep their seat for 90 seconds and can refresh or
  reconnect straight back into the current phase.
- A player leaving doesn't stall the table: turns, votes and confirmations stop
  waiting on them. If the imposter leaves, or fewer than 3 players remain, the
  round ends and everyone returns to the lobby.
- The client reconnects with backoff and tells players when the server is
  waking up.

## Tech stack

- **Client:** React 19 + Vite
- **Server:** Node 20+ with [`ws`](https://github.com/websockets/ws): a single
  `server.js` that holds all game state and is the only source of truth for
  roles, turns and votes
- **Hosting:** Render (free) or Railway; configs for both are included

## Running it locally

Two processes: the game server and the web client.

```bash
npm install
cp .env.example .env   # defaults to ws://localhost:1234
npm run server         # websocket game server on :1234
npm run dev            # web client on :5173
```

Env files are gitignored, so copy `.env.example` to `.env` once. It already
defaults to `ws://localhost:1234`. Open the client in a few tabs (or on phones
on the same Wi-Fi with `npm run dev -- --host`) and play.

### Scripts

| Command               | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Vite dev server for the client                 |
| `npm run server`      | Game server (same as `npm start`)              |
| `npm run build`       | Production build of the client into `dist/`    |
| `npm run preview`     | Serve the built client locally                 |
| `npm run lint`        | ESLint                                         |
| `npm run test:server` | End-to-end regression tests against the server |

### Configuration

| Variable          | Used by | Default               | Purpose                                              |
| ----------------- | ------- | --------------------- | ---------------------------------------------------- |
| `VITE_WS_URL`     | client  | `ws://localhost:1234` | Game server address, baked in at build time          |
| `PORT`            | server  | `1234`                | Port the server listens on                           |
| `REJOIN_GRACE_MS` | server  | `90000`               | How long a dropped player's seat is held mid-game    |

The server also answers `GET /health` with `{"status":"ok","rooms":N}` for
host health checks.

## Tests

```bash
npm run test:server
```

Starts its own server on port 1235, plays full games through it (including
disconnects, rejoins, bad input and timeouts) and shuts it down again. It does
not touch a server you have running for real play.

## Project layout

```
server.js               websocket game server: rooms, phases, timers, voting
src/
  App.jsx               client state machine, routes each phase to a screen
  components/           one component per screen (lobby, clues, vote, result…)
  data/words.js         categories and secret words, shared with the server
  game/socket.js        websocket client with reconnect and seat reclaim
  utils/                avatars and seat layout
test/regression.mjs     end-to-end server tests
render.yaml             Render deploy config
railway.json, Procfile  Railway / Procfile-style deploy config
```

## Deploying

The server is a plain Node websocket process and needs somewhere that keeps a
process alive. Configs for two hosts are included:

- `render.yaml`: Render, free plan. Sleeps after inactivity, so the first
  player to connect waits ~a minute while it wakes. The client shows a
  "waking HQ up" message and keeps retrying, so this is survivable.
- `railway.json`: Railway. Paid, but stays warm.

Whichever you pick, build the client with `VITE_WS_URL` pointing at it and
deploy `dist/` as a static site:

```bash
VITE_WS_URL=wss://your-server.onrender.com npm run build
```

Pasting the `https://` URL from your hosting dashboard is fine: the client
rewrites `https://` to `wss://`, and accepts a bare hostname too. If your static
host builds for you, set `VITE_WS_URL` in its build environment instead. It is
baked into the bundle at build time, so changing it means rebuilding.

## Notes

Rooms live in memory. A server restart or redeploy ends any games in progress,
which is fine for a party game but worth knowing.

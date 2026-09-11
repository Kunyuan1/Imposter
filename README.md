# Imposter

A party game for 3+ players: everyone gets the same secret word except one
imposter, who has to bluff their way through the clue rounds without being
caught.

Play it: <https://imposter-u6ak.onrender.com>. It runs on a free Render
instance that sleeps when idle, so the first player in waits ~a minute while it
wakes — the page says as much and keeps retrying.

## Running it locally

Two processes — the game server and the web client.

```bash
npm install
cp .env.example .env   # defaults to ws://localhost:1234
npm run server         # websocket game server on :1234
npm run dev            # web client on :5173
```

Env files are gitignored, so copy `.env.example` to `.env` once (it already
defaults to `ws://localhost:1234`) and you are set. Open the client in a few
tabs — or on phones on the same Wi-Fi with `npm run dev -- --host` — and play.

## Tests

```bash
npm run test:server
```

Starts its own server on port 1235, plays full games through it — including
disconnects, rejoins, bad input and timeouts — and shuts it down again. It does
not touch a server you have running for real play.

## Deploying

The server is a plain Node websocket process and needs somewhere that keeps a
process alive. Configs for two hosts are included:

- `render.yaml` — Render, free plan. Sleeps after inactivity, so the first
  player to connect waits ~a minute while it wakes. The client shows a
  "waking HQ up" message and keeps retrying, so this is survivable.
- `railway.json` — Railway. Paid, but stays warm.

Whichever you pick, build the client with `VITE_WS_URL` pointing at it and
deploy `dist/` as a static site:

```bash
VITE_WS_URL=wss://your-server.onrender.com npm run build
```

Pasting the `https://` URL from your hosting dashboard is fine — the client
rewrites `https://` to `wss://`, and accepts a bare hostname too. If your static
host builds for you, set `VITE_WS_URL` in its build environment instead. It is
baked into the bundle at build time, so changing it means rebuilding.

## Notes

Rooms live in memory. A server restart or redeploy ends any games in progress —
fine for a party game, but worth knowing. Players who drop mid-game keep their
seat for 90 seconds and can refresh or reconnect straight back into the round.

import WebSocket from "ws";
import { spawn } from "node:child_process";
import process from "node:process";

// Run against our own short-lived server on a private port so the suite never
// depends on (or disturbs) whatever you have running for real play.
const PORT = 1235;
const URL = `ws://localhost:${PORT}`;
const GRACE_MS = 3000;

const server = spawn(process.execPath, ["server.js"], {
  env: { ...process.env, PORT: String(PORT), REJOIN_GRACE_MS: String(GRACE_MS) },
  stdio: ["ignore", "pipe", "pipe"],
});
const serverErrors = [];
server.stderr.on("data", (d) => serverErrors.push(d.toString()));
const stopServer = () => { try { server.kill(); } catch { /* already gone */ } };
process.on("exit", stopServer);

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/health`);
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("server did not start");
}
await waitForServer();
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
};

const mk = (name) => new Promise((res) => {
  const ws = new WebSocket(URL);
  const p = { name, ws, inbox: [], role: null };
  ws.on("message", (d) => {
    const m = JSON.parse(d);
    p.inbox.push(m);
    if (m.type === "role_assigned") p.role = m;
  });
  ws.on("open", () => res(p));
});
const send = (p, m) => p.ws.send(JSON.stringify(m));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 4000) => {
  const t = Date.now();
  while (Date.now() - t < ms) { if (fn()) return true; await wait(50); }
  return false;
};
const last = (p, type, phase) => p.inbox.filter((m) => m.type === type && (!phase || m.phase === phase)).pop();

async function makeRoom(names) {
  const ps = [];
  for (const n of names) ps.push(await mk(n));
  send(ps[0], { type: "create", name: ps[0].name });
  await until(() => ps[0].inbox.some((m) => m.type === "room_created"));
  const created = ps[0].inbox.find((m) => m.type === "room_created");
  const code = created.code;
  ps[0].token = created.token;
  for (const p of ps.slice(1)) send(p, { type: "join", name: p.name, code });
  await wait(300);
  for (const p of ps.slice(1)) p.token = (p.inbox.find((m) => m.type === "joined") || {}).token;
  return { ps, code };
}

async function toClue(ps) {
  send(ps[0], { type: "start_game", category: "Food" });
  await until(() => ps[0].role !== null);
  ps.forEach((p) => send(p, { type: "role_confirmed" }));
  await until(() => last(ps[0], "phase_change", "clue") !== undefined);
}

async function playClues(ps) {
  for (let i = 0; i < ps.length + 2; i++) {
    if (last(ps[0], "phase_change", "majorityVote")) break;
    const pc = last(ps[0], "phase_change", "clue");
    if (!pc) break;
    const active = ps.find((p) => p.name === pc.players[pc.currentPlayerIndex]);
    if (!active) break;
    send(active, { type: "submit_clue", clue: `c-${active.name}` });
    await wait(220);
  }
  return until(() => last(ps[0], "phase_change", "majorityVote") !== undefined);
}

// ---------------------------------------------------------------
console.log("\nTEST 1 — happy path, full game");
{
  const { ps } = await makeRoom(["A", "B", "C"]);
  ok("3 players in lobby", last(ps[0], "room_update").players.length === 3);
  await toClue(ps);
  ok("reached clue phase", !!last(ps[0], "phase_change", "clue"));
  ok("all clues collected", await playClues(ps));
  ps.forEach((p) => send(p, { type: "majority_decision", decision: "yes" }));
  ok("reached vote phase", await until(() => last(ps[0], "phase_change", "vote"), 6000));
  const imposterIdx = ps.findIndex((p) => p.role.role === "imposter");
  ps.forEach((p) => send(p, { type: "cast_vote", accusedIndex: imposterIdx }));
  ok("reached tally", await until(() => last(ps[0], "phase_change", "tally"), 4000));
  ok("reached imposterGuess", await until(() => last(ps[0], "phase_change", "imposterGuess"), 6000));
  const ig = last(ps[0], "phase_change", "imposterGuess");
  ok("secretWord NOT leaked before guess", ig.secretWord === undefined, `got ${ig.secretWord}`);
  const imposter = ps[imposterIdx];
  const word = ps.find((p) => p.role.role === "innocent").role.secretWord;
  send(imposter, { type: "imposter_guess", guess: word });
  await until(() => last(ps[0], "phase_change", "result"));
  const r = last(ps[0], "phase_change", "result");
  ok("correct guess recorded", r.imposterGuessedCorrectly === true);
  ok("word revealed at the end", r.secretWord === word);
  ps.forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 2 — out-of-range vote must not crash the server");
{
  const { ps } = await makeRoom(["D", "E", "F"]);
  await toClue(ps);
  await playClues(ps);
  ps.forEach((p) => send(p, { type: "majority_decision", decision: "yes" }));
  await until(() => last(ps[0], "phase_change", "vote"), 6000);
  ps.forEach((p) => send(p, { type: "cast_vote", accusedIndex: 99 }));
  await wait(800);
  ok("bad vote rejected, no tally", !last(ps[0], "phase_change", "tally"));
  ok("sockets still open", ps.every((p) => p.ws.readyState === 1));
  const alive = await new Promise((r) => {
    const t = new WebSocket(URL);
    t.on("open", () => { t.close(); r(true); });
    t.on("error", () => r(false));
  });
  ok("server still accepts connections", alive);
  ps.forEach((p) => send(p, { type: "cast_vote", accusedIndex: 0 }));
  ok("valid votes still work afterwards", await until(() => last(ps[0], "phase_change", "tally"), 4000));
  ps.forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 3 — non-imposter disconnect keeps the imposter correct");
{
  const { ps } = await makeRoom(["G", "H", "I", "J"]);
  await toClue(ps);
  const imposter = ps.find((p) => p.role.role === "imposter");
  const leaver = ps.find((p) => p !== imposter);
  leaver.ws.close();
  await wait(400);
  const rest = ps.filter((p) => p !== leaver);
  const ru3 = last(rest[0], "room_update");
  ok("seat held, not dropped", ru3.players.length === 4);
  ok("leaver shown as away", (ru3.disconnected || []).includes(leaver.name));
  await playClues(rest);
  rest.forEach((p) => send(p, { type: "majority_decision", decision: "yes" }));
  await until(() => last(rest[0], "phase_change", "vote"), 6000);
  const names = last(rest[0], "phase_change", "vote").players;
  const target = names.indexOf(imposter.name);
  rest.forEach((p) => send(p, { type: "cast_vote", accusedIndex: target }));
  await until(() => last(rest[0], "phase_change", "tally"), 4000);
  await until(() => last(rest[0], "phase_change", "imposterGuess"), 6000);
  const ig = last(rest[0], "phase_change", "imposterGuess");
  ok("right player named as imposter", ig && ig.imposterName === imposter.name,
     `said ${ig && ig.imposterName}, actual ${imposter.name}`);
  rest.forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 4 — the imposter dropping holds the seat, then aborts once it expires");
{
  const { ps } = await makeRoom(["K", "L", "M", "N"]);
  await toClue(ps);
  const imposter = ps.find((p) => p.role.role === "imposter");
  const rest = ps.filter((p) => p !== imposter);
  imposter.ws.close();
  await wait(600);
  ok("game not ended immediately", !last(rest[0], "phase_change", "lobby"));
  ok("imposter shown as away",
     (last(rest[0], "room_update").disconnected || []).includes(imposter.name));

  // Let the held seat expire without a rejoin.
  await wait(GRACE_MS + 1500);
  ok("everyone sent back to lobby", !!last(rest[0], "phase_change", "lobby"));
  ok("players told why", (last(rest[0], "error") || {}).message?.includes(imposter.name));
  ok("seat finally released", !last(rest[0], "room_update").players.includes(imposter.name));
  rest.forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 4b — an expired seat reindexes the imposter correctly");
{
  const { ps } = await makeRoom(["K1", "L1", "M1", "N1"]);
  await toClue(ps);
  const imposterIdx = ps.findIndex((p) => p.role.role === "imposter");
  const imposter = ps[imposterIdx];
  // Drop someone seated BEFORE the imposter so every stored index must shift.
  const leaverIdx = imposterIdx > 0 ? 0 : 1;
  const leaver = ps[leaverIdx];
  leaver.ws.close();
  await wait(GRACE_MS + 1500);
  const rest = ps.filter((p) => p !== leaver);
  ok("seat released after grace", !last(rest[0], "room_update").players.includes(leaver.name));
  ok("game continued", !last(rest[0], "phase_change", "lobby"));
  await playClues(rest);
  rest.forEach((p) => send(p, { type: "majority_decision", decision: "yes" }));
  await until(() => last(rest[0], "phase_change", "vote"), 6000);
  const names = last(rest[0], "phase_change", "vote").players;
  rest.forEach((p) => send(p, { type: "cast_vote", accusedIndex: names.indexOf(imposter.name) }));
  await until(() => last(rest[0], "phase_change", "tally"), 4000);
  await until(() => last(rest[0], "phase_change", "imposterGuess"), 6000);
  const ig = last(rest[0], "phase_change", "imposterGuess");
  ok("still names the real imposter", ig && ig.imposterName === imposter.name,
     `said ${ig && ig.imposterName}, actual ${imposter.name}`);
  rest.forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 5 — one player cannot carry the majority vote alone");
{
  const { ps } = await makeRoom(["O", "P", "Q"]);
  await toClue(ps);
  await playClues(ps);
  send(ps[0], { type: "majority_decision", decision: "yes" });
  send(ps[0], { type: "majority_decision", decision: "yes" });
  send(ps[0], { type: "majority_decision", decision: "yes" });
  await wait(800);
  ok("phase did not advance on duplicate ballots", !last(ps[0], "phase_change", "majorityResult"));
  send(ps[1], { type: "majority_decision", decision: "yes" });
  send(ps[2], { type: "majority_decision", decision: "yes" });
  ok("advances once everyone votes", await until(() => last(ps[0], "phase_change", "majorityResult"), 3000));
  ps.forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 6 — duplicate names rejected");
{
  const { ps, code } = await makeRoom(["R", "S"]);
  const dup = await mk("r");
  send(dup, { type: "join", name: "r", code });
  await wait(400);
  ok("case-insensitive duplicate refused", (last(dup, "error") || {}).message?.includes("taken"));
  ok("roster unchanged", last(ps[0], "room_update").players.length === 2);
  [...ps, dup].forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 7 — only the imposter may submit the final guess");
{
  const { ps } = await makeRoom(["T", "U", "V"]);
  await toClue(ps);
  await playClues(ps);
  ps.forEach((p) => send(p, { type: "majority_decision", decision: "yes" }));
  await until(() => last(ps[0], "phase_change", "vote"), 6000);
  const imposterIdx = ps.findIndex((p) => p.role.role === "imposter");
  ps.forEach((p) => send(p, { type: "cast_vote", accusedIndex: imposterIdx }));
  await until(() => last(ps[0], "phase_change", "imposterGuess"), 8000);
  const innocent = ps.find((p) => p.role.role === "innocent");
  send(innocent, { type: "imposter_guess", guess: "Pizza" });
  await wait(600);
  ok("innocent's guess ignored", !last(ps[0], "phase_change", "result"));
  send(ps[imposterIdx], { type: "imposter_guess", guess: "definitely-wrong" });
  await until(() => last(ps[0], "phase_change", "result"), 3000);
  ok("imposter's guess accepted", last(ps[0], "phase_change", "result")?.imposterGuessedCorrectly === false);
  ps.forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 8 — garbage input is survivable");
{
  const p = await mk("Z");
  p.ws.send("not json at all");
  await wait(200);
  ok("invalid JSON answered with an error", (last(p, "error") || {}).message === "Invalid JSON");
  p.ws.send(JSON.stringify({ type: "start_game" }));
  p.ws.send(JSON.stringify({ type: "cast_vote", accusedIndex: "banana" }));
  p.ws.send(JSON.stringify({ type: "set_animal", index: 999 }));
  p.ws.send(JSON.stringify({ type: 12345 }));
  p.ws.send(JSON.stringify({ type: "join", code: null, name: null }));
  await wait(400);
  ok("socket survived the junk", p.ws.readyState === 1);
  p.ws.close();
  await wait(200);
}

console.log("\nTEST 9 — dropping and rejoining mid-game restores your seat and role");
{
  const { ps, code } = await makeRoom(["AA", "BB", "CC"]);
  await toClue(ps);
  const victim = ps[1];
  const roleBefore = victim.role;
  const token = victim.token;
  victim.ws.close();
  await wait(500);
  ok("marked away while gone", (last(ps[0], "room_update").disconnected || []).includes("BB"));

  const back = await mk("BB");
  send(back, { type: "rejoin", code, token });
  await until(() => last(back, "rejoined") !== undefined, 3000);
  ok("rejoin accepted", !!last(back, "rejoined"));
  await wait(300);
  const newRole = last(back, "role_assigned");
  ok("same role restored", newRole && newRole.role === roleBefore.role,
     `was ${roleBefore.role}, now ${newRole && newRole.role}`);
  ok("same secret word restored", (newRole || {}).secretWord === roleBefore.secretWord);
  ok("dropped back into the live phase", !!last(back, "phase_change"));
  ok("resync flagged", last(back, "phase_change").isResync === true);
  ok("no longer marked away", !(last(ps[0], "room_update").disconnected || []).includes("BB"));

  const rest = [ps[0], back, ps[2]];
  ok("game still completes after rejoin", await playClues(rest));
  rest.forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 10 — a stale or forged token is refused");
{
  const { ps, code } = await makeRoom(["DD", "EE", "FF"]);
  const bad = await mk("XX");
  send(bad, { type: "rejoin", code, token: "deadbeefdeadbeefdeadbeefdeadbeef" });
  await until(() => last(bad, "rejoin_failed") !== undefined, 2000);
  ok("forged token refused", !!last(bad, "rejoin_failed"));
  send(bad, { type: "rejoin", code: "ZZZZ", token: ps[0].token });
  await wait(400);
  ok("unknown room refused", last(bad, "rejoin_failed") !== undefined);
  ok("roster untouched", last(ps[0], "room_update").players.length === 3);
  [...ps, bad].forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 11 — a dropped player does not stall the vote");
{
  const { ps } = await makeRoom(["GG", "HH", "II", "JJ"]);
  await toClue(ps);
  await playClues(ps);
  ps.forEach((p) => send(p, { type: "majority_decision", decision: "yes" }));
  await until(() => last(ps[0], "phase_change", "vote"), 6000);
  ps[3].ws.close();
  await wait(500);
  const rest = ps.slice(0, 3);
  rest.forEach((p) => send(p, { type: "cast_vote", accusedIndex: 0 }));
  ok("tally resolves without the missing player",
     await until(() => last(rest[0], "phase_change", "tally"), 4000));
  rest.forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 12 — the imposter never answering still ends the round");
{
  const { ps } = await makeRoom(["KK", "LL", "MM"]);
  await toClue(ps);
  await playClues(ps);
  ps.forEach((p) => send(p, { type: "majority_decision", decision: "yes" }));
  await until(() => last(ps[0], "phase_change", "vote"), 6000);
  const imposterIdx = ps.findIndex((p) => p.role.role === "imposter");
  ps.forEach((p) => send(p, { type: "cast_vote", accusedIndex: imposterIdx }));
  await until(() => last(ps[0], "phase_change", "imposterGuess"), 8000);
  const ig = last(ps[0], "phase_change", "imposterGuess");
  ok("a guess deadline is advertised", typeof ig.guessDurationMs === "number");
  console.log(`  (waiting out the ${ig.guessDurationMs / 1000}s guess timer...)`);
  ok("round resolves on its own",
     await until(() => last(ps[0], "phase_change", "result"), ig.guessDurationMs + 6000));
  const r = last(ps[0], "phase_change", "result");
  ok("counted as a failed guess", r.imposterGuessedCorrectly === false);
  ok("word revealed", !!r.secretWord);
  ps.forEach((p) => p.ws.close());
  await wait(200);
}

console.log("\nTEST 13 — avatar selection covers all 13 animals");
{
  const { ps } = await makeRoom(["N1", "N2"]);
  send(ps[0], { type: "set_animal", index: 12 });
  await wait(300);
  ok("highest valid animal accepted",
     last(ps[0], "room_update").playerAnimals.N1 === 12);
  send(ps[0], { type: "set_animal", index: 13 });
  send(ps[0], { type: "set_animal", index: -1 });
  send(ps[0], { type: "set_animal", index: 1.5 });
  await wait(400);
  ok("out-of-range and fractional indexes ignored",
     last(ps[0], "room_update").playerAnimals.N1 === 12);
  ok("server unharmed", ps[0].ws.readyState === 1);
  ps.forEach((p) => p.ws.close());
  await wait(200);
}

console.log(`\n================  ${pass} passed, ${fail} failed  ================\n`);
const crashes = serverErrors.join("").trim();
if (crashes) {
  console.log("SERVER STDERR:\n" + crashes);
  fail++;
}
stopServer();
process.exit(fail === 0 ? 0 : 1);

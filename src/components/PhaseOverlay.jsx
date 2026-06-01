import React, { useCallback, useEffect, useRef, useState } from "react";
import { seatsFor } from "../utils/seats";
import { animalFor, WOLF } from "../utils/animals";
import { useToast } from "./Toast";

/**
 * Switches its content based on game phase. Sits above <GameStage /> and
 * uses the same seat coordinates so any seat-anchored accents (glow,
 * bubbles, badges) line up perfectly over the table avatars.
 *
 * Two visual styles:
 *  - Light-chrome:  clue, majorityVote, vote — table center stays visible
 *  - Center-card:   roleReveal, result, imposterGuess — dim + floating card
 */
export default function PhaseOverlay(props) {
  const { phase } = props;

  switch (phase) {
    case "roleReveal":    return <RoleRevealOverlay {...props} />;
    case "clue":          return <ClueOverlay {...props} />;
    case "majorityVote":  return <MajorityOverlay {...props} />;
    case "vote":          return <VoteOverlay {...props} />;
    case "tally":         return <TallyOverlay {...props} />;
    case "imposterGuess": return <ImposterGuessOverlay {...props} />;
    case "result":        return <ResultOverlay {...props} />;
    default:              return null;
  }
}

// ───────────────────────── Role Reveal ─────────────────────────

function RoleRevealOverlay({ myRole, players, playerName, animals, roleConfirmed, onRoleConfirmed }) {
  if (!myRole) return null;
  const isImposter = myRole.role === "imposter";
  const { emoji, tint } = isImposter ? WOLF : animalFor(players, playerName, animals);

  return (
    <div className="overlay overlay-card">
      <div className="overlay-dim" />
      <div className={`reveal-card ${isImposter ? "reveal-card-imposter" : "reveal-card-agent"}`}>
        <div className="reveal-disc" style={{ background: tint }}>
          <span>{emoji}</span>
        </div>
        <span className={`role-pill ${isImposter ? "role-pill-imposter" : "role-pill-agent"}`}>
          {isImposter ? "Imposter" : "Agent"}
        </span>
        {isImposter ? (
          <>
            <p className="reveal-small reveal-small-light">you don't know the word</p>
            <p className="reveal-tiny reveal-tiny-light">bluff your way through</p>
          </>
        ) : (
          <>
            <p className="reveal-label">your secret word</p>
            <p className="reveal-word">{myRole.secretWord}</p>
          </>
        )}

        {!roleConfirmed ? (
          <button type="button" className="btn btn-ink reveal-ready-btn" onClick={onRoleConfirmed}>
            I'm ready
          </button>
        ) : (
          <p className="reveal-waiting">waiting for other agents...</p>
        )}
      </div>
    </div>
  );
}

// ────────────────────────── Clue Phase ─────────────────────────

/**
 * Pop-up window design. Dimmed table behind, two corner badges pinned
 * outside the window (timer top-left, keyword top-right), and a cream
 * card in the center with header / log / input. No more per-seat
 * speech bubbles — the log inside the window replaces them.
 */
function ClueOverlay({ game, isMyTurn, animals, clueInput, setClueInput, onSubmitClue, myRole, playerName }) {
  const activeIdx = game.currentPlayerIndex ?? 0;
  const activeName = game.players[activeIdx];
  const total = game.players.length;
  const round = game.clueRound || 1;
  const submittedRef = useRef(false);

  // Reset submitted-guard whenever a new turn starts
  useEffect(() => { submittedRef.current = false; }, [activeIdx]);

  const handleManualSubmit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmitClue();
  };

  const handleExpire = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmitClue({ force: true });
  }, [onSubmitClue]);

  // Active player still gets a yellow glow ring on their seat at the table
  const seats = seatsFor(game.players.length);

  return (
    <div className="overlay overlay-card">
      <div className="overlay-dim" />

      {/* Active-player glow stays on the table (no per-seat bubbles anymore) */}
      {seats[activeIdx] && (
        <div
          className="seat-glow seat-glow-active"
          style={{
            left: `${seats[activeIdx].left}%`,
            top: `${seats[activeIdx].top}%`,
            width: `${seats[activeIdx].size + 14}px`,
            height: `${seats[activeIdx].size + 14}px`,
          }}
        />
      )}

      {/* Corner: countdown orb (top-left, outside the window) */}
      <ClueTimerOrb endsAt={game.turnEndsAt} onExpire={handleExpire} />

      {/* Corner: keyword badge (top-right, outside the window) */}
      <ClueKeywordBadge
        myRole={myRole}
        players={game.players}
        animals={animals}
        playerName={playerName}
      />

      {/* The clue window itself */}
      <div className="clue-window">
        {/* Header */}
        <div className="clue-window-header">
          <div className="clue-window-header-row">
            <span className="clue-window-eyebrow">clue phase</span>
            <span className="clue-window-counter">
              round {round} · clue {activeIdx + 1} of {total}
            </span>
          </div>
          <p className="clue-window-turn">
            {isMyTurn
              ? "your turn — drop a clue"
              : <><strong>{activeName}</strong>'s turn</>}
          </p>
        </div>

        {/* Clue log */}
        <div className="clue-window-log">
          <p className="clue-window-label">previous clues</p>
          {(!game.clues || game.clues.length === 0) ? (
            <p className="clue-window-empty">no clues yet</p>
          ) : (
            game.clues.map((c, i) => {
              const { emoji, tint } = animalFor(game.players, c.player, animals);
              const isSilence = c.timedOut || c.clue === "— silence —";
              return (
                <div key={i} className="clue-window-row">
                  <div className="clue-window-avatar" style={{ background: tint }}>
                    <span>{emoji}</span>
                  </div>
                  <div className="clue-window-text">
                    <span className="clue-window-name">{c.player}</span>
                    {isSilence ? (
                      <span className="clue-window-silence">— silence —</span>
                    ) : (
                      <span className="clue-window-quote">"{c.clue}"</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input zone */}
        <div className="clue-window-input">
          {isMyTurn ? (
            <>
              <div className="clue-window-input-row">
                <input
                  type="text"
                  placeholder="type your clue..."
                  value={clueInput}
                  onChange={(e) => setClueInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
                  autoFocus
                  maxLength={40}
                />
                <button type="button" className="clue-window-send" onClick={handleManualSubmit}>
                  send
                </button>
              </div>
              <p className="clue-window-helper">
                one word or short phrase · don't say the word itself
              </p>
            </>
          ) : (
            <p className="clue-window-waiting">
              waiting for <strong>{activeName}</strong> to transmit...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Inline 56px countdown orb — orange border, dark center, pulses red < 5s. */
function ClueTimerOrb({ endsAt, onExpire }) {
  const TURN_SECONDS = 20;
  function remaining(end) {
    if (!end) return null;
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  }

  const [seconds, setSeconds] = useState(() => remaining(endsAt) ?? TURN_SECONDS);
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (!endsAt) return;
    firedRef.current = false;
    const id = setInterval(() => {
      const s = remaining(endsAt);
      if (s === null) return;
      setSeconds(s);
      if (s === 0 && !firedRef.current) {
        firedRef.current = true;
        if (onExpireRef.current) onExpireRef.current();
      }
    }, 200);
    return () => clearInterval(id);
  }, [endsAt]);

  const danger = seconds <= 5;
  return (
    <div className={`clue-timer-orb ${danger ? "danger" : ""}`} aria-label={`${seconds} seconds left`}>
      <div className="clue-timer-orb-value">{seconds}</div>
      <div className="clue-timer-orb-label">sec</div>
    </div>
  );
}

/** Inline keyword badge — dark pill, animal + word for agents, "IMPOSTER" red for imposter. */
function ClueKeywordBadge({ myRole, players, animals, playerName }) {
  if (!myRole) return null;
  const isImposter = myRole.role === "imposter";
  const { emoji } = isImposter ? WOLF : animalFor(players, playerName, animals);

  return (
    <div className={`clue-keyword-badge ${isImposter ? "imposter" : ""}`}>
      <span className="clue-keyword-emoji" aria-hidden="true">{emoji}</span>
      <div className="clue-keyword-lines">
        <span className="clue-keyword-label">
          {isImposter ? "you are" : "your word"}
        </span>
        <span className={`clue-keyword-word ${isImposter ? "imposter" : ""}`}>
          {isImposter ? "IMPOSTER" : myRole.secretWord}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────── Majority Vote ────────────────────────

function MajorityOverlay({ onMajorityDecision }) {
  const [vote, setVote] = useState(null);

  function cast(isYes) {
    if (vote !== null) return;
    setVote(isYes);
    onMajorityDecision(isYes);
  }

  return (
    <div className="overlay">
      <div className="overlay-top">
        <div className="top-pill">enough evidence to accuse?</div>
      </div>

      <div className="overlay-bottom overlay-bottom-row">
        <button
          type="button"
          className="btn btn-mint"
          onClick={() => cast(true)}
          disabled={vote !== null}
        >
          Yes, accuse
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => cast(false)}
          disabled={vote !== null}
        >
          More clues
        </button>
        {vote !== null && (
          <p className="overlay-status">vote cast — waiting for others</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────── Exile Vote ────────────────────────────

function VoteOverlay({ game, animals, playerName, votedPlayers = [], hasVoted, onCastVote }) {
  const seats = seatsFor(game.players.length);
  const myIndex = game.players.findIndex((p) => p === playerName);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const showToast = useToast();

  // We only know who has voted, not who they voted for (server keeps that
  // secret to avoid leaking info mid-vote). So no per-suspect tallies.

  function tap(i) {
    if (hasVoted) return;
    if (i === myIndex) return;
    setSelectedIdx(i);
  }

  function lockIn() {
    if (hasVoted) return;
    if (selectedIdx === null) {
      showToast("Tap a suspect first.");
      return;
    }
    onCastVote(selectedIdx);
  }

  const pending = game.players.filter((p) => !votedPlayers.includes(p));

  return (
    <div className="overlay">
      <div className="overlay-dim overlay-dim-vote" />

      <div className="overlay-top">
        <div className="top-stack">
          <div className="top-pill">who's the disguised wolf?</div>
          <span className="top-subtitle">tap a suspect to accuse</span>
        </div>
      </div>

      {seats.map((seat, i) => {
        const name = game.players[i];
        if (!name) return null;
        const isMe = i === myIndex;
        const isSelected = i === selectedIdx;

        return (
          <React.Fragment key={i}>
            {/* Tap target — fully covers the seat disc */}
            <button
              type="button"
              className={`seat-tap ${isMe ? "seat-tap-self" : ""} ${isSelected ? "seat-tap-selected" : ""}`}
              style={{
                left: `${seat.left}%`,
                top: `${seat.top}%`,
                width: `${seat.size + 4}px`,
                height: `${seat.size + 4}px`,
              }}
              onClick={() => tap(i)}
              disabled={isMe || hasVoted}
              aria-label={`Vote for ${name}`}
            />
            {isSelected && (
              <div
                className="seat-glow seat-glow-pick"
                style={{
                  left: `${seat.left}%`,
                  top: `${seat.top}%`,
                  width: `${seat.size + 18}px`,
                  height: `${seat.size + 18}px`,
                }}
              />
            )}
            {isSelected && (
              <div
                className="seat-tag seat-tag-pick"
                style={{
                  left: `${seat.left}%`,
                  // Below the name (which sits at top + size/2 + 6, ~13px tall).
                  top: `calc(${seat.top}% + ${seat.size / 2 + 26}px)`,
                }}
              >
                your pick
              </div>
            )}
          </React.Fragment>
        );
      })}

      <div className="overlay-bottom">
        {!hasVoted ? (
          <>
            <button type="button" className="btn btn-purple" onClick={lockIn}>
              Lock in vote
            </button>
            <p className="overlay-caption">
              {votedPlayers.length} / {game.players.length} locked in
            </p>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ink" disabled>
              Vote locked
            </button>
            <p className="overlay-caption">
              {pending.length === 0
                ? "tallying..."
                : `still deciding: ${pending.join(", ")}`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────── Imposter Guess ────────────────────────

function ImposterGuessOverlay({ isImposter, onImposterGuess }) {
  const [guess, setGuess] = useState("");
  const showToast = useToast();

  function submit() {
    if (guess.trim() === "") {
      showToast("Enter your final guess.");
      return;
    }
    onImposterGuess(guess);
  }

  return (
    <div className="overlay overlay-card">
      <div className="overlay-dim" />
      <div className="guess-overlay-card">
        <div className="reveal-disc reveal-disc-wolf" style={{ background: WOLF.tint }}>
          <span>{WOLF.emoji}</span>
        </div>

        {isImposter ? (
          <>
            <p className="reveal-label">last stand</p>
            <p className="guess-helper">guess the secret word to steal the win</p>
            <div className="guess-input-card">
              <input
                type="text"
                placeholder="your guess..."
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                autoFocus
                maxLength={30}
              />
            </div>
            <button type="button" className="btn btn-red" onClick={submit}>
              Take the shot
            </button>
            <p className="guess-helper-tiny">one chance — make it count</p>
          </>
        ) : (
          <>
            <p className="reveal-label">last stand</p>
            <p className="guess-helper">the imposter is making their final guess...</p>
            <span className="dots-row" aria-hidden="true">
              <span /><span /><span />
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────── Vote Tally Reveal ─────────────────────

function TallyOverlay({ game, players, animals }) {
  const tally = game?.tally || {};
  const isTie = !!game?.isTie;
  const accusedName = game?.accusedName || null;
  const allPlayers = (game?.players?.length ? game.players : players) || [];
  const tallyDurationMs = game?.tallyDurationMs || 3500;

  // Build sorted rows (descending votes), then split into "with votes" and "zero"
  const rows = allPlayers
    .map((name, i) => ({ name, votes: Number(tally[i] || tally[String(i)] || 0) | 0 }))
    .sort((a, b) => b.votes - a.votes);

  const withVotes = rows.filter((r) => r.votes > 0);
  const zeroVotes = rows.filter((r) => r.votes === 0);
  const maxVotes = withVotes.length ? withVotes[0].votes : 0;

  // Animate bar widths from 0 → final on mount
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(id);
  }, []);

  // Countdown for tie state (ticks each second until server advances)
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(tallyDurationMs / 1000));
  useEffect(() => {
    if (!isTie) return;
    const startedAt = Date.now();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((tallyDurationMs - (Date.now() - startedAt)) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [isTie, tallyDurationMs]);

  const accusedAnimal = accusedName ? animalFor(allPlayers, accusedName, animals) : null;

  return (
    <div className="overlay overlay-card">
      <div className="overlay-dim" />
      <div className={`tally-card ${isTie ? "tally-card-tie" : ""}`}>
        <p className="tally-eyebrow">exile vote · results</p>

        {isTie ? (
          <>
            <div className="tally-emoji" aria-hidden="true">⚖️</div>
            <h2 className="tally-title tally-title-tie">it's a tie!</h2>
          </>
        ) : (
          <h2 className="tally-title">the votes are in</h2>
        )}

        <div className="tally-rows">
          {withVotes.map((row, idx) => {
            const isLeader = !isTie && idx === 0;
            const isTied = isTie && row.votes === maxVotes;
            const isFaded = isTie && row.votes < maxVotes;
            const { emoji, tint } = animalFor(allPlayers, row.name, animals);
            const widthPct = isTied ? 100 : maxVotes ? (row.votes / maxVotes) * 100 : 0;

            const fillClass =
              isTied ? "tally-fill-yellow" :
              isLeader ? "tally-fill-red" :
              isFaded ? "tally-fill-faded" :
              "tally-fill-purple";

            return (
              <div key={row.name} className={`tally-row ${isFaded ? "tally-row-faded" : ""}`}>
                <div className="tally-row-head">
                  <div className="tally-avatar" style={{ background: tint }}>
                    <span>{emoji}</span>
                  </div>
                  <span className="tally-name">{row.name}</span>
                  {isLeader && <span className="tally-chip tally-chip-suspect">most suspected</span>}
                  {isTied && <span className="tally-chip tally-chip-tied">tied</span>}
                  <span className="tally-count">{row.votes}</span>
                </div>
                <div className="tally-bar">
                  <div
                    className={`tally-fill ${fillClass}`}
                    style={{ width: animated ? `${widthPct}%` : "0%" }}
                  />
                </div>
              </div>
            );
          })}

          {zeroVotes.length > 0 && (
            <p className="tally-zero-row">
              {zeroVotes.map((z) => z.name).join(" · ")} — 0
            </p>
          )}
        </div>

        <div className="tally-divider" />

        {isTie ? (
          <div className="tally-footer-tie">
            <p className="tally-footer-main">no one is exiled</p>
            <p className="tally-footer-sub">
              back to the clues in{" "}
              <span className="tally-countdown">{secondsLeft}</span>
            </p>
          </div>
        ) : accusedAnimal ? (
          <div className="tally-footer-winner">
            <div className="tally-avatar tally-avatar-sm" style={{ background: accusedAnimal.tint }}>
              <span>{accusedAnimal.emoji}</span>
            </div>
            <span className="tally-footer-text">
              <strong>{accusedName}</strong> is being exiled
              <span className="dots-row" aria-hidden="true"><span /><span /><span /></span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ───────────────────────── Result Reveal ───────────────────────

function ResultOverlay({ result, players, animals, isHost, isImposter, onPlayAgain, onImposterGuessButton }) {
  const [stage, setStage] = useState(0);
  const timersRef = useRef([]);

  const advance = (n) => setStage((s) => Math.max(s, n));

  useEffect(() => {
    timersRef.current = [
      setTimeout(() => advance(1), 1800),
      setTimeout(() => advance(2), 3800),
      setTimeout(() => advance(3), 5800),
      setTimeout(() => advance(4), 7800),
    ];
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  function skip() {
    timersRef.current.forEach(clearTimeout);
    setStage(4);
  }

  const { accusedName, accusedIsImposter, imposterName, secretWord, imposterGuess, imposterGuessedCorrectly } = result;
  const accusedAnimal = animalFor(players, accusedName, animals);
  const imposterCaughtPending = accusedIsImposter && imposterGuessedCorrectly === null;
  const agentsWin = accusedIsImposter && imposterGuessedCorrectly === false;
  const imposterStole = accusedIsImposter && imposterGuessedCorrectly === true;
  const imposterEscaped = !accusedIsImposter;

  return (
    <div className="overlay overlay-card">
      <div className="overlay-dim" />

      {stage < 4 && (
        <button type="button" className="skip-btn" onClick={skip}>skip →</button>
      )}

      <div className="result-card">
        {stage === 0 && (
          <div className="result-stage">
            <div className="spinner-light" />
            <p className="result-caption">analyzing votes...</p>
          </div>
        )}

        {stage >= 1 && (
          <div className="result-stage result-stage-enter">
            <div className="reveal-disc reveal-disc-md" style={{ background: accusedAnimal.tint }}>
              <span>{accusedAnimal.emoji}</span>
            </div>
            <p className="result-label">exiled agent</p>
            <p className="result-name">{accusedName}</p>
          </div>
        )}

        {stage >= 2 && (
          <div className={`verdict-pill ${accusedIsImposter ? "verdict-good" : "verdict-bad"} result-stage-enter`}>
            {accusedIsImposter ? "confirmed — the imposter" : "innocent agent exiled"}
          </div>
        )}

        {stage >= 3 && !imposterCaughtPending && (
          <>
            <div className="identity-strip result-stage-enter">
              <div className="reveal-disc reveal-disc-sm" style={{ background: WOLF.tint }}>
                <span>{WOLF.emoji}</span>
              </div>
              <div className="identity-lines">
                <span className="identity-label">the imposter</span>
                <span className="identity-name">{imposterName}</span>
              </div>
            </div>
            <div className="secret-strip result-stage-enter">
              <span className="identity-label">secret word</span>
              <span className="secret-strip-word">{secretWord}</span>
              {imposterGuess && (
                <span className="identity-label" style={{ marginTop: 6 }}>
                  guess: <strong style={{ color: "#fff" }}>{imposterGuess}</strong>
                </span>
              )}
            </div>
          </>
        )}

        {stage >= 4 && (
          <div className="result-stage result-stage-enter" style={{ width: "100%" }}>
            {imposterCaughtPending ? (
              <>
                <div className="winner-pill winner-imposter">Imposter caught!</div>
                {isImposter ? (
                  <button type="button" className="btn btn-red" onClick={onImposterGuessButton}>
                    Make your last stand
                  </button>
                ) : (
                  <p className="result-caption">awaiting imposter's final guess...</p>
                )}
              </>
            ) : (
              <>
                <div className={`winner-pill ${
                  agentsWin ? "winner-agents" :
                  imposterStole ? "winner-steal" :
                  "winner-imposter"
                }`}>
                  {agentsWin && "Agents Win"}
                  {imposterStole && "Imposter Steals the Win"}
                  {imposterEscaped && "Imposter Wins"}
                </div>
                {isHost ? (
                  <button type="button" className="btn btn-yellow" onClick={onPlayAgain}>
                    Play again
                  </button>
                ) : (
                  <p className="result-caption">waiting for host to start next mission...</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

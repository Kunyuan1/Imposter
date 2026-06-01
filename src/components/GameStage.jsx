import React from "react";
import { animalFor } from "../utils/animals";
import { seatsFor } from "../utils/seats";

/**
 * Always-on background scene. Stays mounted for the entire game so phase
 * transitions don't unmount the table.
 *
 * Each seat is rendered as two independently-positioned elements:
 *   - .seat-wrap (the avatar disc) — its CENTER is anchored at
 *     (seat.left, seat.top). This is the coord that any overlay accent
 *     (glow, tap target) also targets, so they line up on the disc.
 *   - .seat-name — absolutely positioned below the disc, so the disc's
 *     center is unaffected by the name's presence.
 *
 * Never renders the wolf — every seat shows the player's chosen animal.
 */
export default function GameStage({ players = [], host = "", animals = {}, exiled = null }) {
  const seats = seatsFor(players.length);

  return (
    <div className="game-stage" aria-hidden="true">
      <div className="stage-floor" />

      <div className="lamp-cord" />
      <div className="lamp-shade" />
      <div className="lamp-glow" />

      <div className="table-shadow" />
      <div className="table-side" />
      <div className="table-top" />
      <div className="table-felt" />

      <div className="table-deck">
        <div className="deck-card" />
        <div className="deck-card deck-card-stacked" />
      </div>

      {seats.map((seat, i) => {
        const name = players[i];
        if (!name) return null;
        const { emoji, tint } = animalFor(players, name, animals);
        const isExiled = exiled === name;

        return (
          <React.Fragment key={name}>
            {/* Disc wrap: centered on the seat coord */}
            <div
              className="seat-wrap"
              style={{
                left: `${seat.left}%`,
                top: `${seat.top}%`,
              }}
            >
              <div
                className={`seat-disc ${isExiled ? "seat-exiled" : ""}`}
                style={{
                  width: `${seat.size}px`,
                  height: `${seat.size}px`,
                  background: tint,
                  fontSize: `${Math.round(seat.size * 0.55)}px`,
                }}
              >
                <span>{emoji}</span>
                {name === host && <span className="seat-crown">👑</span>}
              </div>
            </div>

            {/* Name: positioned just below the disc */}
            <span
              className="seat-name"
              style={{
                left: `${seat.left}%`,
                top: `calc(${seat.top}% + ${seat.size / 2 + 6}px)`,
              }}
            >
              {name}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

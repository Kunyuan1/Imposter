import React from "react";
import { animalFor, WOLF } from "../utils/animals";

/**
 * Circular animal avatar.
 *
 * Props:
 *   players  — string[] of player names (used to derive a stable animal)
 *   name     — this player's name
 *   size     — "sm" | "md" (default) | "lg" | "xl"
 *   crown    — show a crown overhead (host indicator)
 *   withName — render the player's name below the circle in a column
 *   asWolf   — render the imposter symbol (🐺) instead of looking up the
 *              player's animal. Use for imposter-only contexts (role reveal,
 *              corner badge, result identity row, imposter guess screen).
 */
export default function AnimalAvatar({ players, name, animals, size = "md", crown = false, withName = false, asWolf = false }) {
  const { emoji, tint } = asWolf ? WOLF : animalFor(players, name, animals);

  const circle = (
    <span
      className={`avatar avatar-${size}`}
      style={{ background: tint }}
      role="img"
      aria-label={name}
    >
      {emoji}
      {crown && <span className="avatar-crown" aria-hidden="true">👑</span>}
    </span>
  );

  if (!withName) return circle;

  return (
    <div className="avatar-column">
      {circle}
      <span className="name">{name}</span>
    </div>
  );
}

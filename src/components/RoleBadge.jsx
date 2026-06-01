import React from "react";
import { animalFor, WOLF } from "../utils/animals";

/**
 * Fixed top-center pill that keeps the player's role visible.
 *   Agent:    "🦊 SUSHI"     (navy bg)
 *   Imposter: "🐺 IMPOSTER"  (red bg — wolf is the reserved imposter symbol)
 */
export default function RoleBadge({ role, secretWord, players, name, animals }) {
  if (!role) return null;
  const isImposter = role === "imposter";
  const emoji = isImposter ? WOLF.emoji : animalFor(players, name, animals).emoji;

  return (
    <div className={`role-badge ${isImposter ? "role-badge-imposter" : ""}`}>
      <span className="emoji" aria-hidden="true">{emoji}</span>
      <span className="word">{isImposter ? "IMPOSTER" : secretWord}</span>
    </div>
  );
}

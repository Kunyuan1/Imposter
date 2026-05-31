import React from "react";

/**
 * Small fixed badge that keeps your role/word visible during in-game phases
 * so players don't forget what they're working with.
 */
export default function RoleBadge({ role, secretWord }) {
  if (!role) return null;

  const isImposter = role === "imposter";

  return (
    <div className={`role-badge ${isImposter ? "imposter" : "agent"}`}>
      <span className="role-badge-tag">
        {isImposter ? "// role" : "// codeword"}
      </span>
      <span className="role-badge-value">
        {isImposter ? "IMPOSTER" : secretWord}
      </span>
    </div>
  );
}

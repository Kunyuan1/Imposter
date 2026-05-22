import React from "react";

export default function TallyScreen({ game, tally, onContinue }) {
  const sortedPlayers = [...game.players]
    .map((player, index) => ({
      name: player,
      index,
      votes: tally[index] || 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  const maxVotes = Math.max(...sortedPlayers.map((p) => p.votes));
  const leaders = sortedPlayers.filter((p) => p.votes === maxVotes);
  const isTie = leaders.length > 1;

  return (
    <section className="card">
      <h1>Vote Results</h1>
      <p className="subtitle">
        {isTie ? "⚖️ It's a tie! A new clue round will begin." : `👤 ${leaders[0].name} has been accused!`}
      </p>

      <div className="tally-list">
        {sortedPlayers.map((player) => (
          <div className="tally-row" key={player.index}>
            <span className="tally-name">{player.name}</span>
            <span className="tally-votes">{player.votes} vote{player.votes !== 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>

      <button type="button" className="primary" onClick={onContinue}>
        {isTie ? "Start New Clue Round" : "Continue"}
      </button>
    </section>
  );
}
import React, { useState } from 'react';
import { useToast } from './Toast';

export default function MajorityVoteScreen({ game, onDecision }) {
  // We use an object to store votes: { "Player 1": true, "Player 2": false }
  const [votes, setVotes] = useState({});
  const showToast = useToast();

  function handleVote(player, isYes) {
    setVotes({
      ...votes,
      [player]: isYes
    });
  }

  function submitMajorityVote() {
    const totalPlayers = game.players.length;
    const votesCast = Object.keys(votes).length;

    // Guardrail: Ensure everyone votes
    if (votesCast < totalPlayers) {
      showToast("All agents must cast a vote before proceeding.");
      return;
    }

    // Count how many 'true' (Yes) votes there are
    const yesVotes = Object.values(votes).filter(vote => vote === true).length;
    
    // Check if Yes votes are strictly greater than half the players
    const isMajorityYes = yesVotes > (totalPlayers / 2);
    
    onDecision(isMajorityYes);
  }

  return (
    <section className="card vote-card">
      <h1 className="title-glow">PROCEED TO EXILE?</h1>
      <p className="subtitle">Do you have enough evidence to accuse?</p>

      <div className="suspect-list">
        {game.players.map((player) => (
          <div key={player} className="suspect-row" style={{ justifyContent: 'space-between' }}>
            <span className="suspect-name">{player}</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                className={votes[player] === true ? "btn-primary" : "btn-secondary"}
                onClick={() => handleVote(player, true)}
                style={{ marginTop: 0, padding: '8px 16px' }}
              >
                Yes
              </button>
              <button 
                type="button"
                className={votes[player] === false ? "btn-primary" : "btn-secondary"}
                onClick={() => handleVote(player, false)}
                style={{ marginTop: 0, padding: '8px 16px', backgroundColor: votes[player] === false ? '#ef4444' : '' }}
              >
                No
              </button>
            </div>
          </div>
        ))}
      </div>

      <button 
        type="button" 
        className="btn-primary pulse" 
        onClick={submitMajorityVote}
      >
        SUBMIT BALLOTS
      </button>
    </section>
  );
}
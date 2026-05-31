import React, { useState } from 'react';

export default function MajorityVoteScreen({ game, onDecision }) {
  const [voted, setVoted] = useState(false);

  function handleVote(isYes) {
    setVoted(true);
    onDecision(isYes);
  }

  return (
    <section className="card vote-card">
      <h1 className="title-glow">PROCEED TO EXILE?</h1>
      <p className="subtitle">Do you have enough evidence to accuse?</p>

      {!voted ? (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleVote(true)}
          >
            YES
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleVote(false)}
          >
            NO
          </button>
        </div>
      ) : (
        <p className="subtitle" style={{ marginTop: '2rem' }}>Vote cast! Waiting for other players...</p>
      )}
    </section>
  );
}
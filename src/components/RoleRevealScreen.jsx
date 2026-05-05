{phase === "roleReveal" && game && (
    <section className="card">
      <h1>Role Reveal</h1>
  
      <p className="subtitle">Pass the device to:</p>
  
      <h2>{game.players[game.currentPlayerIndex]}</h2>
  
      {!isRoleVisible ? (
        <button
          type="button"
          className="primary"
          onClick={() => setIsRoleVisible(true)}
        >
          Reveal My Role
        </button>
      ) : (
        <>
          {game.currentPlayerIndex === game.imposterIndex ? (
            <p className="role imposter">You are the Imposter</p>
          ) : (
            <p className="role word">
              Your word is: <strong>{game.secretWord}</strong>
            </p>
          )}
  
          <button type="button" onClick={nextRoleReveal}>
            Hide and Pass
          </button>
        </>
      )}
    </section>
  )}
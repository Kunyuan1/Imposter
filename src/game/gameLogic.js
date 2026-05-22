export function getRandomItem(items) {
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}

export function chooseImposter(players) {
  const randomIndex = Math.floor(Math.random() * players.length);
  return randomIndex;
}

export function createGame(players, words, category) {
  const categoryWords = words[category];
  const secretWord = getRandomItem(categoryWords);
  const imposterIndex = chooseImposter(players);

  return {
    players,
    secretWord,
    category,
    imposterIndex,
    currentPlayerIndex: 0,
    clues: [],
    votes: {},
    phase: "roleReveal",
  };
}

export function tallyVotes(votes) {
  const tally = {};
  for (const voter in votes) {
    const accused = votes[voter];
    tally[accused] = (tally[accused] || 0) + 1;
  }
  return tally;
}

export function getAccused(tally) {
  let maxVotes = 0;
  let accused = null;
  let isTie = false;

  for (const playerIndex in tally) {
    if (tally[playerIndex] > maxVotes) {
      maxVotes = tally[playerIndex];
      accused = Number(playerIndex);
      isTie = false;
    } else if (tally[playerIndex] === maxVotes) {
      isTie = true;
    }
  }

  return { accused, isTie };
}
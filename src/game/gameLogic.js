export function getRandomItem(items) {
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex];
  }
  
  export function chooseImposter(players) {
    const randomIndex = Math.floor(Math.random() * players.length);
    return randomIndex;
  }
  
  export function createGame(players, words) {
    const secretWord = getRandomItem(words);
    const imposterIndex = chooseImposter(players);
  
    return {
      players,
      secretWord,
      imposterIndex,
      currentPlayerIndex: 0,
      clues: [],
      votes: {},
      phase: "roleReveal",
    };
  }
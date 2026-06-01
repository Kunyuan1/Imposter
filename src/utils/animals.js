// 8 animals, each with a pastel tint for its avatar background.
//
// `animalFor(players, name, animals)`:
//   - If `animals[name]` is a valid index, return that animal (player's choice).
//   - Otherwise fall back to deterministic-by-join-order assignment based on
//     the player's index in the shared `players[]` array — so before anyone
//     picks, every client still sees the same animal for the same player.

// Wolf is intentionally NOT in this list — it's reserved as the imposter
// symbol only (see WOLF below).
export const ANIMALS = [
  { emoji: "🦊", tint: "#FCE6D5" },
  { emoji: "🐸", tint: "#E2F3D8" },
  { emoji: "🐻", tint: "#F2E4D2" },
  { emoji: "🐱", tint: "#FDE2EA" },
  { emoji: "🦝", tint: "#E3DECB" },
  { emoji: "🦉", tint: "#E5DAF0" },
  { emoji: "🐧", tint: "#DDE9F4" },
  { emoji: "🦌", tint: "#F5E4D7" },
];

export const WOLF = { emoji: "🐺", tint: "#FDECEC" }; // soft red tint

export function animalFor(players, name, animals) {
  if (animals && typeof animals[name] === "number") {
    const idx = animals[name];
    if (idx >= 0 && idx < ANIMALS.length) return ANIMALS[idx];
  }
  if (!players || !name) return ANIMALS[0];
  const i = players.indexOf(name);
  if (i < 0) return ANIMALS[0];
  return ANIMALS[i % ANIMALS.length];
}

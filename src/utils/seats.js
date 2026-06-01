// Seat coordinates around the round table. All values are in % of the
// game-stage container's width/height. Order: seat[0] starts at front-left
// and proceeds clockwise around the table — consecutive players in
// game.players sit next to each other.
//
// Front seats (closer to viewer) are larger to fake depth.

const LAYOUTS = {
  3: [
    { left: 30, top: 70, size: 56 }, // front-left
    { left: 50, top: 28, size: 44 }, // back-center
    { left: 70, top: 70, size: 56 }, // front-right
  ],
  4: [
    { left: 30, top: 72, size: 54 }, // front-left
    { left: 30, top: 30, size: 42 }, // back-left
    { left: 70, top: 30, size: 42 }, // back-right
    { left: 70, top: 72, size: 54 }, // front-right
  ],
  5: [
    { left: 30, top: 72, size: 54 }, // front-left
    { left: 14, top: 50, size: 46 }, // left
    { left: 50, top: 24, size: 42 }, // back-center
    { left: 86, top: 50, size: 46 }, // right
    { left: 70, top: 72, size: 54 }, // front-right
  ],
  6: [
    { left: 34, top: 72, size: 50 }, // front-left
    { left: 16, top: 50, size: 46 }, // left
    { left: 32, top: 30, size: 42 }, // back-left
    { left: 68, top: 30, size: 42 }, // back-right
    { left: 84, top: 50, size: 46 }, // right
    { left: 66, top: 72, size: 50 }, // front-right
  ],
  7: [
    { left: 30, top: 74, size: 50 },
    { left: 14, top: 52, size: 46 },
    { left: 28, top: 28, size: 40 },
    { left: 50, top: 22, size: 40 },
    { left: 72, top: 28, size: 40 },
    { left: 86, top: 52, size: 46 },
    { left: 70, top: 74, size: 50 },
  ],
  8: [
    { left: 28, top: 74, size: 50 },
    { left: 12, top: 52, size: 44 },
    { left: 24, top: 28, size: 38 },
    { left: 44, top: 22, size: 38 },
    { left: 56, top: 22, size: 38 },
    { left: 76, top: 28, size: 38 },
    { left: 88, top: 52, size: 44 },
    { left: 72, top: 74, size: 50 },
  ],
};

export function seatsFor(n) {
  if (n <= 0) return [];
  if (LAYOUTS[n]) return LAYOUTS[n];
  if (n < 3) return LAYOUTS[3].slice(0, n);
  return LAYOUTS[8].slice(0, n);
}

// Which side of the table this seat is on (used to choose bubble direction).
export function seatSide(seat) {
  return seat.left < 50 ? "left" : "right";
}

// Is this seat in the front row (lower half of the table)?
export function seatIsFront(seat) {
  return seat.top > 55;
}

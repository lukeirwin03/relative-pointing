// src/utils/identicon.js
// Deterministic GitHub-style identicon: a 5x5 grid mirrored across the
// vertical axis, on a seeded color. Same seed always renders the same image,
// so every participant's browser draws everyone the same way without ever
// shipping pixels over the wire.

const GRID = 5;
const HALF = Math.ceil(GRID / 2);

function fnv1a(str) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getIdenticonColor(seed) {
  const rng = mulberry32(fnv1a(String(seed ?? '')));
  const hue = Math.floor(rng() * 360);
  return `hsl(${hue}, 60%, 55%)`;
}

export function generateIdenticon(seed) {
  const rng = mulberry32(fnv1a(String(seed ?? '')));
  const hue = Math.floor(rng() * 360);
  const color = `hsl(${hue}, 60%, 55%)`;

  const cells = [];
  for (let y = 0; y < GRID; y++) {
    const row = [];
    for (let x = 0; x < HALF; x++) {
      row.push(rng() > 0.5);
    }
    for (let x = HALF; x < GRID; x++) {
      row.push(row[GRID - 1 - x]);
    }
    cells.push(row);
  }

  return { color, cells, grid: GRID };
}

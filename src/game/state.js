import { COLORS } from './constants.js'

// { salt: 0, pepper: 0, ..., stock: 0 }
export function emptyTokens() {
  const t = { stock: 0 };
  for (const c of COLORS) t[c] = 0;
  return t;
}

export function newPlayer() {
    return { tokens: emptyTokens(), cards: [], reserved:[], chefs: [] }
}

// Permanent discounts from purchased recipes: { salt: 2, pepper: 0, ... }
export function bonuses(player) {
  const b = {};
  for (const c of COLORS) b[c] = 0;
  for (const card of player.cards) b[card.bonus] += 1;
  return b;
}

// Score is calculated from cards + chefs, never stored.
export function score(player) {
  const fromCards = player.cards.reduce((sum, c) => sum + c.points, 0);
  const fromChefs = player.chefs.reduce((sum, c) => sum + c.points, 0);
  return fromCards + fromChefs;
}

// Total tokens held, for the fridge limit
export function tokenCount(player) {
  return Object.values(player.tokens).reduce((a, b) => a + b, 0);
}

export function refill(G, tier) {
  const next = G.decks[tier].shift();
  G.market[tier][slot] = next ?? null;
}
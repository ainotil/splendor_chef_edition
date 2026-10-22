import { describe, it, expect } from 'vitest';
import { Client } from 'boardgame.io/client';
import { ChefsTable } from './game.js';
import { COLORS } from './constants.js';
import { RECIPES } from './data/recipes.js';
import { CHEFS } from './data/chefs.js';
import { bonuses, score } from './state.js';

function newGame(seed = 'test') {
  const client = Client({ game: { ...ChefsTable, seed }, numPlayers: 5 });
  return client.getState().G;
}

describe('data', () => {
  it('every recipe uses only known seasonings', () => {
    for (const r of RECIPES) {
      expect(COLORS).toContain(r.bonus);
      for (const c of Object.keys(r.cost)) expect(COLORS).toContain(c);
    }
  });

  it('every chef uses only known seasonings', () => {
    for (const chef of CHEFS) {
      for (const c of Object.keys(chef.requires)) expect(COLORS).toContain(c);
    }
  });
});

describe('setup', () => {
  it('fills the bank', () => {
    const G = newGame();
    expect(G.bank).toEqual({ stock: 7, sugar: 10, soy: 10, chili: 10, peppercorn: 10, vinegar: 10 });
  });

  it('deals 4 cards per tier and keeps the rest in the decks', () => {
    const G = newGame();
    for (const [tier, total] of [[1, 40], [2, 30], [3, 20]]) {
      expect(G.market[tier]).toHaveLength(4);
      expect(G.decks[tier]).toHaveLength(total - 4);
      expect([...G.market[tier], ...G.decks[tier]].every(c => c.tier === tier)).toBe(true);
    }
  });

  it('picks 3 angels and 3 devils', () => {
    const G = newGame();
    expect(G.chefs.filter(c => c.side === 'angel')).toHaveLength(3);
    expect(G.chefs.filter(c => c.side === 'devil')).toHaveLength(3);
  });

  it('creates 5 empty players', () => {
    const G = newGame();
    expect(Object.keys(G.players)).toEqual(['0', '1', '2', '3', '4']);
    expect(G.players['0'].cards).toEqual([]);
    expect(G.players['0'].tokens).toEqual({ stock: 0, sugar: 0, soy: 0, chili: 0, peppercorn: 0, vinegar: 0 });
  });

  it('same seed gives the same shuffle, different seed does not', () => {
    const ids = G => G.market[1].map(c => c.id).join();
    expect(ids(newGame('a'))).toBe(ids(newGame('a')));
    expect(ids(newGame('a'))).not.toBe(ids(newGame('b')));
  });

  it('refill 从牌堆顶补到同一格，牌堆减少', () => {
    const G = {
      decks:  { 1: [{ id: 'A' }, { id: 'B' }] },
      market: { 1: [{ id: 'x' }, null, { id: 'y' }, { id: 'z' }] },
    };
    refill(G, 1, 1);

    expect(G.market[1][1].id).toBe('A');
    expect(G.decks[1].map(c => c.id)).toEqual(['B']);
  });

  it('牌堆空了就留空位 null', () => {
    const G = { decks: { 1: [] }, market: { 1: [{ id: 'x' }, { id: 'y' }] } };
    refill(G, 1, 0);

    expect(G.market[1][0]).toBeNull();
  });
  });

describe('helpers', () => {
  const player = {
    tokens: {}, reserved: [],
    cards: [{ bonus: 'sugar', points: 0 }, { bonus: 'sugar', points: 1 }, { bonus: 'chili', points: 2 }],
    chefs: [{ points: 3 }],
  };

  it('bonuses counts cards by seasoning', () => {
    expect(bonuses(player)).toEqual({ sugar: 2, soy: 0, chili: 1, peppercorn: 0, vinegar: 0 });
  });

  it('score adds cards and chefs', () => {
    expect(score(player)).toBe(6);
  });
});
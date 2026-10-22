import { RECIPES } from './data/recipes.js';
import { CHEFS } from './data/chefs.js';
import { COLORS, SEASONING_PER_COLOR, STOCK, MARKET_SIZE, CHEFS_IN_GAME } from './constants.js';
import { newPlayer } from './state.js';
import { takeThree, takeTwo } from './moves.js';

export function setup({ ctx, random }) {
    // 1. Bank
    const bank = { stock: STOCK };
    for (const c of COLORS) bank[c] = SEASONING_PER_COLOR;

    // 2. Decks: split by tier, then shuffle each
    const decks = {};
    for (const tier of [1, 2, 3]) {
        decks[tier] = random.Shuffle(RECIPES.filter(r => r.tier === tier));
    }

    // 3. Market: deal the top 4 of each deck face up
  const market = {};
  for (const tier of [1, 2, 3]) {
    market[tier] = decks[tier].splice(0, MARKET_SIZE);
  }

  // 4. Chefs: 3 random angels + 3 random devils
  const angels = random.Shuffle(CHEFS.filter(c => c.side === 'angel'));
  const devils = random.Shuffle(CHEFS.filter(c => c.side === 'devil'));
  const chefs = [
    ...angels.slice(0, CHEFS_IN_GAME.angel),
    ...devils.slice(0, CHEFS_IN_GAME.devil),
  ];

  // 5. Players, keyed by playerID ('0'..'4')
  const players = {};
  for (const id of ctx.playOrder) players[id] = newPlayer();

  return { bank, decks, market, chefs, players, endTriggered: false, log: [] };
}

export const ChefsTable = {
  name: 'chefs-table',
  minPlayers: 2,
  maxPlayers: 5,
  setup,
  turn: { minMoves: 1, maxMoves: 1 },
  moves: { takeThree, takeTwo },
};
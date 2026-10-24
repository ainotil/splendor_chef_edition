import { RECIPES } from './data/recipes.js';
import { CHEFS } from './data/chefs.js';
import { COLORS, SEASONING_PER_COLOR, STOCK, MARKET_SIZE, CHEFS_IN_GAME, WIN_SCORE } from './constants.js';
import { newPlayer, score, ranking, winners } from './state.js';
import { takeThree, takeTwo, reserve, reserveFromDeck, buy, buyReserved, discard, chooseChef } from './moves.js';
import { draftPhase } from './draft.js';

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

  // 5. 家常菜：再从一级牌堆翻开"人数"张，开局挑选用
  const starters = decks[1].splice(0, ctx.numPlayers);

  // 6. Players, keyed by playerID ('0'..'4')
  const players = {};
  for (const id of ctx.playOrder) players[id] = newPlayer();

  return { bank, decks, market, starters, chefs, players, endTriggered: false, finalRoundDone: false, log: [] };
}

// 正式游戏阶段
const playPhase = {
  moves: { takeThree, takeTwo, reserve, reserveFromDeck, buy, buyReserved },
  turn: {
    // 开局结束后，从 1 号位开始顺时针
    order: {
      first: () => 0,
      next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.playOrder.length,
    },
    // 每个回合结束时：检查有没有人达到终局分数，以及这一轮是否打完
    onEnd: ({ G, ctx }) => {
      if (score(G.players[ctx.currentPlayer]) >= WIN_SCORE) G.endTriggered = true;
      const lastInRound = ctx.playOrderPos === ctx.playOrder.length - 1;
      if (G.endTriggered && lastInRound) G.finalRoundDone = true;
    },
    stages: {
      // 冰箱超过上限时进入：只能弃牌
      discard: { moves: { discard } },
      // 同时满足多位主厨时进入：选 1 位
      chooseChef: { moves: { chooseChef } },
    },
  },
};

export const ChefsTable = {
  name: 'chefs-table',
  minPlayers: 2,
  maxPlayers: 5,
  setup,
  phases: {
    draft: draftPhase,   // 开局：家常菜 + 座位补偿
    play: playPhase,     // 正式游戏
  },

  // 这一轮打完就结束游戏，返回赢家和排名
  endIf: ({ G }) => {
    if (G.finalRoundDone) return { winners: winners(G), ranking: ranking(G) };
  },
};

// 测试用：跳过开局，直接从正式游戏开始
export const ChefsTableNoDraft = {
  ...ChefsTable,
  phases: {
    draft: { ...draftPhase, start: false },
    play: { ...playPhase, start: true },
  },
};
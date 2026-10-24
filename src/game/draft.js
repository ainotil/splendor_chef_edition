import { INVALID_MOVE } from 'boardgame.io/core';
import { COLORS, SEAT_BONUS } from './constants.js';

// 开局挑选：选 1 张家常菜（index = 0–4），同时领取座位补偿调味
// seasonings 例如 ['sugar', 'soy']，数量必须等于这个座位的补偿数（可以重复颜色）
export function pickStarter({ G, ctx, playerID }, index, seasonings = []) {
  if (!Number.isInteger(index) || index < 0 || index >= G.starters.length) return INVALID_MOVE;
  const card = G.starters[index];
  if (!card) return INVALID_MOVE;                                    // 已经被挑走

  const seat = ctx.playOrder.indexOf(playerID);
  const bonus = SEAT_BONUS[seat] ?? 0;
  if (!Array.isArray(seasonings) || seasonings.length !== bonus) return INVALID_MOVE;
  if (!seasonings.every(c => COLORS.includes(c))) return INVALID_MOVE; // 不能拿高汤

  const me = G.players[playerID];
  me.cards.push(card);
  G.starters[index] = null;                                          // 留空位，位置不乱
  for (const c of seasonings) {
    G.bank[c] -= 1;
    me.tokens[c] += 1;
  }
}

export const draftPhase = {
  start: true,
  moves: { pickStarter },
  turn: {
    minMoves: 1,
    maxMoves: 1,                                       // 挑完自动轮到下一位
    order: {
      first: ({ ctx }) => ctx.playOrder.length - 1,    // 从最后一个座位开始
      next: ({ ctx }) => (ctx.playOrderPos > 0 ? ctx.playOrderPos - 1 : undefined),
    },
  },
  // 每人都挑过 1 张，开局结束
  endIf: ({ G }) => Object.values(G.players).every(p => p.cards.length >= 1),
  next: 'play',
};
import { INVALID_MOVE } from 'boardgame.io/core';
import { COLORS } from './constants.js';

// 拿 1–3 个不同颜色的调味（不能拿高汤）
export function takeThree({ G, playerID }, colors) {
  if (!Array.isArray(colors)) return INVALID_MOVE;
  if (colors.length < 1 || colors.length > 3) return INVALID_MOVE;
  if (new Set(colors).size !== colors.length) return INVALID_MOVE;   // 不能重复
  if (!colors.every(c => COLORS.includes(c))) return INVALID_MOVE;   // 只能是 5 种调味
  if (colors.some(c => G.bank[c] < 1)) return INVALID_MOVE;          // 桌上要有

  // 规则：桌上有 3 种以上可拿时，必须拿满 3 个
  const available = COLORS.filter(c => G.bank[c] > 0).length;
  if (colors.length < Math.min(3, available)) return INVALID_MOVE;

  const me = G.players[playerID];
  for (const c of colors) {
    G.bank[c] -= 1;
    me.tokens[c] += 1;
  }
}

// 拿 2 个同色调味（该色桌上至少 4 个）
export function takeTwo({ G, playerID }, color) {
  if (!COLORS.includes(color)) return INVALID_MOVE;
  if (G.bank[color] < 4) return INVALID_MOVE;

  G.bank[color] -= 2;
  G.players[playerID].tokens[color] += 2;
}
import { INVALID_MOVE } from 'boardgame.io/core';
import { COLORS, MAX_RESERVED, MARKET_SIZE } from './constants.js';
import { refill } from './state.js';

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

export function reserve({ G, playerID }) {
  for (const card of G.market[tier])
  if (G.bank[color] < 4) return INVALID_MOVE;

  G.bank[color] -= 2;
  G.players[playerID].tokens[color] += 2;
}

// ---------- 预订 ----------

// 预订成功后的共同步骤：放进手里 + 拿 1 个高汤（如果桌上还有）
function takeIntoHand(G, me, card) {
  me.reserved.push(card);
  if (G.bank.stock > 0) {
    G.bank.stock -= 1;
    me.tokens.stock += 1;
  }
}

// 预订市场上的明牌：tier = 1/2/3，slot = 0–3
export function reserve({ G, playerID }, tier, slot) {
  const me = G.players[playerID];
  if (me.reserved.length >= MAX_RESERVED) return INVALID_MOVE;   // 最多 3 张
  if (![1, 2, 3].includes(tier)) return INVALID_MOVE;
  if (!Number.isInteger(slot) || slot < 0 || slot >= MARKET_SIZE) return INVALID_MOVE;

  const card = G.market[tier][slot];
  if (!card) return INVALID_MOVE;                                // 空位

  takeIntoHand(G, me, card);
  refill(G, tier, slot);
}

// 预订某一级牌堆顶的暗牌（别人看不到是什么）
export function reserveFromDeck({ G, playerID }, tier) {
  const me = G.players[playerID];
  if (me.reserved.length >= MAX_RESERVED) return INVALID_MOVE;
  if (![1, 2, 3].includes(tier)) return INVALID_MOVE;
  if (G.decks[tier].length === 0) return INVALID_MOVE;          // 牌堆空了

  const card = G.decks[tier].shift();
  takeIntoHand(G, me, card);
}

/// 招牌菜（三级）最少要实付：3 个这道菜需要的调味，或者 1 个高汤
export const SIGNATURE_MIN_SEASONING = 3;

// 算出买 card 要付什么。付得起返回 { sugar: 1, ..., stock: 0 }，付不起返回 null。
// 规则：
// 1. 每种调味：需要 = 价格 − 折扣（最少 0）
// 2. 先用手里同色调味付，不够的部分用高汤补
// 3. 招牌菜（三级）：实付必须有 ≥3 个这道菜需要的调味，或者 ≥1 个高汤。
//    折扣抵得太多时，要少用折扣、多付调味来补足 3 个，或者改付 1 个高汤。
//    extra（可选）由玩家指定怎么补：
//      'stock'               → 付 1 个高汤
//      { soy: 2, sugar: 1 }  → 多付这些调味
//    不指定时自动：先用调味补（从手里最多的开始），补不够再付高汤。
export function payment(player, card, extra) {
  const discount = bonuses(player);
  const pay = emptyTokens();
  let short = 0;

  for (const c of COLORS) {
    const need = Math.max(0, (card.cost[c] ?? 0) - discount[c]);
    pay[c] = Math.min(need, player.tokens[c]);
    short += need - pay[c];
  }
  if (short > player.tokens.stock) return null;
  pay.stock = short;

  if (card.tier !== 3) return pay;
  if (signatureOk(pay)) return pay;

  if (extra === 'stock') return addStock(player, pay);
  if (extra && typeof extra === 'object') return addSeasoning(player, card, pay, extra);
  return addSeasoning(player, card, pay, autoSeasoning(player, card, pay)) ?? addStock(player, pay);
}

function seasoningPaid(pay) {
  return COLORS.reduce((sum, c) => sum + pay[c], 0);
}

function signatureOk(pay) {
  return seasoningPaid(pay) >= SIGNATURE_MIN_SEASONING || pay.stock >= 1;
}

// 某种调味还能多付几个：不超过这道菜的价格，也不超过手里剩下的
function room(player, card, pay, c) {
  return Math.min((card.cost[c] ?? 0) - pay[c], player.tokens[c] - pay[c]);
}

function addStock(player, pay) {
  if (player.tokens.stock - pay.stock < 1) return null;
  return { ...pay, stock: pay.stock + 1 };
}

function addSeasoning(player, card, pay, extra) {
  if (!extra) return null;
  const result = { ...pay };
  for (const [c, n] of Object.entries(extra)) {
    if (!COLORS.includes(c) || !Number.isInteger(n) || n < 0) return null;
    if (n > room(player, card, pay, c)) return null;
    result[c] += n;
  }
  return signatureOk(result) ? result : null;
}

// 自动补调味：从手里最多的开始，补到 3 个为止。补不够返回 null。
function autoSeasoning(player, card, pay) {
  let missing = SIGNATURE_MIN_SEASONING - seasoningPaid(pay);
  const extra = {};
  const colors = COLORS
    .filter(c => room(player, card, pay, c) > 0)
    .sort((a, b) => (player.tokens[b] - pay[b]) - (player.tokens[a] - pay[a]));
  for (const c of colors) {
    if (missing === 0) break;
    const n = Math.min(missing, room(player, card, pay, c));
    extra[c] = n;
    missing -= n;
  }
  return missing === 0 ? extra : null;
}

function payAndTake(G, me, card, extra) {
  const pay = payment(me, card, extra);
  if (!pay) return false;

  for (const [token, n] of Object.entries(pay)) {
    me.tokens[token] -= n;
    G.bank[token] += n;
  }
  me.cards.push(card);
  return true;
}

// 购买市场上的食谱
// extra（可选）：招牌菜要补付时，指定 'stock' 或 { soy: 2, sugar: 1 }
export function buy({ G, playerID }, tier, slot, extra) {
  const me = G.players[playerID];
  if (!payAndTake(G, me, card, extra)) return INVALID_MOVE;   // 付不起
  if (!Number.isInteger(slot) || slot < 0 || slot >= MARKET_SIZE) return INVALID_MOVE;

  const card = G.market[tier][slot];
  if (!card) return INVALID_MOVE;
  if (!payAndTake(G, me, card)) return INVALID_MOVE;   // 付不起

  refill(G, tier, slot);
}

export function buyReserved({ G, playerID }, index, extra) {
  const me = G.players[playerID];
  if (!payAndTake(G, me, card, extra)) return INVALID_MOVE;
  const card = me.reserved[index];
  if (!payAndTake(G, me, card)) return INVALID_MOVE;

  me.reserved.splice(index, 1);
}
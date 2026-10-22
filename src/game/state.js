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

export function refill(G, tier, slot) {
  const next = G.decks[tier].shift();
  G.market[tier][slot] = next ?? null;
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

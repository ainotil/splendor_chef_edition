import { describe, it, expect } from 'vitest';
import { Client } from 'boardgame.io/client';
import { ChefsTable, setup } from './game.js';
import { CHEFS } from './data/chefs.js';
import { score } from './state.js';

function clientWith(change) {
  const game = {
    ...ChefsTable,
    seed: 'test',
    setup: (ctx) => { const G = setup(ctx); change(G); return G; },
  };
  return Client({ game, numPlayers: 5 });
}

const chef = id => CHEFS.find(c => c.id === id);

// 给玩家 0 一些已购买的食谱（只关心折扣颜色）
function giveCards(G, colors) {
  G.players['0'].cards = colors.map((b, i) => ({ id: 'C' + i, bonus: b, points: 0 }));
}

// 甜点天使：糖 3 + 醋 3      慢炖天使：酱油 3 + 花椒 3
const SWEET_SOUR = ['sugar', 'sugar', 'sugar', 'vinegar', 'vinegar', 'vinegar'];
const SOY_PEPPER = ['soy', 'soy', 'soy', 'peppercorn', 'peppercorn', 'peppercorn'];

describe('主厨到来', () => {
  it('满足 1 位：回合结束时自动获得，主厨离开桌面', () => {
    const client = clientWith(G => {
      G.chefs = [chef('angel-dessert'), chef('angel-stew')];
      giveCards(G, SWEET_SOUR);
    });
    client.moves.takeTwo('soy');
    const { G, ctx } = client.getState();

    expect(G.players['0'].chefs.map(c => c.id)).toEqual(['angel-dessert']);
    expect(G.chefs.map(c => c.id)).toEqual(['angel-stew']);
    expect(score(G.players['0'])).toBe(3);
    expect(ctx.currentPlayer).toBe('1');
  });

  it('只看折扣，手里的调味再多也不算', () => {
    const client = clientWith(G => {
      G.chefs = [chef('angel-dessert')];
      Object.assign(G.players['0'].tokens, { sugar: 3, vinegar: 3 });
      G.bank.sugar -= 3; G.bank.vinegar -= 3;
    });
    client.moves.takeTwo('soy');
    expect(client.getState().G.players['0'].chefs).toHaveLength(0);
  });

  it('满足多位：进入选择环节，选 1 位后结束回合', () => {
    const client = clientWith(G => {
      G.chefs = [chef('angel-dessert'), chef('angel-stew')];
      giveCards(G, [...SWEET_SOUR, ...SOY_PEPPER]);
    });
    client.moves.takeTwo('chili');
    expect(client.getState().ctx.activePlayers).toEqual({ '0': 'chooseChef' });

    client.moves.chooseChef('angel-stew');
    const { G, ctx } = client.getState();
    expect(G.players['0'].chefs.map(c => c.id)).toEqual(['angel-stew']);
    expect(G.chefs.map(c => c.id)).toEqual(['angel-dessert']);   // 另一位留在桌上
    expect(ctx.currentPlayer).toBe('1');
  });

  it('不能选不满足条件的主厨', () => {
    const client = clientWith(G => {
      G.chefs = [chef('angel-dessert'), chef('angel-stew'), chef('devil-thief')];
      giveCards(G, [...SWEET_SOUR, ...SOY_PEPPER]);
    });
    client.moves.takeTwo('chili');
    client.moves.chooseChef('devil-thief');
    const { G, ctx } = client.getState();
    expect(G.players['0'].chefs).toHaveLength(0);
    expect(ctx.activePlayers).toEqual({ '0': 'chooseChef' });
  });

  it('上回合没拿的主厨，下回合还会来', () => {
    const client = clientWith(G => {
      G.chefs = [chef('angel-dessert'), chef('angel-stew')];
      giveCards(G, [...SWEET_SOUR, ...SOY_PEPPER]);
    });
    client.moves.takeTwo('chili');
    client.moves.chooseChef('angel-stew');
    for (const c of ['soy', 'vinegar', 'peppercorn', 'sugar']) client.moves.takeTwo(c);   // 玩家 1–4
    client.moves.takeThree(['sugar', 'soy', 'chili']);   // 又轮到玩家 0

    const names = client.getState().G.players['0'].chefs.map(c => c.id);
    expect(names).toEqual(['angel-stew', 'angel-dessert']);
  });

  it('先弃牌，再来主厨', () => {
    const client = clientWith(G => {
      G.chefs = [chef('angel-dessert')];
      giveCards(G, SWEET_SOUR);
      Object.assign(G.players['0'].tokens, { soy: 4, chili: 4 });   // 8 个
      G.bank.soy -= 4; G.bank.chili -= 4;
    });
    client.moves.reserve(1, 0);                       // +1 高汤 = 9 个
    expect(client.getState().ctx.activePlayers).toEqual({ '0': 'discard' });
    expect(client.getState().G.players['0'].chefs).toHaveLength(0);

    client.moves.discard('chili');
    const { G, ctx } = client.getState();
    expect(G.players['0'].chefs.map(c => c.id)).toEqual(['angel-dessert']);
    expect(ctx.currentPlayer).toBe('1');
  });
});
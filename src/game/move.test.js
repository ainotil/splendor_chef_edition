import { describe, it, expect } from 'vitest';
import { Client } from 'boardgame.io/client';
import { ChefsTable } from './game.js';

function newClient() {
  return Client({ game: { ...ChefsTable, seed: 'test' }, numPlayers: 5 });
}

describe('takeThree', () => {
  it('拿 3 个不同色：桌上减少、玩家增加、轮到下一位', () => {
    const client = newClient();
    client.moves.takeThree(['sugar', 'soy', 'chili']);
    const { G, ctx } = client.getState();

    expect(G.bank.sugar).toBe(9);
    expect(G.players['0'].tokens).toMatchObject({ sugar: 1, soy: 1, chili: 1 });
    expect(ctx.currentPlayer).toBe('1');
  });

  it('不能拿重复颜色', () => {
    const client = newClient();
    client.moves.takeThree(['sugar', 'sugar', 'soy']);
    const { G, ctx } = client.getState();

    expect(G.bank.sugar).toBe(10);       // 没变
    expect(ctx.currentPlayer).toBe('0'); // 还是我的回合
  });

  it('桌上够 3 种时，不能只拿 2 个', () => {
    const client = newClient();
    client.moves.takeThree(['sugar', 'soy']);
    expect(client.getState().G.bank.sugar).toBe(10);
  });

  it('不能拿高汤', () => {
    const client = newClient();
    client.moves.takeThree(['stock', 'soy', 'chili']);
    expect(client.getState().G.bank.stock).toBe(7);
  });
});

describe('takeTwo', () => {
  it('拿 2 个同色', () => {
    const client = newClient();
    client.moves.takeTwo('vinegar');
    const { G } = client.getState();

    expect(G.bank.vinegar).toBe(8);
    expect(G.players['0'].tokens.vinegar).toBe(2);
  });

  it('该色桌上少于 4 个时不能拿', () => {
    const client = newClient();
    client.moves.takeTwo('vinegar');          // 玩家0：10 → 8
    client.moves.takeTwo('vinegar');          // 玩家1：8 → 6
    client.moves.takeTwo('vinegar');          // 玩家2：6 → 4
    client.moves.takeTwo('vinegar');          // 玩家3：4 → 2
    client.moves.takeTwo('vinegar');          // 玩家4：只剩 2，应被拒绝

    const { G, ctx } = client.getState();
    expect(G.bank.vinegar).toBe(2);
    expect(ctx.currentPlayer).toBe('4');
  });

  describe('reserve', () => {
    it('预订市场明牌：进手里、拿高汤、市场补牌、轮到下一位', () => {
      const client = newClient();
      const before = client.getState().G;
      const target = before.market[2][1];
      const topOfDeck = before.decks[2][0];

      client.moves.reserve(2, 1);
      const { G, ctx } = client.getState();
      const me = G.players['0'];

      expect(me.reserved.map(c => c.id)).toEqual([target.id]);
      expect(me.tokens.stock).toBe(1);
      expect(G.bank.stock).toBe(6);
      expect(G.market[2][1].id).toBe(topOfDeck.id);   // 同一格补上牌堆顶
      expect(G.decks[2]).toHaveLength(25);
      expect(ctx.currentPlayer).toBe('1');
    });

    it('预订牌堆顶暗牌：市场不变，牌堆 -1', () => {
      const client = newClient();
      const before = client.getState().G;
      const top = before.decks[3][0];

      client.moves.reserveFromDeck(3);
      const { G } = client.getState();

      expect(G.players['0'].reserved[0].id).toBe(top.id);
      expect(G.decks[3]).toHaveLength(15);
      expect(G.market[3].map(c => c.id)).toEqual(before.market[3].map(c => c.id));
    });

    it('手里已有 3 张时不能再预订', () => {
      const client = newClient();
      // 5 个人轮流预订，转 3 圈后玩家 0 已有 3 张
      for (let i = 0; i < 15; i++) client.moves.reserve(1, 0);
      expect(client.getState().G.players['0'].reserved).toHaveLength(3);

      client.moves.reserve(1, 0);     // 第 4 张
      const { G, ctx } = client.getState();
      expect(G.players['0'].reserved).toHaveLength(3);
      expect(ctx.currentPlayer).toBe('0');   // 被拒绝，还是玩家 0
    });

    it('高汤拿完了也可以预订，只是拿不到高汤', () => {
      const client = newClient();
      for (let i = 0; i < 7; i++) client.moves.reserve(1, 0);   // 7 个高汤被拿光
      expect(client.getState().G.bank.stock).toBe(0);

      client.moves.reserve(1, 0);     // 第 8 次：玩家 2 的第二张
      const { G } = client.getState();
      expect(G.players['2'].reserved).toHaveLength(2);
      expect(G.players['2'].tokens.stock).toBe(1);   // 只有第一次拿到
      expect(G.bank.stock).toBe(0);
    });

    it('不能预订不存在的位置', () => {
      const client = newClient();
      client.moves.reserve(2, 4);
      client.moves.reserve(4, 0);
      expect(client.getState().G.players['0'].reserved).toHaveLength(0);
    });
  });
});
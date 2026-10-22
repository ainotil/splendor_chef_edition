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
});
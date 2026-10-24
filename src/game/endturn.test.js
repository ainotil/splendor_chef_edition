import { describe, it, expect } from 'vitest';
import { clientWith } from './testing.js';

// 给玩家 0 一些调味（同时从桌上扣掉，保持总数守恒）
function give(G, tokens) {
  for (const [t, n] of Object.entries(tokens)) {
    G.players['0'].tokens[t] += n;
    G.bank[t] -= n;
  }
}

describe('冰箱上限（弃牌）', () => {
  it('不超过 8 个：直接轮到下一位', () => {
    const client = clientWith(G => give(G, { sugar: 2, soy: 2, chili: 1 }));   // 5 个
    client.moves.takeThree(['sugar', 'soy', 'chili']);                     // 8 个
    const { ctx } = client.getState();
    expect(ctx.currentPlayer).toBe('1');
    expect(ctx.activePlayers).toBeNull();
  });

  it('超过 8 个：进入弃牌环节，还是我的回合', () => {
    const client = clientWith(G => give(G, { sugar: 3, soy: 3 }));         // 6 个
    client.moves.takeThree(['sugar', 'soy', 'chili']);                     // 9 个
    const { ctx } = client.getState();
    expect(ctx.currentPlayer).toBe('0');
    expect(ctx.activePlayers).toEqual({ '0': 'discard' });
  });

  it('弃牌环节里不能做别的行动', () => {
    const client = clientWith(G => give(G, { sugar: 3, soy: 3 }));
    client.moves.takeThree(['sugar', 'soy', 'chili']);
    client.moves.takeTwo('vinegar');                                       // 应被拒绝
    expect(client.getState().G.players['0'].tokens.vinegar).toBe(0);
  });

  it('弃到 8 个就结束回合，弃掉的回到桌上', () => {
    const client = clientWith(G => give(G, { sugar: 4, soy: 3 }));         // 7 个
    client.moves.takeThree(['sugar', 'soy', 'chili']);                     // 10 个
    client.moves.discard('sugar');                                         // 9 个，还没结束
    expect(client.getState().ctx.currentPlayer).toBe('0');

    client.moves.discard('soy');                                           // 8 个，结束
    const { G, ctx } = client.getState();
    expect(ctx.currentPlayer).toBe('1');
    expect(G.players['0'].tokens).toMatchObject({ sugar: 4, soy: 3, chili: 1 });
    expect(G.bank).toMatchObject({ sugar: 6, soy: 7, chili: 9 });
  });

  it('可以弃高汤', () => {
    const client = clientWith(G => give(G, { sugar: 4, soy: 3, stock: 1 })); // 8 个
    client.moves.reserve(1, 0);                                             // +1 高汤 = 9 个
    client.moves.discard('stock');
    const { G, ctx } = client.getState();
    expect(G.players['0'].tokens.stock).toBe(1);
    expect(ctx.currentPlayer).toBe('1');
  });

  it('不能弃手里没有的', () => {
    const client = clientWith(G => give(G, { sugar: 3, soy: 3 }));
    client.moves.takeThree(['sugar', 'soy', 'chili']);
    client.moves.discard('vinegar');
    expect(client.getState().ctx.activePlayers).toEqual({ '0': 'discard' });
  });

  it('不在弃牌环节时不能弃牌', () => {
    const client = clientWith(G => give(G, { sugar: 3 }));
    client.moves.discard('sugar');
    expect(client.getState().G.players['0'].tokens.sugar).toBe(3);
  });
});
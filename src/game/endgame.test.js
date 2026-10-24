import { describe, it, expect } from 'vitest';
import { clientWith as withChefs } from './testing.js';
import { CHEFS } from './data/chefs.js';
import { winners } from './state.js';

// 这组测试不需要主厨来打扰
const clientWith = change => withChefs(G => { G.chefs = []; change(G); });

// 给某位玩家几张已购买的食谱，points 是每张的口碑
function giveCards(G, id, pointsList) {
  G.players[id].cards = pointsList.map((pts, i) => ({ id: `${id}-${i}`, bonus: 'sugar', points: pts }));
}

// 玩家 1–4 各做一个简单行动，让这一轮走完
function playRestOfRound(client) {
  for (const c of ['soy', 'vinegar', 'peppercorn', 'chili']) client.moves.takeTwo(c);
}

describe('终局判定', () => {
  it('达到 16 分不会立刻结束，要打完这一轮', () => {
    const client = clientWith(G => giveCards(G, '0', [5, 5, 6]));   // 16 分
    client.moves.takeTwo('sugar');
    const { G, ctx } = client.getState();

    expect(G.endTriggered).toBe(true);
    expect(ctx.gameover).toBeUndefined();
    expect(ctx.currentPlayer).toBe('1');
  });

  it('5 号位行动完，游戏结束，算出赢家', () => {
    const client = clientWith(G => giveCards(G, '0', [5, 5, 6]));
    client.moves.takeTwo('sugar');
    playRestOfRound(client);

    const { gameover } = client.getState().ctx;
    expect(gameover.winners).toEqual(['0']);
    expect(gameover.ranking[0]).toMatchObject({ id: '0', score: 16 });
  });

  it('后面的玩家在最后一轮反超，赢家是反超的人', () => {
    const client = clientWith(G => {
      giveCards(G, '0', [5, 5, 6]);   // 16 分
      giveCards(G, '3', [5, 6, 6]);   // 17 分，但他还没行动
    });
    client.moves.takeTwo('sugar');
    playRestOfRound(client);

    expect(client.getState().ctx.gameover.winners).toEqual(['3']);
  });

  it('5 号位自己触发终局：他的回合结束就直接结束', () => {
    const client = clientWith(G => giveCards(G, '4', [5, 5, 6]));
    for (const c of ['sugar', 'soy', 'vinegar', 'peppercorn']) client.moves.takeTwo(c);   // 玩家 0–3
    expect(client.getState().ctx.gameover).toBeUndefined();

    client.moves.takeTwo('chili');   // 玩家 4
    expect(client.getState().ctx.gameover.winners).toEqual(['4']);
  });

  it('游戏结束后不能再行动', () => {
    const client = clientWith(G => giveCards(G, '0', [5, 5, 6]));
    client.moves.takeTwo('sugar');
    playRestOfRound(client);
    const before = client.getState().G.bank.sugar;

    client.moves.takeTwo('sugar');
    expect(client.getState().G.bank.sugar).toBe(before);
  });
});

describe('平局规则', () => {
  // 直接构造一个小 G 测试 winners()，不用跑整局
  function G(players) {
    return { players };
  }
  function p(points, devils = 0) {
    return {
      cards: points.map(pts => ({ points: pts })),
      chefs: Array.from({ length: devils }, () => CHEFS.find(c => c.side === 'devil')),
    };
  }

  it('同分时，食谱少的赢', () => {
    expect(winners(G({ '0': p([8, 8]), '1': p([4, 4, 4, 4]) }))).toEqual(['0']);
  });

  it('同分同食谱数时，恶魔少的赢', () => {
    const a = p([6], 1);                               // 6 + 2 = 8 分，1 张食谱，1 个恶魔
    const b = { cards: [{ points: 8 }], chefs: [] };   // 8 分，1 张食谱，0 个恶魔
    expect(winners(G({ '0': a, '1': b }))).toEqual(['1']);
  });

  it('三项都一样：共同获胜', () => {
    expect(winners(G({ '0': p([8]), '1': p([8]), '2': p([3]) }))).toEqual(['0', '1']);
  });
});
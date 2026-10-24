import { describe, it, expect } from 'vitest';
import { Client } from 'boardgame.io/client';
import { ChefsTable } from './game.js';
import { tokenCount } from './state.js';

function newClient() {
  return Client({ game: { ...ChefsTable, seed: 'test' }, numPlayers: 5 });
}

// 按座位补偿 0/1/1/2/2，替 5 个人完成开局（从 5 号位开始）
function finishDraft(client) {
  const picks = [
    ['4', ['sugar', 'soy']],
    ['3', ['chili', 'chili']],
    ['2', ['vinegar']],
    ['1', ['peppercorn']],
    ['0', []],
  ];
  for (const [, seasonings] of picks) {
    const index = client.getState().G.starters.findIndex(c => c);   // 挑第一张还在的
    client.moves.pickStarter(index, seasonings);
  }
}

describe('开局阶段', () => {
  it('游戏从开局阶段开始，5 号位先挑', () => {
    const { ctx } = newClient().getState();
    expect(ctx.phase).toBe('draft');
    expect(ctx.currentPlayer).toBe('4');
  });

  it('挑选后：食谱到面前、领到调味、轮到 4 号位', () => {
    const client = newClient();
    const card = client.getState().G.starters[2];

    client.moves.pickStarter(2, ['sugar', 'soy']);
    const { G, ctx } = client.getState();
    const me = G.players['4'];

    expect(me.cards.map(c => c.id)).toEqual([card.id]);
    expect(G.starters[2]).toBeNull();
    expect(me.tokens).toMatchObject({ sugar: 1, soy: 1 });
    expect(G.bank.sugar).toBe(9);
    expect(ctx.currentPlayer).toBe('3');
  });

  it('调味数量必须等于座位补偿', () => {
    const client = newClient();
    client.moves.pickStarter(0, ['sugar']);                 // 5 号位要 2 个，只给 1 个
    client.moves.pickStarter(0, ['sugar', 'soy', 'chili']); // 给 3 个
    expect(client.getState().ctx.currentPlayer).toBe('4');
  });

  it('不能拿高汤当开局补偿', () => {
    const client = newClient();
    client.moves.pickStarter(0, ['stock', 'soy']);
    expect(client.getState().G.players['4'].cards).toHaveLength(0);
  });

  it('不能挑已经被挑走的', () => {
    const client = newClient();
    client.moves.pickStarter(0, ['sugar', 'soy']);   // 5 号位挑走第 0 张
    client.moves.pickStarter(0, ['chili', 'chili']); // 4 号位也想挑第 0 张
    expect(client.getState().ctx.currentPlayer).toBe('3');
  });

  it('全部挑完：每人 1 张家常菜、调味 0/1/1/2/2，进入正式游戏、1 号位先手', () => {
    const client = newClient();
    finishDraft(client);
    const { G, ctx } = client.getState();

    expect(ctx.phase).toBe('play');
    expect(ctx.currentPlayer).toBe('0');
    for (const p of Object.values(G.players)) expect(p.cards).toHaveLength(1);
    expect(['0', '1', '2', '3', '4'].map(id => tokenCount(G.players[id]))).toEqual([0, 1, 1, 2, 2]);
  });

  it('开局阶段不能做正式游戏的行动', () => {
    const client = newClient();
    client.moves.takeTwo('sugar');
    expect(client.getState().G.bank.sugar).toBe(10);
  });

  it('进入正式游戏后，家常菜的折扣立刻生效', () => {
    const client = newClient();
    finishDraft(client);
    const me = client.getState().G.players['0'];
    expect(me.cards[0].tier).toBe(1);
    client.moves.takeThree(['sugar', 'soy', 'chili']);
    expect(client.getState().ctx.currentPlayer).toBe('1');
  });
});
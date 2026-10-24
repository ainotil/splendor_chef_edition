import { Client } from 'boardgame.io/client';
import { ChefsTableNoDraft, setup } from './game.js';

// 测试用：跳过开局，先用 change(G) 改好桌面，再开一局 5 人游戏
export function clientWith(change) {
  const game = {
    ...ChefsTableNoDraft,
    seed: 'test',
    setup: (ctx) => {
      const G = setup(ctx);
      change(G);
      return G;
    },
  };
  return Client({ game, numPlayers: 5 });
}

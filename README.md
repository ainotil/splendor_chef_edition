# 主厨餐桌 · Splendor: The Chef's Table

一个专门面向 5 人局的 Splendor 私人改版的数字原型。保留原版"拿资源—买卡—折扣滚雪球"的骨架，用中餐五味主题、家常菜开局、座位补偿、招牌菜付费门槛和善恶主厨系统，解决 5 人局资源枯竭、节奏失衡和先手优势的问题。

完整策划案见 [docs/proposal.md](docs/proposal.md)。

## 快速开始

需要 Node.js 24（见 `.nvmrc`）。

```bash
npm install
npm run dev        # 本地同屏试玩，打开终端里显示的地址
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm test` | 跑一遍全部测试 |
| `npm run test:watch` | 改代码时自动重跑测试 |
| `npm run lint` | ESLint 检查 |
| `npm run build` | 打包到 `dist/` |
| `npm run check` | lint + 测试 + 打包，提交前跑一次 |

CI（`.github/workflows/ci.yml`）在每次推送到 `main` 和每个 PR 上跑同样的检查。

## 目录结构

```
src/
  game/              规则引擎（纯逻辑，不依赖 React）
    constants.js     所有可调数值：每色调味数、高汤、冰箱容量、终局分数、座位补偿
    data/            90 张食谱、10 位主厨
    state.js         纯函数：折扣、口碑、付款计算、主厨条件、排名
    moves.js         正式游戏的行动：拿 3 个 / 拿 2 个 / 预订 / 购买 / 弃牌 / 选主厨
    draft.js         开局阶段：家常菜反向挑选 + 座位补偿
    game.js          boardgame.io 游戏定义：setup、阶段、回合顺序、终局
    testing.js       测试辅助函数
    *.test.js        Vitest 测试
  board/             React 同屏界面
docs/
  proposal.md        策划案
```

## 设计约定

- **状态只存事实，不存推导值**：口碑和折扣每次从已购买的食谱和主厨实时算出来，见 `state.js`。
- **非法行动一律返回 `INVALID_MOVE`**，不改变任何状态。
- **调数值只改 `constants.js`**：试玩后调整冰箱容量、终局分数、座位补偿等，都只需要改这一个文件。
- 代币键名：`sugar` 糖、`soy` 酱油、`chili` 辣椒、`peppercorn` 花椒、`vinegar` 醋、`stock` 高汤。

## 技术栈

[boardgame.io](https://boardgame.io) 0.50 · React 19 · Vite · Vitest · ESLint

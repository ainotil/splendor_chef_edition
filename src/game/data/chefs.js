// skill：技能说明（技能还没实现，目前主厨只提供口碑）
export const CHEFS = [
  { id: 'angel-dessert', name: '甜点天使',   side: 'angel', points: 3, requires: { sugar: 3, vinegar: 3 }, skill: '你的冰箱容量 +2' },
  { id: 'angel-soup',    name: '汤品天使',   side: 'angel', points: 3, requires: { sugar: 2, soy: 2, peppercorn: 2 }, skill: '你每次预订食谱时，额外拿 1 个高汤（桌上还有的话）' },
  { id: 'angel-stew',    name: '慢炖天使',   side: 'angel', points: 3, requires: { soy: 3, peppercorn: 3 }, skill: '你拿 2 个同色时，该色桌上剩 ≥ 3 个就可以拿' },
  { id: 'angel-umami',   name: '万味天使',   side: 'angel', points: 3, requires: { sugar: 2, chili: 2, vinegar: 2 }, skill: '你买食谱时，可以把 1 个调味当作任意调味用' },
  { id: 'angel-prep',    name: '备菜天使',   side: 'angel', points: 3, requires: { chili: 3, peppercorn: 3 }, skill: '你最多可以预订 4 张（原来 3 张）' },
  { id: 'devil-thief',   name: '偷味恶魔',   side: 'devil', points: 2, requires: { soy: 3, chili: 3 }, skill: '到来时：其他每位玩家各交给你 1 个调味（由对方选）' },
  { id: 'devil-spill',   name: '打翻锅恶魔', side: 'devil', points: 2, requires: { soy: 2, peppercorn: 2, vinegar: 2 }, skill: '到来时：其他所有玩家各扔掉 1 个高汤（没有就不扔）' },
  { id: 'devil-snatch',  name: '抢单恶魔',   side: 'devil', points: 2, requires: { sugar: 3, chili: 3 }, skill: '到来时：从口碑最高的其他玩家的预订里随机拿 1 张给你（你的预订满了就无效）' },
  { id: 'devil-price',   name: '涨价恶魔',   side: 'devil', points: 2, requires: { peppercorn: 3, vinegar: 3 }, skill: '到来时：直到你下回合开始前，其他人买食谱要多付 1 个任意调味' },
  { id: 'devil-clear',   name: '撤菜恶魔',   side: 'devil', points: 2, requires: { soy: 2, chili: 2, vinegar: 2 }, skill: '到来时：选一个等级，把那一行 4 张食谱全部换掉' },
];
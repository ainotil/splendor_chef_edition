import { useEffect, useState } from 'react';
import {
  COLORS, SEASONING_PER_COLOR, STOCK, FRIDGE_LIMIT, WIN_SCORE, MAX_RESERVED, SEAT_BONUS,
} from '../game/constants.js';
import { SIGNATURE_MIN_SEASONING } from '../game/state.js';
import { TOKEN_INFO, SEAT_NAMES } from './labels.js';
import { RecipeCard } from './RecipeCard.jsx';

// 右上角的问号：点开是分步的新手教程
export function Help() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') setStep(s => Math.min(s + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setStep(s => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const { title, body: Body } = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <>
      <button className="help-button" onClick={() => setOpen(true)} title="新手教程" aria-label="新手教程">?</button>
      {open && (
        <div className="help-backdrop" onClick={() => setOpen(false)}>
          <div className="help-dialog" role="dialog" aria-label="新手教程" onClick={e => e.stopPropagation()}>
            <button className="help-close" onClick={() => setOpen(false)} aria-label="关闭">×</button>
            <div className="help-step">第 {step + 1} / {STEPS.length} 步</div>
            <h1>{title}</h1>
            <div className="help-body"><Body /></div>
            <nav className="help-nav">
              <button disabled={step === 0} onClick={() => setStep(step - 1)}>上一步</button>
              <div className="help-dots">
                {STEPS.map((s, i) => (
                  <button key={i} className={i === step ? 'on' : ''} onClick={() => setStep(i)} aria-label={s.title} />
                ))}
              </div>
              {last
                ? <button className="primary" onClick={() => { setOpen(false); setStep(0); }}>开始玩</button>
                : <button className="primary" onClick={() => setStep(step + 1)}>下一步</button>}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function Pip({ type, n }) {
  const info = TOKEN_INFO[type];
  return (
    <span className="help-pip" style={{ background: info.color, color: info.text }}>
      {info.name}{n !== undefined && ` ×${n}`}
    </span>
  );
}

const EXAMPLE = { id: 'example', name: '红烧肉', tier: 2, bonus: 'soy', points: 2, cost: { soy: 3, chili: 2 } };

const STEPS = [
  {
    title: '这是什么游戏？',
    body: () => (
      <>
        <p>每个人扮演一位厨师，比谁先成为名厨。</p>
        <div className="help-flow">
          <span>拿调料</span>→<span>用调料做菜</span>→<span>做过的菜让以后更省调料</span>→<span>做大菜赚口碑</span>
        </div>
        <p>
          <b>口碑</b>就是分数。谁的口碑先到 <b>{WIN_SCORE}</b> 分，大家再把这一圈打完，
          然后口碑最高的人赢。
        </p>
        <p>
          诀窍：一开始的菜不给分，但它们让你以后<b>越做越快</b>。
          先打基础，再冲大菜。
        </p>
      </>
    ),
  },
  {
    title: '桌上有什么？',
    body: () => (
      <>
        <h2>调料（相当于钱）</h2>
        <p>
          五种调料：{COLORS.map(c => <Pip key={c} type={c} />)}，每种 {SEASONING_PER_COLOR} 个，在市场右边竖着排成一列。
        </p>
        <p>
          还有 <Pip type="stock" />，共 {STOCK} 个。它是<b>万能调料</b>，缺哪种都能顶上。
          它不能直接拿，只能通过"预订"得到（后面会讲）。
        </p>
        <h2>食谱（要买的卡）</h2>
        <p>中间三行是食谱市场，越往上越贵、分越高：一级家常菜（绿）、二级餐馆菜（黄）、三级招牌菜（蓝）。每行最左边是这一级还没翻开的牌堆。</p>
        <h2>主厨（额外奖励）</h2>
        <p>最右边一列是主厨。达到条件后他们会自动来找你，带来额外口碑。鼠标停在主厨上可以看他的技能。</p>
        <h2>玩家</h2>
        <p>最左边一列是所有玩家，金框的是现在轮到的人。屏幕最下面一条是<b>当前玩家的手牌</b>：口碑、冰箱、每种颜色的折扣和调料、预订的菜。</p>
      </>
    ),
  },
  {
    title: '怎么看一张食谱？',
    body: () => (
      <div className="help-example">
        <div className="help-example-card"><RecipeCard card={EXAMPLE} /></div>
        <ul>
          <li><b>左上角的大数字 2</b>：做出这道菜得 2 分口碑。没有数字就是 0 分。</li>
          <li><b>右上角的"酱油"标签</b>：做出来以后，你<b>永久</b>少付 1 个酱油（叫"折扣"）。</li>
          <li><b>左下角的圆点</b>：价格。这道菜要付 <Pip type="soy" n={3} /> 和 <Pip type="chili" n={2} />。</li>
        </ul>
      </div>
    ),
  },
  {
    title: '轮到你时：四件事选一件',
    body: () => (
      <>
        <p>每回合<b>只能做一件事</b>，做完就轮到下一个人。</p>
        <ol className="help-actions">
          <li>
            <b>拿 3 个不同的调料</b>
            <div>在右边那列调料里点 3 种不同颜色，按"拿不同色"。最常用的一步。</div>
          </li>
          <li>
            <b>拿 2 个一样的调料</b>
            <div>只点 1 种颜色，按"拿 2 个同色"。这种调料桌上至少要剩 4 个才能这样拿。</div>
          </li>
          <li>
            <b>买一道菜</b>
            <div>点食谱上的"买"。付的调料放回桌上，菜留在你面前。买不起的菜会变淡。</div>
          </li>
          <li>
            <b>预订一道菜</b>
            <div>点"预订"把菜先占住，同时拿 1 个万能的高汤。下一步详细讲。</div>
          </li>
        </ol>
      </>
    ),
  },
  {
    title: '折扣：越做越省',
    body: () => (
      <>
        <p>你做过的每道菜都会让以后的菜<b>永久便宜 1 个</b>它右上角的调料。折扣不会用完，也不会被抢走。</p>
        <div className="help-box">
          <b>举个例子</b>
          <p>你已经做过 2 道"酱油"菜，现在想买上一页的红烧肉（<Pip type="soy" n={3} /> <Pip type="chili" n={2} />）。</p>
          <p>酱油便宜 2 个，你只需要付 <Pip type="soy" n={1} /> <Pip type="chili" n={2} />。</p>
          <p>如果调料不够，差的部分可以用高汤顶上。</p>
        </div>
        <p>屏幕最下面的手牌里，每种颜色的<b>大数字是折扣</b>，下面的小圆是手里的调料。左边玩家列表里的 <b>2+1</b> 意思是：手里 2 个，折扣 1。</p>
      </>
    ),
  },
  {
    title: '预订和高汤',
    body: () => (
      <>
        <p>看中一道菜但现在买不起？可以<b>预订</b>它：</p>
        <ul>
          <li>菜从市场拿到你的手牌里（屏幕最下面），别人就买不走了。以后轮到你，可以在那里买它。</li>
          <li>同时拿 1 个<Pip type="stock" />（桌上还有的话）。这是得到高汤的唯一办法。</li>
          <li>每人最多同时预订 {MAX_RESERVED} 张。</li>
        </ul>
        <h2>"摸牌预订"是什么？</h2>
        <p>
          每行最左边有一叠没翻开的牌。点"摸牌预订"，就是从那叠牌最上面<b>直接摸一张</b>预订。
          摸之前你也不知道是什么，别人更看不到。适合想碰运气、或者只是想拿一个高汤的时候。
        </p>
        <h2>招牌菜的特别规定</h2>
        <p>
          买三级招牌菜时，你实际付出的调料里至少要有 {SIGNATURE_MIN_SEASONING} 个是这道菜要的调料，
          或者至少付 1 个高汤。也就是说，折扣再多也不能白拿大菜。系统会自动帮你算。
        </p>
      </>
    ),
  },
  {
    title: '冰箱、主厨和结束',
    body: () => (
      <>
        <h2>冰箱：手里最多 {FRIDGE_LIMIT} 个</h2>
        <p>
          调料加高汤一共最多 {FRIDGE_LIMIT} 个。拿多了要扔回去，扔到 {FRIDGE_LIMIT} 个为止。
          快要超出时界面会提醒你；拿了以后不想扔，也可以按"撤销上一步"。
        </p>
        <h2>主厨自己来</h2>
        <p>
          每个主厨都写着条件，比如"酱油 3 + 花椒 3"，意思是你<b>做过的菜</b>里有 3 道酱油菜、3 道花椒菜
          （只看菜，不看手里的调料）。达到了，他会在你回合结束时自动来，每回合最多来 1 位。
        </p>
        <ul>
          <li><b>天使</b>：3 分，技能一直对你有效。</li>
          <li><b>恶魔</b>：2 分，来的时候给对手捣一次乱。</li>
        </ul>
        <h2>什么时候结束？</h2>
        <p>
          有人口碑到 {WIN_SCORE} 分后，把这一圈打完（保证每个人回合数一样），口碑最高的人赢。
          平分时，做的菜<b>更少</b>的人赢（说明效率更高）；还平，恶魔少的人赢。
        </p>
      </>
    ),
  },
  {
    title: '开局怎么做？',
    body: () => (
      <>
        <p>开局每人先免费拿 1 道家常菜，后面的座位先挑。座位越靠后，还能多拿几个调料，用来弥补后出手的劣势：</p>
        <div className="help-seats">
          {SEAT_BONUS.map((n, i) => (
            <div key={i}><b>{SEAT_NAMES[i]}</b><span>{n} 个调料</span></div>
          ))}
        </div>
        <p>调料颜色自己选，可以重复，但不能选高汤。挑完后从 1 号位开始正式游戏。</p>
        <div className="help-box">
          <b>新手建议</b>
          <ul>
            <li>前几回合多拿调料、买便宜的一级菜，先攒折扣。</li>
            <li>盯着主厨的条件，选对颜色的菜能多拿 2–3 分。</li>
            <li>看看别人差什么，有时候抢先买走或预订就能卡住对手。</li>
          </ul>
        </div>
        <p className="muted">随时可以点右上角的 ? 回来看。</p>
      </>
    ),
  },
];

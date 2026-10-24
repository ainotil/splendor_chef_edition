import { useState } from 'react';
import { COLORS, SEAT_BONUS, FRIDGE_LIMIT, MAX_RESERVED } from '../game/constants.js';
import { bonuses, score, tokenCount, payment, eligibleChefs } from '../game/state.js';
import { TOKEN_INFO, SEAT_NAMES } from './labels.js';
import { Token } from './Token.jsx';
import { RecipeCard } from './RecipeCard.jsx';
import './board.css';

const ALL_TOKENS = [...COLORS, 'stock'];

// 布局（参考数字版 Splendor）：
//   顶栏
//   左：所有玩家 | 中：三行市场（每行左边是牌堆）| 右：桌面调味 | 最右：主厨
//   底栏：当前玩家的手牌（冰箱、折扣 + 调味、预订、主厨）
export function Board({ G, ctx, moves, undo, playerID }) {
  // 同屏模式没有固定的 playerID，"我"就是当前行动的玩家
  const me = playerID ?? ctx.currentPlayer;
  const seat = ctx.playOrder.indexOf(me);
  const stage = ctx.activePlayers?.[me];
  const player = G.players[me];
  const playing = ctx.phase === 'play';

  if (ctx.gameover) return <GameOver result={ctx.gameover} />;

  return (
    <div className="board">
      <Header G={G} ctx={ctx} me={me} undo={undo} />
      <div className="table">
        <Players G={G} ctx={ctx} />
        {playing ? (
          <>
            <Market G={G} player={player} moves={moves} active={!stage} />
            <Bank G={G} player={player} moves={moves} active={!stage} />
          </>
        ) : (
          <DraftPanel G={G} moves={moves} seat={seat} />
        )}
        <Chefs G={G} player={player} moves={moves} choosing={stage === 'chooseChef'} />
      </div>
      {playing && <Hand player={player} moves={moves} stage={stage} />}
    </div>
  );
}

// ---------- 顶栏：现在轮到谁 ----------
function Header({ G, ctx, me, undo }) {
  const seat = ctx.playOrder.indexOf(me);
  const stage = ctx.activePlayers?.[me];
  const over = tokenCount(G.players[me]) - FRIDGE_LIMIT;
  const what =
    ctx.phase === 'draft' ? '挑选家常菜' :
    stage === 'chooseChef' ? '有多位主厨想来，请在右边选 1 位' :
    stage === 'discard' ? '冰箱放不下了' :
    '选择一个行动';
  return (
    <header className="header">
      <h1>主厨餐桌</h1>
      <div className="turn">
        <strong>{SEAT_NAMES[seat]}</strong>：{what}
      </div>
      {stage === 'discard' && (
        <div className="alert">
          冰箱最多放 {FRIDGE_LIMIT} 个，你现在有 {FRIDGE_LIMIT + over} 个。
          点底栏里自己的调味扔掉 <b>{over}</b> 个，或者
          <button onClick={undo}>撤销上一步</button>
        </div>
      )}
      {stage === 'chooseChef' && <button onClick={undo}>撤销上一步</button>}
      {G.endTriggered && <div className="final-round">最后一轮！</div>}
    </header>
  );
}

// ---------- 左栏：所有玩家 ----------
function Players({ G, ctx }) {
  return (
    <section className="players">
      {ctx.playOrder.map((id, seat) => {
        const p = G.players[id];
        const b = bonuses(p);
        return (
          <div key={id} className={`player ${id === ctx.currentPlayer ? 'current' : ''}`}>
            <div className="player-head">
              <strong>{SEAT_NAMES[seat]}</strong>
              <span className="player-score" title="口碑">{score(p)}</span>
            </div>
            <div className="mini">
              {ALL_TOKENS.map(t => (
                <span key={t} className="mini-token" title={TOKEN_INFO[t].name}
                      style={{ background: TOKEN_INFO[t].color, color: TOKEN_INFO[t].text }}>
                  {p.tokens[t]}{t !== 'stock' && b[t] > 0 && <sup>+{b[t]}</sup>}
                </span>
              ))}
            </div>
            <div className="player-meta">
              冰箱 {tokenCount(p)}/{FRIDGE_LIMIT} · 菜 {p.cards.length} · 预订 {p.reserved.length}
              {p.chefs.map(c => <span key={c.id} className={`tag ${c.side}`} title={c.skill}>{c.name}</span>)}
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ---------- 中间：三行市场，每行左边是这一级的牌堆 ----------
function Market({ G, player, moves, active }) {
  const canReserve = active && player.reserved.length < MAX_RESERVED;
  return (
    <section className="market">
      {[3, 2, 1].map(tier => (
        <div key={tier} className="market-row">
          <div className={`deck tier-${tier}`}>
            <div className="deck-tier">{tier} 级</div>
            <div className="deck-left">剩 {G.decks[tier].length}</div>
            {canReserve && G.decks[tier].length > 0 && (
              <button onClick={() => moves.reserveFromDeck(tier)}
                      title="从这一级牌堆顶摸一张直接预订：摸之前谁也看不到是什么，别人之后也看不到">
                摸牌预订
              </button>
            )}
          </div>
          {G.market[tier].map((card, slot) => {
            const affordable = card && payment(player, card);
            return (
              <RecipeCard key={slot} card={card} dim={card && !affordable}>
                {active && card && (
                  <>
                    <button className={affordable ? 'primary' : ''} disabled={!affordable}
                            onClick={() => moves.buy(tier, slot)}>买</button>
                    <button disabled={!canReserve} onClick={() => moves.reserve(tier, slot)}>预订</button>
                  </>
                )}
              </RecipeCard>
            );
          })}
        </div>
      ))}
    </section>
  );
}

// ---------- 右栏：桌面调味，点选后拿 ----------
function Bank({ G, player, moves, active }) {
  const [selected, setSelected] = useState([]);

  function toggle(c) {
    setSelected(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c].slice(-3));
  }
  function takeThree() { moves.takeThree(selected); setSelected([]); }
  function takeTwo() { moves.takeTwo(selected[0]); setSelected([]); }

  // 提前算好：拿了之后冰箱会不会超
  const have = tokenCount(player);
  const after = have + (selected.length === 1 && G.bank[selected[0]] >= 4 ? 2 : selected.length);

  return (
    <section className="bank">
      {ALL_TOKENS.map(c => (
        <Token key={c} type={c} count={G.bank[c]} selected={selected.includes(c)}
               onClick={active && c !== 'stock' && G.bank[c] > 0 ? () => toggle(c) : undefined} />
      ))}
      {active && (
        <div className="bank-actions">
          <button className={selected.length ? 'primary' : ''} disabled={selected.length === 0} onClick={takeThree}>
            拿不同色
          </button>
          <button disabled={selected.length !== 1 || G.bank[selected[0]] < 4} onClick={takeTwo}>
            拿 2 个同色
          </button>
          {selected.length > 0 && after > FRIDGE_LIMIT && (
            <p className="warn">冰箱已有 {have}/{FRIDGE_LIMIT}，拿完要扔掉 {after - FRIDGE_LIMIT} 个（拿了也可以撤销）</p>
          )}
        </div>
      )}
    </section>
  );
}

// ---------- 最右栏：主厨，鼠标停留看技能 ----------
function Chefs({ G, player, moves, choosing }) {
  const eligible = eligibleChefs(G, player).map(c => c.id);
  return (
    <section className="chefs">
      {G.chefs.length === 0 && <span className="muted">主厨已全部被请走</span>}
      {G.chefs.map(chef => (
        <div key={chef.id} className={`chef ${chef.side}`}>
          <div className="chef-requires">
            {Object.entries(chef.requires).map(([c, n]) => (
              <span key={c} className="req" style={{ background: TOKEN_INFO[c].color, color: TOKEN_INFO[c].text }}>{n}</span>
            ))}
          </div>
          <div className="chef-main">
            <span className="chef-name">{chef.name}</span>
            <span className="chef-points">{chef.points}</span>
          </div>
          {choosing && eligible.includes(chef.id) && (
            <button className="primary chef-choose" onClick={() => moves.chooseChef(chef.id)}>请他来</button>
          )}
          <div className="chef-tip" role="tooltip">
            <b>{chef.side === 'angel' ? '天使 · 持续生效' : '恶魔 · 到来时生效一次'}</b>
            <div>{chef.skill}</div>
            <div className="muted">条件：已做的菜里有这些折扣（只看菜，不看手里的调味）</div>
            <div className="muted">技能还没实现，目前只提供口碑</div>
          </div>
        </div>
      ))}
    </section>
  );
}

// ---------- 底栏：当前玩家的手牌 ----------
function Hand({ player, moves, stage }) {
  const b = bonuses(player);
  const discarding = stage === 'discard';
  const count = tokenCount(player);
  return (
    <section className={`hand ${discarding ? 'discarding' : ''}`}>
      <div className="hand-stat" title="口碑">
        <span className="hand-stat-num">{score(player)}</span>
        <span className="hand-stat-label">口碑</span>
      </div>
      <div className={`hand-stat fridge ${count > FRIDGE_LIMIT ? 'over' : ''}`} title="冰箱：调味 + 高汤">
        <span className="hand-stat-num">{count}<small>/{FRIDGE_LIMIT}</small></span>
        <span className="hand-stat-label">冰箱</span>
      </div>

      <div className="hand-colors">
        {ALL_TOKENS.map(t => {
          const info = TOKEN_INFO[t];
          const canDrop = discarding && player.tokens[t] > 0;
          return (
            <div key={t} className="hand-color" style={{ '--c': info.color, '--t': info.text }}>
              <div className="hand-color-name">{info.name}</div>
              {t !== 'stock'
                ? <div className="hand-discount" title="折扣：已做的这种菜">{b[t]}</div>
                : <div className="hand-discount none">万能</div>}
              <button className="hand-tokens" title={canDrop ? `扔掉 1 个${info.name}` : '手里的调味'}
                      disabled={!canDrop} onClick={() => moves.discard(t)}>
                {player.tokens[t]}
              </button>
            </div>
          );
        })}
      </div>

      <div className="hand-reserved">
        <div className="hand-label">预订 {player.reserved.length}/{MAX_RESERVED}</div>
        <div className="hand-reserved-cards">
          {player.reserved.length === 0 && <span className="muted">还没有预订</span>}
          {player.reserved.map((card, i) => {
            const affordable = payment(player, card);
            return (
              <RecipeCard key={card.id} card={card} dim={!affordable} compact>
                {!stage && (
                  <button className={affordable ? 'primary' : ''} disabled={!affordable}
                          onClick={() => moves.buyReserved(i)}>买</button>
                )}
              </RecipeCard>
            );
          })}
        </div>
      </div>

      {player.chefs.length > 0 && (
        <div className="hand-chefs">
          <div className="hand-label">请来的主厨</div>
          {player.chefs.map(c => <span key={c.id} className={`tag ${c.side}`} title={c.skill}>{c.name}</span>)}
        </div>
      )}
    </section>
  );
}

// ---------- 开局：挑家常菜 + 座位补偿（占据市场的位置）----------
function DraftPanel({ G, moves, seat }) {
  const [index, setIndex] = useState(null);
  const [picked, setPicked] = useState([]);
  const need = SEAT_BONUS[seat] ?? 0;

  function confirm() {
    moves.pickStarter(index, picked);
    setIndex(null);
    setPicked([]);
  }

  return (
    <section className="draft">
      <h2>1. 选一张家常菜</h2>
      <div className="row">
        {G.starters.map((card, i) => (
          <div key={i} className={`pickable ${index === i ? 'picked' : ''}`}
               onClick={() => card && setIndex(i)}>
            <RecipeCard card={card} />
          </div>
        ))}
      </div>

      <h2>2. 领取开局调味：{need} 个（可重复）</h2>
      <div className="row">
        {COLORS.map(c => (
          <Token key={c} type={c}
                 onClick={picked.length < need ? () => setPicked([...picked, c]) : undefined} />
        ))}
      </div>
      <div className="row">
        已选：
        {picked.length === 0 && <span className="muted">无</span>}
        {picked.map((c, i) => (
          <Token key={i} type={c} small
                 onClick={() => setPicked(picked.filter((_, j) => j !== i))} />
        ))}
      </div>

      <button className="primary" disabled={index === null || picked.length !== need} onClick={confirm}>
        确定
      </button>
    </section>
  );
}

// ---------- 结算 ----------
function GameOver({ result }) {
  return (
    <div className="board">
      <section className="panel gameover">
        <h1>游戏结束</h1>
        <p>获胜：{result.winners.map(id => SEAT_NAMES[Number(id)]).join('、')}</p>
        <table>
          <thead><tr><th>名次</th><th>座位</th><th>口碑</th><th>菜</th><th>恶魔</th></tr></thead>
          <tbody>
            {result.ranking.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td><td>{SEAT_NAMES[Number(r.id)]}</td>
                <td>{r.score}</td><td>{r.cards}</td><td>{r.devils}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
